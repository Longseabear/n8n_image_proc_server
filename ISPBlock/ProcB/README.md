# ProcB

Demo ISP processing block.

Usage:

- Select `ProcB` from the `ISPBlock` node dropdown.
- Connect it after another `ISPBlock` node, or provide input files directly.
- `process.py` is the Python wrapper entry point.
- `block.json` points to the executable command. Replace it with the real ProcB `.exe` path later.
- Current demo executable copies main/sub input files to their output paths when they exist.
- Output paths are generated as original image name plus `_ProcB`.
