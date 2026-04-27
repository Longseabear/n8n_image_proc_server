import json
import os
import shutil
import sys


def copy_or_skip(input_path, output_path, require_input):
    if os.path.exists(input_path):
        os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
        shutil.copyfile(input_path, output_path)
        return "copied"

    if require_input:
        raise FileNotFoundError(input_path)

    return "missing_input_skipped"


payload = json.load(sys.stdin)
require_input = bool(payload.get("options", {}).get("requireInputFiles"))
results = {}

for name, input_path in payload.get("inputFiles", {}).items():
    output_path = payload.get("outputFiles", {}).get(name)
    if not output_path:
        continue
    results[name] = {
        "input": input_path,
        "output": output_path,
        "status": copy_or_skip(input_path, output_path, require_input),
    }

print(json.dumps({"blockName": "ProcA", "results": results}))
