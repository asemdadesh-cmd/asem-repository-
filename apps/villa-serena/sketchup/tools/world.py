"""Payloads that assemble the whole island in SketchUp from the game's own
data (sketchup/world.json, exported from src/world/layout.ts + terrain.ts):
the terrain as a surface-coloured mesh, the sea, and every placed component.

  python3 tools/world.py terrain K N   # row band K of N (keeps payloads small)
  python3 tools/world.py place         # sea, all placements, boat, swing seat

The asset definitions must already exist in the session
(build.py --payload <file> --define-only, the first one with --lib).
Game axes are x east, y up, z south; SketchUp is x east, y north, z up.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
WORLD = os.path.join(HERE, "..", "world.json")

PRELUDE = """_L = session_state['lib']
M = _L['M']; mnew = _L['mnew']; vadd = _L['vadd']; fadd = _L['fadd']; part = _L['part']
mat = _L['mat']; place = _L['place']; xf = _L['xf']; defn = _L['defn']; layer = _L['layer']
def top_group(name):
    for g in model.get_entities().get_groups():
        if g.get_name() == name:
            return g
    g = Group()
    model.get_entities().add_group(g)
    g.set_name(name)
    return g
"""

SURF = {
    "g": ("Terrain_Grass", (118, 146, 74)),
    "s": ("Terrain_Sand", (226, 208, 166)),
    "r": ("Terrain_Rock", (176, 166, 150)),
    "p": ("Terrain_Paving", (204, 192, 170)),
    "w": ("Terrain_Seabed", (196, 178, 136)),
}


def terrain(k, n):
    d = json.load(open(WORLD))
    g = d["grid"]
    nx, nz = g["nx"], g["nz"]
    j0 = (nz * k) // n
    j1 = (nz * (k + 1)) // n
    heights = g["h"][j0 * (nx + 1):(j1 + 1) * (nx + 1)]
    surface = d["surface"][j0 * nx:j1 * nx]
    return PRELUDE + f"""
X0, Z0, STEP, NX = {g['x0']}, {g['z0']}, {g['step']}, {nx}
J0, J1 = {j0}, {j1}
H = {json.dumps(heights, separators=(',', ':'))}
S = {json.dumps(surface)}
SURF = {json.dumps(SURF)}
root = top_group('Terrain')
meshes = {{}}
index = {{}}
def vert(m, key, i, j):
    k2 = (key, i, j)
    if k2 not in index:
        h = H[(j - J0) * (NX + 1) + i] / 100.0
        # game (x, y, z) -> SketchUp (x, -z, y)
        index[k2] = vadd(m, ((X0 + i * STEP) * M, -(Z0 + j * STEP) * M, h * M))
    return index[k2]
for j in range(J0, J1):
    for i in range(NX):
        t = S[(j - J0) * NX + i]
        m = meshes.setdefault(t, mnew())
        a = vert(m, t, i, j); b = vert(m, t, i + 1, j); c = vert(m, t, i, j + 1); dd = vert(m, t, i + 1, j + 1)
        # same split as the game's terrain mesh and physics heightfield
        fadd(m, [a, c, b]); fadd(m, [b, c, dd])
result = {{}}
for t, m in meshes.items():
    name, rgb = SURF[t]
    part(root.get_entities(), name + '_{k}', m, mat(name, rgb[0], rgb[1], rgb[2]), 35.0)
    result[name] = len(m['f'])
"""


def placements():
    d = json.load(open(WORLD))
    extra = [
        # made by the game at runtime: the moored rowboat with its oars, the swing seat
        ["Rowboat", -26.4, 0.0, 74.8, 0, 1, ""],
        ["SwingSeat", -4.0, 4.92, 23.5, 0, 1, ""],
    ]
    return PRELUDE + f"""
P = {json.dumps(d['place'] + extra, separators=(',', ':'))}
defs = {{x.get_name(): x for x in model.get_component_definitions()}}
ivory = mat('Chess_Ivory', 239, 230, 210)
ebony = mat('Chess_Ebony', 43, 37, 34)
island = top_group('Island')
ents = island.get_entities()
missing = []
count = 0
for name, x, y, z, yaw, s, tint in P:
    cd = defs.get(name)
    if cd is None:
        missing.append(name)
        continue
    # game (x, y, z), yaw about +y  ->  SketchUp (x, -z, y), rotation about +z
    i = place(cd, ents, xf(x * M, -z * M, y * M, yaw, 0, 0, s), name)
    if tint:
        i.set_material(ivory if tint == 'ivory' else ebony)
    count += 1
# the oars rest in the boat along its length
oar = defs.get('Oar')
if oar is not None:
    for side in (-0.28, 0.28):
        place(oar, ents, xf((-26.4 + side) * M, (-74.8 + 1.25) * M, 0.42 * M, 0, 0, 0, 1), 'Oar')
# the sea: a still plane at sea level (the terrain shows the coastline)
sea = mnew()
a = _L['vadd'](sea, (-220 * M, 150 * M, 0)); b = vadd(sea, (240 * M, 150 * M, 0)); c = vadd(sea, (240 * M, -420 * M, 0)); e = vadd(sea, (-220 * M, -420 * M, 0))
fadd(sea, [a, e, c, b])
part(top_group('Sea').get_entities(), 'Sea', sea, mat('Sea_Water', 38, 120, 150, 170))
result = {{'placed': count, 'missing': sorted(set(missing))}}
"""


if __name__ == "__main__":
    if sys.argv[1] == "terrain":
        sys.stdout.write(terrain(int(sys.argv[2]), int(sys.argv[3])))
    else:
        sys.stdout.write(placements())
