# PostgreSQL MCP Server
[![smithery badge](https://smithery.ai/badge/@HenkDz/postgresql-mcp-server)](https://smithery.ai/server/@HenkDz/postgresql-mcp-server)

A Model Context Protocol (MCP) server that provides PostgreSQL database management capabilities. This server assists with analyzing existing PostgreSQL setups, providing implementation guidance, debugging database issues, managing schemas, migrating data, and monitoring database performance.

**Key Update (Version 0.2.0):** This version introduces a significantly streamlined toolset. Many individual tools have been consolidated into powerful meta-tools, each supporting multiple operations. This reduces the total number of tools from 46 to 14, making it easier for AI clients like Cursor to discover and utilize the server's capabilities effectively.

## Version 0.2.0

## Features

The server provides a set of consolidated meta-tools and specialized tools:

### 1. Specialized Tools: Database Analysis, Setup & Debugging

These tools provide focused capabilities for specific, complex tasks.

#### 1.1. Analyze Database (`analyze_database`)
Analyzes PostgreSQL database configuration and performance metrics:
- Configuration analysis
- Performance metrics
- Security assessment
- Recommendations for optimization

```typescript
// Example usage
{
  "analysisType": "performance" // Optional: "configuration" | "performance" | "security"
}
```

#### 1.2. Get Setup Instructions (`get_setup_instructions`)
Provides step-by-step PostgreSQL installation and configuration guidance:
- Platform-specific installation steps
- Configuration recommendations
- Security best practices
- Post-installation tasks

```typescript
// Example usage
{
  "platform": "linux", // Required: "linux" | "macos" | "windows"
  "version": "15", // Optional: PostgreSQL version
  "useCase": "production" // Optional: "development" | "production"
}
```

#### 1.3. Debug Database (`debug_database`)
Debug common PostgreSQL issues:
- Connection problems
- Performance bottlenecks
- Lock conflicts
- Replication status

```typescript
// Example usage
{
  "issue": "performance", // Required: "connection" | "performance" | "locks" | "replication"
  "logLevel": "debug" // Optional: "info" | "debug" | "trace"
}
```

### 2. Consolidated Tool: Schema Management (`pg_manage_schema`)
Manages PostgreSQL schema objects including tables and ENUM types. Supports multiple operations related to schema inspection and modification.

- **Supported Operations**: `get_info`, `create_table`, `alter_table`, `get_enums`, `create_enum`
- **Key Features**: 
    - Get detailed schema information for databases or specific tables (columns, constraints, indexes).
    - Create new tables with specified columns, types, and constraints.
    - Alter existing tables by adding, modifying, or dropping columns.
    - List existing ENUM types or create new ENUM types.

```typescript
// Example: Creating a new table using the 'create_table' operation
{
  "operation": "create_table", // Required: e.g., "get_info", "create_table", "alter_table", "get_enums", "create_enum"
  "tableName": "products", 
  "columns": [
    { "name": "id", "type": "SERIAL PRIMARY KEY" },
    { "name": "name", "type": "VARCHAR(255) NOT NULL" },
    { "name": "price", "type": "DECIMAL(10, 2)" },
    { "name": "category_id", "type": "INTEGER" }
  ],
  "schema": "public" // Optional
}

// Example: Getting information about an ENUM using the 'get_enums' operation
{
  "operation": "get_enums",
  "enumName": "order_status",
  "schema": "public" // Optional
}
```

### 3. Specialized Tools: Data Migration
These tools handle specific data import, export, and copying tasks.

#### 3.1. Export Table Data (`export_table_data`)
Export table data to JSON or CSV format:
- Filter data with WHERE clause
- Limit number of rows
- Choose output format

```typescript
// Example usage
{
  "tableName": "users", // Required
  "outputPath": "./exports/users.json", // Required
  "where": "created_at > '2023-01-01'", // Optional
  "limit": 1000, // Optional
  "format": "json" // Optional: "json" | "csv"
}
```

#### 3.2. Import Table Data (`import_table_data`)
Import data from JSON or CSV files:
- Optionally truncate table before import
- Support for different formats
- Custom CSV delimiters

```typescript
// Example usage
{
  "tableName": "users", // Required
  "inputPath": "./imports/users.json", // Required
  "truncateFirst": false, // Optional
  "format": "json", // Optional: "json" | "csv"
  "delimiter": "," // Optional: for CSV files
}
```

#### 3.3. Copy Between Databases (`copy_between_databases`)
Copy data between two PostgreSQL databases:
- Filter data with WHERE clause
- Optionally truncate target table

```typescript
// Example usage
{
  "sourceConnectionString": "postgresql://user:password@localhost:5432/source_db", // Required
  "targetConnectionString": "postgresql://user:password@localhost:5432/target_db", // Required
  "tableName": "users", // Required
  "where": "active = true", // Optional
  "truncateTarget": false // Optional
}
```

### 4. Specialized Tool: Database Monitoring (`monitor_database`)
Real-time monitoring of PostgreSQL database:
- Database metrics (connections, cache hit ratio, etc.)
- Table metrics (size, row counts, dead tuples)
- Active query information
- Lock information
- Replication status
- Configurable alerts

```typescript
// Example usage
{
  "includeTables": true, // Optional
  "includeQueries": true, // Optional
  "includeLocks": true, // Optional
  "includeReplication": false, // Optional
  "alertThresholds": { // Optional
    "connectionPercentage": 80,
    "longRunningQuerySeconds": 30,
    "cacheHitRatio": 0.95,
    "deadTuplesPercentage": 10,
    "vacuumAge": 7
  }
}
```

### 5. Consolidated Tool: Functions Management (`pg_manage_functions`)
Manages PostgreSQL functions, allowing for their retrieval, creation, and deletion.

- **Supported Operations**: `get`, `create`, `drop`
- **Key Features**:
    - Get information about specific functions or list all functions in a schema.
    - Create new functions or replace existing ones with specified parameters, return type, body, and language.
    - Drop existing functions, with an option for cascading.

```typescript
// Example: Creating a new SQL function using the 'create' operation
{
  "operation": "create", // Required: "get" | "create" | "drop"
  "functionName": "get_active_users_count",
  "parameters": "", // E.g., "p_customer_id INTEGER, p_date_from DATE"
  "returnType": "INTEGER",
  "functionBody": "SELECT COUNT(*) FROM users WHERE status = 'active';",
  "language": "sql", // Optional, defaults to "plpgsql"
  "replace": true, // Optional, defaults to false
  "schema": "public" // Optional
}

// Example: Getting information about a function using the 'get' operation
{
  "operation": "get",
  "functionName": "calculate_total",
  "schema": "public" // Optional
}
```

### 6. Consolidated Tool: Row-Level Security (RLS) Management (`pg_manage_rls`)
Manages Row-Level Security (RLS) settings and policies for tables.

- **Supported Operations**: `enable`, `disable`, `create_policy`, `edit_policy`, `drop_policy`, `get_policies`
- **Key Features**:
    - Enable or disable RLS for a specific table.
    - Create new RLS policies with `USING` and `WITH CHECK` expressions for different commands (SELECT, INSERT, UPDATE, DELETE).
    - Modify existing RLS policies.
    - Drop RLS policies from a table.
    - List all RLS policies for a table or schema.

```typescript
// Example: Creating a new RLS policy using the 'create_policy' operation
{
  "operation": "create_policy", // Required: e.g., "enable", "create_policy", "get_policies"
  "tableName": "documents",
  "policyName": "user_can_see_own_documents",
  "command": "SELECT", // Optional, defaults to "ALL"
  "using": "owner_user_id = current_setting('app.current_user_id')::INTEGER",
  "role": "app_user", // Optional
  "schema": "public" // Optional
}

// Example: Enabling RLS on a table using the 'enable' operation
{
  "operation": "enable",
  "tableName": "sensitive_data",
  "schema": "secure" // Optional
}
```

### 7. Consolidated Tool: User and Permissions Management (`pg_manage_users`)
Manages PostgreSQL users (roles) and their permissions.

- **Supported Operations**: `create`, `drop`, `alter`, `grant`, `revoke`, `get_permissions`, `list`
- **Key Features**:
    - Create new users with various attributes (login, password, connection limit, etc.).
    - Drop existing users, with an option for cascading to remove owned objects.
    - Alter user attributes like password, connection limits, or superuser status.
    - Grant or revoke specific permissions (SELECT, INSERT, UPDATE, DELETE, etc.) on database objects (tables, schemas, etc.) to users.
    - List all users or get detailed permissions for a specific user on a target object.

```typescript
// Example: Creating a new user with login privileges using the 'create' operation
{
  "operation": "create", // Required: e.g., "create", "grant", "list"
  "username": "new_app_user",
  "password": "securePassword123!",
  "login": true,
  "connectionLimit": 10 // Optional
}

// Example: Granting SELECT permission on a table to a user using the 'grant' operation
{
  "operation": "grant",
  "username": "readonly_user",
  "permissions": ["SELECT"],
  "target": "reports_table",
  "targetType": "table",
  "schema": "analytics" // Optional
}
```

### 8. Consolidated Tool: Triggers Management (`pg_manage_triggers`)
Manages database triggers, allowing for their retrieval, creation, deletion, and state modification.

- **Supported Operations**: `get`, `create`, `drop`, `set_state`
- **Key Features**:
    - Get information about specific triggers or list all triggers on a table.
    - Create new triggers with specified timing (BEFORE, AFTER, INSTEAD OF), events (INSERT, UPDATE, DELETE, TRUNCATE), and a function to execute.
    - Drop existing triggers.
    - Enable or disable specific triggers on a table.

```typescript
// Example: Creating a trigger that updates 'updated_at' timestamp using the 'create' operation
{
  "operation": "create", // Required: "get" | "create" | "drop" | "set_state"
  "triggerName": "update_users_updated_at",
  "tableName": "users",
  "functionName": "update_updated_at_column", // Assumes this function exists
  "timing": "BEFORE", // Optional, defaults to "AFTER"
  "events": ["UPDATE"], // Optional, defaults to ["INSERT"]
  "forEach": "ROW", // Optional, defaults to "ROW"
  "schema": "public" // Optional
}

// Example: Disabling a trigger using the 'set_state' operation
{
  "operation": "set_state",
  "triggerName": "audit_log_trigger",
  "tableName": "sensitive_actions",
  "enable": false, // Required for "set_state"
  "schema": "auditing" // Optional
}
```

### 9. Consolidated Tool: Index Management (`pg_manage_indexes`)
Manages database indexes, including their creation, retrieval, deletion, reindexing, and usage analysis.

- **Supported Operations**: `get`, `create`, `drop`, `reindex`, `analyze_usage`
- **Key Features**:
    - Get information about indexes, including their definition, size, and usage statistics.
    - Create new indexes (B-tree, Hash, GiST, etc.) on specified table columns, with options for unique, concurrent, and partial indexes.
    - Drop existing indexes, with an option for concurrent removal.
    - Reindex tables, schemas, or entire databases to rebuild indexes.
    - Analyze index usage to find unused, duplicate, or inefficient indexes.

```typescript
// Example: Creating a B-tree index on the email column of the users table using the 'create' operation
{
  "operation": "create", // Required: "get" | "create" | "drop" | "reindex" | "analyze_usage"
  "indexName": "idx_users_email",
  "tableName": "users",
  "columns": ["email"],
  "method": "btree", // Optional, defaults to "btree"
  "unique": true, // Optional, defaults to false
  "concurrent": false, // Optional, defaults to false
  "schema": "public" // Optional
}

// Example: Analyzing index usage in a schema using the 'analyze_usage' operation
{
  "operation": "analyze_usage",
  "schema": "public", // Optional, defaults to "public"
  "showUnused": true, // Optional
  "showDuplicates": true // Optional
}
```

### 10. Consolidated Tool: Query Performance & Analysis (`pg_manage_query`)
Provides tools for analyzing query performance, understanding execution plans, and managing `pg_stat_statements` statistics.

- **Supported Operations**: `explain`, `get_slow_queries`, `get_stats`, `reset_stats`
- **Key Features**:
    - Generate `EXPLAIN` or `EXPLAIN ANALYZE` plans for queries in various formats (JSON, text, XML, YAML).
    - Identify slow-running queries using the `pg_stat_statements` extension, with options to filter by duration and sort results.
    - Retrieve query execution statistics from `pg_stat_statements`, including call counts, timings, and cache hit ratios.
    - Reset `pg_stat_statements` statistics for all queries or a specific query ID.

```typescript
// Example: Explaining a query with EXPLAIN ANALYZE using the 'explain' operation
{
  "operation": "explain", // Required: "explain" | "get_slow_queries" | "get_stats" | "reset_stats"
  "query": "SELECT * FROM orders WHERE order_date > '2023-01-01' AND status = 'shipped';",
  "analyze": true, // Optional, defaults to false
  "buffers": true, // Optional, defaults to false
  "format": "json" // Optional, defaults to "json"
}

// Example: Getting top 5 slowest queries using the 'get_slow_queries' operation
{
  "operation": "get_slow_queries",
  "limit": 5, // Optional, defaults to 10
  "orderBy": "mean_time", // Optional, defaults to "mean_time"
  "minDuration": 100 // Optional: minimum average duration in milliseconds
}
```

### 11. Consolidated Tool: Constraint Management (`pg_manage_constraints`)
Manages database constraints such as Primary Keys, Foreign Keys, Unique constraints, and Check constraints.

- **Supported Operations**: `get`, `create_fk`, `drop_fk`, `create`, `drop`
- **Key Features**:
    - List existing constraints on a table or schema, filterable by constraint type.
    - Create new Foreign Key constraints between tables.
    - Drop existing Foreign Key constraints.
    - Create new Primary Key, Unique, or Check constraints on tables.
    - Drop existing Primary Key, Unique, or Check constraints.

```typescript
// Example: Creating a foreign key constraint using the 'create_fk' operation
{
  "operation": "create_fk", // Required: e.g., "get", "create_fk", "drop"
  "constraintName": "fk_orders_customer_id",
  "tableName": "orders",
  "columnNames": ["customer_id"],
  "referencedTable": "customers",
  "referencedColumns": ["id"],
  "onDelete": "SET NULL", // Optional
  "schema": "public" // Optional
}

// Example: Adding a UNIQUE constraint using the 'create' operation
{
  "operation": "create",
  "constraintName": "uk_products_sku",
  "tableName": "products",
  "constraintTypeCreate": "unique", // Required for 'create' op: "unique" | "check" | "primary_key"
  "columnNames": ["sku"], // Required for unique/primary_key
  "schema": "public" // Optional
}
```

## Prerequisites

- Node.js >= 18.0.0
- PostgreSQL server (for target database operations)
- Network access to target PostgreSQL instances

## Installation

### Installing via Smithery

To install postgresql-mcp-server for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@HenkDz/postgresql-mcp-server):

```bash
npx -y @smithery/cli install @HenkDz/postgresql-mcp-server --client claude
```

### Manual Installation
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the server:
   ```bash
   npm run build
   ```
4. Add to MCP settings file (e.g., in your IDE's settings or a global MCP configuration):

   There are a few ways to configure the connection string for the server, with the following order of precedence:
   1. **Tool-Specific Argument**: If a `connectionString` is provided directly in the arguments when calling a specific tool, that value will be used for that call.
   2. **CLI Argument**: You can provide a default connection string when starting the server using the `-cs` or `--connection-string` argument.
   3. **Environment Variable**: If neither of the above is provided, the server will look for a `POSTGRES_CONNECTION_STRING` environment variable.

   If no connection string is found through any of these methods, tools requiring a database connection will fail.

   **Example using CLI argument in MCP settings:**
   ```json
   {
     "mcpServers": {
       "postgresql-mcp": {
         "command": "node",
         "args": [
           "/path/to/postgresql-mcp-server/build/index.js",
           "--connection-string",
           "postgresql://username:password@server:port/dbname"
           // Optionally, add "--tools-config", "/path/to/your/mcp-tools.json"
         ],
         "disabled": false,
         "alwaysAllow": []
         // Note: 'env' block for POSTGRES_CONNECTION_STRING can still be used as a fallback
         // if --connection-string is not provided in args.
       }
     }
   }
   ```

   **Example using environment variable (if not using CLI arg):**
   ```json
   {
     "mcpServers": {
       "postgresql-mcp": {
         "command": "node",
         "args": [
           "/path/to/postgresql-mcp-server/build/index.js"
           // Optionally, add "--tools-config", "/path/to/your/mcp-tools.json"
         ],
         "disabled": false,
         "alwaysAllow": [],
         "env": {
           "POSTGRES_CONNECTION_STRING": "postgresql://username:password@server:port/dbname"
         }
       }
     }
   }
   ```
   *Using the `--connection-string` CLI argument or the `POSTGRES_CONNECTION_STRING` environment variable makes the `connectionString` argument optional for most tool calls.*

## Tool Configuration

The server supports filtering which tools are enabled via an external JSON configuration file.

- **CLI Option**: Use `-tc <path>` or `--tools-config <path>` to specify the path to your tools configuration file.
- **File Format**: The JSON file should contain an object with an `enabledTools` key, which holds an array of tool name strings.

  **Example `mcp-tools.json`:**
  ```json
  {
    "enabledTools": [
      "get_schema_info",
      "analyze_database",
      "export_table_data"
    ]
  }
  ```
- **Behavior**:
  - If the configuration file is provided and valid, only the listed tools will be enabled.
  - If the file is not provided, is invalid, or cannot be read, all tools will be enabled by default.
  - The server will log which tools are enabled based on this configuration.

## Development

- `npm run dev` - Start development server with hot reload
- `npm run lint` - Run ESLint
- `npm test` - Run tests (if configured)

## Security Considerations

1. Connection Security
   - The server determines the database connection string based on the following precedence:
     1.  `connectionString` provided directly in a tool's arguments.
     2.  `--connection-string` CLI argument used when starting the server.
     3.  `POSTGRES_CONNECTION_STRING` environment variable.
   - Ensure that connection strings (especially those with credentials) are managed securely.
   - Uses connection pooling via `pg` (previously `@vercel/postgres`).
   - Validates connection strings.
   - Supports SSL/TLS connections (configure via connection string).

2. Query Safety
   - Executes predefined operations; avoids arbitrary SQL execution where possible.
   - Uses parameterized queries where applicable to prevent SQL injection.
   - Logs operations for auditing.

3. Authentication
   - Relies on PostgreSQL's authentication mechanisms via the connection string.
   - Securely manage your database credentials. Do not hardcode them in client requests if avoidable; prefer using the `--connection-string` CLI option or the `POSTGRES_CONNECTION_STRING` environment variable when configuring the server.

## Best Practices

1. Configure the default database connection string securely using the `--connection-string` CLI option or the `POSTGRES_CONNECTION_STRING` environment variable.
2. If a tool needs to connect to a *different* database than the default, provide the `connectionString` directly in that tool's arguments.
3. Always use secure connection strings with proper credentials, preferably configured via the `POSTGRES_CONNECTION_STRING` environment variable.
4. Follow production security recommendations for sensitive environments.
5. Regularly monitor and analyze database performance using the `monitor_database` tool.
6. Keep PostgreSQL version up to date.
7. Implement proper backup strategies independently.
8. Use connection pooling for better resource management (handled internally).
9. Implement proper error handling and logging.
10. Regular security audits and updates.

## Error Handling

The server implements error handling for:
- Connection failures
- Query errors
- Invalid inputs
- Permission issues

Errors are returned in the standard MCP error format.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the AGPLv3 License - see LICENSE file for details.
