import json
import sys


payload = json.load(sys.stdin)

item = payload.get("json", {})
preset = payload.get("preset", {})
globals_ = payload.get("globals", {})

value = str(item.get("value", ""))
append_text = str(preset.get("appendText", ""))
global_parameter = globals_.get("PIPELINE_GLOBAL_PARAMETER", "")

print(
    json.dumps(
        {
            **item,
            "value": value + append_text,
            "preset": preset.get("name", ""),
            "appended": append_text,
            "globalParameter": global_parameter,
        }
    )
)
