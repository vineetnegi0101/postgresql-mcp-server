#!/usr/bin/env node
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
import { DatabaseConnection } from './utils/connection.js';

// Define all tool definitions
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
          description: 'PostgreSQL connection string'
        },
        analysisType: {
          type: 'string',
          enum: ['configuration', 'performance', 'security'],
          description: 'Type of analysis to perform'
        }
      },
      required: ['connectionString']
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
          description: 'PostgreSQL connection string'
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
      required: ['connectionString', 'issue']
    }
  },
  
  // New schema management tools
  {
    name: 'get_schema_info',
    description: 'Get schema information for a database or specific table',
    inputSchema: {
      type: 'object',
      properties: {
        connectionString: {
          type: 'string',
          description: 'PostgreSQL connection string'
        },
        tableName: {
          type: 'string',
          description: 'Optional table name to get detailed schema for'
        }
      },
      required: ['connectionString']
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
          description: 'PostgreSQL connection string'
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
      required: ['connectionString', 'tableName', 'columns']
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
          description: 'PostgreSQL connection string'
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
      required: ['connectionString', 'tableName', 'operations']
    }
  },
  
  // New data migration tools
  {
    name: 'export_table_data',
    description: 'Export table data to JSON or CSV format',
    inputSchema: {
      type: 'object',
      properties: {
        connectionString: {
          type: 'string',
          description: 'PostgreSQL connection string'
        },
        tableName: {
          type: 'string',
          description: 'Name of the table to export'
        },
        outputPath: {
          type: 'string',
          description: 'Path to save the exported data'
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
      required: ['connectionString', 'tableName', 'outputPath']
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
          description: 'PostgreSQL connection string'
        },
        tableName: {
          type: 'string',
          description: 'Name of the table to import into'
        },
        inputPath: {
          type: 'string',
          description: 'Path to the file to import'
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
      required: ['connectionString', 'tableName', 'inputPath']
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
  
  // New monitoring tool
  {
    name: 'monitor_database',
    description: 'Get real-time monitoring information for a PostgreSQL database',
    inputSchema: {
      type: 'object',
      properties: {
        connectionString: {
          type: 'string',
          description: 'PostgreSQL connection string'
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
      required: ['connectionString']
    }
  }
];

class PostgreSQLServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'postgresql-mcp-server',
        version: '0.2.0',
      },
      {
        capabilities: {
          tools: TOOL_DEFINITIONS.reduce((acc, tool) => {
            acc[tool.name] = tool;
            return acc;
          }, {} as Record<string, any>),
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

  private async cleanup(): Promise<void> {
    console.error('Shutting down PostgreSQL MCP server...');
    await DatabaseConnection.cleanupPools();
    await this.server.close();
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: TOOL_DEFINITIONS
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          // Original tools
          case 'analyze_database': {
            const { connectionString, analysisType } = request.params.arguments as {
              connectionString: string;
              analysisType?: 'configuration' | 'performance' | 'security';
            };
            const result = await analyzeDatabase(connectionString, analysisType);
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
              connectionString: string;
              issue: 'connection' | 'performance' | 'locks' | 'replication';
              logLevel?: 'info' | 'debug' | 'trace';
            };
            const result = await debugDatabase(connectionString, issue, logLevel);
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
              connectionString: string;
              tableName?: string;
            };
            const result = await getSchemaInfo(connectionString, tableName);
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
              connectionString: string;
              tableName: string;
              columns: { name: string; type: string; nullable?: boolean; default?: string }[];
            };
            const result = await createTable(connectionString, tableName, columns);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2)
                }
              ]
            };
          }
          
          case 'alter_table': {
            const { connectionString, tableName, operations } = request.params.arguments as {
              connectionString: string;
              tableName: string;
              operations: {
                type: 'add' | 'alter' | 'drop';
                columnName: string;
                dataType?: string;
                nullable?: boolean;
                default?: string;
              }[];
            };
            const result = await alterTable(connectionString, tableName, operations);
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
              connectionString: string;
              tableName: string;
              outputPath: string;
              where?: string;
              limit?: number;
              format?: 'json' | 'csv';
            };
            const result = await exportTableData(connectionString, tableName, outputPath, { where, limit, format });
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2)
                }
              ]
            };
          }
          
          case 'import_table_data': {
            const { connectionString, tableName, inputPath, truncateFirst, format, delimiter } = request.params.arguments as {
              connectionString: string;
              tableName: string;
              inputPath: string;
              truncateFirst?: boolean;
              format?: 'json' | 'csv';
              delimiter?: string;
            };
            const result = await importTableData(connectionString, tableName, inputPath, { truncateFirst, format, delimiter });
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2)
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
              connectionString: string;
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
            const result = await monitorDatabase(connectionString, { 
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
