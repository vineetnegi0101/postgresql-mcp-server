import { DatabaseConnection } from '../utils/connection.js';
import { z } from 'zod';
import type { PostgresTool, GetConnectionStringFn, ToolOutput } from '../types/tool.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

interface TriggerResult {
  success: boolean;
  message: string;
  details: unknown;
}

interface TriggerInfo {
  name: string;
  tableName: string;
  tableSchema: string;
  event: string;
  timing: string;
  definition: string;
  function: string;
  enabled: boolean;
}

/**
 * Get information about database triggers
 */
export async function getTriggers(
  connectionString: string,
  tableName?: string,
  schema: string = 'public'
): Promise<TriggerResult> {
  const db = DatabaseConnection.getInstance();
  
  try {
    await db.connect(connectionString);
    
    let query = `
      SELECT 
        t.tgname AS name,
        c.relname AS "tableName",
        n.nspname AS "tableSchema",
        CASE
          WHEN t.tgtype & (1<<0) THEN 'ROW'
          ELSE 'STATEMENT'
        END AS level,
        CASE
          WHEN t.tgtype & (1<<1) THEN 'BEFORE'
          WHEN t.tgtype & (1<<6) THEN 'INSTEAD OF'
          ELSE 'AFTER'
        END AS timing,
        CASE
          WHEN t.tgtype & (1<<2) THEN 'INSERT'
          WHEN t.tgtype & (1<<3) THEN 'DELETE'
          WHEN t.tgtype & (1<<4) THEN 'UPDATE'
          WHEN t.tgtype & (1<<5) THEN 'TRUNCATE'
          ELSE 'UNKNOWN'
        END AS event,
        p.proname AS function,
        pg_get_triggerdef(t.oid) AS definition,
        NOT t.tgdisabled AS enabled
      FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      JOIN pg_proc p ON t.tgfoid = p.oid
      WHERE NOT t.tgisinternal
    `;
    
    const params = [];
    
    if (schema) {
      query += ` AND n.nspname = $${params.length + 1}`;
      params.push(schema);
    }
    
    if (tableName) {
      query += ` AND c.relname = $${params.length + 1}`;
      params.push(tableName);
    }
    
    query += ' ORDER BY c.relname, t.tgname';
    
    const triggers = await db.query<TriggerInfo>(query, params);
    
    return {
      success: true,
      message: tableName 
        ? `Triggers for table ${schema}.${tableName}` 
        : `Found ${triggers.length} triggers in schema ${schema}`,
      details: triggers
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to get trigger information: ${error instanceof Error ? error.message : String(error)}`,
      details: null
    };
  } finally {
    await db.disconnect();
  }
}

/**
 * Create a trigger
 */
export async function createTrigger(
  connectionString: string,
  triggerName: string,
  tableName: string,
  functionName: string,
  options: {
    schema?: string;
    timing?: 'BEFORE' | 'AFTER' | 'INSTEAD OF';
    events?: ('INSERT' | 'UPDATE' | 'DELETE' | 'TRUNCATE')[];
    when?: string;
    forEach?: 'ROW' | 'STATEMENT';
    replace?: boolean;
  } = {}
): Promise<TriggerResult> {
  const db = DatabaseConnection.getInstance();
  
  try {
    await db.connect(connectionString);
    
    const schema = options.schema || 'public';
    const timing = options.timing || 'AFTER';
    const events = options.events || ['INSERT'];
    const forEach = options.forEach || 'ROW';
    const createOrReplace = options.replace ? 'CREATE OR REPLACE' : 'CREATE';
    
    // Build trigger creation SQL
    let sql = `
      ${createOrReplace} TRIGGER ${triggerName}
      ${timing} ${events.join(' OR ')}
      ON ${schema}.${tableName}
    `;
    
    // Add FOR EACH clause
    if (forEach) {
      sql += ` FOR EACH ${forEach}`;
    }
    
    // Add WHEN clause if provided
    if (options.when) {
      sql += ` WHEN (${options.when})`;
    }
    
    // Add EXECUTE PROCEDURE clause
    sql += ` EXECUTE FUNCTION ${functionName}()`;
    
    await db.query(sql);
    
    return {
      success: true,
      message: `Trigger ${triggerName} created successfully on ${schema}.${tableName}`,
      details: {
        name: triggerName,
        table: tableName,
        schema,
        timing,
        events,
        function: functionName
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to create trigger: ${error instanceof Error ? error.message : String(error)}`,
      details: null
    };
  } finally {
    await db.disconnect();
  }
}

/**
 * Drop a trigger
 */
