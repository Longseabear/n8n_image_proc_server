import json
import sys


payload = json.load(sys.stdin)
item = payload.get("json", {})
history = list(item.get("ispScripts", []))
history.append("ScriptC")

print(json.dumps({**item, "ispScripts": history, "lastISPScript": "ScriptC"}))
