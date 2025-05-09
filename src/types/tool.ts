import type { z } from 'zod';
import type { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

export type GetConnectionStringFn = (connectionStringArg?: string) => string;

export interface ToolOutput {
    content: Array<{ type: 'text'; text: string }>;
    isError?: boolean;
}

export interface PostgresTool {
    name: string;
    description: string;
    inputSchema: z.ZodTypeAny; // Zod schema, will be converted to JSON schema for MCP
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    execute: (args: any, getConnectionString: GetConnectionStringFn) => Promise<ToolOutput>;
} 