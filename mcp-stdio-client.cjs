const { spawn } = require('child_process');

// Start the MCP server as a child process
const server = spawn('node', ['build/index.js'], {
  stdio: ['pipe', 'pipe', 'inherit']
});

// Correct MCP JSON-RPC request (list tools)
const request = {
  jsonrpc: "2.0",
  id: 1,
  method: "tools/list",
  params: {}
};

server.stdout.on('data', (data) => {
  console.log('[STDOUT]', data.toString());
});

server.stderr && server.stderr.on('data', (data) => {
  console.error('[STDERR]', data.toString());
});

// Send the request to the server
server.stdin.write(JSON.stringify(request) + '\n');

// Wait longer before closing
setTimeout(() => {
  server.stdin.end();
  server.kill();
}, 5000); 