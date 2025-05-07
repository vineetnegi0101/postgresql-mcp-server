#!/usr/bin/env node
import { program } from 'commander';
import fs from 'node:fs';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError
} from '@modelcontextprotocol/sdk/types.js';

import { analyzeDatabase } from './tools/analyze.js';
import { getSetupInstructions } from './tools/setup.js';
import { debugDatabase } from './tools/debug.js';
import { getSchemaInfo, createTable, alterTable } from './tools/schema.js';
import { exportTableData, importTableData, copyBetweenDatabases } from './tools/migration.js';
import { monitorDatabase } from './tools/monitor.js';
import { 
  getFunctions, 
  createFunction, 
  dropFunction, 
  enableRLS, 
  disableRLS, 
  createRLSPolicy, 
  dropRLSPolicy,
  editRLSPolicy, 
  getRLSPolicies 
} from './tools/functions.js';
import {
  getTriggers,
  createTrigger,
  dropTrigger,
  setTriggerState
} from './tools/triggers.js';
import { getEnums, createEnum } from './tools/enums.js';
import { DatabaseConnection } from './utils/connection.js';

// Initialize commander
program
  .version('0.2.0')
  .option('-cs, --connection-string <string>', 'PostgreSQL connection string')
  .option('-tc, --tools-config <path>', 'Path to tools configuration JSON file')
  .parse(process.argv);

const options = program.opts();

// Updated helper function to get connection string
function getConnectionString(connectionStringArg?: string): string {
  // 1. Use connectionStringArg from tool's direct arguments if provided
  if (connectionStringArg) {
    return connectionStringArg;
  }
  // 2. Else, use CLI option if provided
  const cliConnectionString = options.connectionString;
  if (cliConnectionString) {
    return cliConnectionString;
  }
  // 3. Else, use environment variable
  const envConnectionString = process.env.POSTGRES_CONNECTION_STRING;
  if (envConnectionString) {
    return envConnectionString;
  }
  // 4. If none are found, throw error
  throw new McpError(
    ErrorCode.InvalidParams, // Changed from InvalidArgument to InvalidParams
    'No connection string provided. Provide one in the tool arguments, via the --connection-string CLI option, or set the POSTGRES_CONNECTION_STRING environment variable.'
  );
}

