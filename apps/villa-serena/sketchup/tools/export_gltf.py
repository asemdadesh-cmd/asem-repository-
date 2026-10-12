"""glTF 2.0 (GLB) exporter for models built through tools/shim.py.

Mirrors what SketchUp's own glTF export does with a model:
  * inches -> metres, SketchUp Z-up -> glTF Y-up (x, y, z) -> (x, z, -y);
  * every face is triangulated (holes included);
  * soft + smooth edges blend vertex normals (SketchUp smoothing groups);
  * faces without a material inherit the enclosing group/instance material;
  * groups and component instances become nodes; a component's mesh is shared
    by all of its instances.
Hidden helper groups become data-only nodes: COL_* colliders carry their box
in extras.box, other hidden groups (SEAT_*, HINGE_*, WHEEL_*…) are markers.
UVs are planar per face in metres, laid along each face's longer side so wood
grain follows planks and legs.
"""
from __future__ import annotations

import json
import math
import struct

import mapbox_earcut as earcut
import numpy as np

from shim import ComponentDefinition, Entities, SUTransformation

S = 0.0254  # inches -> metres


def to_gltf_point(p):
    return (p[0] * S, p[2] * S, -p[1] * S)


def to_gltf_dir(n):
    return (n[0], n[2], -n[1])


def to_gltf_matrix(t: SUTransformation):
    m = t.m  # column-major
    R = [[m[0], m[4], m[8]], [m[1], m[5], m[9]], [m[2], m[6], m[10]]]
    tx, ty, tz = m[12], m[13], m[14]
    # C = Rc (axis swap); R' = Rc R Rc^T, t' = S * Rc t
    Rc = [[1, 0, 0], [0, 0, 1], [0, -1, 0]]

    def mm(A, B):
        return [[sum(A[i][k] * B[k][j] for k in range(3)) for j in range(3)] for i in range(3)]

    RcT = [[Rc[j][i] for j in range(3)] for i in range(3)]
    Rp = mm(mm(Rc, R), RcT)
    tp = (tx * S, tz * S, -ty * S)
    return [
        Rp[0][0], Rp[1][0], Rp[2][0], 0.0,
        Rp[0][1], Rp[1][1], Rp[2][1], 0.0,
        Rp[0][2], Rp[1][2], Rp[2][2], 0.0,
        tp[0], tp[1], tp[2], 1.0,
    ]


