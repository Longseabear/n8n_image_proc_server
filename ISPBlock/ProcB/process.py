import json
import sys

from isp_common.exe import run_block_executable


payload = json.load(sys.stdin)
print(json.dumps(run_block_executable(payload)))