// Define all tool definitions using JSON Schema for inputSchema
const TOOL_DEFINITIONS = [
  // Original tools
  {
    name: 'analyze_database',
    description: 'Analyze PostgreSQL database configuration and performance',
    inputSchema: {
      type: 'object',
      properties: {
        connectionString: {
          type: 'string',
          description: 'PostgreSQL connection string (optional if POSTGRES_CONNECTION_STRING environment variable or --connection-string CLI option is set)'
        },
        analysisType: {
          type: 'string',
          enum: ['configuration', 'performance', 'security'],
          description: 'Type of analysis to perform'
        }
      },
      required: [] // connectionString is truly optional here
    }
  },
  {
    name: 'get_setup_instructions',
    description: 'Get step-by-step PostgreSQL setup instructions',
    inputSchema: {
      type: 'object',
      properties: {
        version: {
          type: 'string',
          description: 'PostgreSQL version to install'
        },
        platform: {
          type: 'string',
          enum: ['linux', 'macos', 'windows'],
          description: 'Operating system platform'
        },
        useCase: {
          type: 'string',
          enum: ['development', 'production'],
          description: 'Intended use case'
        }
      },
      required: ['platform']
    }
  },
  {
    name: 'debug_database',
    description: 'Debug common PostgreSQL issues',
    inputSchema: {
      type: 'object',
      properties: {
        connectionString: {
          type: 'string',
          description: 'PostgreSQL connection string (optional if POSTGRES_CONNECTION_STRING environment variable or --connection-string CLI option is set)'
        },
        issue: {
          type: 'string',
          enum: [
            'connection',
            'performance',
            'locks',
            'replication'
          ],
          description: 'Type of issue to debug'
        },
        logLevel: {
          type: 'string',
          enum: ['info', 'debug', 'trace'],
          default: 'info',
          description: 'Logging detail level'
        }
      },
      required: ['issue'] // Removed 'connectionString'
    }
  },
  
  // Schema management tools
  {
    name: 'get_schema_info',
    description: 'Get schema information for a database or specific table',
    inputSchema: {
      type: 'object',
      properties: {
        connectionString: {
          type: 'string',
          description: 'PostgreSQL connection string (optional if POSTGRES_CONNECTION_STRING environment variable or --connection-string CLI option is set)'
        },
        tableName: {
          type: 'string',
          description: 'Optional table name to get detailed schema for'
        }
      },
      required: [] // Removed 'connectionString'
    }
  },
  {
    name: 'create_table',
    description: 'Create a new table in the database',
    inputSchema: {
      type: 'object',
      properties: {
        connectionString: {
          type: 'string',
          description: 'PostgreSQL connection string (optional if POSTGRES_CONNECTION_STRING environment variable or --connection-string CLI option is set)'
        },
        tableName: {
          type: 'string',
          description: 'Name of the table to create'
        },
        columns: {
          type: 'array',
          description: 'Column definitions',
          items: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Column name'
              },
              type: {
                type: 'string',
                description: 'PostgreSQL data type'
              },
              nullable: {
                type: 'boolean',
                description: 'Whether the column can be NULL'
              },
              default: {
                type: 'string',
                description: 'Default value expression'
              }
            },
            required: ['name', 'type']
          }
        }
      },
      required: ['tableName', 'columns'] // Removed 'connectionString'
    }
  },
  {
    name: 'alter_table',
    description: 'Alter an existing table (add/modify/drop columns)',
    inputSchema: {
      type: 'object',
      properties: {
        connectionString: {
          type: 'string',
          description: 'PostgreSQL connection string (optional if POSTGRES_CONNECTION_STRING environment variable or --connection-string CLI option is set)'
        },
        tableName: {
          type: 'string',
          description: 'Name of the table to alter'
        },
        operations: {
          type: 'array',
          description: 'Operations to perform',
          items: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['add', 'alter', 'drop'],
                description: 'Type of operation'
              },
              columnName: {
                type: 'string',
                description: 'Column name'
              },
              dataType: {
                type: 'string',
                description: 'PostgreSQL data type (for add/alter)'
              },
              nullable: {
                type: 'boolean',
                description: 'Whether the column can be NULL (for add/alter)'
              },
              default: {
                type: 'string',
                description: 'Default value expression (for add/alter)'
              }
            },
            required: ['type', 'columnName']
          }
        }
      },
      required: ['tableName', 'operations'] // Removed 'connectionString'
    }
  },

  // Enum management tools (Define with JSON Schema)
  {
    name: 'get_enums',
    description: 'Get information about PostgreSQL ENUM types',
    inputSchema: {
      type: 'object',
      properties: {
        connectionString: {
          type: 'string',
          description: 'PostgreSQL connection string (optional if POSTGRES_CONNECTION_STRING environment variable or --connection-string CLI option is set)'
        },
        schema: {
          type: 'string',
          description: 'Schema name (defaults to public)',
          default: 'public'
        },
        enumName: {
          type: 'string',
          description: 'Optional specific ENUM name to filter by'
        }
      },
      required: [] // Removed 'connectionString'
    }
  },
  {
    name: 'create_enum',
    description: 'Create a new ENUM type in the database',
    inputSchema: {
      type: 'object',
      properties: {
        connectionString: {
          type: 'string',
          description: 'PostgreSQL connection string (optional if POSTGRES_CONNECTION_STRING environment variable or --connection-string CLI option is set)'
        },
        enumName: {
          type: 'string',
          description: 'Name of the ENUM type to create'
        },
        values: {
          type: 'array',
          description: 'List of values for the ENUM type',
          items: { type: 'string' },
          minItems: 1
        },
        schema: {
          type: 'string',
          description: 'Schema name (defaults to public)',
          default: 'public'
        },
        ifNotExists: {
          type: 'boolean',
          description: 'Include IF NOT EXISTS clause',
          default: false
        }
      },
      required: ['enumName', 'values'] // Removed 'connectionString'
    }
  },
  
  // Data migration tools
  {
    name: 'export_table_data',
    description: 'Export table data to JSON or CSV format',
    inputSchema: {
      type: 'object',
      properties: {
        connectionString: {
          type: 'string',
          description: 'PostgreSQL connection string (optional if POSTGRES_CONNECTION_STRING environment variable or --connection-string CLI option is set)'
        },
        tableName: {
          type: 'string',
          description: 'Name of the table to export'
        },
        outputPath: {
          type: 'string',
          description: 'absolute path to save the exported data'
        },
        where: {
          type: 'string',
          description: 'Optional WHERE clause to filter data'
        },
        limit: {
          type: 'number',
          description: 'Optional limit on number of rows to export'
        },
        format: {
          type: 'string',
          enum: ['json', 'csv'],
          default: 'json',
          description: 'Output format'
        }
      },
      required: ['tableName', 'outputPath'] // Removed 'connectionString'
    }
  },
  {
    name: 'import_table_data',
    description: 'Import data from JSON or CSV file into a table',
    inputSchema: {
      type: 'object',
      properties: {
        connectionString: {
          type: 'string',
          description: 'PostgreSQL connection string (optional if POSTGRES_CONNECTION_STRING environment variable or --connection-string CLI option is set)'
        },
        tableName: {
          type: 'string',
          description: 'Name of the table to import into'
        },
        inputPath: {
          type: 'string',
          description: 'absolute path to the file to import'
        },
        truncateFirst: {
          type: 'boolean',
          default: false,
          description: 'Whether to truncate the table before importing'
        },
        format: {
          type: 'string',
          enum: ['json', 'csv'],
          default: 'json',
          description: 'Input format'
        },
        delimiter: {
          type: 'string',
          default: ',',
          description: 'Delimiter for CSV files'
        }
      },
      required: ['tableName', 'inputPath'] // Removed 'connectionString'
    }
  },
  {
    name: 'copy_between_databases',
    description: 'Copy data between two databases',
    inputSchema: {
      type: 'object',
      properties: {
        sourceConnectionString: {
          type: 'string',
          description: 'Source PostgreSQL connection string'
        },
        targetConnectionString: {
          type: 'string',
          description: 'Target PostgreSQL connection string'
        },
        tableName: {
          type: 'string',
          description: 'Name of the table to copy'
        },
        where: {
          type: 'string',
          description: 'Optional WHERE clause to filter data'
        },
        truncateTarget: {
          type: 'boolean',
          default: false,
          description: 'Whether to truncate the target table before copying'
        }
      },
      required: ['sourceConnectionString', 'targetConnectionString', 'tableName']
    }
  },
  
  // Monitoring tool
  {
    name: 'monitor_database',
    description: 'Get real-time monitoring information for a PostgreSQL database',
    inputSchema: {
      type: 'object',
      properties: {
        connectionString: {
          type: 'string',
          description: 'PostgreSQL connection string (optional if POSTGRES_CONNECTION_STRING environment variable or --connection-string CLI option is set)'
        },
        includeTables: {
          type: 'boolean',
          default: true,
          description: 'Whether to include table metrics'
        },
        includeQueries: {
          type: 'boolean',
          default: true,
          description: 'Whether to include active query information'
        },
        includeLocks: {
          type: 'boolean',
          default: true,
          description: 'Whether to include lock information'
        },
        includeReplication: {
          type: 'boolean',
          default: false,
          description: 'Whether to include replication information'
        },
        alertThresholds: {
          type: 'object',
          description: 'Alert thresholds',
          properties: {
            connectionPercentage: {
              type: 'number',
              description: 'Connection usage percentage threshold'
            },
            longRunningQuerySeconds: {
              type: 'number',
              description: 'Long-running query threshold in seconds'
            },
            cacheHitRatio: {
              type: 'number',
              description: 'Cache hit ratio threshold'
            },
            deadTuplesPercentage: {
              type: 'number',
              description: 'Dead tuples percentage threshold'
            },
            vacuumAge: {
              type: 'number',
              description: 'Vacuum age threshold in days'
            }
          }
        }
      },
      required: [] // Removed 'connectionString'
    }
  },

  // Function management tools
  {
    name: 'get_functions',
    description: 'Get information about PostgreSQL functions',
    inputSchema: {
      type: 'object',
      properties: {
        connectionString: {
          type: 'string',
          description: 'PostgreSQL connection string (optional if POSTGRES_CONNECTION_STRING environment variable or --connection-string CLI option is set)'
        },
        functionName: {
          type: 'string',
          description: 'Optional function name to filter by'
        },
        schema: {
          type: 'string',
          description: 'Schema name (defaults to public)'
        }
      },
      required: [] // Removed 'connectionString'
    }
  },
  {
    name: 'create_function',
    description: 'Create or replace a PostgreSQL function',
    inputSchema: {
      type: 'object',
      properties: {
        connectionString: {
          type: 'string',
          description: 'PostgreSQL connection string (optional if POSTGRES_CONNECTION_STRING environment variable or --connection-string CLI option is set)'
        },
        functionName: {
          type: 'string',
          description: 'Name of the function to create'
        },
        parameters: {
          type: 'string',
          description: 'Function parameters (e.g., "id integer, name text")'
        },
        returnType: {
          type: 'string',
          description: 'Return type of the function'
        },
        functionBody: {
          type: 'string',
          description: 'Function body code'
        },
        language: {
          type: 'string',
          enum: ['sql', 'plpgsql', 'plpython3u'],
          description: 'Function language'
        },
        volatility: {
          type: 'string',
          enum: ['VOLATILE', 'STABLE', 'IMMUTABLE'],
          description: 'Function volatility'
        },
        schema: {
          type: 'string',
          description: 'Schema name (defaults to public)'
        },
        security: {
          type: 'string',
          enum: ['INVOKER', 'DEFINER'],
          description: 'Function security context'
        },
        replace: {
          type: 'boolean',
          description: 'Whether to replace the function if it exists'
        }
      },
      required: ['functionName', 'parameters', 'returnType', 'functionBody'] // Removed 'connectionString'
    }
  },
  {
    name: 'drop_function',
    description: 'Drop a PostgreSQL function',
    inputSchema: {
      type: 'object',
      properties: {
        connectionString: {
          type: 'string',
          description: 'PostgreSQL connection string (optional if POSTGRES_CONNECTION_STRING environment variable or --connection-string CLI option is set)'
        },
        functionName: {
          type: 'string',
          description: 'Name of the function to drop'
        },
        parameters: {
          type: 'string',
          description: 'Function parameters signature (required for overloaded functions)'
        },
        schema: {
          type: 'string',
          description: 'Schema name (defaults to public)'
        },
        ifExists: {
          type: 'boolean',
          description: 'Whether to include IF EXISTS clause'
        },
        cascade: {
          type: 'boolean',
          description: 'Whether to include CASCADE clause'
        }
      },
      required: ['functionName'] // Removed 'connectionString'
    }
  },
  
  // Row-Level Security (RLS) tools
  {
    name: 'enable_rls',
    description: 'Enable Row-Level Security on a table',
    inputSchema: {
      type: 'object',
      properties: {
        connectionString: {
          type: 'string',
          description: 'PostgreSQL connection string (optional if POSTGRES_CONNECTION_STRING environment variable or --connection-string CLI option is set)'
        },
        tableName: {
          type: 'string',
          description: 'Name of the table to enable RLS on'
        },
        schema: {
          type: 'string',
          description: 'Schema name (defaults to public)'
        }
      },
      required: ['tableName'] // Removed 'connectionString'
    }
  },
  {
    name: 'disable_rls',
    description: 'Disable Row-Level Security on a table',
    inputSchema: {
      type: 'object',
      properties: {
        connectionString: {
          type: 'string',
          description: 'PostgreSQL connection string (optional if POSTGRES_CONNECTION_STRING environment variable or --connection-string CLI option is set)'
        },
        tableName: {
          type: 'string',
          description: 'Name of the table to disable RLS on'
        },
        schema: {
          type: 'string',
          description: 'Schema name (defaults to public)'
        }
      },
      required: ['tableName'] // Removed 'connectionString'
    }
  },
  {
    name: 'create_rls_policy',
    description: 'Create a Row-Level Security policy',
    inputSchema: {
      type: 'object',
      properties: {
        connectionString: {
          type: 'string',
          description: 'PostgreSQL connection string (optional if POSTGRES_CONNECTION_STRING environment variable or --connection-string CLI option is set)'
        },
        tableName: {
          type: 'string',
          description: 'Name of the table to create policy on'
        },
        policyName: {
          type: 'string',
          description: 'Name of the policy to create'
        },
        using: {
          type: 'string',
          description: 'USING expression for the policy (e.g., "user_id = current_user_id()")'
        },
        check: {
          type: 'string',
          description: 'WITH CHECK expression for the policy (if different from USING)'
        },
        schema: {
          type: 'string',
          description: 'Schema name (defaults to public)'
        },
        command: {
          type: 'string',
          enum: ['ALL', 'SELECT', 'INSERT', 'UPDATE', 'DELETE'],
          description: 'Command the policy applies to'
        },
        role: {
          type: 'string',
          description: 'Role the policy applies to'
        },
        replace: {
          type: 'boolean',
          description: 'Whether to replace the policy if it exists'
        }
      },
      required: ['tableName', 'policyName', 'using'] // Removed 'connectionString'
    }
  },
  {
    name: 'drop_rls_policy',
    description: 'Drop a Row-Level Security policy',
    inputSchema: {
      type: 'object',
      properties: {
        connectionString: {
          type: 'string',
          description: 'PostgreSQL connection string (optional if POSTGRES_CONNECTION_STRING environment variable or --connection-string CLI option is set)'
        },
        tableName: {
          type: 'string',
          description: 'Name of the table the policy is on'
        },
        policyName: {
          type: 'string',
          description: 'Name of the policy to drop'
        },
        schema: {
          type: 'string',
          description: 'Schema name (defaults to public)'
        },
        ifExists: {
          type: 'boolean',
          description: 'Whether to include IF EXISTS clause'
        }
      },
      required: ['tableName', 'policyName'] // Removed 'connectionString'
    }
  },
  {
    name: 'get_rls_policies',
    description: 'Get Row-Level Security policies',
    inputSchema: {
      type: 'object',
      properties: {
        connectionString: {
          type: 'string',
          description: 'PostgreSQL connection string (optional if POSTGRES_CONNECTION_STRING environment variable or --connection-string CLI option is set)'
        },
        tableName: {
          type: 'string',
          description: 'Optional table name to filter by'
        },
        schema: {
          type: 'string',
          description: 'Schema name (defaults to public)'
        }
      },
      required: [] // Removed 'connectionString'
    }
  },

  // Trigger management tools
  {
    name: 'get_triggers',
    description: 'Get information about PostgreSQL triggers',
    inputSchema: {
      type: 'object',
      properties: {
        connectionString: {
          type: 'string',
          description: 'PostgreSQL connection string (optional if POSTGRES_CONNECTION_STRING environment variable or --connection-string CLI option is set)'
        },
        tableName: {
          type: 'string',
          description: 'Optional table name to filter by'
        },
        schema: {
          type: 'string',
          description: 'Schema name (defaults to public)'
        }
      },
      required: [] // Removed 'connectionString'
    }
  },
  {
    name: 'create_trigger',
    description: 'Create a PostgreSQL trigger',
    inputSchema: {
      type: 'object',
      properties: {
        connectionString: {
          type: 'string',
          description: 'PostgreSQL connection string (optional if POSTGRES_CONNECTION_STRING environment variable or --connection-string CLI option is set)'
        },
        triggerName: {
          type: 'string',
          description: 'Name of the trigger to create'
        },
        tableName: {
          type: 'string',
          description: 'Name of the table to create trigger on'
        },
        functionName: {
          type: 'string',
          description: 'Name of the function to execute'
        },
        schema: {
          type: 'string',
          description: 'Schema name (defaults to public)'
        },
        timing: {
          type: 'string',
          enum: ['BEFORE', 'AFTER', 'INSTEAD OF'],
          description: 'When to fire the trigger'
        },
        events: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE']
          },
          description: 'Events that fire the trigger'
        },
        when: {
          type: 'string',
          description: 'Optional WHEN condition'
        },
        forEach: {
          type: 'string',
          enum: ['ROW', 'STATEMENT'],
          description: 'Whether to fire once per row or statement'
        },
        replace: {
          type: 'boolean',
          description: 'Whether to replace the trigger if it exists'
        }
      },
      required: ['triggerName', 'tableName', 'functionName'] // Removed 'connectionString'
    }
  },
  {
    name: 'drop_trigger',
    description: 'Drop a PostgreSQL trigger',
    inputSchema: {
      type: 'object',
      properties: {
        connectionString: {
          type: 'string',
          description: 'PostgreSQL connection string (optional if POSTGRES_CONNECTION_STRING environment variable or --connection-string CLI option is set)'
        },
        triggerName: {
          type: 'string',
          description: 'Name of the trigger to drop'
        },
        tableName: {
          type: 'string',
          description: 'Name of the table the trigger is on'
        },
        schema: {
          type: 'string',
          description: 'Schema name (defaults to public)'
        },
        ifExists: {
          type: 'boolean',
          description: 'Whether to include IF EXISTS clause'
        },
        cascade: {
          type: 'boolean',
          description: 'Whether to include CASCADE clause'
        }
      },
      required: ['triggerName', 'tableName'] // Removed 'connectionString'
    }
  },
  {
    name: 'set_trigger_state',
    description: 'Enable or disable a PostgreSQL trigger',
    inputSchema: {
      type: 'object',
      properties: {
        connectionString: {
          type: 'string',
          description: 'PostgreSQL connection string (optional if POSTGRES_CONNECTION_STRING environment variable or --connection-string CLI option is set)'
        },
        triggerName: {
          type: 'string',
          description: 'Name of the trigger to enable/disable'
        },
        tableName: {
          type: 'string',
          description: 'Name of the table the trigger is on'
        },
        enable: {
          type: 'boolean',
          description: 'Whether to enable (true) or disable (false) the trigger'
        },
        schema: {
          type: 'string',
          description: 'Schema name (defaults to public)'
        }
      },
      required: ['triggerName', 'tableName', 'enable'] // Removed 'connectionString'
    }
  },

  // Edit RLS Policy Tool
  {
    name: 'edit_rls_policy',
    description: 'Edit an existing Row-Level Security policy',
    inputSchema: {
      type: 'object',
      properties: {
        connectionString: {
          type: 'string',
          description: 'PostgreSQL connection string (optional if POSTGRES_CONNECTION_STRING environment variable or --connection-string CLI option is set)'
        },
        tableName: {
          type: 'string',
          description: 'Name of the table the policy is on'
        },
        policyName: {
          type: 'string',
          description: 'Name of the policy to edit'
        },
        schema: {
          type: 'string',
          description: 'Schema name (defaults to public)'
        },
        roles: {
          type: 'array',
          description: 'New list of roles the policy applies to (e.g., ["role1", "role2"]. Use PUBLIC or leave empty for all roles)',
          items: { type: 'string' }
        },
        using: {
          type: 'string',
          description: 'New USING expression for the policy'
        },
        check: {
          type: 'string',
          description: 'New WITH CHECK expression for the policy'
        }
      },
      required: ['tableName', 'policyName'] // Removed 'connectionString'
    }
  },
];

