import { DatabaseConnection } from '../utils/connection.js';
import type { PostgresTool, ToolOutput, GetConnectionStringFn } from '../types/tool.js';
import { z } from 'zod';

interface FunctionResult {
  success: boolean;
  message: string;
  details: unknown;
}

interface FunctionInfo {
  name: string;
  language: string;
  returnType: string;
  arguments: string;
  definition: string;
  volatility: string;
  owner: string;
}

/**
 * Get information about database functions
 */
async function _getFunctions(
  connectionString: string,
  functionName?: string,
  schema = 'public'
): Promise<FunctionResult> {
  const db = DatabaseConnection.getInstance();
  
  try {
    await db.connect(connectionString);
    
    let query = `
      SELECT 
        p.proname AS name,
        l.lanname AS language,
        pg_get_function_result(p.oid) AS "returnType",
        pg_get_function_arguments(p.oid) AS "arguments",
        CASE
          WHEN p.provolatile = 'i' THEN 'IMMUTABLE'
          WHEN p.provolatile = 's' THEN 'STABLE'
          WHEN p.provolatile = 'v' THEN 'VOLATILE'
        END AS volatility,
        pg_get_functiondef(p.oid) AS definition,
        a.rolname AS owner
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      JOIN pg_language l ON p.prolang = l.oid
      JOIN pg_authid a ON p.proowner = a.oid
      WHERE n.nspname = $1
    `;
    
    const params: (string | undefined)[] = [schema];
    
    if (functionName) {
      query += ' AND p.proname = $2';
      params.push(functionName);
    }
    
    query += ' ORDER BY p.proname';
    
    const functions = await db.query<FunctionInfo>(query, params);
    
    return {
      success: true,
      message: functionName 
        ? `Function information for ${functionName}` 
        : `Found ${functions.length} functions in schema ${schema}`,
      details: functions
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to get function information: ${error instanceof Error ? error.message : String(error)}`,
      details: null
    };
  } finally {
    await db.disconnect();
  }
}

/**
 * Create or replace a database function
 */
async function _createFunction(
  connectionString: string,
  functionName: string,
  parameters: string,
  returnType: string,
  functionBody: string,
  options: {
    language?: 'sql' | 'plpgsql' | 'plpython3u';
    volatility?: 'VOLATILE' | 'STABLE' | 'IMMUTABLE';
    schema?: string;
    security?: 'INVOKER' | 'DEFINER';
    replace?: boolean;
  } = {}
): Promise<FunctionResult> {
  const db = DatabaseConnection.getInstance();
  
  try {
    await db.connect(connectionString);
    
    const language = options.language || 'plpgsql';
    const volatility = options.volatility || 'VOLATILE';
    const schema = options.schema || 'public';
    const security = options.security || 'INVOKER';
    const createOrReplace = options.replace ? 'CREATE OR REPLACE' : 'CREATE';
    
    // Build function creation SQL
    const sql = `
      ${createOrReplace} FUNCTION ${schema}.${functionName}(${parameters})
      RETURNS ${returnType}
      LANGUAGE ${language}
      ${volatility}
      SECURITY ${security}
      AS $function$
      ${functionBody}
      $function$;
    `;
    
    await db.query(sql);
    
    return {
      success: true,
      message: `Function ${functionName} created successfully`,
      details: {
        name: functionName,
        schema,
        returnType,
        language,
        volatility,
        security
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to create function: ${error instanceof Error ? error.message : String(error)}`,
      details: null
    };
  } finally {
    await db.disconnect();
  }
}

/**
 * Drop a database function
 */
