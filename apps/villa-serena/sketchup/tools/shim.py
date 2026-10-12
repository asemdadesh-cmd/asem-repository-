"""Local stand-in for the Trimble SketchUp connector's Python SDK surface.

Asset scripts in ../assets run unchanged here and inside SketchUp (via the
connector's build_model). This module implements exactly the subset of the
SDK they use, with SketchUp's semantics where they matter for the exported
mesh: vertices weld by position, faces must be planar, edges are shared
between faces, soft/smooth edges blend normals, faces without a material
inherit their parent group/instance material.

It also enforces the connector's sandbox rules (no imports, no exec/eval/
open/type/setattr, no dunder access) so a script that runs here will not be
rejected by build_model's AST validation.
"""
from __future__ import annotations

import ast
import math

WELD = 1e-4  # inches; SketchUp's own weld tolerance is ~0.001"
PLANAR_TOL = 0.005  # inches


class SUPoint3D:
    __slots__ = ("x", "y", "z")

    def __init__(self, x=0.0, y=0.0, z=0.0):
        self.x, self.y, self.z = float(x), float(y), float(z)


class SUVector3D(SUPoint3D):
    pass


class SUPoint2D:
    def __init__(self, x=0.0, y=0.0):
        self.x, self.y = float(x), float(y)


class SUColor:
    def __init__(self, r=0, g=0, b=0, a=255):
        self.red, self.green, self.blue, self.alpha = int(r), int(g), int(b), int(a)


class SUTransformation:
    def __init__(self, flat=None):
        self.m = [float(v) for v in (flat or [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])]
        if len(self.m) != 16:
            raise ValueError("SUTransformation needs 16 values")

    def to_a(self):
        return list(self.m)

    def apply(self, p):
        m = self.m
        x, y, z = p
        return (
            m[0] * x + m[4] * y + m[8] * z + m[12],
            m[1] * x + m[5] * y + m[9] * z + m[13],
            m[2] * x + m[6] * y + m[10] * z + m[14],
        )

    def mul(self, other):
        a, b = self.m, other.m
        out = [0.0] * 16
        for c in range(4):
            for r in range(4):
                out[c * 4 + r] = sum(a[k * 4 + r] * b[c * 4 + k] for k in range(4))
        return SUTransformation(out)


class LoopInput:
    def __init__(self):
        self.idx = []

    def add_vertex_index(self, i):
        self.idx.append(int(i))
        return self


class GeometryInput:
    def __init__(self):
        self.verts = []
        self.faces = []  # [outer, [holes], front_mat]

    def set_vertices(self, pts):
        self.verts = [(p.x, p.y, p.z) for p in pts]
        return self

    def add_vertex(self, p):
        self.verts.append((p.x, p.y, p.z))
        return self

    def add_face(self, loop):
        self.faces.append([list(loop.idx), [], None])
        return len(self.faces) - 1, self

    def face_add_inner_loop(self, fi, loop):
        self.faces[fi][1].append(list(loop.idx))
        return self

    def add_arc_curve(self, start, end, center, normal, n):
        # Curve registration only affects SketchUp's inference/edit tools.
        return 0, 0, self

    def face_set_front_material(self, fi, *args):
        self.faces[fi][2] = args[-1]
        return self


class Vertex:
    __slots__ = ("p", "id")

    def __init__(self, p, vid):
        self.p = p
        self.id = vid

    def get_position(self):
        return SUPoint3D(*self.p)


class Edge:
    def __init__(self, a, b):
        self.a, self.b = a, b
        self.faces = []
        self.soft = False
        self.smooth = False

    def get_faces(self):
        return list(self.faces)

    def get_num_faces(self):
        return len(self.faces)

    def set_soft(self, v):
        self.soft = bool(v)

    def set_smooth(self, v):
        self.smooth = bool(v)

    def get_soft(self):
        return self.soft

    def get_smooth(self):
        return self.smooth

    def get_start_vertex(self):
        return self.a

    def get_end_vertex(self):
        return self.b

    def is_reversed_in_face(self, face):
        for loop in [face.outer] + face.holes:
            k = len(loop)
            for i in range(k):
                if loop[i] is self.a and loop[(i + 1) % k] is self.b:
                    return False
                if loop[i] is self.b and loop[(i + 1) % k] is self.a:
                    return True
        raise ValueError("edge not in face")