class PostgreSQLServer {
  private server: Server;
  private enabledTools: typeof TOOL_DEFINITIONS;

  constructor() {
    this.enabledTools = this.loadAndFilterTools();

    this.server = new Server(
      {
        name: 'postgresql-mcp-server',
        version: '0.2.0',
      },
      {
        capabilities: {
          tools: this.enabledTools.reduce((acc, tool) => {
            acc[tool.name] = tool;
            return acc;
          }, {} as Record<string, typeof TOOL_DEFINITIONS[number]>),
        },
      }
    );

    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    
    // Cleanup on exit
    process.on('SIGINT', async () => {
      await this.cleanup();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      await this.cleanup();
      process.exit(0);
    });
  }

  private loadAndFilterTools(): typeof TOOL_DEFINITIONS {
    let tools = [...TOOL_DEFINITIONS];
    const toolsConfigPath = options.toolsConfig;

    if (toolsConfigPath) {
      try {
        const configContent = fs.readFileSync(toolsConfigPath, 'utf-8');
        const config = JSON.parse(configContent);

        if (config && Array.isArray(config.enabledTools) && config.enabledTools.every((t: unknown) => typeof t === 'string')) {
          const enabledToolNames = new Set(config.enabledTools as string[]);
          tools = TOOL_DEFINITIONS.filter(tool => enabledToolNames.has(tool.name));
          console.error(`[MCP Info] Loaded tools configuration from ${toolsConfigPath}. Enabled tools: ${tools.map(t => t.name).join(', ')}`);
        } else {
          console.error(`[MCP Warning] Invalid tools configuration file format at ${toolsConfigPath}. Expected an object with an 'enabledTools' array of strings. All tools will be enabled.`);
        }
      } catch (error) {
        console.error(`[MCP Warning] Could not read or parse tools configuration file at ${toolsConfigPath}. Error: ${error instanceof Error ? error.message : String(error)}. All tools will be enabled.`);
      }
    } else {
      console.error('[MCP Info] No tools configuration file provided. All tools will be enabled.');
    }
    return tools;
  }

