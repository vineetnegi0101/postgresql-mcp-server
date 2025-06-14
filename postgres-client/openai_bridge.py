import json
from openai import OpenAI
from config import OPENAI_API_KEY
from schemas import function_schemas, function_to_mcp
from mcp_client import MCPClient

def patch_args(func_name, mcp_args):
    """Apply any special argument patches (e.g., for CREATE DATABASE)."""
    if func_name == "execute_sql" and "sql" in mcp_args and "create database" in mcp_args["sql"].lower():
        mcp_args["transactional"] = False
    return mcp_args

def run_openai_mcp_loop():
    print("[DEBUG] Initializing OpenAI and MCPClient...")
    client = OpenAI(api_key=OPENAI_API_KEY)
    mcp_client = MCPClient()
    system_prompt = (
        "You are a PostgreSQL database assistant. "
        "You MUST ALWAYS use a function/tool call for every user request. "
        "Never answer with plain text. If you cannot answer with a function/tool call, return an error. "
        "If the user asks for a database query, listing, or modification, "
        "ALWAYS use the most appropriate function/tool. "
        "If you do not use a function/tool call, you are not following instructions."
    )
    user_input = input("Ask your database question: ")
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_input}
    ]
    print("[DEBUG] Sending request to OpenAI...")
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=messages,
        functions=function_schemas,
        function_call="auto"
    )
    print("[DEBUG] OpenAI response received.")
    message = response.choices[0].message
    if message.function_call:
        func = message.function_call
        func_name = func.name
        func_args = json.loads(func.arguments or "{}")
        print(f"[DEBUG] OpenAI chose function: {func_name} with args: {func_args}")
        mcp_tool, static_args = function_to_mcp[func_name]
        mcp_args = static_args.copy() if static_args else {}
        mcp_args.update(func_args)
        mcp_args = patch_args(func_name, mcp_args)
        mcp_args["connectionString"] = mcp_client.get_connection_string(mcp_args)
        print("[DEBUG] Connection string used:", mcp_args["connectionString"])
        print("[DEBUG] MCP Request:", json.dumps({"tool": mcp_tool, "arguments": mcp_args}, indent=2))
        print("[DEBUG] Sending request to MCP server...")
        result = mcp_client.call(mcp_tool, mcp_args)
        print("[DEBUG] Raw MCP response:", result)
        print("[DEBUG] Parsing MCP response...")
        if result and "result" in result and "content" in result["result"]:
            for item in result["result"]["content"]:
                if item.get("type") == "text":
                    print(item.get("text"))
        else:
            print("MCP Result:", json.dumps(result, indent=2))
    else:
        print("[ERROR] OpenAI did not select a function/tool call. This is not allowed.")
        raise RuntimeError("OpenAI did not select a function/tool call. The system is configured to only allow tool/function calls.") 