def _newell(pts):
    nx = ny = nz = 0.0
    k = len(pts)
    for i in range(k):
        a, b = pts[i], pts[(i + 1) % k]
        nx += (a[1] - b[1]) * (a[2] + b[2])
        ny += (a[2] - b[2]) * (a[0] + b[0])
        nz += (a[0] - b[0]) * (a[1] + b[1])
    return nx, ny, nz


class Face:
    def __init__(self, outer, holes):
        self.outer = outer
        self.holes = holes
        self.front = None
        self.back = None
        self._calc()

    def _calc(self):
        n = _newell([v.p for v in self.outer])
        ln = math.sqrt(n[0] ** 2 + n[1] ** 2 + n[2] ** 2)
        self.n = (n[0] / ln, n[1] / ln, n[2] / ln)
        area = ln / 2
        for h in self.holes:
            hn = _newell([v.p for v in h])
            area -= math.sqrt(hn[0] ** 2 + hn[1] ** 2 + hn[2] ** 2) / 2
        self.area = area

    def get_normal(self):
        return SUVector3D(*self.n)

    def get_area(self):
        return self.area

    def get_vertices(self):
        return list(self.outer)

    def loops(self):
        return [self.outer] + self.holes

    def reverse(self):
        self.outer = self.outer[::-1]
        self.holes = [h[::-1] for h in self.holes]
        self._calc()
        return self

    def set_front_material(self, m):
        self.front = m

    def set_back_material(self, m):
        self.back = m

    def get_front_material(self):
        return self.front

    def get_material(self):
        return self.front


class Entities:
    def __init__(self, owner=None):
        self.owner = owner
        self.vmap = {}
        self.verts = []
        self.faces = []
        self.edges = {}
        self.groups = []
        self.instances = []
        self.errors = []

    # --- geometry
    def _vertex(self, p):
        key = (round(p[0] / WELD), round(p[1] / WELD), round(p[2] / WELD))
        v = self.vmap.get(key)
        if v is None:
            v = Vertex(p, len(self.verts))
            self.vmap[key] = v
            self.verts.append(v)
        return v

    def _edge(self, a, b):
        key = (a.id, b.id) if a.id < b.id else (b.id, a.id)
        e = self.edges.get(key)
        if e is None:
            e = Edge(a, b)
            self.edges[key] = e
        return e

    def fill(self, gi, weld_vertices=True):
        seen = set()
        for fi, (outer, holes, fmat) in enumerate(gi.faces):
            loops = []
            ok = True
            for li, loop in enumerate([outer] + holes):
                vs = []
                for i in loop:
                    if i < 0 or i >= len(gi.verts):
                        self.errors.append(f"face {fi}: vertex index {i} out of range")
                        ok = False
                        break
                    v = self._vertex(gi.verts[i])
                    if not vs or vs[-1] is not v:
                        vs.append(v)
                if len(vs) > 1 and vs[0] is vs[-1]:
                    vs.pop()
                if len(set(id(v) for v in vs)) != len(vs) or len(vs) < 3:
                    self.errors.append(f"face {fi}: degenerate loop {li} ({len(vs)} distinct vertices)")
                    ok = False
                loops.append(vs)
            if not ok:
                continue
            pts = [v.p for v in loops[0]]
            n = _newell(pts)
            ln = math.sqrt(n[0] ** 2 + n[1] ** 2 + n[2] ** 2)
            if ln < 1e-9:
                self.errors.append(f"face {fi}: zero area")
                continue
            nn = (n[0] / ln, n[1] / ln, n[2] / ln)
            d0 = sum(nn[k] * pts[0][k] for k in range(3))
            worst = max(abs(sum(nn[k] * v.p[k] for k in range(3)) - d0) for loop in loops for v in loop)
            if worst > PLANAR_TOL:
                self.errors.append(f"face {fi}: not planar (off by {worst:.4f} in)")
                continue
            key = frozenset(v.id for v in loops[0])
            if key in seen:
                self.errors.append(f"face {fi}: duplicate face")
                continue
            seen.add(key)
            face = Face(loops[0], loops[1:])
            face.front = fmat
            self.faces.append(face)
            for loop in loops:
                k = len(loop)
                for i in range(k):
                    e = self._edge(loop[i], loop[(i + 1) % k])
                    e.faces.append(face)
        return self

    def add_group(self, g):
        self.groups.append(g)
        g.parent = self
        return g

    def add_instance(self, inst):
        self.instances.append(inst)
        inst.parent = self
        return inst

    def get_faces(self):
        return list(self.faces)

    def get_edges(self):
        return list(self.edges.values())

    def get_groups(self):
        return list(self.groups)

    def get_instances(self):
        return list(self.instances)

    def erase_entities(self, items):
        for it in items:
            if isinstance(it, Edge):
                for f in list(it.faces):
                    self._drop_face(f)
                key = (it.a.id, it.b.id) if it.a.id < it.b.id else (it.b.id, it.a.id)
                self.edges.pop(key, None)
            elif isinstance(it, Face):
                self._drop_face(it)
            elif isinstance(it, Group):
                self.groups.remove(it)
            elif isinstance(it, ComponentInstance):
                self.instances.remove(it)

    def _drop_face(self, f):
        if f in self.faces:
            self.faces.remove(f)
        for e in self.edges.values():
            if f in e.faces:
                e.faces.remove(f)


