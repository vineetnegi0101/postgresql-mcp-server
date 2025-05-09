import { DatabaseConnection } from '../utils/connection.js';
import { z } from 'zod';
import type { PostgresTool, GetConnectionStringFn, ToolOutput } from '../types/tool.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import type { PoolClient } from 'pg'; // For transaction client type

interface SchemaResult {
  success: boolean;
  message: string;
  details: unknown;
}

interface TableInfo {
  tableName: string;
  columns: ColumnInfo[];
  constraints: ConstraintInfo[];
  indexes: IndexInfo[];
}

interface ColumnInfo {
  name: string;
  dataType: string;
  nullable: boolean;
  default: string | null;
}

interface ConstraintInfo {
  name: string;
  type: string;
  definition: string;
}

interface IndexInfo {
  name: string;
  definition: string;
}

// --- GetSchemaInfo Tool ---
const GetSchemaInfoInputSchema = z.object({
  connectionString: z.string().optional(),
  tableName: z.string().optional().describe("Optional table name to get detailed schema for"),
});
type GetSchemaInfoInput = z.infer<typeof GetSchemaInfoInputSchema>;

async function executeGetSchemaInfo(
  input: GetSchemaInfoInput,
  getConnectionString: GetConnectionStringFn
): Promise<TableInfo | string[]> { // Return type depends on whether tableName is provided
  const resolvedConnectionString = getConnectionString(input.connectionString);
  const db = DatabaseConnection.getInstance();
  const { tableName } = input;
  
  try {
    await db.connect(resolvedConnectionString);
    
    if (tableName) {
      return await getTableInfo(db, tableName);
    }
    
    const tables = await db.query<{ table_name: string }>(
      `SELECT table_name 
       FROM information_schema.tables 
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE' -- Ensure only base tables
       ORDER BY table_name`
    );
    return tables.map(t => t.table_name);

  } catch (error) {
    throw new McpError(ErrorCode.InternalError, `Failed to get schema information: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    await db.disconnect();
  }
}

export const getSchemaInfoTool: PostgresTool = {
  name: 'pg_get_schema_info',
  description: 'Get schema information for a database or specific table',
  inputSchema: GetSchemaInfoInputSchema,
  async execute(params: unknown, getConnectionString: GetConnectionStringFn): Promise<ToolOutput> {
    const validationResult = GetSchemaInfoInputSchema.safeParse(params);
    if (!validationResult.success) {
      return { content: [{ type: 'text', text: `Invalid input: ${validationResult.error.format()}` }], isError: true };
    }
    try {
      const result = await executeGetSchemaInfo(validationResult.data, getConnectionString);
      const message = validationResult.data.tableName 
        ? `Schema information for table ${validationResult.data.tableName}` 
        : 'List of tables in database';
      return { content: [{ type: 'text', text: message }, { type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      const errorMessage = error instanceof McpError ? error.message : (error instanceof Error ? error.message : String(error));
      return { content: [{ type: 'text', text: `Error getting schema info: ${errorMessage}` }], isError: true };
    }
  }
};

// --- CreateTable Tool ---
const CreateTableColumnSchema = z.object({
  name: z.string(),
  type: z.string().describe("PostgreSQL data type"),
  nullable: z.boolean().optional(),
  default: z.string().optional().describe("Default value expression"),
  // primaryKey: z.boolean().optional(), // Consider adding PK constraint separately or via constraint tools
});

const CreateTableInputSchema = z.object({
  connectionString: z.string().optional(),
  tableName: z.string(),
  columns: z.array(CreateTableColumnSchema).min(1),
  // primaryKeyColumns: z.array(z.string()).optional(), // Alternative for PKs
});
type CreateTableInput = z.infer<typeof CreateTableInputSchema>;

async function executeCreateTable(
  input: CreateTableInput,
  getConnectionString: GetConnectionStringFn
): Promise<{ tableName: string; columns: z.infer<typeof CreateTableColumnSchema>[] }> {
  const resolvedConnectionString = getConnectionString(input.connectionString);
  const db = DatabaseConnection.getInstance();
  const { tableName, columns } = input;

  try {
    await db.connect(resolvedConnectionString);
    
    const columnDefs = columns.map(col => {
      let def = `"${col.name}" ${col.type}`;
      if (col.nullable === false) def += ' NOT NULL';
      if (col.default !== undefined) def += ` DEFAULT ${col.default}`;
      // if (col.primaryKey) def += ' PRIMARY KEY'; // If using column-level PK
      return def;
    }).join(', ');
    
    // const primaryKeyDef = input.primaryKeyColumns && input.primaryKeyColumns.length > 0 
    //  ? `, PRIMARY KEY (${input.primaryKeyColumns.map(pk => `"${pk}"`).join(', ')})` 
    //  : '';

    // const createTableSQL = `CREATE TABLE IF NOT EXISTS "${tableName}" (${columnDefs}${primaryKeyDef})`;
    const createTableSQL = `CREATE TABLE IF NOT EXISTS "${tableName}" (${columnDefs})`;
    
    await db.query(createTableSQL);
    
    return { tableName, columns };
  } catch (error) {
    throw new McpError(ErrorCode.InternalError, `Failed to create table: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    await db.disconnect();
  }
}

export const createTableTool: PostgresTool = {
  name: 'pg_create_table',
  description: 'Create a new table in the database',
  inputSchema: CreateTableInputSchema,
  async execute(params: unknown, getConnectionString: GetConnectionStringFn): Promise<ToolOutput> {
    const validationResult = CreateTableInputSchema.safeParse(params);
    if (!validationResult.success) {
      return { content: [{ type: 'text', text: `Invalid input: ${validationResult.error.format()}` }], isError: true };
    }
    try {
      const result = await executeCreateTable(validationResult.data, getConnectionString);
      return { content: [{ type: 'text', text: `Table ${result.tableName} created successfully (if not exists).` }, { type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      const errorMessage = error instanceof McpError ? error.message : (error instanceof Error ? error.message : String(error));
      return { content: [{ type: 'text', text: `Error creating table: ${errorMessage}` }], isError: true };
    }
  }
};

// --- AlterTable Tool ---
const AlterTableOperationSchema = z.object({
  type: z.enum(['add', 'alter', 'drop']),
  columnName: z.string(),
  dataType: z.string().optional().describe("PostgreSQL data type (for add/alter)"),
  nullable: z.boolean().optional().describe("Whether the column can be NULL (for add/alter)"),
  default: z.string().optional().describe("Default value expression (for add/alter)"),
});

const AlterTableInputSchema = z.object({
  connectionString: z.string().optional(),
  tableName: z.string(),
  operations: z.array(AlterTableOperationSchema).min(1),
});
type AlterTableInput = z.infer<typeof AlterTableInputSchema>;

async function executeAlterTable(
  input: AlterTableInput,
  getConnectionString: GetConnectionStringFn
): Promise<{ tableName: string; operations: z.infer<typeof AlterTableOperationSchema>[] }> {
  const resolvedConnectionString = getConnectionString(input.connectionString);
  const db = DatabaseConnection.getInstance();
  const { tableName, operations } = input;

  try {
    await db.connect(resolvedConnectionString);
    
    await db.transaction(async (client: PoolClient) => {
      for (const op of operations) {
        let sql = '';
        const colNameQuoted = `"${op.columnName}"`;
        
        switch (op.type) {
          case 'add':
            if (!op.dataType) throw new Error('Data type is required for ADD operation');
            sql = `ALTER TABLE "${tableName}" ADD COLUMN ${colNameQuoted} ${op.dataType}`;
            if (op.nullable === false) sql += ' NOT NULL';
            if (op.default !== undefined) sql += ` DEFAULT ${op.default}`;
            break;
            
          case 'alter': {
            // PostgreSQL requires separate ALTER COLUMN clauses for different alterations
            // This simplified version might need to be split into multiple statements for complex alters
            // Or use a more specific action like 'set data type', 'set default', 'set not null' etc.
            sql = `ALTER TABLE "${tableName}" ALTER COLUMN ${colNameQuoted}`;
            const alterActions: string[] = [];
            if (op.dataType) alterActions.push(`TYPE ${op.dataType}`); // May need USING clause for some type changes
            if (op.nullable !== undefined) {
              alterActions.push(op.nullable ? 'DROP NOT NULL' : 'SET NOT NULL');
            }
            if (op.default !== undefined) {
              alterActions.push(op.default === null || op.default === '' 
                ? 'DROP DEFAULT' 
                : `SET DEFAULT ${op.default}`);
            }
            if (alterActions.length === 0) throw new Error('No alter operation specified for column.');
            // This only works if all actions can be combined in one ALTER COLUMN. Often not true.
            // A robust solution would execute separate ALTER TABLE ... ALTER COLUMN statements for each action.
            // For now, we will assume simple cases or require user to send multiple ops for one column.
            sql += ` ${alterActions.join(' ')}`;
            if (alterActions.length > 1) {
              console.warn("[MCP Warning] Multiple alterations on a single column in one 'alter' operation might not be supported directly by PostgreSQL. Consider separate operations if it fails.");
              // Example of how to split: Iterate alterActions and make separate SQL calls.
              // For simplicity, current code attempts to combine.
            }
            break;
          }
            
          case 'drop':
            sql = `ALTER TABLE "${tableName}" DROP COLUMN ${colNameQuoted}`;
            break;
        }
        if (sql) { // Ensure sql is not empty, e.g. if alterActions was empty
            await client.query(sql);
        }
      }
    });
    
    return { tableName, operations };
  } catch (error) {
    throw new McpError(ErrorCode.InternalError, `Failed to alter table: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    await db.disconnect();
  }
}

export const alterTableTool: PostgresTool = {
  name: 'pg_alter_table',
  description: 'Alter an existing table (add/modify/drop columns)',
  inputSchema: AlterTableInputSchema,
  async execute(params: unknown, getConnectionString: GetConnectionStringFn): Promise<ToolOutput> {
    const validationResult = AlterTableInputSchema.safeParse(params);
    if (!validationResult.success) {
      return { content: [{ type: 'text', text: `Invalid input: ${validationResult.error.format()}` }], isError: true };
    }
    try {
      const result = await executeAlterTable(validationResult.data, getConnectionString);
      return { content: [{ type: 'text', text: `Table ${result.tableName} altered successfully.` }, { type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      const errorMessage = error instanceof McpError ? error.message : (error instanceof Error ? error.message : String(error));
      return { content: [{ type: 'text', text: `Error altering table: ${errorMessage}` }], isError: true };
    }
  }
};

/**
 * Get detailed information about a specific table
 */
async function getTableInfo(db: DatabaseConnection, tableName: string): Promise<TableInfo> {
  // Get column information
  const columns = await db.query<{
    column_name: string;
    data_type: string;
    is_nullable: string;
    column_default: string | null;
  }>(
    `SELECT column_name, data_type, is_nullable, column_default
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
     ORDER BY ordinal_position`,
    [tableName]
  );
  
  // Get constraint information
  const constraints = await db.query<{
    constraint_name: string;
    constraint_type: string;
    definition: string;
  }>(
    `SELECT
       c.conname as constraint_name,
       CASE
         WHEN c.contype = 'p' THEN 'PRIMARY KEY'
         WHEN c.contype = 'f' THEN 'FOREIGN KEY'
         WHEN c.contype = 'u' THEN 'UNIQUE'
         WHEN c.contype = 'c' THEN 'CHECK'
         ELSE c.contype::text
       END as constraint_type,
       pg_get_constraintdef(c.oid) as definition
     FROM pg_constraint c
     JOIN pg_namespace n ON n.oid = c.connamespace
     JOIN pg_class cl ON cl.oid = c.conrelid
     WHERE n.nspname = 'public' AND cl.relname = $1`,
    [tableName]
  );
  
  // Get index information
  const indexes = await db.query<{
    indexname: string;
    indexdef: string;
  }>(
    `SELECT
       i.relname as indexname,
       pg_get_indexdef(i.oid) as indexdef
     FROM pg_index x
     JOIN pg_class c ON c.oid = x.indrelid
     JOIN pg_class i ON i.oid = x.indexrelid
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE c.relkind = 'r' AND n.nspname = 'public' AND c.relname = $1`,
    [tableName]
  );
  
  return {
    tableName,
    columns: columns.map(col => ({
      name: col.column_name,
      dataType: col.data_type,
      nullable: col.is_nullable === 'YES',
      default: col.column_default
    })),
    constraints: constraints.map(con => ({
      name: con.constraint_name,
      type: con.constraint_type,
      definition: con.definition
    })),
    indexes: indexes.map(idx => ({
      name: idx.indexname,
      definition: idx.indexdef
    }))
  };
} 