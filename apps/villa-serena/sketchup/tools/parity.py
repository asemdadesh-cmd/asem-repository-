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


def parse(fp):
    """'F1 E2 ... N1/2/3' -> dict of numbers."""
    out = {}
    for tok in fp.split():
        key, val = tok[0], tok[1:]
        if key == "N":
            for i, v in enumerate(val.split("/")):
                out[f"N{i}"] = float(v)
        else:
            out[key] = float(val)
    return out


def same(a, b):
    """Counts must be equal; areas/volumes may differ in the last digits
    (float summation order differs between the two runtimes)."""
    pa, pb = parse(a), parse(b)
    for k in pa:
        if k in ("F", "E", "S", "G", "I"):
            if pa[k] != pb.get(k):
                return False
        elif abs(pa[k] - pb.get(k, 0.0)) > max(1.0, abs(pa[k]) * 1e-5):
            return False
    return True


bad = 0
ok = 0
for name, fp in local.items():
    ref = su.get(name)
    if ref is None:
        print(f"  ?  {name:<16} not yet built in SketchUp")
    elif same(ref, fp):
        ok += 1
        print(f"  ok {name:<16} {fp}" + ("" if ref == fp else "   (float rounding)"))
    else:
        bad += 1
        print(f"  XX {name:<16} SketchUp {ref}\n     {'':<16} local    {fp}")
print(f"\n{ok}/{len(local)} definitions match SketchUp")
sys.exit(1 if bad or errors else 0)