def srgb_to_linear(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


# Default PBR response by material name prefix (the game refines these).
PBR = [
    ("Glass", 0.05, 0.0),
    ("Water", 0.05, 0.0),
    ("Chrome", 0.15, 1.0),
    ("Steel", 0.35, 1.0),
    ("Brass", 0.3, 1.0),
    ("Bronze", 0.4, 1.0),
    ("Iron", 0.55, 0.9),
    ("Metal", 0.4, 1.0),
    ("Paint", 0.45, 0.0),
    ("Lacquer", 0.3, 0.0),
    ("Ceramic", 0.25, 0.0),
    ("Marble", 0.3, 0.0),
    ("Rubber", 0.85, 0.0),
]


def pbr_for(name):
    for prefix, rough, metal in PBR:
        if name.startswith(prefix):
            return rough, metal
    return 0.8, 0.0


class _Builder:
    def __init__(self):
        self.json = {
            "asset": {"version": "2.0", "generator": "Villa Serena SketchUp exporter"},
            "scene": 0,
            "scenes": [{"nodes": []}],
            "nodes": [],
            "meshes": [],
            "materials": [],
            "accessors": [],
            "bufferViews": [],
            "buffers": [{"byteLength": 0}],
        }
        self.bin = bytearray()
        self.mat_index = {}
        self.mesh_cache = {}

    # ----------------------------------------------------------- buffers
    def _view(self, data: bytes, target=None):
        while len(self.bin) % 4:
            self.bin.append(0)
        off = len(self.bin)
        self.bin.extend(data)
        bv = {"buffer": 0, "byteOffset": off, "byteLength": len(data)}
        if target:
            bv["target"] = target
        self.json["bufferViews"].append(bv)
        return len(self.json["bufferViews"]) - 1

    def _accessor(self, arr: np.ndarray, kind: str, target, minmax=False):
        comp = {np.float32: 5126, np.uint16: 5123, np.uint32: 5125}[arr.dtype.type]
        view = self._view(arr.tobytes(), target)
        acc = {"bufferView": view, "componentType": comp, "count": int(arr.shape[0]), "type": kind}
        if minmax:
            acc["min"] = [float(x) for x in arr.min(axis=0)]
            acc["max"] = [float(x) for x in arr.max(axis=0)]
        self.json["accessors"].append(acc)
        return len(self.json["accessors"]) - 1

    # --------------------------------------------------------- materials
    def material(self, m):
        name = m.get_name() if m else "Default"
        if name in self.mat_index:
            return self.mat_index[name]
        c = m.get_color() if m else None
        rgba = [1.0, 1.0, 1.0, 1.0]
        if c is not None:
            rgba = [srgb_to_linear(c.red), srgb_to_linear(c.green), srgb_to_linear(c.blue), c.alpha / 255.0]
        rough, metal = pbr_for(name)
        mat = {
            "name": name,
            "pbrMetallicRoughness": {"baseColorFactor": rgba, "roughnessFactor": rough, "metallicFactor": metal},
        }
        if rgba[3] < 0.999:
            mat["alphaMode"] = "BLEND"
            mat["doubleSided"] = True
        self.json["materials"].append(mat)
        self.mat_index[name] = len(self.json["materials"]) - 1
        return self.mat_index[name]

    # -------------------------------------------------------------- mesh
    def mesh(self, ents: Entities, inherited, name):
        key = (id(ents), inherited.get_name() if inherited else None)
        if key in self.mesh_cache:
            return self.mesh_cache[key]
        if not ents.faces:
            self.mesh_cache[key] = None
            return None
        normals = _smooth_normals(ents)
        by_mat = {}
        for f in ents.faces:
            m = f.front or inherited
            by_mat.setdefault(m.get_name() if m else None, (m, []))[1].append(f)
        prims = []
        for _, (m, faces) in sorted(by_mat.items(), key=lambda kv: kv[0] or ""):
            pos, nor, uv, idx = [], [], [], []
            cache = {}
            for f in faces:
                tris = _triangulate(f)
                ub, vb = _uv_basis(f)
                for t in tris:
                    for v in t:
                        n = normals[(v.id, id(f))]
                        p = v.p
                        uvc = ((p[0] * ub[0] + p[1] * ub[1] + p[2] * ub[2]) * S, (p[0] * vb[0] + p[1] * vb[1] + p[2] * vb[2]) * S)
                        k = (v.id, round(n[0], 4), round(n[1], 4), round(n[2], 4), round(uvc[0], 4), round(uvc[1], 4))
                        i = cache.get(k)
                        if i is None:
                            i = len(pos)
                            cache[k] = i
                            pos.append(to_gltf_point(p))
                            nor.append(to_gltf_dir(n))
                            uv.append(uvc)
                        idx.append(i)
            P = np.array(pos, dtype=np.float32)
            N = np.array(nor, dtype=np.float32)
            T = np.array(uv, dtype=np.float32)
            I = np.array(idx, dtype=np.uint32 if len(pos) > 65535 else np.uint16)
            prims.append({
                "attributes": {
                    "POSITION": self._accessor(P, "VEC3", 34962, minmax=True),
                    "NORMAL": self._accessor(N, "VEC3", 34962),
                    "TEXCOORD_0": self._accessor(T, "VEC2", 34962),
                },
                "indices": self._accessor(I, "SCALAR", 34963),
                "material": self.material(m),
            })
        self.json["meshes"].append({"name": name, "primitives": prims})
        mi = len(self.json["meshes"]) - 1
        self.mesh_cache[key] = mi
        return mi

    # ------------------------------------------------------------- nodes
    def node(self, name, matrix=None, mesh=None, extras=None):
        n = {"name": name}
        if matrix is not None and matrix != [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]:
            n["matrix"] = [round(x, 7) for x in matrix]
        if mesh is not None:
            n["mesh"] = mesh
        if extras:
            n["extras"] = extras
        self.json["nodes"].append(n)
        return len(self.json["nodes"]) - 1

    def contents(self, ents: Entities, inherited, name):
        """Children node indices for an entities collection."""
        kids = []
        mi = self.mesh(ents, inherited, name)
        if mi is not None:
            kids.append(self.node(name + "_mesh", None, mi))
        for g in ents.groups:
            kids.append(self.group(g, inherited))
        for inst in ents.instances:
            kids.append(self.instance(inst, inherited))
        return kids

    def group(self, g, inherited):
        mat = to_gltf_matrix(g.transform)
        if g.hidden:
            return self.helper(g.name or "Hidden", g.ents, mat)
        own = g.material or inherited
        idx = self.node(g.name or "Group", mat)
        kids = self.contents(g.ents, own, g.name or "Group")
        if kids:
            self.json["nodes"][idx]["children"] = kids
        return idx

    def instance(self, inst, inherited):
        mat = to_gltf_matrix(inst.transform)
        own = inst.material or inherited
        cd = inst.definition
        idx = self.node(inst.name or cd.name, mat, extras={"component": cd.name})
        kids = self.contents(cd.ents, own, cd.name)
        if kids:
            self.json["nodes"][idx]["children"] = kids
        return idx

    def helper(self, name, ents, mat):
        pts = [to_gltf_point(v.p) for v in ents.verts]
        extras = {"hidden": True}
        if name.startswith("COL_") or name.startswith("VOL_"):
            a = np.array(pts)
            extras["collider" if name.startswith("COL_") else "volume"] = "box"
            extras["box"] = [round(float(x), 5) for x in list(a.min(axis=0)) + list(a.max(axis=0))]
        else:
            extras["marker"] = name.split("_", 1)[0]
        return self.node(name, mat, extras=extras)

    def asset(self, cd: ComponentDefinition, extras=None):
        idx = self.node(cd.name, None, extras={"asset": True, **(extras or {})})
        kids = self.contents(cd.ents, None, cd.name)
        if kids:
            self.json["nodes"][idx]["children"] = kids
        self.json["scenes"][0]["nodes"].append(idx)
        return idx

    def glb(self) -> bytes:
        while len(self.bin) % 4:
            self.bin.append(0)
        self.json["buffers"][0]["byteLength"] = len(self.bin)
        js = json.dumps(self.json, separators=(",", ":")).encode()
        while len(js) % 4:
            js += b" "
        total = 12 + 8 + len(js) + 8 + len(self.bin)
        out = bytearray()
        out += struct.pack("<III", 0x46546C67, 2, total)
        out += struct.pack("<II", len(js), 0x4E4F534A) + js
        out += struct.pack("<II", len(self.bin), 0x004E4942) + bytes(self.bin)
        return bytes(out)


def _smooth_normals(ents: Entities):
    """Per (vertex, face) normal. Faces around a vertex that are joined by
    smooth edges through that vertex share an area-weighted average."""
    out = {}
    by_vertex = {}
    for f in ents.faces:
        for loop in f.loops():
            for v in loop:
                by_vertex.setdefault(v.id, []).append(f)
    parent = {}

    def find(k):
        while parent[k] != k:
            parent[k] = parent[parent[k]]
            k = parent[k]
        return k

    for vid, faces in by_vertex.items():
        for f in faces:
            parent[(vid, id(f))] = (vid, id(f))
    for e in ents.edges.values():
        if e.smooth and len(e.faces) == 2:
            f0, f1 = e.faces
            for v in (e.a, e.b):
                a, b = find((v.id, id(f0))), find((v.id, id(f1)))
                if a != b:
                    parent[a] = b
    sums = {}
    for vid, faces in by_vertex.items():
        for f in faces:
            r = find((vid, id(f)))
            s = sums.setdefault(r, [0.0, 0.0, 0.0])
            w = max(f.area, 1e-6)
            s[0] += f.n[0] * w
            s[1] += f.n[1] * w
            s[2] += f.n[2] * w
    for vid, faces in by_vertex.items():
        for f in faces:
            s = sums[find((vid, id(f)))]
            ln = math.sqrt(s[0] ** 2 + s[1] ** 2 + s[2] ** 2) or 1.0
            n = (s[0] / ln, s[1] / ln, s[2] / ln)
            # never let a blended normal face away from its own face
            if n[0] * f.n[0] + n[1] * f.n[1] + n[2] * f.n[2] < 0.1:
                n = f.n
            out[(vid, id(f))] = n
    return out


def _basis(n):
    a = (0.0, 0.0, 1.0) if abs(n[2]) < 0.9 else (1.0, 0.0, 0.0)
    u = (a[1] * n[2] - a[2] * n[1], a[2] * n[0] - a[0] * n[2], a[0] * n[1] - a[1] * n[0])
    lu = math.sqrt(sum(x * x for x in u))
    u = tuple(x / lu for x in u)
    v = (n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0])
    return u, v


