import json
with open(r'C:\Users\Miguel\.gemini\antigravity\brain\6d8a2f71-18e6-4651-afed-0cf1503c173c\.system_generated\logs\transcript.jsonl', encoding='utf-8') as f:
    for line in f:
        data = json.loads(line)
        idx = data.get('step_index', 0)
        if 500 <= idx <= 538:
            print(f"STEP {idx}: Source={data.get('source')} Type={data.get('type')} Status={data.get('status')}")
            if data.get('content'):
                print(f"  Content: {data.get('content')[:150]}")
            if data.get('tool_calls'):
                print(f"  Tool Calls: {data.get('tool_calls')}")
            print("-" * 50)
