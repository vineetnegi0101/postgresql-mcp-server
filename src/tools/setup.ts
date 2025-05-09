import { z } from 'zod';
import type { PostgresTool, GetConnectionStringFn, ToolOutput } from '../types/tool.js';
// McpError and ErrorCode are not strictly needed here as this tool doesn't throw them,
// but good practice to have available if future changes require error handling.
// import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js'; 

interface SetupInstructions {
  steps: string[];
  configuration: string[];
  postInstall: string[];
}

const GetSetupInstructionsInputSchema = z.object({
  platform: z.enum(['linux', 'macos', 'windows']),
  version: z.string().optional().default('latest'),
  useCase: z.enum(['development', 'production']).optional().default('development'),
});

type GetSetupInstructionsInput = z.infer<typeof GetSetupInstructionsInputSchema>;

// The core logic of getSetupInstructions remains largely the same,
// but it's no longer exported directly. It will be called by the execute method of the tool.
function generateSetupInstructions(
  input: GetSetupInstructionsInput
): SetupInstructions {
  const { platform, version, useCase } = input;
  const instructions: SetupInstructions = {
    steps: [],
    configuration: [],
    postInstall: []
  };

  // Installation steps
  switch (platform) {
    case 'linux':
      instructions.steps = [
        '# Add PostgreSQL repository',
        'sudo sh -c \'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list\'',
        'wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -',
        'sudo apt-get update',
        `sudo apt-get install postgresql${version === 'latest' ? '' : `-${version}`}`,
        '# Start PostgreSQL service',
        'sudo systemctl start postgresql',
        'sudo systemctl enable postgresql'
      ];
      break;

    case 'macos':
      instructions.steps = [
        '# Install PostgreSQL using Homebrew',
        'brew update',
        `brew install postgresql${version === 'latest' ? '' : `@${version}`}`,
        '# Start PostgreSQL service',
        'brew services start postgresql'
      ];
      break;

    case 'windows':
      instructions.steps = [
        '# Download PostgreSQL installer',
        'Download the installer from https://www.postgresql.org/download/windows/',
        'Run the installer and follow the setup wizard',
        'Ensure to remember the superuser password you set during installation'
      ];
      break;
  }

  // Basic configuration
  instructions.configuration = [
    '# Edit postgresql.conf with recommended settings',
    useCase === 'production' ? 'max_connections = 100' : 'max_connections = 20',
    useCase === 'production' ? 'shared_buffers = 25% of RAM' : 'shared_buffers = 128MB',
    'work_mem = 4MB',
    'maintenance_work_mem = 64MB',
    'effective_cache_size = 50% of RAM',
    'synchronous_commit = on',
    'fsync = on',
    useCase === 'production' ? 'full_page_writes = on' : 'full_page_writes = off',
    'log_destination = \'csvlog\'',
    'logging_collector = on',
    'log_min_duration_statement = 250ms'
  ];

  // Security configuration for production
  if (useCase === 'production') {
    instructions.configuration.push(
      '# Security settings',
      'ssl = on',
      'ssl_cert_file = \'server.crt\'',
      'ssl_key_file = \'server.key\'',
      'password_encryption = scram-sha-256',
      'authentication_timeout = 1min'
    );
  }

  // Post-installation steps
  instructions.postInstall = [
    '# Create a new database and user',
    'sudo -u postgres psql',
    'CREATE DATABASE myapp;',
    'CREATE USER myuser WITH ENCRYPTED PASSWORD \'mypass\';',
    'GRANT ALL PRIVILEGES ON DATABASE myapp TO myuser;',
    '\\q'
  ];

  if (useCase === 'production') {
    instructions.postInstall.push(
      '# Additional production security steps',
      'pg_hba.conf configuration:',
      'hostssl all all 0.0.0.0/0 scram-sha-256',
      'host all all 127.0.0.1/32 scram-sha-256',
      '',
      '# Setup automated backups',
      '# Add to crontab:',
      '0 0 * * * pg_dump -U postgres myapp > /backup/myapp_$(date +%Y%m%d).sql'
    );
  }

  return instructions;
}

export const getSetupInstructionsTool: PostgresTool = {
  name: 'pg_get_setup_instructions',
  description: 'Get step-by-step PostgreSQL setup instructions',
  inputSchema: GetSetupInstructionsInputSchema,
  // This tool doesn't need a connection string, so getConnectionString is not used.
  async execute(params: unknown, _getConnectionString: GetConnectionStringFn): Promise<ToolOutput> {
    const validationResult = GetSetupInstructionsInputSchema.safeParse(params);
    if (!validationResult.success) {
      return {
        content: [{ type: 'text', text: `Invalid input: ${validationResult.error.format()}` }],
        isError: true,
      };
    }

    try {
      // Call the original logic, now as an internal function
      const instructions = generateSetupInstructions(validationResult.data);
      
      // Format the SetupInstructions into ToolOutput
      // For simplicity, joining each section into a single text block.
      // Could also be multiple text blocks or a JSON block.
      const outputText = 
`Installation Steps:\n${instructions.steps.join('\n')}\n
Configuration:\n${instructions.configuration.join('\n')}\n
Post-Installation:\n${instructions.postInstall.join('\n')}`;

      return {
        content: [{ type: 'text', text: outputText }],
      };
    } catch (error) {
      // Should not happen with current synchronous generateSetupInstructions,
      // but good for robustness if it were async or could throw other errors.
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text', text: `Error generating setup instructions: ${errorMessage}` }],
        isError: true,
      };
    }
  }
}; 

// The old getSetupInstructions is no longer exported.