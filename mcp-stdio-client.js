const { spawn } = require('child_process');

// Start the MCP server as a child process
const server = spawn('node', ['build/index.js'], {
  stdio: ['pipe', 'pipe', 'inherit']
});

// Example MCP JSON-RPC request (list tools)
const request = {
  jsonrpc: "2.0",
  id: 1,
  method: "list_tools",
  params: {}
};

server.stdout.on('data', (data) => {
  console.log('Server response:', data.toString());
});

// Send the request to the server
server.stdin.write(JSON.stringify(request) + '\n');

// Optionally, close after a short delay
setTimeout(() => {
  server.stdin.end();
  server.kill();
}, 2000); 