class _Drawable:
    def __init__(self):
        self.name = ""
        self.transform = SUTransformation()
        self.material = None
        self.layer = None
        self.hidden = False
        self.parent = None

    def set_name(self, n):
        self.name = str(n)

    def get_name(self):
        return self.name

    def set_transform(self, t):
        self.transform = t

    def get_transform(self):
        return self.transform

    def set_material(self, m):
        self.material = m

    def get_material(self):
        return self.material

    def set_layer(self, lay):
        self.layer = lay

    def get_layer(self):
        return self.layer

    def set_hidden(self, h):
        self.hidden = bool(h)

    def get_hidden(self):
        return self.hidden

    def set_casts_shadows(self, v):
        pass

    def set_receives_shadows(self, v):
        pass


class Group(_Drawable):
    def __init__(self):
        super().__init__()
        self.ents = Entities(self)

    def get_entities(self):
        return self.ents

    def compute_volume(self):
        return _volume(self.ents)


class ComponentDefinition:
    def __init__(self):
        self.name = ""
        self.ents = Entities(self)
        self.instances = []
        self.description = ""

    def set_name(self, n):
        self.name = str(n)

    def get_name(self):
        return self.name

    def set_description(self, d):
        self.description = d

    def get_entities(self):
        return self.ents

    def create_instance(self):
        i = ComponentInstance(self)
        self.instances.append(i)
        return i

    def get_num_instances(self):
        return len(self.instances)

    def get_instances(self):
        return list(self.instances)

    def is_manifold(self):
        return _volume(self.ents) is not None


class ComponentInstance(_Drawable):
    def __init__(self, cd):
        super().__init__()
        self.definition = cd

    def get_component_definition(self):
        return self.definition


def _volume(ents):
    if ents.groups or ents.instances:
        return None
    for e in ents.edges.values():
        if len(e.faces) != 2:
            return None
    vol = 0.0
    for f in ents.faces:
        p = f.outer[0].p
        vol += f.area * (f.n[0] * p[0] + f.n[1] * p[1] + f.n[2] * p[2]) / 3.0
    return vol


class Material:
    def __init__(self):
        self.name = ""
        self.color = SUColor(255, 255, 255, 255)

    def set_name(self, n):
        self.name = str(n)

    def get_name(self):
        return self.name

    def set_color(self, c):
        self.color = c

    def get_color(self):
        return self.color


