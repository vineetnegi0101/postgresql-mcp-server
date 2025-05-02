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
  "connectionString": "postgresql://user:password@localhost:5432/dbname", // Optional if env var set
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
  "connectionString": "postgresql://user:password@localhost:5432/dbname", // Required
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
  "connectionString": "postgresql://user:password@localhost:5432/dbname", // Required
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
  "connectionString": "postgresql://user:password@localhost:5432/dbname", // Required
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
  "connectionString": "postgresql://user:password@localhost:5432/dbname", // Required
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
  "connectionString": "postgresql://user:password@localhost:5432/dbname", // Required
  "schema": "public", // Optional
  "enumName": "user_status" // Optional
}
```

#### 2.5. Create Enum (`create_enum`)
Create a new ENUM type in the database.

```typescript
// Example usage
{
  "connectionString": "postgresql://user:password@localhost:5432/dbname", // Required
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
  "connectionString": "postgresql://user:password@localhost:5432/dbname", // Required
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
  "connectionString": "postgresql://user:password@localhost:5432/dbname", // Required
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
  "connectionString": "postgresql://user:password@localhost:5432/dbname", // Required
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
  "connectionString": "postgresql://user:password@localhost:5432/dbname", // Required
  "functionName": "calculate_total", // Optional
  "schema": "public" // Optional
}
```

#### 5.2. Create Function (`create_function`)
Create or replace a PostgreSQL function.

```typescript
// Example usage
{
  "connectionString": "postgresql://user:password@localhost:5432/dbname", // Required
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
  "connectionString": "postgresql://user:password@localhost:5432/dbname", // Required
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
  "connectionString": "postgresql://user:password@localhost:5432/dbname", // Required
  "tableName": "sensitive_data", // Required
  "schema": "secure" // Optional
}
```

#### 6.2. Disable RLS (`disable_rls`)
Disable Row-Level Security on a table.

```typescript
// Example usage
{
  "connectionString": "postgresql://user:password@localhost:5432/dbname", // Required
  "tableName": "sensitive_data", // Required
  "schema": "secure" // Optional
}
```

#### 6.3. Create RLS Policy (`create_rls_policy`)
Create a Row-Level Security policy.

```typescript
// Example usage
{
  "connectionString": "postgresql://user:password@localhost:5432/dbname", // Required
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
  "connectionString": "postgresql://user:password@localhost:5432/dbname", // Required
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
  "connectionString": "postgresql://user:password@localhost:5432/dbname", // Required
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
  "connectionString": "postgresql://user:password@localhost:5432/dbname", // Required
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
  "connectionString": "postgresql://user:password@localhost:5432/dbname", // Required
  "tableName": "audit_log", // Optional
  "schema": "public" // Optional
}
```

#### 7.2. Create Trigger (`create_trigger`)
Create a PostgreSQL trigger.

```typescript
// Example usage
{
  "connectionString": "postgresql://user:password@localhost:5432/dbname", // Required
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
  "connectionString": "postgresql://user:password@localhost:5432/dbname", // Required
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
  "connectionString": "postgresql://user:password@localhost:5432/dbname", // Required
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
4. Add to MCP settings file:
   ```json
   {
     "mcpServers": {
       "postgresql-mcp": {
         "command": "node",
         "args": ["/path/to/postgresql-mcp-server/build/index.js"],
         "disabled": false,
         "alwaysAllow": [],
         "env": {
           "POSTGRES_CONNECTION_STRING": "postgresql://username:password@server:port/dbname"
         }
       }
     }
   }
   ```
   *Note: Providing the `POSTGRES_CONNECTION_STRING` environment variable here makes the `connectionString` argument optional for most tools.*

## Development

- `npm run dev` - Start development server with hot reload
- `npm run lint` - Run ESLint
- `npm test` - Run tests (if configured)

## Security Considerations

1. Connection Security
   - Uses connection pooling via `@vercel/postgres` and `pg`.
   - Validates connection strings.
   - Supports SSL/TLS connections (configure via connection string).

2. Query Safety
   - Executes predefined operations; avoids arbitrary SQL execution where possible.
   - Uses parameterized queries where applicable to prevent SQL injection.
   - Logs operations for auditing.

3. Authentication
   - Relies on PostgreSQL's authentication mechanisms via the connection string.
   - Securely manage your database credentials. Do not hardcode them in client requests; use the environment variable setup during installation.

## Best Practices

1. Always use secure connection strings with proper credentials, preferably configured via the `POSTGRES_CONNECTION_STRING` environment variable.
2. Follow production security recommendations for sensitive environments.
3. Regularly monitor and analyze database performance using the `monitor_database` tool.
4. Keep PostgreSQL version up to date.
5. Implement proper backup strategies independently.
6. Use connection pooling for better resource management (handled internally).
7. Implement proper error handling and logging.
8. Regular security audits and updates.

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
