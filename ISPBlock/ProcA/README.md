# ProcA

Demo ISP processing block.

Usage:

- Select `ProcA` from the `ISPBlock` node dropdown.
- Provide input files as JSON such as `{ "raw": "C:/images/input.png" }`.
- `process.py` is the image-processing entry point.
- Current demo behavior copies the input file to the output path when the input file exists.
- Output paths are generated as original image name plus `_ProcA`.