  private async cleanup(): Promise<void> {
    console.error('Shutting down PostgreSQL MCP server...');
    await DatabaseConnection.cleanupPools();
    await this.server.close();
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.enabledTools
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const toolName = request.params.name;
        const isToolEnabled = this.enabledTools.some(tool => tool.name === toolName);

        if (!isToolEnabled) {
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Tool '${toolName}' is not enabled or does not exist.`
          );
        }

        switch (request.params.name) {
          // Original tools
          case 'analyze_database': {
            const { connectionString, analysisType } = request.params.arguments as {
              connectionString?: string;
              analysisType?: 'configuration' | 'performance' | 'security';
            };
            const connString = getConnectionString(connectionString);
            const result = await analyzeDatabase(connString, analysisType);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2)
                }
              ]
            };
          }

          case 'get_setup_instructions': {
            const { platform, version, useCase } = request.params.arguments as {
              platform: 'linux' | 'macos' | 'windows';
              version?: string;
              useCase?: 'development' | 'production';
            };
            const instructions = getSetupInstructions(platform, version, useCase);
            return {
              content: [
                {
                  type: 'text',
                  text: [
                    '# Installation Steps',
                    ...instructions.steps,
                    '',
                    '# Configuration',
                    ...instructions.configuration,
                    '',
                    '# Post-Installation Steps',
                    ...instructions.postInstall
                  ].join('\n')
                }
              ]
            };
          }

          case 'debug_database': {
            const { connectionString, issue, logLevel } = request.params.arguments as {
              connectionString?: string;
              issue: 'connection' | 'performance' | 'locks' | 'replication';
              logLevel?: 'info' | 'debug' | 'trace';
            };
            const connString = getConnectionString(connectionString);
            const result = await debugDatabase(connString, issue, logLevel);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2)
                }
              ]
            };
          }
          
          // Schema management tools
          case 'get_schema_info': {
            const { connectionString, tableName } = request.params.arguments as {
              connectionString?: string;
              tableName?: string;
            };
            const connString = getConnectionString(connectionString);
            const result = await getSchemaInfo(connString, tableName);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2)
                }
              ]
            };
          }
          
          case 'create_table': {
            const { connectionString, tableName, columns } = request.params.arguments as {
              connectionString?: string;
              tableName: string;
              columns: Array<{
                name: string;
                type: string;
                nullable?: boolean;
                default?: string;
              }>;
            };
            const connString = getConnectionString(connectionString);
            const result = await createTable(connString, tableName, columns);
            return {
              content: [
                {
                  type: 'text',
                  text: `Table ${tableName} created successfully with ${columns.length} columns.`
                }
              ]
            };
          }
          
          case 'alter_table': {
            const { connectionString, tableName, operations } = request.params.arguments as {
              connectionString?: string;
              tableName: string;
              operations: Array<{
                type: 'add' | 'alter' | 'drop';
                columnName: string;
                dataType?: string;
                nullable?: boolean;
                default?: string;
              }>;
            };
            const connString = getConnectionString(connectionString);
            const result = await alterTable(connString, tableName, operations);
            return {
              content: [
                {
                  type: 'text',
                  text: `Table ${tableName} altered successfully with ${operations.length} operations.`
                }
              ]
            };
          }
          
          // Enum management handlers (Call imported functions)
          case 'get_enums': {
            const { connectionString, schema, enumName } = request.params.arguments as {
              connectionString?: string;
              schema?: string; 
              enumName?: string;
            };
            const connString = getConnectionString(connectionString);
            const result = await getEnums({ 
              connectionString: connString, 
              schema: schema ?? 'public', 
              enumName 
            }); 
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2)
                }
              ]
            };
          }
          
          case 'create_enum': {
            const { connectionString, enumName, values, schema, ifNotExists } = request.params.arguments as {
              connectionString?: string;
              enumName: string;
              values: string[];
              schema?: string; 
              ifNotExists?: boolean; 
            };
            const connString = getConnectionString(connectionString);
            const result = await createEnum({ 
              connectionString: connString, 
              enumName, 
              values, 
              schema: schema ?? 'public', 
              ifNotExists: ifNotExists ?? false 
            });
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2) 
                }
              ]
            };
          }
          
          // Data migration tools
          case 'export_table_data': {
            const { connectionString, tableName, outputPath, where, limit, format } = request.params.arguments as {
              connectionString?: string;
              tableName: string;
              outputPath: string;
              where?: string;
              limit?: number;
              format?: 'json' | 'csv';
            };
            const connString = getConnectionString(connectionString);
            const result = await exportTableData(connString, tableName, outputPath, { where, limit, format });
            return {
              content: [
                {
                  type: 'text',
                  text: `Data from table ${tableName} exported successfully to ${outputPath}`
                }
              ]
            };
          }
          
          case 'import_table_data': {
            const { connectionString, tableName, inputPath, truncateFirst, format, delimiter } = request.params.arguments as {
              connectionString?: string;
              tableName: string;
              inputPath: string;
              truncateFirst?: boolean;
              format?: 'json' | 'csv';
              delimiter?: string;
            };
            const connString = getConnectionString(connectionString);
            const result = await importTableData(connString, tableName, inputPath, { truncateFirst, format, delimiter });
            return {
              content: [
                {
                  type: 'text',
                  text: `Data imported successfully into table ${tableName}`
                }
              ]
            };
          }
          
          case 'copy_between_databases': {
            const { sourceConnectionString, targetConnectionString, tableName, where, truncateTarget } = request.params.arguments as {
              sourceConnectionString: string;
              targetConnectionString: string;
              tableName: string;
              where?: string;
              truncateTarget?: boolean;
            };
            const result = await copyBetweenDatabases(sourceConnectionString, targetConnectionString, tableName, { where, truncateTarget });
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2)
                }
              ]
            };
          }
          
          // Monitoring tool
          case 'monitor_database': {
            const { connectionString, includeTables, includeQueries, includeLocks, includeReplication, alertThresholds } = request.params.arguments as {
              connectionString?: string;
              includeTables?: boolean;
              includeQueries?: boolean;
              includeLocks?: boolean;
              includeReplication?: boolean;
              alertThresholds?: {
                connectionPercentage?: number;
                longRunningQuerySeconds?: number;
                cacheHitRatio?: number;
                deadTuplesPercentage?: number;
                vacuumAge?: number;
              };
            };
            const connString = getConnectionString(connectionString);
            const result = await monitorDatabase(connString, { 
              includeTables,
              includeQueries,
              includeLocks,
              includeReplication,
              alertThresholds
            });
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2)
                }
              ]
            };
          }

          // Function management handlers
          case 'get_functions': {
            const { connectionString, functionName, schema } = request.params.arguments as {
              connectionString: string;
              functionName?: string;
              schema?: string;
            };
            const result = await getFunctions(connectionString, functionName, schema);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2)
                }
              ]
            };
          }
          
          case 'create_function': {
            const { connectionString, functionName, parameters, returnType, functionBody, language, volatility, schema, security, replace } = request.params.arguments as {
              connectionString: string;
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
            const result = await createFunction(
              connectionString,
              functionName,
              parameters,
              returnType,
              functionBody,
              {
                language,
                volatility,
                schema,
                security,
                replace
              }
            );
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2)
                }
              ]
            };
          }
          
          case 'drop_function': {
            const { connectionString, functionName, parameters, schema, ifExists, cascade } = request.params.arguments as {
              connectionString: string;
              functionName: string;
              parameters: string;
              schema?: string;
              ifExists: boolean;
              cascade: boolean;
            };
            const result = await dropFunction(
              connectionString,
              functionName,
              parameters,
              {
                schema,
                ifExists,
                cascade
              }
            );
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2)
                }
              ]
            };
          }
          
          // Row-Level Security handlers
          case 'enable_rls': {
            const { connectionString, tableName, schema } = request.params.arguments as {
              connectionString: string;
              tableName: string;
              schema?: string;
            };
            const result = await enableRLS(connectionString, tableName, schema);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2)
                }
              ]
            };
          }
          
          case 'disable_rls': {
            const { connectionString, tableName, schema } = request.params.arguments as {
              connectionString: string;
              tableName: string;
              schema?: string;
            };
            const result = await disableRLS(connectionString, tableName, schema);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2)
                }
              ]
            };
          }
          
          case 'create_rls_policy': {
            const { connectionString, tableName, policyName, using, check, schema, command, role, replace } = request.params.arguments as {
              connectionString: string;
              tableName: string;
              policyName: string;
              using: string;
              check?: string;
              schema?: string;
              command?: 'ALL' | 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
              role?: string;
              replace?: boolean;
            };
            const result = await createRLSPolicy(
              connectionString,
              tableName,
              policyName,
              using,
              check,
              {
                schema,
                command,
                role,
                replace
              }
            );
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2)
                }
              ]
            };
          }
          
          case 'drop_rls_policy': {
            const { connectionString, tableName, policyName, schema, ifExists } = request.params.arguments as {
              connectionString: string;
              tableName: string;
              policyName: string;
              schema?: string;
              ifExists: boolean;
            };
            const result = await dropRLSPolicy(
              connectionString,
              tableName,
              policyName,
              {
                schema,
                ifExists
              }
            );
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2)
                }
              ]
            };
          }
          
          case 'get_rls_policies': {
            const { connectionString, tableName, schema } = request.params.arguments as {
              connectionString: string;
              tableName?: string;
              schema?: string;
            };
            const result = await getRLSPolicies(connectionString, tableName, schema);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2)
                }
              ]
            };
          }

          // Trigger management handlers
          case 'get_triggers': {
            const { connectionString, tableName, schema } = request.params.arguments as {
              connectionString: string;
              tableName?: string;
              schema?: string;
            };
            const result = await getTriggers(connectionString, tableName, schema);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2)
                }
              ]
            };
          }
          
          case 'create_trigger': {
            const { connectionString, triggerName, tableName, functionName, schema, timing, events, when, forEach, replace } = request.params.arguments as {
              connectionString: string;
              triggerName: string;
              tableName: string;
              functionName: string;
              schema?: string;
              timing?: 'BEFORE' | 'AFTER' | 'INSTEAD OF';
              events?: ('INSERT' | 'UPDATE' | 'DELETE' | 'TRUNCATE')[];
              when?: string;
              forEach?: 'ROW' | 'STATEMENT';
              replace?: boolean;
            };
            const result = await createTrigger(
              connectionString,
              triggerName,
              tableName,
              functionName,
              {
                schema,
                timing,
                events,
                when,
                forEach,
                replace
              }
            );
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2)
                }
              ]
            };
          }
          
          case 'drop_trigger': {
            const { connectionString, triggerName, tableName, schema, ifExists, cascade } = request.params.arguments as {
              connectionString: string;
              triggerName: string;
              tableName: string;
              schema?: string;
              ifExists?: boolean;
              cascade?: boolean;
            };
            const result = await dropTrigger(
              connectionString,
              triggerName,
              tableName,
              {
                schema,
                ifExists,
                cascade
              }
            );
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2)
                }
              ]
            };
          }
          
          case 'set_trigger_state': {
            const { connectionString, triggerName, tableName, enable, schema } = request.params.arguments as {
              connectionString: string;
              triggerName: string;
              tableName: string;
              enable: boolean;
              schema?: string;
            };
            const result = await setTriggerState(
              connectionString,
              triggerName,
              tableName,
              enable,
              {
                schema
              }
            );
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2)
                }
              ]
            };
          }

          case 'edit_rls_policy': {
            const { connectionString, tableName, policyName, schema, roles, using, check } = request.params.arguments as {
              connectionString: string;
              tableName: string;
              policyName: string;
              schema?: string;
              roles?: string[];
              using?: string;
              check?: string;
            };
            const result = await editRLSPolicy(
              connectionString,
              tableName,
              policyName,
              {
                schema,
                roles,
                using,
                check
              }
            );
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2)
                }
              ]
            };
          }

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (error) {
        console.error(`Error handling request for tool ${request.params.name}:`, error);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`
            }
          ],
          isError: true
        };
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('PostgreSQL MCP server running on stdio');
  }
}

const server = new PostgreSQLServer();
server.run().catch(console.error);
