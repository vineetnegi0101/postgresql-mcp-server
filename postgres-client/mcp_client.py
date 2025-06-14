import json
import re
import subprocess
import itertools
import threading
import time
import select
from config import CONN_STR_TEMPLATE

class MCPClient:
    def __init__(self, node_cmd=['node', 'build/index.js']):
        self.node_cmd = node_cmd
        self.proc = None
        self._id_counter = itertools.count(1)
        self._lock = threading.Lock()  # For thread safety if needed

    def open(self):
        if self.proc is None or self.proc.poll() is not None:
            self.proc = subprocess.Popen(
                self.node_cmd,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1
            )

    def close(self):
        if self.proc:
            try:
                self.proc.stdin.close()
            except Exception:
                pass
            try:
                self.proc.terminate()
                self.proc.wait(timeout=5)
            except Exception:
                pass
            self.proc = None

    def get_connection_string(self, mcp_args, default_db="postgres"):
        dbname = default_db
        if "connectionString" in mcp_args:
            match = re.search(r"dbname=([\w\-]+)", mcp_args["connectionString"])
            if match:
                dbname = match.group(1)
            elif mcp_args["connectionString"].strip() and not mcp_args["connectionString"].startswith("postgresql://"):
                dbname = mcp_args["connectionString"].strip()
        if "sql" in mcp_args and "create database" in mcp_args["sql"].lower():
            match = re.search(r"create database\s+([\w\-]+)", mcp_args["sql"], re.IGNORECASE)
            if match:
                dbname = match.group(1)
        return CONN_STR_TEMPLATE.format(db=dbname)

    def call(self, tool_name, arguments, timeout=10):
        with self._lock:
            self.open()
            arguments["connectionString"] = self.get_connection_string(arguments)
            request_id = next(self._id_counter)
            request = {
                "jsonrpc": "2.0",
                "id": request_id,
                "method": "tools/call",
                "params": {"name": tool_name, "arguments": arguments}
            }
            request_str = json.dumps(request) + '\n'
            print("[DEBUG] Sending to MCP stdin:", request_str.strip())
            self.proc.stdin.write(request_str)
            self.proc.stdin.flush()
            # Wait for response with timeout
            response = ""
            result = None
            start_time = time.time()
            while True:
                if time.time() - start_time > timeout:
                    raise TimeoutError(f"No response from MCP server after {timeout} seconds")
                if self.proc.stdout.readable():
                    line = self.proc.stdout.readline()
                    print("[DEBUG] MCP stdout line:", repr(line))
                    if not line:
                        break
                    response += line
                    if line.strip().startswith('{'):
                        try:
                            parsed = json.loads(line)
                            if parsed.get("id") == request_id:
                                result = parsed
                                break
                        except json.JSONDecodeError:
                            continue
                else:
                    time.sleep(0.05)
            return result 