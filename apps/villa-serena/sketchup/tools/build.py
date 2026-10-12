"""Runs asset scripts locally (through the SketchUp API shim), validates them,
prints SketchUp-comparable fingerprints and exports the game's GLB.

  python3 tools/build.py                 # all assets -> ../public/models/kit.glb
  python3 tools/build.py lounger chair   # only these (fingerprints + checks)
  python3 tools/build.py --payload lounger [--lib] [--at X,Y] [--define-only]
        prints the exact code to send to the SketchUp connector's build_model

Each assets/<name>.py defines build() returning its ComponentDefinition.
"""
from __future__ import annotations

import ast
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)

import shim  # noqa: E402
from export_gltf import export  # noqa: E402

ASSETS = os.path.join(ROOT, "assets")
LIB = os.path.join(ROOT, "lib.py")
OUT = os.path.join(ROOT, "..", "public", "models", "kit.glb")
MANIFEST = os.path.join(ROOT, "assets.json")


def read(p):
    with open(p, encoding="utf-8") as fh:
        return fh.read()


def lib_names():
    tree = ast.parse(read(LIB))
    names = []
    for node in tree.body:
        if isinstance(node, ast.FunctionDef):
            names.append(node.name)
        elif isinstance(node, ast.Assign):
            names += [t.id for t in node.targets if isinstance(t, ast.Name)]
    return names


def manifest():
    """assets.json: {"files": [asset script stems, in build order],
    "meta": {DefinitionName: extras copied onto the glTF asset node}}"""
    return json.loads(read(MANIFEST))


def payload(name, with_lib, at, define_only=False):
    parts = []
    names = lib_names()
    if with_lib:
        parts.append(read(LIB))
        parts.append("session_state['lib'] = {" + ", ".join(f"'{n}': {n}" for n in names) + "}")
    src = read(os.path.join(ASSETS, name + ".py"))
    if not with_lib:
        used = {n.id for n in ast.walk(ast.parse(src)) if isinstance(n, ast.Name)} | {"M", "place", "xf", "fingerprint"}
        parts.append("_L = session_state['lib']\n" + "\n".join(f"{n} = _L['{n}']" for n in names if n in used))
    parts.append(src)
    x, y = at
    if define_only:
        # build the definitions only (the world model places them itself)
        parts.append(
            "defs = build()\n"
            "defs = defs if isinstance(defs, list) else [defs]\n"
            "result = {d.get_name(): fingerprint(d) for d in defs}"
        )
        return "\n\n".join(parts)
    parts.append(
        "defs = build()\n"
        "defs = defs if isinstance(defs, list) else [defs]\n"
        "result = {}\n"
        "for k, d in enumerate(defs):\n"
        f"    place(d, model.get_entities(), xf(({x} + 3.5 * k) * M, {y} * M, 0), d.get_name())\n"
        "    result[d.get_name()] = fingerprint(d)"
    )
    return "\n\n".join(parts)


def build_local(names):
    ns = shim.new_namespace()
    shim.run(ns, read(LIB), "lib.py")
    defs = []
    report = []
    for name in names:
        src = read(os.path.join(ASSETS, name + ".py"))
        ns.pop("build", None)
        shim.run(ns, src, name + ".py")
        out = ns["build"]()
        for cd in out if isinstance(out, list) else [out]:
            defs.append(cd)
            report.append((cd.name, ns["fingerprint"](cd), _solids(cd)))
    errors = shim.collect_errors(ns["model"])
    return ns, defs, report, errors


def _solids(cd):
    """Counts leaf groups that are closed, consistently oriented solids."""
    ok = bad = 0
    bad_names = []

    def walk(ents):
        nonlocal ok, bad
        for g in ents.groups:
            if g.hidden:
                continue
            if g.ents.groups or g.ents.instances:
                walk(g.ents)
                continue
            if not g.ents.faces:
                continue
            v = shim._volume(g.ents)
            consistent = True
            for e in g.ents.edges.values():
                if len(e.faces) == 2 and e.is_reversed_in_face(e.faces[0]) == e.is_reversed_in_face(e.faces[1]):
                    consistent = False
                    break
            if v is not None and v > 0 and consistent:
                ok += 1
            else:
                bad += 1
                bad_names.append(f"{g.name}({'open' if v is None else ('inverted' if v <= 0 else 'mixed')})")

    walk(cd.ents)
    for inst_cd in {i.definition for i in _all_instances(cd.ents)}:
        walk(inst_cd.ents)
    return ok, bad, bad_names


def _all_instances(ents):
    out = list(ents.instances)
    for g in ents.groups:
        out += _all_instances(g.ents)
    for i in list(out):
        out += _all_instances(i.definition.ents)
    return out


def main(argv):
    if argv and argv[0] == "--payload":
        name = argv[1]
        with_lib = "--lib" in argv
        at = (0.0, 0.0)
        if "--at" in argv:
            a = argv[argv.index("--at") + 1].split(",")
            at = (float(a[0]), float(a[1]))
        sys.stdout.write(payload(name, with_lib, at, "--define-only" in argv) + "\n")
        return 0
    names = argv or manifest()["files"]
    ns, defs, report, errors = build_local(names)
    for name, fp, (ok, bad, bad_names) in report:
        line = f"{name:<18} {fp}   solids {ok}/{ok + bad}"
        if bad_names:
            line += "  non-solid: " + ", ".join(bad_names[:8])
        print(line)
    if errors:
        print(f"\n{len(errors)} geometry errors:")
        for e in errors[:40]:
            print("  " + e)
        return 1
    if not argv:
        extras = manifest().get("meta", {})
        keep = [d for d in defs if extras.get(d.name, {}).get("export", True)]
        size = export(keep, OUT, {d.name: extras.get(d.name, {}) for d in keep})
        print(f"\nwrote {os.path.relpath(OUT)} ({size / 1024:.0f} KiB)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
