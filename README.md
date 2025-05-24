# PostgreSQL MCP Server
[![smithery badge](https://smithery.ai/badge/@HenkDz/postgresql-mcp-server)](https://smithery.ai/server/@HenkDz/postgresql-mcp-server)

A Model Context Protocol (MCP) server that provides comprehensive PostgreSQL database management capabilities for AI assistants.

## Quick Start

### Install via Smithery (Fast)
```bash
npx -y @smithery/cli install @HenkDz/postgresql-mcp-server --client claude
```

### Manual Installation (Host Locally)
```bash
git clone <repository-url>
cd postgresql-mcp-server
npm install
npm run build
```

Add to your MCP client configuration:
```json
{
  "mcpServers": {
    "postgresql-mcp": {
      "command": "node",
      "args": [
        "/path/to/postgresql-mcp-server/build/index.js",
        "--connection-string", "postgresql://user:password@host:port/database"
      ]
    }
  }
}
```

## What's Included

**14 powerful tools** (down from 46 in v0.1) organized into:

### 📊 **Consolidated Meta-Tools** (8 tools)
- **Schema Management** - Tables, columns, ENUMs, constraints
- **User & Permissions** - Create users, grant/revoke permissions  
- **Query Performance** - EXPLAIN plans, slow queries, statistics
- **Index Management** - Create, analyze, optimize indexes
- **Functions** - Create, modify, manage stored functions
- **Triggers** - Database trigger management
- **Constraints** - Foreign keys, checks, unique constraints
- **Row-Level Security** - RLS policies and management

### 🔧 **Specialized Tools** (6 tools)
- **Database Analysis** - Performance and configuration analysis
- **Setup Instructions** - Platform-specific PostgreSQL setup
- **Debug Database** - Troubleshoot connection, performance, locks
- **Data Export/Import** - JSON/CSV data migration
- **Copy Between Databases** - Cross-database data transfer  
- **Real-time Monitoring** - Live database metrics and alerts

## Example Usage

```typescript
// Analyze database performance
{ "analysisType": "performance" }

// Create a table with constraints
{
  "operation": "create_table",
  "tableName": "users", 
  "columns": [
    { "name": "id", "type": "SERIAL PRIMARY KEY" },
    { "name": "email", "type": "VARCHAR(255) UNIQUE NOT NULL" }
  ]
}

// Find slow queries
{
  "operation": "get_slow_queries",
  "limit": 5,
  "minDuration": 100
}
```

## 📚 Documentation

**📋 [Complete Tool Schema Reference](./TOOL_SCHEMAS.md)** - All 14 tool parameters & examples in one place

For additional information, see the [`docs/`](./docs/) folder:

- **[📖 Usage Guide](./docs/USAGE.md)** - Comprehensive tool usage and examples
- **[🛠️ Development Guide](./docs/DEVELOPMENT.md)** - Setup and contribution guide  
- **[⚙️ Technical Details](./docs/TECHNICAL.md)** - Architecture and implementation
- **[👨‍💻 Developer Reference](./docs/DEVELOPER.md)** - API reference and advanced usage
- **[📋 Documentation Index](./docs/INDEX.md)** - Complete documentation overview

## Features Highlights

✅ **46→14 tools** - Streamlined for better AI discovery  
✅ **Consolidated operations** - Multiple functions per tool  
✅ **Smart parameter validation** - Clear error messages  
✅ **Flexible connection** - CLI args, env vars, or per-tool  
✅ **Production ready** - Connection pooling, error handling  
✅ **Security focused** - Parameterized queries, SSL support  

## Prerequisites

- Node.js ≥ 18.0.0
- PostgreSQL server access
- Valid connection credentials

## Contributing

1. Fork the repository
2. Create a feature branch  
3. Commit your changes
4. Create a Pull Request

See [Development Guide](./docs/DEVELOPMENT.md) for detailed setup instructions.

## License

AGPLv3 License - see [LICENSE](./LICENSE) file for details.
