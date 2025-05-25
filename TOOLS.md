# PostgreSQL MCP Server - Tools Documentation

This document provides a comprehensive overview of all available tools in the PostgreSQL MCP Server, organized by functional categories.

## Implementation Status

✅ **Completed** - Tool is fully implemented and tested  
🚧 **In Progress** - Tool is partially implemented or being developed  
❌ **Not Started** - Tool is planned but not yet implemented  

---

## 1. Database Analysis and Setup (3/3 ✅)

| Tool Name | Status | Description | File Location |
|-----------|--------|-------------|---------------|
| `analyze_database` | ✅ | Analyzes PostgreSQL database configuration, performance, and security | `src/tools/analyze.ts` |
| `get_setup_instructions` | ✅ | Provides platform-specific PostgreSQL installation and setup guidance | `src/tools/setup.ts` |
| `debug_database` | ✅ | Debug common PostgreSQL issues (connections, performance, locks, replication) | `src/tools/debug.ts` |

---

## 2. Schema Management (5/5 ✅)

| Tool Name | Status | Description | File Location |
|-----------|--------|-------------|---------------|
| `get_schema_info` | ✅ | Get detailed schema information for database or specific table | `src/tools/schema.ts` |
| `create_table` | ✅ | Create new tables with columns, constraints, and defaults | `src/tools/schema.ts` |
| `alter_table` | ✅ | Modify existing tables (add/alter/drop columns) | `src/tools/schema.ts` |
| `get_enums` | ✅ | List PostgreSQL ENUM types with their values | `src/tools/enums.ts` |
| `create_enum` | ✅ | Create new ENUM types with specified values | `src/tools/enums.ts` |

---

## 3. Data Migration (3/3 ✅)

| Tool Name | Status | Description | File Location |
|-----------|--------|-------------|---------------|
| `export_table_data` | ✅ | Export table data to JSON or CSV with filtering options | `src/tools/migration.ts` |
| `import_table_data` | ✅ | Import data from JSON or CSV files into tables | `src/tools/migration.ts` |
| `copy_between_databases` | ✅ | Copy data between two PostgreSQL databases | `src/tools/migration.ts` |

---

## 4. Monitoring (1/1 ✅)

| Tool Name | Status | Description | File Location |
|-----------|--------|-------------|---------------|
| `monitor_database` | ✅ | Real-time monitoring with metrics, alerts, and performance statistics | `src/tools/monitor.ts` |

---

## 5. Functions Management (3/3 ✅)

| Tool Name | Status | Description | File Location |
|-----------|--------|-------------|---------------|
| `get_functions` | ✅ | List PostgreSQL functions with details | `src/tools/functions.ts` |
| `create_function` | ✅ | Create or replace PostgreSQL functions (SQL, PL/pgSQL, Python) | `src/tools/functions.ts` |
| `drop_function` | ✅ | Drop PostgreSQL functions with cascade options | `src/tools/functions.ts` |

---

## 6. Row-Level Security (RLS) (6/6 ✅)

| Tool Name | Status | Description | File Location |
|-----------|--------|-------------|---------------|
| `enable_rls` | ✅ | Enable Row-Level Security on tables | `src/tools/functions.ts` |
| `disable_rls` | ✅ | Disable Row-Level Security on tables | `src/tools/functions.ts` |
| `create_rls_policy` | ✅ | Create RLS policies with USING and CHECK expressions | `src/tools/functions.ts` |
| `edit_rls_policy` | ✅ | Modify existing RLS policies | `src/tools/functions.ts` |
| `drop_rls_policy` | ✅ | Remove RLS policies from tables | `src/tools/functions.ts` |
| `get_rls_policies` | ✅ | List all RLS policies for tables | `src/tools/functions.ts` |

---

## 7. Triggers Management (4/4 ✅)

| Tool Name | Status | Description | File Location |
|-----------|--------|-------------|---------------|
| `get_triggers` | ✅ | List PostgreSQL triggers with details | `src/tools/triggers.ts` |
| `create_trigger` | ✅ | Create triggers with timing, events, and conditions | `src/tools/triggers.ts` |
| `drop_trigger` | ✅ | Drop triggers with cascade options | `src/tools/triggers.ts` |
| `set_trigger_state` | ✅ | Enable or disable existing triggers | `src/tools/triggers.ts` |

---

## 8. Index Management (5/5 ✅)

