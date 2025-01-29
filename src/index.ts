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

const TOOL_DEFINITIONS = [
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
  }
];

class PostgreSQLServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'postgresql-mcp-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {
            analyze_database: TOOL_DEFINITIONS[0],
            get_setup_instructions: TOOL_DEFINITIONS[1],
            debug_database: TOOL_DEFINITIONS[2]
          },
        },
      }
    );

    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: TOOL_DEFINITIONS
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
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

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (error) {
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
