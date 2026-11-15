"""Prints a playwright-cli config given as an argument, with the browser set to use the graphics card."""

import json
import sys

with open(sys.argv[1]) as file:
    config = json.load(file)
options = config.setdefault("browser", {}).setdefault("launchOptions", {})
options["args"] = options.get("args", []) + [
    "--use-angle=vulkan",
    "--ignore-gpu-blocklist",
    "--enable-gpu-rasterization",
]
json.dump(config, sys.stdout)