class Layer:
    def __init__(self):
        self.name = ""
        self.visible = True

    def set_name(self, n):
        self.name = str(n)

    def get_name(self):
        return self.name

    def set_visibility(self, v):
        self.visible = bool(v)


class Camera:
    def set_orientation(self, eye, target, up):
        self.eye, self.target, self.up = eye, target, up

    def enable_perspective(self, v=True):
        pass

    def set_perspective_frustum_fov(self, fov):
        self.fov = fov


class _Stub:
    """Accepts any call / item access (rendering options, styles…)."""

    def __getattr__(self, name):
        return lambda *a, **k: _Stub()

    def __getitem__(self, k):
        return _Stub()

    def __setitem__(self, k, v):
        pass

    def __call__(self, *a, **k):
        return _Stub()


class _Enum(_Stub):
    def __getitem__(self, k):
        return k


class Model:
    def __init__(self):
        self.ents = Entities(self)
        self.materials = []
        self.defs = []
        self.layers = []
        self.camera = None

    def get_entities(self):
        return self.ents

    def add_materials(self, mats):
        names = {m.name for m in self.materials}
        for m in mats:
            if m.name in names:
                raise RuntimeError(f"duplicate material name {m.name!r}")
            self.materials.append(m)
            names.add(m.name)

    def get_materials(self):
        return list(self.materials)

    def add_component_definitions(self, defs):
        self.defs.extend(defs)

    def get_component_definitions(self):
        return list(self.defs)

    def add_layers(self, layers):
        self.layers.extend(layers)

    def get_layers(self):
        return list(self.layers)

    def set_camera(self, cam):
        self.camera = cam

    def get_camera(self):
        return self.camera

    def get_rendering_options(self):
        return _Stub()

    def get_shadow_info(self):
        return _Stub()

    def get_styles(self):
        return _Stub()

    def orient_faces_consistently(self, v=True):
        pass


def TypedValue(**kw):
    return kw


BANNED_CALLS = {"exec", "eval", "type", "setattr", "open", "__import__", "compile", "globals", "locals", "vars"}


def check_sandbox(src: str, filename: str) -> None:
    """Mirror of build_model's AST validation (the parts we can know)."""
    tree = ast.parse(src, filename)
    for node in ast.walk(tree):
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            raise SyntaxError(f"{filename}:{node.lineno}: imports are not allowed in build_model")
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id in BANNED_CALLS:
            raise SyntaxError(f"{filename}:{node.lineno}: {node.func.id}() is not allowed in build_model")
        if isinstance(node, ast.Attribute) and node.attr.startswith("__"):
            raise SyntaxError(f"{filename}:{node.lineno}: dunder attribute access is not allowed")
        if isinstance(node, ast.Name) and node.id.startswith("__"):
            raise SyntaxError(f"{filename}:{node.lineno}: dunder names are not allowed")


def new_namespace():
    model = Model()
    ns = {
        "model": model,
        "math": math,
        "session_state": {},
        "SUPoint3D": SUPoint3D,
        "SUVector3D": SUVector3D,
        "SUPoint2D": SUPoint2D,
        "SUColor": SUColor,
        "SUTransformation": SUTransformation,
        "GeometryInput": GeometryInput,
        "LoopInput": LoopInput,
        "Group": Group,
        "ComponentDefinition": ComponentDefinition,
        "ComponentInstance": ComponentInstance,
        "Material": Material,
        "Layer": Layer,
        "Camera": Camera,
        "TypedValue": TypedValue,
        "RenderingOptionKey": _Enum(),
        "ShadowInfoKey": _Enum(),
        "Exception": Exception,
    }
    return ns


def run(ns, src: str, filename: str):
    check_sandbox(src, filename)
    exec(compile(src, filename, "exec"), ns)  # noqa: S102 — trusted local build scripts
    return ns


def collect_errors(model):
    out = []

    def walk(ents, path):
        for e in ents.errors:
            out.append(f"{path}: {e}")
        for g in ents.groups:
            walk(g.ents, f"{path}/{g.name or 'Group'}")

    walk(model.ents, "model")
    for d in model.defs:
        walk(d.ents, d.name)
    return out
