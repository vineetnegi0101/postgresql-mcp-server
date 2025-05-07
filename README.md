# PostgreSQL MCP Server
[![smithery badge](https://smithery.ai/badge/@HenkDz/postgresql-mcp-server)](https://smithery.ai/server/@HenkDz/postgresql-mcp-server)

A Model Context Protocol (MCP) server that provides PostgreSQL database management capabilities. This server assists with analyzing existing PostgreSQL setups, providing implementation guidance, debugging database issues, managing schemas, migrating data, and monitoring database performance.

## Version 0.2.0

## Features

The server provides the following tools:

### 1. Database Analysis and Setup

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

### 2. Schema Management

#### 2.1. Get Schema Information (`get_schema_info`)
Get detailed schema information for a database or specific table:
- List of tables in a database
- Column definitions
- Constraints (primary keys, foreign keys, etc.)
- Indexes

```typescript
// Example usage
{
  "tableName": "users" // Optional: specific table to get info for
}
```

#### 2.2. Create Table (`create_table`)
Create a new table with specified columns:
- Define column names and types
- Set nullable constraints
- Set default values

```typescript
// Example usage
{
  "tableName": "users", // Required
  "columns": [ // Required
    { "name": "id", "type": "SERIAL", "nullable": false },
    { "name": "username", "type": "VARCHAR(100)", "nullable": false },
    { "name": "email", "type": "VARCHAR(255)", "nullable": false },
    { "name": "created_at", "type": "TIMESTAMP", "default": "NOW()" }
  ]
}
```

#### 2.3. Alter Table (`alter_table`)
Modify existing tables:
- Add new columns
- Modify column types or constraints
- Drop columns

```typescript
// Example usage
{
  "tableName": "users", // Required
  "operations": [ // Required
    { "type": "add", "columnName": "last_login", "dataType": "TIMESTAMP" },
    { "type": "alter", "columnName": "email", "nullable": false },
    { "type": "drop", "columnName": "temporary_field" }
  ]
}
```

#### 2.4. Get Enums (`get_enums`)
Get information about PostgreSQL ENUM types.

```typescript
// Example usage
{
  "schema": "public", // Optional
  "enumName": "user_status" // Optional
}
```

#### 2.5. Create Enum (`create_enum`)
Create a new ENUM type in the database.

```typescript
// Example usage
{
  "enumName": "order_status", // Required
  "values": ["pending", "processing", "shipped", "delivered"], // Required
  "schema": "public", // Optional
  "ifNotExists": true // Optional
}
```

### 3. Data Migration

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

### 4. Monitoring

#### 4.1. Monitor Database (`monitor_database`)
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

### 5. Functions

#### 5.1. Get Functions (`get_functions`)
Get information about PostgreSQL functions.

```typescript
// Example usage
{
  "functionName": "calculate_total", // Optional
  "schema": "public" // Optional
}
```

#### 5.2. Create Function (`create_function`)
Create or replace a PostgreSQL function.

```typescript
// Example usage
{
  "functionName": "get_user_count", // Required
  "parameters": "", // Required (empty if no params)
  "returnType": "integer", // Required
  "functionBody": "SELECT count(*) FROM users;", // Required
  "language": "sql", // Optional
  "volatility": "STABLE", // Optional
  "schema": "public", // Optional
  "security": "INVOKER", // Optional
  "replace": true // Optional
}
```

#### 5.3. Drop Function (`drop_function`)
Drop a PostgreSQL function.

```typescript
// Example usage
{
  "functionName": "old_function", // Required
  "parameters": "integer", // Optional: required for overloaded functions
  "schema": "public", // Optional
  "ifExists": true, // Optional
  "cascade": false // Optional
}
```

### 6. Row-Level Security (RLS)

#### 6.1. Enable RLS (`enable_rls`)
Enable Row-Level Security on a table.

```typescript
// Example usage
{
  "tableName": "sensitive_data", // Required
  "schema": "secure" // Optional
}
```

#### 6.2. Disable RLS (`disable_rls`)
Disable Row-Level Security on a table.

```typescript
// Example usage
{
  "tableName": "sensitive_data", // Required
  "schema": "secure" // Optional
}
```

#### 6.3. Create RLS Policy (`create_rls_policy`)
Create a Row-Level Security policy.

```typescript
// Example usage
{
  "tableName": "documents", // Required
  "policyName": "user_can_see_own_docs", // Required
  "using": "owner_id = current_user_id()", // Required
  "check": "owner_id = current_user_id()", // Optional
  "schema": "public", // Optional
  "command": "SELECT", // Optional
  "role": "app_user", // Optional
  "replace": false // Optional
}
```

#### 6.4. Edit RLS Policy (`edit_rls_policy`)
Edit an existing Row-Level Security policy.

```typescript
// Example usage
{
  "tableName": "documents", // Required
  "policyName": "user_can_see_own_docs", // Required
  "schema": "public", // Optional
  "roles": ["app_user", "admin_user"], // Optional: New roles (empty or omit to keep existing/use default)
  "using": "owner_id = current_user_id() OR is_admin(current_user_id())", // Optional: New USING expression
  "check": "owner_id = current_user_id()" // Optional: New WITH CHECK expression
}
```

#### 6.5. Drop RLS Policy (`drop_rls_policy`)
Drop a Row-Level Security policy.

```typescript
// Example usage
{
  "tableName": "documents", // Required
  "policyName": "old_policy", // Required
  "schema": "public", // Optional
  "ifExists": true // Optional
}
```

#### 6.6. Get RLS Policies (`get_rls_policies`)
Get Row-Level Security policies.

```typescript
// Example usage
{
  "tableName": "documents", // Optional
  "schema": "public" // Optional
}
```

### 7. Triggers

#### 7.1. Get Triggers (`get_triggers`)
Get information about PostgreSQL triggers.

```typescript
// Example usage
{
  "tableName": "audit_log", // Optional
  "schema": "public" // Optional
}
```

#### 7.2. Create Trigger (`create_trigger`)
Create a PostgreSQL trigger.

```typescript
// Example usage
{
  "triggerName": "log_user_update", // Required
  "tableName": "users", // Required
  "functionName": "audit_user_change", // Required
  "schema": "public", // Optional
  "timing": "AFTER", // Optional
  "events": ["UPDATE"], // Optional
  "when": "OLD.email IS DISTINCT FROM NEW.email", // Optional
  "forEach": "ROW", // Optional
  "replace": false // Optional
}
```

#### 7.3. Drop Trigger (`drop_trigger`)
Drop a PostgreSQL trigger.

```typescript
// Example usage
{
  "triggerName": "old_trigger", // Required
  "tableName": "users", // Required
  "schema": "public", // Optional
  "ifExists": true, // Optional
  "cascade": false // Optional
}
```

#### 7.4. Set Trigger State (`set_trigger_state`)
Enable or disable a PostgreSQL trigger.

```typescript
// Example usage
{
  "triggerName": "log_user_update", // Required
  "tableName": "users", // Required
  "enable": false, // Required: true to enable, false to disable
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
