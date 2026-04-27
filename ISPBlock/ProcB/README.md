# ProcB

Demo ISP processing block.

Usage:

- Select `ProcB` from the `ISPBlock` node dropdown.
- Connect it after another `ISPBlock` node, or provide input files directly.
- `process.py` is the image-processing entry point.
- Current demo behavior copies the previous block input file to the output path when the input file exists.
- Output paths are generated as original image name plus `_ProcB`.
