"""Compares SketchUp's fingerprints (parity.json, pasted from build_model
results) with the local exporter's. Exit code 1 on any mismatch.

  python3 tools/parity.py
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import build  # noqa: E402

ROOT = os.path.dirname(HERE)
su = json.load(open(os.path.join(ROOT, "parity.json")))
_, defs, report, errors = build.build_local(build.manifest()["files"])
local = {name: fp for name, fp, _ in report}
bad = 0
for name, fp in local.items():
    ref = su.get(name)
    if ref is None:
        print(f"  ?  {name:<16} not yet built in SketchUp")
    elif ref == fp:
        print(f"  ok {name:<16} {fp}")
    else:
        bad += 1
        print(f"  XX {name:<16} SketchUp {ref}\n     {'':<16} local    {fp}")
print(f"\n{sum(1 for n in local if su.get(n) == local[n])}/{len(local)} definitions match SketchUp exactly")
sys.exit(1 if bad or errors else 0)
