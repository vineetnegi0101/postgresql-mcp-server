import subprocess
import json
import time

# Start the MCP server as a subprocess
proc = subprocess.Popen(
    ['node', 'build/index.js'],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True
)

# Example: List all users
request = {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
        "name": "pg_manage_users",
        "arguments": {
            "operation": "list",
            "connectionString": "postgresql://postgres:mysecretpassword@localhost:5432/postgres"
        }
    }
}

# Send the request
proc.stdin.write(json.dumps(request) + '\n')
proc.stdin.flush()

# Read the response (wait for a line of output)
response = ""
while True:
    line = proc.stdout.readline()
    if not line:
        break
    response += line
    try:
        # Try to parse JSON from the output
        result = json.loads(line)
        print("MCP Response:", json.dumps(result, indent=2))
        break
    except json.JSONDecodeError:
        continue

# Clean up
proc.stdin.close()
proc.terminate() 