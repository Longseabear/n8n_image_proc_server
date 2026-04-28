# ProcA

Demo ISP processing block.

Usage:

- Select `ProcA` from the `ISPBlock` node dropdown.
- Provide input files as JSON such as `{ "raw": "C:/images/input.png" }`.
- `process.py` is the Python wrapper entry point.
- `block.json` points to the executable command. Replace it with the real ProcA `.exe` path later.
- Current demo executable copies main/sub input files to their output paths when they exist.
- Output paths are generated as original image name plus `_ProcA`.
