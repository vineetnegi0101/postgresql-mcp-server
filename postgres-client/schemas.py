# Function schemas for all MCP tools
function_schemas = [
    {
        "name": "analyze_database",
        "description": "Analyze PostgreSQL database configuration and performance.",
        "parameters": {
            "type": "object",
            "properties": {
                "analysisType": {
                    "type": "string",
                    "enum": ["configuration", "performance", "security"],
                    "description": "Type of analysis to perform"
                },
                "connectionString": {"type": "string"}
            },
            "required": ["analysisType"]
        }
    },
    {
        "name": "manage_functions",
        "description": "Manage PostgreSQL functions (get, create, drop).",
        "parameters": {
            "type": "object",
            "properties": {
                "operation": {"type": "string", "enum": ["get", "create", "drop"]},
                "functionName": {"type": "string"},
                "parameters": {"type": "string"},
                "returnType": {"type": "string"},
                "functionBody": {"type": "string"},
                "language": {"type": "string", "enum": ["sql", "plpgsql", "plpython3u"]},
                "volatility": {"type": "string", "enum": ["VOLATILE", "STABLE", "IMMUTABLE"]},
                "security": {"type": "string", "enum": ["INVOKER", "DEFINER"]},
                "replace": {"type": "boolean"},
                "ifExists": {"type": "boolean"},
                "cascade": {"type": "boolean"},
                "connectionString": {"type": "string"}
            },
            "required": ["operation"]
        }
    },
    {
        "name": "manage_rls",
        "description": "Manage PostgreSQL Row-Level Security policies.",
        "parameters": {
            "type": "object",
            "properties": {
                "operation": {"type": "string", "enum": ["enable", "disable", "create_policy", "edit_policy", "drop_policy", "get_policies"]},
                "tableName": {"type": "string"},
                "policyName": {"type": "string"},
                "using": {"type": "string"},
                "check": {"type": "string"},
                "command": {"type": "string", "enum": ["ALL", "SELECT", "INSERT", "UPDATE", "DELETE"]},
                "role": {"type": "string"},
                "replace": {"type": "boolean"},
                "roles": {"type": "array", "items": {"type": "string"}},
                "ifExists": {"type": "boolean"},
                "connectionString": {"type": "string"}
            },
            "required": ["operation"]
        }
    },
    {
        "name": "debug_database",
        "description": "Debug common PostgreSQL issues.",
        "parameters": {
            "type": "object",
            "properties": {
                "issue": {"type": "string", "enum": ["connection", "performance", "locks", "replication"]},
                "logLevel": {"type": "string", "enum": ["info", "debug", "trace"]},
                "connectionString": {"type": "string"}
            },
            "required": ["issue"]
        }
    },
    {
        "name": "manage_schema",
        "description": (
            "Manage PostgreSQL schema (get info, create/alter tables, manage enums). "
            "For create_table, you MUST provide both tableName and columns. "
            "Example columns: [{\"name\": \"id\", \"type\": \"serial\", \"nullable\": false}, {\"name\": \"name\", \"type\": \"text\", \"nullable\": false}]. "
            "For alter_table, specify operations. For create_enum, provide enumName and values."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "operation": {"type": "string", "enum": ["get_info", "create_table", "alter_table", "get_enums", "create_enum"]},
                "tableName": {"type": "string"},
                "schema": {"type": "string"},
                "columns": {"type": "array", "items": {"type": "object"}},
                "operations": {"type": "array", "items": {"type": "object"}},
                "enumName": {"type": "string"},
                "values": {"type": "array", "items": {"type": "string"}},
                "ifNotExists": {"type": "boolean"},
                "connectionString": {"type": "string"}
            },
            "required": ["operation"]
        }
    },
    {
        "name": "export_table_data",
        "description": "Export table data to JSON or CSV format.",
        "parameters": {
            "type": "object",
            "properties": {
                "tableName": {"type": "string"},
                "outputPath": {"type": "string"},
                "where": {"type": "string"},
                "limit": {"type": "integer"},
                "format": {"type": "string", "enum": ["json", "csv"]},
                "connectionString": {"type": "string"}
            },
            "required": ["tableName", "outputPath"]
        }
    },
    {
        "name": "import_table_data",
        "description": "Import data from JSON or CSV file into a table.",
        "parameters": {
            "type": "object",
            "properties": {
                "tableName": {"type": "string"},
                "inputPath": {"type": "string"},
                "truncateFirst": {"type": "boolean"},
                "format": {"type": "string", "enum": ["json", "csv"]},
                "delimiter": {"type": "string"},
                "connectionString": {"type": "string"}
            },
            "required": ["tableName", "inputPath"]
        }
    },
    {
        "name": "copy_between_databases",
        "description": "Copy data between two databases.",
        "parameters": {
            "type": "object",
            "properties": {
                "sourceConnectionString": {"type": "string"},
                "targetConnectionString": {"type": "string"},
                "tableName": {"type": "string"},
                "where": {"type": "string"},
                "truncateTarget": {"type": "boolean"}
            },
            "required": ["sourceConnectionString", "targetConnectionString", "tableName"]
        }
    },
    {
        "name": "monitor_database",
        "description": "Get real-time monitoring information for a PostgreSQL database.",
        "parameters": {
            "type": "object",
            "properties": {
                "includeTables": {"type": "boolean"},
                "includeQueries": {"type": "boolean"},
                "includeLocks": {"type": "boolean"},
                "includeReplication": {"type": "boolean"},
                "alertThresholds": {"type": "object"},
                "connectionString": {"type": "string"}
            },
            "required": []
        }
    },
    {
        "name": "get_setup_instructions",
        "description": "Get step-by-step PostgreSQL setup instructions.",
        "parameters": {
            "type": "object",
            "properties": {
                "platform": {"type": "string", "enum": ["linux", "macos", "windows"]},
                "version": {"type": "string"},
                "useCase": {"type": "string", "enum": ["development", "production"]}
            },
            "required": ["platform"]
        }
    },
    {
        "name": "manage_triggers",
        "description": "Manage PostgreSQL triggers (get, create, drop, enable/disable).",
        "parameters": {
            "type": "object",
            "properties": {
                "operation": {"type": "string", "enum": ["get", "create", "drop", "set_state"]},
                "tableName": {"type": "string"},
                "triggerName": {"type": "string"},
                "functionName": {"type": "string"},
                "timing": {"type": "string", "enum": ["BEFORE", "AFTER", "INSTEAD OF"]},
                "events": {"type": "array", "items": {"type": "string", "enum": ["INSERT", "UPDATE", "DELETE", "TRUNCATE"]}},
                "forEach": {"type": "string", "enum": ["ROW", "STATEMENT"]},
                "when": {"type": "string"},
                "replace": {"type": "boolean"},
                "ifExists": {"type": "boolean"},
                "cascade": {"type": "boolean"},
                "enable": {"type": "boolean"},
                "connectionString": {"type": "string"}
            },
            "required": ["operation"]
        }
    },
    {
        "name": "manage_indexes",
        "description": "Manage PostgreSQL indexes (get, create, drop, reindex, analyze usage).",
        "parameters": {
            "type": "object",
            "properties": {
                "operation": {"type": "string", "enum": ["get", "create", "drop", "reindex", "analyze_usage"]},
                "tableName": {"type": "string"},
                "indexName": {"type": "string"},
                "includeStats": {"type": "boolean"},
                "columns": {"type": "array", "items": {"type": "string"}},
                "unique": {"type": "boolean"},
                "concurrent": {"type": "boolean"},
                "method": {"type": "string", "enum": ["btree", "hash", "gist", "spgist", "gin", "brin"]},
                "where": {"type": "string"},
                "ifNotExists": {"type": "boolean"},
                "ifExists": {"type": "boolean"},
                "cascade": {"type": "boolean"},
                "target": {"type": "string"},
                "type": {"type": "string", "enum": ["index", "table", "schema", "database"]},
                "minSizeBytes": {"type": "number"},
                "showUnused": {"type": "boolean"},
                "showDuplicates": {"type": "boolean"},
                "connectionString": {"type": "string"}
            },
            "required": ["operation"]
        }
    },
    {
        "name": "manage_query",
        "description": "Manage PostgreSQL query analysis and performance.",
        "parameters": {
            "type": "object",
            "properties": {
                "operation": {"type": "string", "enum": ["explain", "get_slow_queries", "get_stats", "reset_stats"]},
                "query": {"type": "string"},
                "analyze": {"type": "boolean"},
                "buffers": {"type": "boolean"},
                "verbose": {"type": "boolean"},
                "costs": {"type": "boolean"},
                "format": {"type": "string", "enum": ["text", "json", "xml", "yaml"]},
                "limit": {"type": "integer"},
                "minDuration": {"type": "number"},
                "orderBy": {"type": "string", "enum": ["mean_time", "total_time", "calls", "cache_hit_ratio"]},
                "includeNormalized": {"type": "boolean"},
                "minCalls": {"type": "number"},
                "queryPattern": {"type": "string"},
                "queryId": {"type": "string"},
                "connectionString": {"type": "string"}
            },
            "required": ["operation"]
        }
    },
    {
        "name": "manage_users",
        "description": "Manage PostgreSQL users and permissions.",
        "parameters": {
            "type": "object",
            "properties": {
                "operation": {"type": "string", "enum": ["create", "drop", "alter", "grant", "revoke", "get_permissions", "list"]},
                "username": {"type": "string"},
                "password": {"type": "string"},
                "superuser": {"type": "boolean"},
                "createdb": {"type": "boolean"},
                "createrole": {"type": "boolean"},
                "login": {"type": "boolean"},
                "replication": {"type": "boolean"},
                "connectionLimit": {"type": "number"},
                "validUntil": {"type": "string"},
                "inherit": {"type": "boolean"},
                "ifExists": {"type": "boolean"},
                "cascade": {"type": "boolean"},
                "permissions": {"type": "array", "items": {"type": "string", "enum": ["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER", "ALL"]}},
                "target": {"type": "string"},
                "targetType": {"type": "string", "enum": ["table", "schema", "database", "sequence", "function"]},
                "withGrantOption": {"type": "boolean"},
                "schema": {"type": "string"},
                "includeSystemRoles": {"type": "boolean"},
                "connectionString": {"type": "string"}
            },
            "required": ["operation"]
        }
    },
    {
        "name": "manage_constraints",
        "description": "Manage PostgreSQL constraints (get, create foreign keys, drop foreign keys, create/drop constraints).",
        "parameters": {
            "type": "object",
            "properties": {
                "operation": {"type": "string", "enum": ["get", "create_fk", "drop_fk", "create", "drop"]},
                "constraintName": {"type": "string"},
                "tableName": {"type": "string"},
                "constraintType": {"type": "string", "enum": ["PRIMARY KEY", "FOREIGN KEY", "UNIQUE", "CHECK"]},
                "columnNames": {"type": "array", "items": {"type": "string"}},
                "referencedTable": {"type": "string"},
                "referencedColumns": {"type": "array", "items": {"type": "string"}},
                "referencedSchema": {"type": "string"},
                "onUpdate": {"type": "string", "enum": ["NO ACTION", "RESTRICT", "CASCADE", "SET NULL", "SET DEFAULT"]},
                "onDelete": {"type": "string", "enum": ["NO ACTION", "RESTRICT", "CASCADE", "SET NULL", "SET DEFAULT"]},
                "constraintTypeCreate": {"type": "string", "enum": ["unique", "check", "primary_key"]},
                "checkExpression": {"type": "string"},
                "deferrable": {"type": "boolean"},
                "initiallyDeferred": {"type": "boolean"},
                "ifExists": {"type": "boolean"},
                "cascade": {"type": "boolean"},
                "connectionString": {"type": "string"}
            },
            "required": ["operation"]
        }
    },
    {
        "name": "execute_query",
        "description": (
            "Execute SELECT queries and data retrieval operations. "
            "Use this for any request to list, show, or retrieve data from the database, "
            "including listing all databases (e.g., 'show databases'), tables, or records. "
            "For example, to list all databases, use: SELECT datname FROM pg_database;"
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "operation": {"type": "string", "enum": ["select", "count", "exists"]},
                "query": {"type": "string"},
                "parameters": {"type": "array", "items": {}},
                "limit": {"type": "integer"},
                "timeout": {"type": "integer"},
                "connectionString": {"type": "string"}
            },
            "required": ["operation", "query"]
        }
    },
    {
        "name": "execute_mutation",
        "description": (
            "Execute data modification operations (INSERT/UPDATE/DELETE/UPSERT). "
            "For insert, you MUST provide table and data (object with column values). "
            "For update/delete, provide table and where clause. For upsert, provide conflictColumns. "
            "Example data: {\"id\": 1, \"name\": \"John\"}."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "operation": {"type": "string", "enum": ["insert", "update", "delete", "upsert"]},
                "table": {"type": "string"},
                "data": {"type": "object"},
                "where": {"type": "string"},
                "conflictColumns": {"type": "array", "items": {"type": "string"}},
                "returning": {"type": "string"},
                "schema": {"type": "string"},
                "connectionString": {"type": "string"}
            },
            "required": ["operation", "table"]
        }
    },
    {
        "name": "manage_comments",
        "description": "Manage PostgreSQL object comments.",
        "parameters": {
            "type": "object",
            "properties": {
                "operation": {"type": "string", "enum": ["get", "set", "remove", "bulk_get"]},
                "objectType": {"type": "string", "enum": ["table", "column", "index", "constraint", "function", "trigger", "view", "sequence", "schema", "database"]},
                "objectName": {"type": "string"},
                "schema": {"type": "string"},
                "columnName": {"type": "string"},
                "comment": {"type": "string"},
                "includeSystemObjects": {"type": "boolean"},
                "filterObjectType": {"type": "string", "enum": ["table", "column", "index", "constraint", "function", "trigger", "view", "sequence", "schema", "database"]},
                "connectionString": {"type": "string"}
            },
            "required": ["operation", "objectType", "objectName"]
        }
    }
]

# Map function names to MCP tool names and static/default arguments
function_to_mcp = {
    "analyze_database": ("pg_analyze_database", {}),
    "manage_functions": ("pg_manage_functions", {}),
    "manage_rls": ("pg_manage_rls", {}),
    "debug_database": ("pg_debug_database", {}),
    "manage_schema": ("pg_manage_schema", {}),
    "export_table_data": ("pg_export_table_data", {}),
    "import_table_data": ("pg_import_table_data", {}),
    "copy_between_databases": ("pg_copy_between_databases", {}),
    "monitor_database": ("pg_monitor_database", {}),
    "get_setup_instructions": ("pg_get_setup_instructions", {}),
    "manage_triggers": ("pg_manage_triggers", {}),
    "manage_indexes": ("pg_manage_indexes", {}),
    "manage_query": ("pg_manage_query", {}),
    "manage_users": ("pg_manage_users", {}),
    "manage_constraints": ("pg_manage_constraints", {}),
    "execute_query": ("pg_execute_query", {}),
    "execute_mutation": ("pg_execute_mutation", {}),
    "execute_sql": ("pg_execute_sql", {}),
    "manage_comments": ("pg_manage_comments", {}),
} 