export async function dropTrigger(
  connectionString: string,
  triggerName: string,
  tableName: string,
  options: {
    schema?: string;
    ifExists?: boolean;
    cascade?: boolean;
  } = {}
): Promise<TriggerResult> {
  const db = DatabaseConnection.getInstance();
  
  try {
    await db.connect(connectionString);
    
    const schema = options.schema || 'public';
    const ifExists = options.ifExists ? 'IF EXISTS' : '';
    const cascade = options.cascade ? 'CASCADE' : '';
    
    // Build trigger drop SQL
    let sql = `DROP TRIGGER ${ifExists} ${triggerName} ON ${schema}.${tableName}`;
    
    // Add cascade if specified
    if (cascade) {
      sql += ` ${cascade}`;
    }
    
    await db.query(sql);
    
    return {
      success: true,
      message: `Trigger ${triggerName} dropped successfully from ${schema}.${tableName}`,
      details: {
        name: triggerName,
        table: tableName,
        schema
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to drop trigger: ${error instanceof Error ? error.message : String(error)}`,
      details: null
    };
  } finally {
    await db.disconnect();
  }
}

/**
 * Enable or disable a trigger
 */
export async function setTriggerState(
  connectionString: string,
  triggerName: string,
  tableName: string,
  enable: boolean,
  options: {
    schema?: string;
  } = {}
): Promise<TriggerResult> {
  const db = DatabaseConnection.getInstance();
  
  try {
    await db.connect(connectionString);
    
    const schema = options.schema || 'public';
    const action = enable ? 'ENABLE' : 'DISABLE';
    
    // Build trigger alter SQL
    const sql = `ALTER TABLE ${schema}.${tableName} ${action} TRIGGER ${triggerName}`;
    
    await db.query(sql);
    
    return {
      success: true,
      message: `Trigger ${triggerName} ${enable ? 'enabled' : 'disabled'} on ${schema}.${tableName}`,
      details: {
        name: triggerName,
        table: tableName,
        schema,
        enabled: enable
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to ${enable ? 'enable' : 'disable'} trigger: ${error instanceof Error ? error.message : String(error)}`,
      details: null
    };
  } finally {
    await db.disconnect();
  }
}

// --- GetTriggers Tool ---
const GetTriggersInputSchema = z.object({
  connectionString: z.string().optional(),
  tableName: z.string().optional(),
  schema: z.string().optional().default('public'),
});
type GetTriggersInput = z.infer<typeof GetTriggersInputSchema>;

async function executeGetTriggers(
  input: GetTriggersInput,
  getConnectionString: GetConnectionStringFn
): Promise<TriggerInfo[]> {
  const resolvedConnectionString = getConnectionString(input.connectionString);
  const db = DatabaseConnection.getInstance();
  const { tableName, schema } = input;
  
  try {
    await db.connect(resolvedConnectionString);
    
    let query = `
      SELECT 
        t.tgname AS name,
        c.relname AS "tableName",
        n.nspname AS "tableSchema",
        CASE
          WHEN t.tgtype & (1<<0) THEN 'ROW'
          ELSE 'STATEMENT'
        END AS level,
        CASE
          WHEN t.tgtype & (1<<1) THEN 'BEFORE'
          WHEN t.tgtype & (1<<6) THEN 'INSTEAD OF'
          ELSE 'AFTER'
        END AS timing,
        CASE
          WHEN t.tgtype & (1<<2) THEN 'INSERT'
          WHEN t.tgtype & (1<<3) THEN 'DELETE'
          WHEN t.tgtype & (1<<4) THEN 'UPDATE'
          WHEN t.tgtype & (1<<5) THEN 'TRUNCATE'
          ELSE 'UNKNOWN'
        END AS event,
        p.proname AS function,
        pg_get_triggerdef(t.oid) AS definition,
        NOT t.tgdisabled AS enabled
      FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      JOIN pg_proc p ON t.tgfoid = p.oid
      WHERE NOT t.tgisinternal
    `;
    
    const params = [];
    
    if (schema) {
      query += ` AND n.nspname = $${params.length + 1}`;
      params.push(schema);
    }
    
    if (tableName) {
      query += ` AND c.relname = $${params.length + 1}`;
      params.push(tableName);
    }
    
    query += ' ORDER BY c.relname, t.tgname';
    
    const triggers = await db.query<TriggerInfo>(query, params);
    return triggers;
  } catch (error) {
    throw new McpError(ErrorCode.InternalError, `Failed to get trigger information: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    await db.disconnect();
  }
}

export const getTriggersTool: PostgresTool = {
  name: 'pg_get_triggers',
  description: 'Get information about PostgreSQL triggers',
  inputSchema: GetTriggersInputSchema,
  async execute(params: unknown, getConnectionString: GetConnectionStringFn): Promise<ToolOutput> {
    const validationResult = GetTriggersInputSchema.safeParse(params);
    if (!validationResult.success) {
      return { content: [{ type: 'text', text: `Invalid input: ${validationResult.error.format()}` }], isError: true };
    }
    try {
      const triggers = await executeGetTriggers(validationResult.data, getConnectionString);
      const { tableName, schema } = validationResult.data;
      const message = tableName 
        ? `Triggers for table ${schema}.${tableName}` 
        : `Found ${triggers.length} triggers in schema ${schema}`;
      return { content: [{ type: 'text', text: message }, { type: 'text', text: JSON.stringify(triggers, null, 2) }] };
    } catch (error) {
      const errorMessage = error instanceof McpError ? error.message : (error instanceof Error ? error.message : String(error));
      return { content: [{ type: 'text', text: `Error getting triggers: ${errorMessage}` }], isError: true };
    }
  }
};

// --- CreateTrigger Tool ---
const CreateTriggerInputSchema = z.object({
  connectionString: z.string().optional(),
  triggerName: z.string(),
  tableName: z.string(),
  functionName: z.string(),
  schema: z.string().optional().default('public'),
  timing: z.enum(['BEFORE', 'AFTER', 'INSTEAD OF']).optional().default('AFTER'),
  events: z.array(z.enum(['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE'])).min(1).optional().default(['INSERT']),
  when: z.string().optional(),
  forEach: z.enum(['ROW', 'STATEMENT']).optional().default('ROW'),
  replace: z.boolean().optional().default(false),
});
type CreateTriggerInput = z.infer<typeof CreateTriggerInputSchema>;

async function executeCreateTrigger(
  input: CreateTriggerInput,
  getConnectionString: GetConnectionStringFn
): Promise<{ name: string; table: string; schema: string; timing: string; events: string[]; function: string }> {
  const resolvedConnectionString = getConnectionString(input.connectionString);
  const db = DatabaseConnection.getInstance();
  const { triggerName, tableName, functionName, schema, timing, events, when, forEach, replace } = input;
  
  try {
    await db.connect(resolvedConnectionString);
    
    const createOrReplace = replace ? 'CREATE OR REPLACE' : 'CREATE';
    const qualifiedTableName = `"${schema}"."${tableName}"`;
    const qualifiedFunctionName = `"${functionName}"`; // Assuming functionName might also need quoting or schema qualification

    let sql = `
      ${createOrReplace} TRIGGER "${triggerName}"
      ${timing} ${events.join(' OR ')}
      ON ${qualifiedTableName}
    `;
    
    if (forEach) {
      sql += ` FOR EACH ${forEach}`;
    }
    
    if (when) {
      sql += ` WHEN (${when})`;
    }
    
    sql += ` EXECUTE FUNCTION ${qualifiedFunctionName}()`; // Ensure function has () if it's a procedure/function call
    
    await db.query(sql);
    
    return {
      name: triggerName,
      table: tableName,
      schema,
      timing,
      events,
      function: functionName
    };
  } catch (error) {
    throw new McpError(ErrorCode.InternalError, `Failed to create trigger: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    await db.disconnect();
  }
}

export const createTriggerTool: PostgresTool = {
  name: 'pg_create_trigger',
  description: 'Create a PostgreSQL trigger',
  inputSchema: CreateTriggerInputSchema,
  async execute(params: unknown, getConnectionString: GetConnectionStringFn): Promise<ToolOutput> {
    const validationResult = CreateTriggerInputSchema.safeParse(params);
    if (!validationResult.success) {
      return { content: [{ type: 'text', text: `Invalid input: ${validationResult.error.format()}` }], isError: true };
    }
    try {
      const result = await executeCreateTrigger(validationResult.data, getConnectionString);
      return { content: [{ type: 'text', text: `Trigger ${result.name} created successfully on ${result.schema}.${result.table}` }, { type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      const errorMessage = error instanceof McpError ? error.message : (error instanceof Error ? error.message : String(error));
      return { content: [{ type: 'text', text: `Error creating trigger: ${errorMessage}` }], isError: true };
    }
  }
};

// --- DropTrigger Tool ---
const DropTriggerInputSchema = z.object({
  connectionString: z.string().optional(),
  triggerName: z.string(),
  tableName: z.string(),
  schema: z.string().optional().default('public'),
  ifExists: z.boolean().optional().default(false),
  cascade: z.boolean().optional().default(false),
});
type DropTriggerInput = z.infer<typeof DropTriggerInputSchema>;

async function executeDropTrigger(
  input: DropTriggerInput,
  getConnectionString: GetConnectionStringFn
): Promise<{ name: string; table: string; schema: string }> {
  const resolvedConnectionString = getConnectionString(input.connectionString);
  const db = DatabaseConnection.getInstance();
  const { triggerName, tableName, schema, ifExists, cascade } = input;

  try {
    await db.connect(resolvedConnectionString);
    
    const ifExistsClause = ifExists ? 'IF EXISTS' : '';
    const cascadeClause = cascade ? 'CASCADE' : '';
    const qualifiedTableName = `"${schema}"."${tableName}"`;
    
    let sql = `DROP TRIGGER ${ifExistsClause} "${triggerName}" ON ${qualifiedTableName}`;
    if (cascadeClause) {
      sql += ` ${cascadeClause}`;
    }
    
    await db.query(sql);
    
    return { name: triggerName, table: tableName, schema };
  } catch (error) {
    throw new McpError(ErrorCode.InternalError, `Failed to drop trigger: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    await db.disconnect();
  }
}

export const dropTriggerTool: PostgresTool = {
  name: 'pg_drop_trigger',
  description: 'Drop a PostgreSQL trigger',
  inputSchema: DropTriggerInputSchema,
  async execute(params: unknown, getConnectionString: GetConnectionStringFn): Promise<ToolOutput> {
    const validationResult = DropTriggerInputSchema.safeParse(params);
    if (!validationResult.success) {
      return { content: [{ type: 'text', text: `Invalid input: ${validationResult.error.format()}` }], isError: true };
    }
    try {
      const result = await executeDropTrigger(validationResult.data, getConnectionString);
      return { content: [{ type: 'text', text: `Trigger ${result.name} dropped successfully from ${result.schema}.${result.table}` }, { type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      const errorMessage = error instanceof McpError ? error.message : (error instanceof Error ? error.message : String(error));
      return { content: [{ type: 'text', text: `Error dropping trigger: ${errorMessage}` }], isError: true };
    }
  }
};

// --- SetTriggerState Tool ---
const SetTriggerStateInputSchema = z.object({
  connectionString: z.string().optional(),
  triggerName: z.string(),
  tableName: z.string(),
  enable: z.boolean(),
  schema: z.string().optional().default('public'),
});
type SetTriggerStateInput = z.infer<typeof SetTriggerStateInputSchema>;

async function executeSetTriggerState(
  input: SetTriggerStateInput,
  getConnectionString: GetConnectionStringFn
): Promise<{ name: string; table: string; schema: string; enabled: boolean }> {
  const resolvedConnectionString = getConnectionString(input.connectionString);
  const db = DatabaseConnection.getInstance();
  const { triggerName, tableName, enable, schema } = input;
  
  try {
    await db.connect(resolvedConnectionString);
    
    const action = enable ? 'ENABLE' : 'DISABLE';
    const qualifiedTableName = `"${schema}"."${tableName}"`;
        
    const sql = `ALTER TABLE ${qualifiedTableName} ${action} TRIGGER "${triggerName}"`;
    
    await db.query(sql);
    
    return { name: triggerName, table: tableName, schema, enabled: enable };
  } catch (error) {
    throw new McpError(ErrorCode.InternalError, `Failed to set trigger state: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    await db.disconnect();
  }
}

export const setTriggerStateTool: PostgresTool = {
  name: 'pg_set_trigger_state',
  description: 'Enable or disable a PostgreSQL trigger',
  inputSchema: SetTriggerStateInputSchema,
  async execute(params: unknown, getConnectionString: GetConnectionStringFn): Promise<ToolOutput> {
    const validationResult = SetTriggerStateInputSchema.safeParse(params);
    if (!validationResult.success) {
      return { content: [{ type: 'text', text: `Invalid input: ${validationResult.error.format()}` }], isError: true };
    }
    try {
      const result = await executeSetTriggerState(validationResult.data, getConnectionString);
      return { content: [{ type: 'text', text: `Trigger ${result.name} ${result.enabled ? 'enabled' : 'disabled'} on ${result.schema}.${result.table}` }, { type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      const errorMessage = error instanceof McpError ? error.message : (error instanceof Error ? error.message : String(error));
      return { content: [{ type: 'text', text: `Error setting trigger state: ${errorMessage}` }], isError: true };
    }
  }
}; 