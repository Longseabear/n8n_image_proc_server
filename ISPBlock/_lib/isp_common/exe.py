import json
import os
import subprocess
import sys
from pathlib import Path


def isp_root():
    return Path(os.environ.get("ISP_ROOT", Path(__file__).resolve().parents[2]))


def load_block_config(block_name):
    config_path = isp_root() / block_name / "block.json"
    if not config_path.exists():
        return {
            "executable": sys.executable,
            "args": [str(isp_root() / "_tools" / "mock_isp_exe.py")],
        }

    with config_path.open("r", encoding="utf-8") as file:
        return json.load(file)


def expand_token(value):
    if not isinstance(value, str):
        return value

    return value.replace("${ISP_ROOT}", str(isp_root()))


def run_block_executable(payload):
    block_name = payload["blockName"]
    config = load_block_config(block_name)
    executable = expand_token(config.get("executable") or sys.executable)
    args = [expand_token(arg) for arg in config.get("args", [])]
    timeout = payload.get("options", {}).get("timeoutMs", 30000) / 1000

    completed = subprocess.run(
        [executable, *args],
        input=json.dumps(payload),
        text=True,
        encoding="utf-8",
        capture_output=True,
        timeout=timeout,
        check=False,
    )

    if completed.returncode != 0:
        raise RuntimeError(completed.stderr.strip() or f"executable exited with {completed.returncode}")

    stdout = completed.stdout.strip()
    if not stdout:
        return {"blockName": block_name, "executable": executable, "args": args}

    result = json.loads(stdout)
    result.setdefault("blockName", block_name)
    result.setdefault("executable", executable)
    result.setdefault("args", args)
    return result
