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

for group_name, input_key, output_key in [
    ("main", "mainInputFiles", "outputMainFiles"),
    ("sub", "subInputFiles", "outputSubFiles"),
]:
    group_results = {}
    for name, input_path in payload.get(input_key, {}).items():
        output_path = payload.get(output_key, {}).get(name)
        if not output_path:
            continue
        group_results[name] = {
            "input": input_path,
            "output": output_path,
            "status": copy_or_skip(input_path, output_path, require_input),
        }
    results[group_name] = group_results

print(json.dumps({"blockName": payload.get("blockName"), "results": results}))