def _triangulate(f):
    loops = f.loops()
    if len(loops) == 1 and len(loops[0]) == 3:
        return [tuple(loops[0])]
    u, v = _basis(f.n)
    flat = [vv for loop in loops for vv in loop]
    pts = np.array([[sum(p.p[k] * u[k] for k in range(3)), sum(p.p[k] * v[k] for k in range(3))] for p in flat], dtype=np.float64)
    ends = np.cumsum([len(loop) for loop in loops]).astype(np.uint32)
    idx = earcut.triangulate_float64(pts, ends)
    tris = []
    for i in range(0, len(idx), 3):
        a, b, c = flat[idx[i]], flat[idx[i + 1]], flat[idx[i + 2]]
        e1 = [b.p[k] - a.p[k] for k in range(3)]
        e2 = [c.p[k] - a.p[k] for k in range(3)]
        cr = (e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0])
        if cr[0] * f.n[0] + cr[1] * f.n[1] + cr[2] * f.n[2] < 0:
            b, c = c, b
        tris.append((a, b, c))
    return tris


def _uv_basis(f):
    n = f.n
    if abs(n[2]) > 0.7:
        cands = [(1.0, 0.0, 0.0), (0.0, 1.0, 0.0)]
    else:
        h = (-n[1], n[0], 0.0)
        lh = math.sqrt(h[0] ** 2 + h[1] ** 2) or 1.0
        h = (h[0] / lh, h[1] / lh, 0.0)
        b = (n[1] * h[2] - n[2] * h[1], n[2] * h[0] - n[0] * h[2], n[0] * h[1] - n[1] * h[0])
        cands = [h, b]
    pts = [v.p for v in f.outer]

    def extent(ax):
        d = [p[0] * ax[0] + p[1] * ax[1] + p[2] * ax[2] for p in pts]
        return max(d) - min(d)

    a, b = cands
    if extent(b) > extent(a) * 1.05:
        a, b = b, a
    return a, b


def export(defs, path, extras_by_name=None):
    b = _Builder()
    for cd in defs:
        b.asset(cd, (extras_by_name or {}).get(cd.name))
    data = b.glb()
    with open(path, "wb") as fh:
        fh.write(data)
    return len(data)