| Tool Name | Status | Description | File Location |
|-----------|--------|-------------|---------------|
| `pg_get_indexes` | ✅ | List indexes with size and usage statistics | `src/tools/indexes.ts` |
| `pg_create_index` | ✅ | Create indexes (unique, partial, concurrent) with various methods | `src/tools/indexes.ts` |
| `pg_drop_index` | ✅ | Drop indexes with concurrent and cascade options | `src/tools/indexes.ts` |
| `pg_reindex` | ✅ | Rebuild indexes for performance optimization | `src/tools/indexes.ts` |
| `pg_analyze_index_usage` | ✅ | Find unused, duplicate, and low-usage indexes | `src/tools/indexes.ts` |

---

## 9. Query Performance & Analysis (4/4 ✅)

| Tool Name | Status | Description | File Location |
|-----------|--------|-------------|---------------|
| `pg_explain_query` | ✅ | EXPLAIN/EXPLAIN ANALYZE with multiple output formats | `src/tools/performance.ts` |
| `pg_get_slow_queries` | ✅ | Find slow queries using pg_stat_statements | `src/tools/performance.ts` |
| `pg_get_query_stats` | ✅ | Query statistics with cache hit ratios | `src/tools/performance.ts` |
| `pg_reset_query_stats` | ✅ | Reset pg_stat_statements statistics | `src/tools/performance.ts` |

---

## 10. User & Permission Management (7/7 ✅)

| Tool Name | Status | Description | File Location |
|-----------|--------|-------------|---------------|
| `pg_create_user` | ✅ | Create PostgreSQL users/roles with various privileges | `src/tools/users.ts` |
| `pg_drop_user` | ✅ | Drop users/roles with cascade options | `src/tools/users.ts` |
| `pg_alter_user` | ✅ | Modify user attributes and privileges | `src/tools/users.ts` |
| `pg_grant_permissions` | ✅ | Grant permissions on various database objects | `src/tools/users.ts` |
| `pg_revoke_permissions` | ✅ | Revoke permissions with cascade options | `src/tools/users.ts` |
| `pg_get_user_permissions` | ✅ | View user permissions across objects | `src/tools/users.ts` |
| `pg_list_users` | ✅ | List all users/roles in the database | `src/tools/users.ts` |

---

## 11. Constraint Management (5/5 ✅)

| Tool Name | Status | Description | File Location |
|-----------|--------|-------------|---------------|
| `pg_get_constraints` | ✅ | List all constraints (PK, FK, unique, check) | `src/tools/constraints.ts` |
| `pg_create_foreign_key` | ✅ | Create foreign key constraints with referential actions | `src/tools/constraints.ts` |
| `pg_drop_foreign_key` | ✅ | Drop foreign key constraints | `src/tools/constraints.ts` |
| `pg_create_constraint` | ✅ | Create unique, check, or primary key constraints | `src/tools/constraints.ts` |
| `pg_drop_constraint` | ✅ | Drop constraints with cascade options | `src/tools/constraints.ts` |

---

## Summary

**Total Tools: 46/46 ✅ (100% Complete)**

### Tools by Category:
- **Database Analysis & Setup**: 3 tools ✅
- **Schema Management**: 5 tools ✅
- **Data Migration**: 3 tools ✅
- **Monitoring**: 1 tool ✅
- **Functions Management**: 3 tools ✅
- **Row-Level Security**: 6 tools ✅
- **Triggers Management**: 4 tools ✅
- **Index Management**: 5 tools ✅
- **Query Performance**: 4 tools ✅
- **User Management**: 7 tools ✅
- **Constraint Management**: 5 tools ✅

## Future Enhancements

While all core functionality is implemented, potential future enhancements could include:

- **Backup & Restore Tools**: pg_dump/pg_restore integration
- **Replication Management**: Enhanced replication monitoring and control
- **Connection Pooling**: PgBouncer configuration and monitoring
- **Advanced Analytics**: Query plan analysis and optimization suggestions
- **Partitioning Management**: Table partitioning tools
- **Extension Management**: PostgreSQL extension installation and management

## Tool Configuration

Tools can be selectively enabled using the `--tools-config` CLI option with a JSON configuration file:

```json
{
  "enabledTools": [
    "get_schema_info",
    "analyze_database",
    "pg_get_indexes",
    "pg_explain_query"
  ]
}
```

For complete usage examples and parameter details, see the main [README.md](README.md) file. 