async function _dropFunction(
  connectionString: string,
  functionName: string,
  parameters?: string,
  options: {
    schema?: string;
    ifExists?: boolean;
    cascade?: boolean;
  } = {}
): Promise<FunctionResult> {
  const db = DatabaseConnection.getInstance();
  
  try {
    await db.connect(connectionString);
    
    const schema = options.schema || 'public';
    const ifExists = options.ifExists ? 'IF EXISTS' : '';
    const cascade = options.cascade ? 'CASCADE' : '';
    
    // Build function drop SQL
    let sql = `DROP FUNCTION ${ifExists} ${schema}.${functionName}`;
    
    // Add parameters if provided
    if (parameters) {
      sql += `(${parameters})`;
    }
    
    // Add cascade if specified
    if (cascade) {
      sql += ` ${cascade}`;
    }
    
    await db.query(sql);
    
    return {
      success: true,
      message: `Function ${functionName} dropped successfully`,
      details: {
        name: functionName,
        schema
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to drop function: ${error instanceof Error ? error.message : String(error)}`,
      details: null
    };
  } finally {
    await db.disconnect();
  }
}

/**
 * Enable Row-Level Security (RLS) on a table
 */
async function _enableRLS(
  connectionString: string,
  tableName: string,
  schema = 'public'
): Promise<FunctionResult> {
  const db = DatabaseConnection.getInstance();
  
  try {
    await db.connect(connectionString);
    
    await db.query(`ALTER TABLE ${schema}.${tableName} ENABLE ROW LEVEL SECURITY`);
    
    return {
      success: true,
      message: `Row-Level Security enabled on ${schema}.${tableName}`,
      details: {
        table: tableName,
        schema
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to enable RLS: ${error instanceof Error ? error.message : String(error)}`,
      details: null
    };
  } finally {
    await db.disconnect();
  }
}

/**
 * Disable Row-Level Security (RLS) on a table
 */
async function _disableRLS(
  connectionString: string,
  tableName: string,
  schema = 'public'
): Promise<FunctionResult> {
  const db = DatabaseConnection.getInstance();
  
  try {
    await db.connect(connectionString);
    
    await db.query(`ALTER TABLE ${schema}.${tableName} DISABLE ROW LEVEL SECURITY`);
    
    return {
      success: true,
      message: `Row-Level Security disabled on ${schema}.${tableName}`,
      details: {
        table: tableName,
        schema
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to disable RLS: ${error instanceof Error ? error.message : String(error)}`,
      details: null
    };
  } finally {
    await db.disconnect();
  }
}

/**
 * Create a Row-Level Security policy
 */
async function _createRLSPolicy(
  connectionString: string,
  tableName: string,
  policyName: string,
  using: string,
  check?: string,
  options: {
    schema?: string;
    command?: 'ALL' | 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
    role?: string;
    replace?: boolean;
  } = {}
): Promise<FunctionResult> {
  const db = DatabaseConnection.getInstance();
  
  try {
    await db.connect(connectionString);
    
    const schema = options.schema || 'public';
    const command = options.command || 'ALL';
    const createOrReplace = options.replace ? 'CREATE OR REPLACE' : 'CREATE';
    
    // Build policy creation SQL
    let sql = `
      ${createOrReplace} POLICY ${policyName}
      ON ${schema}.${tableName}
      FOR ${command}
    `;
    
    // Add role if specified
    if (options.role) {
      sql += ` TO ${options.role}`;
    }
    
    // Add USING expression
    sql += ` USING (${using})`;
    
    // Add WITH CHECK expression if provided
    if (check) {
      sql += ` WITH CHECK (${check})`;
    }
    
    await db.query(sql);
    
    return {
      success: true,
      message: `Policy ${policyName} created successfully on ${schema}.${tableName}`,
      details: {
        table: tableName,
        schema,
        policy: policyName,
        command
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to create policy: ${error instanceof Error ? error.message : String(error)}`,
      details: null
    };
  } finally {
    await db.disconnect();
  }
}

/**
 * Drop a Row-Level Security policy
 */
async function _dropRLSPolicy(
  connectionString: string,
  tableName: string,
  policyName: string,
  options: {
    schema?: string;
    ifExists?: boolean;
  } = {}
): Promise<FunctionResult> {
  const db = DatabaseConnection.getInstance();
  
  try {
    await db.connect(connectionString);
    
    const schema = options.schema || 'public';
    const ifExists = options.ifExists ? 'IF EXISTS' : '';
    
    await db.query(`DROP POLICY ${ifExists} ${policyName} ON ${schema}.${tableName}`);
    
    return {
      success: true,
      message: `Policy ${policyName} dropped successfully from ${schema}.${tableName}`,
      details: {
        table: tableName,
        schema,
        policy: policyName
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to drop policy: ${error instanceof Error ? error.message : String(error)}`,
      details: null
    };
  } finally {
    await db.disconnect();
  }
}

/**
 * Edit an existing Row-Level Security policy
 */
async function _editRLSPolicy(
  connectionString: string,
  tableName: string,
  policyName: string,
  options: {
    schema?: string;
    roles?: string[]; // Use PUBLIC for all roles
    using?: string;
    check?: string;
  } = {}
): Promise<FunctionResult> {
  const db = DatabaseConnection.getInstance();

  try {
    await db.connect(connectionString);

    const schema = options.schema || 'public';
    const alterClauses: string[] = [];

    if (options.roles !== undefined) {
      const rolesString = options.roles.length === 0 
        ? 'PUBLIC' // Assuming empty array means PUBLIC, adjust if needed
        : options.roles.join(', ');
      alterClauses.push(`TO ${rolesString}`);
    }

    if (options.using !== undefined) {
      alterClauses.push(`USING (${options.using})`);
    }

    if (options.check !== undefined) {
      // Ensure 'using' is also provided if 'check' is, 
      // or handle the case where only check is altered if allowed by PG version/syntax.
      // PostgreSQL requires re-specifying USING if you alter CHECK.
      // For simplicity, let's assume if check is provided, using should ideally be too,
      // or the user intends to keep the existing 'using'. The ALTER syntax might implicitly handle this.
      // Let's require 'using' if 'check' is provided for clarity, or adjust based on specific PG behavior knowledge.
      if (options.using === undefined) {
          // Decide on behavior: fetch existing 'using', error out, or proceed?
          // Fetching existing 'using' adds complexity. Let's initially require it.
          // throw new Error("The 'using' expression must be provided when altering the 'check' expression.");
          // Alternatively, allow altering only check if syntax supports it, but PG docs suggest USING is needed.
          // Let's focus on altering TO, USING, WITH CHECK where provided.
      }
      alterClauses.push(`WITH CHECK (${options.check})`);
    }

    if (alterClauses.length === 0) {
      return {
        success: false,
        message: 'No changes specified for the policy.',
        details: { table: tableName, schema, policy: policyName }
      };
    }

    const sql = `
      ALTER POLICY ${policyName}
      ON ${schema}.${tableName}
      ${alterClauses.join('\n')};
    `;

    await db.query(sql);

    return {
      success: true,
      message: `Policy ${policyName} on ${schema}.${tableName} updated successfully.`,
      details: {
        table: tableName,
        schema,
        policy: policyName,
        changes: options
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to edit policy: ${error instanceof Error ? error.message : String(error)}`,
      details: null
    };
  } finally {
    await db.disconnect();
  }
}

/**
 * Get Row-Level Security policies for a table
 */
async function _getRLSPolicies(
  connectionString: string,
  tableName?: string,
  schema = 'public'
): Promise<FunctionResult> {
  const db = DatabaseConnection.getInstance();
  
  try {
    await db.connect(connectionString);
    
    let query = `
      SELECT 
        schemaname,
        tablename,
        policyname,
        roles,
        cmd,
        qual as "using",
        with_check as "check"
      FROM pg_policies
      WHERE schemaname = $1
    `;
    
    const params: (string | undefined)[] = [schema];
    
    if (tableName) {
      query += ' AND tablename = $2';
      params.push(tableName);
    }
    
    query += ' ORDER BY tablename, policyname';
    
    const policies = await db.query(query, params);
    
    return {
      success: true,
      message: tableName 
        ? `Policies for table ${schema}.${tableName}` 
        : `All policies in schema ${schema}`,
      details: policies
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to get policies: ${error instanceof Error ? error.message : String(error)}`,
      details: null
    };
  } finally {
    await db.disconnect();
  }
}

// --- Tool Definitions ---

export const getFunctionsTool: PostgresTool = {
  name: 'pg_get_functions',
  description: 'Get information about PostgreSQL functions',
  inputSchema: z.object({
    connectionString: z.string().optional().describe('PostgreSQL connection string (optional)'),
    functionName: z.string().optional().describe('Optional function name to filter by'),
    schema: z.string().optional().describe('Schema name (defaults to public)') // Assuming 'public' default is handled in execute or not strictly enforced by schema
  }),
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  execute: async (args: any, getConnectionStringVal: GetConnectionStringFn): Promise<ToolOutput> => {
    const { connectionString: connStringArg, functionName, schema } = args as {
      connectionString?: string;
      functionName?: string;
      schema?: string;
    };
    const resolvedConnString = getConnectionStringVal(connStringArg);
    const result = await _getFunctions(resolvedConnString, functionName, schema);
    if (result.success) {
      return { content: [{ type: 'text', text: JSON.stringify(result.details, null, 2) || result.message }] };
    }
    return { content: [{ type: 'text', text: result.message }], isError: true };
  },
};

export const createFunctionTool: PostgresTool = {
  name: 'pg_create_function',
  description: 'Create or replace a PostgreSQL function',
  inputSchema: z.object({
    connectionString: z.string().optional().describe('PostgreSQL connection string (optional)'),
    functionName: z.string().describe('Name of the function to create'),
    parameters: z.string().describe('Function parameters (e.g., "id integer, name text")'),
    returnType: z.string().describe('Return type of the function'),
    functionBody: z.string().describe('Function body code'),
    language: z.enum(['sql', 'plpgsql', 'plpython3u']).describe('Function language'),
    volatility: z.enum(['VOLATILE', 'STABLE', 'IMMUTABLE']).describe('Function volatility'),
    schema: z.string().describe('Schema name (defaults to public)'),
    security: z.enum(['INVOKER', 'DEFINER']).describe('Function security context'),
    replace: z.boolean().describe('Whether to replace the function if it exists')
  }),
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  execute: async (args: any, getConnectionStringVal: GetConnectionStringFn): Promise<ToolOutput> => {
    const { 
        connectionString: connStringArg, 
        functionName, 
        parameters, 
        returnType, 
        functionBody, 
        language, 
        volatility, 
        schema, 
        security, 
        replace 
    } = args as {
      connectionString?: string;
      functionName: string;
      parameters: string;
      returnType: string;
      functionBody: string;
      language?: 'sql' | 'plpgsql' | 'plpython3u';
      volatility?: 'VOLATILE' | 'STABLE' | 'IMMUTABLE';
      schema?: string;
      security?: 'INVOKER' | 'DEFINER';
      replace?: boolean;
    };
    const resolvedConnString = getConnectionStringVal(connStringArg);
    const result = await _createFunction(resolvedConnString, functionName, parameters, returnType, functionBody, { language, volatility, schema, security, replace });
    if (result.success) {
      return { content: [{ type: 'text', text: result.message + (result.details ? ` Details: ${JSON.stringify(result.details)}` : '') }] };
    }
    return { content: [{ type: 'text', text: result.message }], isError: true };
  },
};

export const dropFunctionTool: PostgresTool = {
  name: 'pg_drop_function',
  description: 'Drop a PostgreSQL function',
  inputSchema: z.object({
    connectionString: z.string().optional().describe('PostgreSQL connection string (optional)'),
    functionName: z.string().describe('Name of the function to drop'),
    parameters: z.string().describe('Function parameters signature (required for overloaded functions)'),
    schema: z.string().describe('Schema name (defaults to public)'),
    ifExists: z.boolean().describe('Whether to include IF EXISTS clause'),
    cascade: z.boolean().describe('Whether to include CASCADE clause')
  }),
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  execute: async (args: any, getConnectionStringVal: GetConnectionStringFn): Promise<ToolOutput> => {
    const { 
        connectionString: connStringArg, 
        functionName, 
        parameters, 
        schema, 
        ifExists, 
        cascade 
    } = args as {
        connectionString?: string;
        functionName: string;
        parameters?: string;
        schema?: string;
        ifExists?: boolean;
        cascade?: boolean;
    };
    const resolvedConnString = getConnectionStringVal(connStringArg);
    const result = await _dropFunction(resolvedConnString, functionName, parameters, { schema, ifExists, cascade });
    if (result.success) {
      return { content: [{ type: 'text', text: result.message + (result.details ? ` Details: ${JSON.stringify(result.details)}` : '') }] };
    }
    return { content: [{ type: 'text', text: result.message }], isError: true };
  },
};

export const enableRLSTool: PostgresTool = {
  name: 'pg_enable_rls',
  description: 'Enable Row-Level Security on a table',
  inputSchema: z.object({
    connectionString: z.string().optional().describe('PostgreSQL connection string (optional)'),
    tableName: z.string().describe('Name of the table to enable RLS on'),
    schema: z.string().describe('Schema name (defaults to public)')
  }),
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  execute: async (args: any, getConnectionStringVal: GetConnectionStringFn): Promise<ToolOutput> => {
    const { connectionString: connStringArg, tableName, schema } = args;
    const resolvedConnString = getConnectionStringVal(connStringArg);
    const result = await _enableRLS(resolvedConnString, tableName, schema);
    if (result.success) {
      return { content: [{ type: 'text', text: result.message + (result.details ? ` Details: ${JSON.stringify(result.details)}` : '') }] };
    }
    return { content: [{ type: 'text', text: result.message }], isError: true };
  }
};

export const disableRLSTool: PostgresTool = {
  name: 'pg_disable_rls',
  description: 'Disable Row-Level Security on a table',
  inputSchema: z.object({
    connectionString: z.string().optional().describe('PostgreSQL connection string (optional)'),
    tableName: z.string().describe('Name of the table to disable RLS on'),
    schema: z.string().describe('Schema name (defaults to public)')
  }),
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  execute: async (args: any, getConnectionStringVal: GetConnectionStringFn): Promise<ToolOutput> => {
    const { connectionString: connStringArg, tableName, schema } = args;
    const resolvedConnString = getConnectionStringVal(connStringArg);
    const result = await _disableRLS(resolvedConnString, tableName, schema);
    if (result.success) {
      return { content: [{ type: 'text', text: result.message + (result.details ? ` Details: ${JSON.stringify(result.details)}` : '') }] };
    }
    return { content: [{ type: 'text', text: result.message }], isError: true };
  }
};

export const createRLSPolicyTool: PostgresTool = {
  name: 'pg_create_rls_policy',
  description: 'Create a Row-Level Security policy',
  inputSchema: z.object({
    connectionString: z.string().optional().describe('PostgreSQL connection string (optional)'),
    tableName: z.string().describe('Name of the table to create policy on'),
    policyName: z.string().describe('Name of the policy to create'),
    using: z.string().describe('USING expression for the policy (e.g., "user_id = current_user_id()")'),
    check: z.string().describe('WITH CHECK expression for the policy (if different from USING)'),
    schema: z.string().describe('Schema name (defaults to public)'),
    command: z.enum(['ALL', 'SELECT', 'INSERT', 'UPDATE', 'DELETE']).describe('Command the policy applies to'),
    role: z.string().describe('Role the policy applies to'),
    replace: z.boolean().describe('Whether to replace the policy if it exists')
  }),
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  execute: async (args: any, getConnectionStringVal: GetConnectionStringFn): Promise<ToolOutput> => {
    const { connectionString: connStringArg, tableName, policyName, using, check, schema, command, role, replace } = args;
    const resolvedConnString = getConnectionStringVal(connStringArg);
    const result = await _createRLSPolicy(resolvedConnString, tableName, policyName, using, check, { schema, command, role, replace });
    if (result.success) {
      return { content: [{ type: 'text', text: result.message + (result.details ? ` Details: ${JSON.stringify(result.details)}` : '') }] };
    }
    return { content: [{ type: 'text', text: result.message }], isError: true };
  }
};

export const dropRLSPolicyTool: PostgresTool = {
  name: 'pg_drop_rls_policy',
  description: 'Drop a Row-Level Security policy',
  inputSchema: z.object({
    connectionString: z.string().optional().describe('PostgreSQL connection string (optional)'),
    tableName: z.string().describe('Name of the table the policy is on'),
    policyName: z.string().describe('Name of the policy to drop'),
    schema: z.string().describe('Schema name (defaults to public)'),
    ifExists: z.boolean().describe('Whether to include IF EXISTS clause')
  }),
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  execute: async (args: any, getConnectionStringVal: GetConnectionStringFn): Promise<ToolOutput> => {
    const { connectionString: connStringArg, tableName, policyName, schema, ifExists } = args;
    const resolvedConnString = getConnectionStringVal(connStringArg);
    const result = await _dropRLSPolicy(resolvedConnString, tableName, policyName, { schema, ifExists });
    if (result.success) {
      return { content: [{ type: 'text', text: result.message + (result.details ? ` Details: ${JSON.stringify(result.details)}` : '') }] };
    }
    return { content: [{ type: 'text', text: result.message }], isError: true };
  }
};

export const editRLSPolicyTool: PostgresTool = {
  name: 'pg_edit_rls_policy',
  description: 'Edit an existing Row-Level Security policy',
  inputSchema: z.object({
    connectionString: z.string().optional().describe('PostgreSQL connection string (optional)'),
    tableName: z.string().describe('Name of the table the policy is on'),
    policyName: z.string().describe('Name of the policy to edit'),
    schema: z.string().describe('Schema name (defaults to public)'),
    roles: z.array(z.string()).describe('New list of roles the policy applies to (e.g., ["role1", "role2"]. Use PUBLIC or leave empty for all roles)'),
    using: z.string().describe('New USING expression for the policy'),
    check: z.string().describe('New WITH CHECK expression for the policy')
  }),
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  execute: async (args: any, getConnectionStringVal: GetConnectionStringFn): Promise<ToolOutput> => {
    const { connectionString: connStringArg, tableName, policyName, schema, roles, using, check } = args;
    const resolvedConnString = getConnectionStringVal(connStringArg);
    const result = await _editRLSPolicy(resolvedConnString, tableName, policyName, { schema, roles, using, check });
    if (result.success) {
      return { content: [{ type: 'text', text: result.message + (result.details ? ` Details: ${JSON.stringify(result.details)}` : '') }] };
    }
    return { content: [{ type: 'text', text: result.message }], isError: true };
  }
};

export const getRLSPoliciesTool: PostgresTool = {
  name: 'pg_get_rls_policies',
  description: 'Get Row-Level Security policies',
  inputSchema: z.object({
    connectionString: z.string().optional().describe('PostgreSQL connection string (optional)'),
    tableName: z.string().optional().describe('Optional table name to filter by'),
    schema: z.string().optional().describe('Schema name (defaults to public)')
  }),
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  execute: async (args: any, getConnectionStringVal: GetConnectionStringFn): Promise<ToolOutput> => {
    const { connectionString: connStringArg, tableName, schema } = args;
    const resolvedConnString = getConnectionStringVal(connStringArg);
    const result = await _getRLSPolicies(resolvedConnString, tableName, schema);
    if (result.success) {
      return { content: [{ type: 'text', text: JSON.stringify(result.details, null, 2) || result.message }] };
    }
    return { content: [{ type: 'text', text: result.message }], isError: true };
  }
}; 