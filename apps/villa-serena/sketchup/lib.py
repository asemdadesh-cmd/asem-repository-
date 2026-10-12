# Villa Serena — SketchUp modelling library.
#
# This file runs in two places, unchanged:
#   1. inside SketchUp, through the Trimble SketchUp connector's build_model
#      (the real model: geometry validation, Solids, the .skp you can open);
#   2. in tools/shim.py, a local implementation of the same SDK surface that
#      exports glTF for the web game (SketchUp file downloads are not reachable
#      from the build machine). tools/parity.py checks both produce the same
#      geometry fingerprints.
#
# Rules of the connector sandbox apply: no imports, no classes needed, only the
# pre-loaded names (math, SUPoint3D, GeometryInput, Group, ...). Units are
# inches internally; author in metres with the M constant. X = east, Y = north
# (an asset's front faces -Y), Z = up.

M = 39.37007874  # one metre in inches


# --------------------------------------------------------------- mesh lists
# A mesh is {"v": [(x, y, z)], "f": [(outer_indices, [hole_indices, ...])]}.
# Builders return meshes; fill() turns one into SketchUp faces in one pass.

def mnew():
    return {"v": [], "f": []}


def vadd(m, p):
    m["v"].append((float(p[0]), float(p[1]), float(p[2])))
    return len(m["v"]) - 1


def fadd(m, outer, holes=None):
    m["f"].append((list(outer), [list(h) for h in (holes or [])]))


def mmerge(dst, src):
    off = len(dst["v"])
    dst["v"].extend(src["v"])
    for o, hs in src["f"]:
        dst["f"].append(([i + off for i in o], [[i + off for i in h] for h in hs]))
    return dst


def mjoin(meshes):
    out = mnew()
    for m in meshes:
        mmerge(out, m)
    return out


def mmap(m, fn, flip=False):
    out = {"v": [fn(p) for p in m["v"]], "f": []}
    for o, hs in m["f"]:
        if flip:
            out["f"].append((o[::-1], [h[::-1] for h in hs]))
        else:
            out["f"].append((list(o), [list(h) for h in hs]))
    return out


def mmove(m, dx, dy, dz):
    return mmap(m, lambda p: (p[0] + dx, p[1] + dy, p[2] + dz))


def mscale(m, sx, sy, sz):
    return mmap(m, lambda p: (p[0] * sx, p[1] * sy, p[2] * sz), flip=(sx * sy * sz) < 0)


def mrot(m, axis, deg, o=(0.0, 0.0, 0.0)):
    a = math.radians(deg)
    c = math.cos(a)
    s = math.sin(a)

    def f(p):
        x = p[0] - o[0]
        y = p[1] - o[1]
        z = p[2] - o[2]
        if axis == "x":
            y, z = y * c - z * s, y * s + z * c
        elif axis == "y":
            x, z = x * c + z * s, -x * s + z * c
        else:
            x, y = x * c - y * s, x * s + y * c
        return (x + o[0], y + o[1], z + o[2])

    return mmap(m, f)


def mbounds(m):
    xs = [p[0] for p in m["v"]]
    ys = [p[1] for p in m["v"]]
    zs = [p[2] for p in m["v"]]
    return (min(xs), min(ys), min(zs)), (max(xs), max(ys), max(zs))


# ------------------------------------------------------------- vector maths

def vsub(a, b):
    return (a[0] - b[0], a[1] - b[1], a[2] - b[2])


def vcross(a, b):
    return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])


def vdot(a, b):
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]


def vlen(a):
    return math.sqrt(vdot(a, a))


def vnorm(a):
    n = vlen(a)
    if n < 1e-12:
        return (0.0, 0.0, 0.0)
    return (a[0] / n, a[1] / n, a[2] / n)


def newell(pts):
    nx = ny = nz = 0.0
    k = len(pts)
    for i in range(k):
        a = pts[i]
        b = pts[(i + 1) % k]
        nx += (a[1] - b[1]) * (a[2] + b[2])
        ny += (a[2] - b[2]) * (a[0] + b[0])
        nz += (a[0] - b[0]) * (a[1] + b[1])
    return (nx, ny, nz)


def planar(pts, tol=0.002):
    n = vnorm(newell(pts))
    if vlen(n) < 0.5:
        return False
    d0 = vdot(n, pts[0])
    for p in pts[1:]:
        if abs(vdot(n, p) - d0) > tol:
            return False
    return True


def quad(m, a, b, c, d):
    """Quad a-b-c-d (CCW seen from outside). Split into two triangles along
    the shorter diagonal when the four corners are not coplanar."""
    pa, pb, pc, pd = m["v"][a], m["v"][b], m["v"][c], m["v"][d]
    if vlen(vcross(vsub(pb, pa), vsub(pc, pa))) < 1e-9 and vlen(vcross(vsub(pc, pa), vsub(pd, pa))) < 1e-9:
        return
    if planar([pa, pb, pc, pd]):
        fadd(m, [a, b, c, d])
    elif vlen(vsub(pa, pc)) <= vlen(vsub(pb, pd)):
        fadd(m, [a, b, c])
        fadd(m, [a, c, d])
    else:
        fadd(m, [a, b, d])
        fadd(m, [b, c, d])


def tri(m, a, b, c):
    pa, pb, pc = m["v"][a], m["v"][b], m["v"][c]
    if vlen(vcross(vsub(pb, pa), vsub(pc, pa))) > 1e-9:
        fadd(m, [a, b, c])


# ------------------------------------------------------------- 2D profiles

def area2(poly):
    s = 0.0
    for i in range(len(poly)):
        x0, y0 = poly[i]
        x1, y1 = poly[(i + 1) % len(poly)]
        s += x0 * y1 - x1 * y0
    return s * 0.5


def ccw(poly):
    return list(poly) if area2(poly) > 0 else list(poly)[::-1]


def cw(poly):
    return list(poly)[::-1] if area2(poly) > 0 else list(poly)


def rect2(x0, y0, x1, y1):
    return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]


def rrect2(w, d, r, n=4, cx=0.0, cy=0.0):
    """Rounded rectangle centred on (cx, cy), CCW, n segments per corner.
    Tangent points are included so straight sides stay straight."""
    r = max(0.0, min(r, w * 0.5 - 0.02, d * 0.5 - 0.02))
    if r < 0.01:
        return rect2(cx - w / 2, cy - d / 2, cx + w / 2, cy + d / 2)
    hw = w / 2 - r
    hd = d / 2 - r
    corners = [(hw, -hd, -90.0), (hw, hd, 0.0), (-hw, hd, 90.0), (-hw, -hd, 180.0)]
    pts = []
    for (ox, oy, a0) in corners:
        for j in range(n + 1):
            a = math.radians(a0 + 90.0 * j / n)
            pts.append((cx + ox + r * math.cos(a), cy + oy + r * math.sin(a)))
    return pts


def circle2(r, n=16, cx=0.0, cy=0.0, a0=0.0):
    return [(cx + r * math.cos(a0 + 2 * math.pi * i / n), cy + r * math.sin(a0 + 2 * math.pi * i / n)) for i in range(n)]


def offset_poly(poly, d):
    """Offsets a convex-ish CCW polygon outward by d (inward if d < 0)."""
    poly = ccw(poly)
    k = len(poly)
    out = []
    for i in range(k):
        p0 = poly[i - 1]
        p1 = poly[i]
        p2 = poly[(i + 1) % k]
        e0 = vnorm((p1[0] - p0[0], p1[1] - p0[1], 0.0))
        e1 = vnorm((p2[0] - p1[0], p2[1] - p1[1], 0.0))
        n0 = (e0[1], -e0[0])
        n1 = (e1[1], -e1[0])
        bx = n0[0] + n1[0]
        by = n0[1] + n1[1]
        bl = math.sqrt(bx * bx + by * by)
        if bl < 1e-9:
            out.append((p1[0] + n0[0] * d, p1[1] + n0[1] * d))
            continue
        bx /= bl
        by /= bl
        cosh = bx * n0[0] + by * n0[1]
        s = d / max(cosh, 0.2)
        out.append((p1[0] + bx * s, p1[1] + by * s))
    return out


# ---------------------------------------------------------------- builders

def prism(poly, z0, z1, holes=None):
    """Extrudes a 2D polygon (any winding) from z0 to z1; holes become inner
    loops on the caps and tunnels through the solid."""
    poly = ccw(poly)
    holes = [cw(h) for h in (holes or [])]
    m = mnew()
    b = [vadd(m, (x, y, z0)) for x, y in poly]
    t = [vadd(m, (x, y, z1)) for x, y in poly]
    hb = [[vadd(m, (x, y, z0)) for x, y in h] for h in holes]
    ht = [[vadd(m, (x, y, z1)) for x, y in h] for h in holes]
    fadd(m, b[::-1], [h[::-1] for h in hb])
    fadd(m, t, ht)
    for ring_b, ring_t in [(b, t)] + list(zip(hb, ht)):
        k = len(ring_b)
        for i in range(k):
            j = (i + 1) % k
            quad(m, ring_b[i], ring_b[j], ring_t[j], ring_t[i])
    return m


def box(x0, y0, z0, x1, y1, z1):
    return prism(rect2(x0, y0, x1, y1), z0, z1)


def boxc(w, d, h, cx=0.0, cy=0.0, z0=0.0):
    return box(cx - w / 2, cy - d / 2, z0, cx + w / 2, cy + d / 2, z0 + h)


def plane_map(m, plane):
    """Re-maps a mesh built as 2D (u, v) extruded along w (x, y, z) to:
    plane 'xz': (u, v, w) -> (x=u, y=w, z=v)  (a profile seen from the front)
    plane 'yz': (u, v, w) -> (x=w, y=u, z=v)  (a profile seen from the side)."""
    if plane == "xz":
        return mmap(m, lambda p: (p[0], p[2], p[1]), flip=True)
    if plane == "yz":
        return mmap(m, lambda p: (p[2], p[0], p[1]))
    return m


def rr_lathe(w, d, r, n, profile, cx=0.0, cy=0.0):
    """Stack of rounded-rectangle rings: profile = [(z, inset)], walked so the
    material is on the inside of the walk. Rings shrink their corner radius
    with the inset, so every band between rings is made of planar quads.
    The first ring gets a downward cap, the last an upward cap (when its inset
    leaves an opening)."""
    m = mnew()
    rings = []
    for z, ins in profile:
        cr = max(0.06, r - ins)
        pts = rrect2(w - 2 * ins, d - 2 * ins, cr, n, cx, cy)
        rings.append([vadd(m, (x, y, z)) for x, y in pts])
    for i in range(len(rings) - 1):
        a = rings[i]
        b = rings[i + 1]
        k = len(a)
        for j in range(k):
            jj = (j + 1) % k
            quad(m, a[j], a[jj], b[jj], b[j])
    fadd(m, rings[0][::-1])
    fadd(m, rings[-1])
    return m


def pill_profile(h, e, k=3, z0=0.0):
    """(z, inset) profile for a slab of height h with all edges rounded by e."""
    e = min(e, h / 2 - 0.001)
    lo = []
    for t in range(k + 1):
        a = (math.pi / 2) * t / k
        lo.append((z0 + e - e * math.cos(a), e - e * math.sin(a)))
    hi = [(z0 + h - (z - z0), ins) for z, ins in lo[::-1]]
    return lo + hi


def top_round_profile(h, e, k=3, z0=0.0):
    """(z, inset) profile: square bottom, top edges rounded by e."""
    e = min(e, h - 0.001)
    out = [(z0, 0.0), (z0 + h - e, 0.0)]
    for t in range(1, k + 1):
        a = (math.pi / 2) * t / k
        out.append((z0 + h - e + e * math.sin(a), e - e * math.cos(a)))
    return out


def revolve(profile, n=16, cx=0.0, cy=0.0, a0=0.0, closed=False):
    """Solid of revolution about the vertical axis through (cx, cy).
    profile = [(z, r)] walked bottom-to-top along the outside (it may come
    back down an inside wall for cups). r == 0 at an end makes a pole;
    otherwise that end gets a flat cap. closed=True joins the last point back
    to the first (rings, tyres, lathe-turned beads) and adds no caps."""
    m = mnew()
    rings = []
    last = len(profile) - 1
    for i, (z, r) in enumerate(profile):
        if r < 1e-6 and (i == 0 or i == last):
            rings.append(("p", vadd(m, (cx, cy, z))))
        else:
            ring = []
            for j in range(n):
                a = a0 + 2 * math.pi * j / n
                ring.append(vadd(m, (cx + r * math.cos(a), cy + r * math.sin(a), z)))
            rings.append(("r", ring))
    segs = len(rings) if closed else len(rings) - 1
    for i in range(segs):
        i1 = (i + 1) % len(rings)
        ka, A = rings[i]
        kb, B = rings[i1]
        if ka == "r" and kb == "r":
            if abs(profile[i][0] - profile[i1][0]) < 1e-6 and abs(profile[i][1] - profile[i1][1]) < 1e-6:
                continue
            for j in range(n):
                jj = (j + 1) % n
                quad(m, A[j], A[jj], B[jj], B[j])
        elif ka == "p" and kb == "r":
            for j in range(n):
                tri(m, A, B[(j + 1) % n], B[j])
        elif ka == "r" and kb == "p":
            for j in range(n):
                tri(m, A[j], A[(j + 1) % n], B)
    if not closed and rings[0][0] == "r":
        fadd(m, rings[0][1][::-1])
    if not closed and rings[-1][0] == "r":
        fadd(m, rings[-1][1])
    return m


def sphere(r, n=16, rings=8, cx=0.0, cy=0.0, cz=0.0, sz=1.0):
    prof = []
    for i in range(rings + 1):
        a = -math.pi / 2 + math.pi * i / rings
        prof.append((cz + r * sz * math.sin(a), r * math.cos(a) if 0 < i < rings else 0.0))
    return revolve(prof, n, cx, cy)


def cylinder(r, h, n=16, cx=0.0, cy=0.0, z0=0.0):
    return revolve([(z0, r), (z0 + h, r)], n, cx, cy)


def _frames(path):
    """Rotation-minimising frames (double reflection) along a polyline."""
    k = len(path)
    T = []
    for i in range(k):
        if i == 0:
            t = vsub(path[1], path[0])
        elif i == k - 1:
            t = vsub(path[-1], path[-2])
        else:
            t = vadd3(vnorm(vsub(path[i], path[i - 1])), vnorm(vsub(path[i + 1], path[i])))
        T.append(vnorm(t))
    up = (0.0, 0.0, 1.0) if abs(T[0][2]) < 0.9 else (1.0, 0.0, 0.0)
    N0 = vnorm(vcross(vcross(T[0], up), T[0]))
    N = [N0]
    for i in range(k - 1):
        v1 = vsub(path[i + 1], path[i])
        c1 = vdot(v1, v1)
        if c1 < 1e-12:
            N.append(N[-1])
            continue
        rL = vsub(N[i], tuple(2.0 / c1 * vdot(v1, N[i]) * x for x in v1))
        tL = vsub(T[i], tuple(2.0 / c1 * vdot(v1, T[i]) * x for x in v1))
        v2 = vsub(T[i + 1], tL)
        c2 = vdot(v2, v2)
        if c2 < 1e-12:
            N.append(vnorm(rL))
        else:
            N.append(vnorm(vsub(rL, tuple(2.0 / c2 * vdot(v2, rL) * x for x in v2))))
    B = [vcross(T[i], N[i]) for i in range(k)]
    return T, N, B


def vadd3(a, b):
    return (a[0] + b[0], a[1] + b[1], a[2] + b[2])


def sweep(path, radius, n=8, caps=True, section=None, closed=False):
    """Tube along a 3D polyline. radius may be a number or a list (one per
    station). section: optional 2D polygon (CCW) replacing the circle."""
    T, N, B = _frames(path)
    m = mnew()
    rings = []
    sec = section or [(math.cos(2 * math.pi * j / n), math.sin(2 * math.pi * j / n)) for j in range(n)]
    for i, c in enumerate(path):
        r = radius[i] if isinstance(radius, list) else radius
        ring = []
        for (u, v) in sec:
            ring.append(vadd(m, tuple(c[a] + r * (u * N[i][a] + v * B[i][a]) for a in range(3))))
        rings.append(ring)
    kk = len(sec)
    segs = len(rings) if closed else len(rings) - 1
    for i in range(segs):
        A = rings[i]
        Bn = rings[(i + 1) % len(rings)]
        for j in range(kk):
            jj = (j + 1) % kk
            quad(m, A[j], A[jj], Bn[jj], Bn[j])
    if caps and not closed:
        fadd(m, rings[0][::-1])
        fadd(m, rings[-1])
    return m


def loft(rings_pts, cap0=True, cap1=True):
    """Skins a list of rings (each a list of 3D points, same count, wound CCW
    about the direction of travel)."""
    m = mnew()
    rings = [[vadd(m, p) for p in ring] for ring in rings_pts]
    k = len(rings[0])
    for i in range(len(rings) - 1):
        A = rings[i]
        Bn = rings[i + 1]
        for j in range(k):
            jj = (j + 1) % k
            quad(m, A[j], A[jj], Bn[jj], Bn[j])
    if cap0:
        fadd(m, rings[0][::-1])
    if cap1:
        fadd(m, rings[-1])
    return m


def torus(R, r, nu=24, nv=10, cx=0.0, cy=0.0, cz=0.0):
    path = [(cx + R * math.cos(2 * math.pi * i / nu), cy + R * math.sin(2 * math.pi * i / nu), cz) for i in range(nu)]
    return sweep(path, r, nv, caps=False, closed=True)


def arc_pts(cx, cy, r, a0, a1, n, z=0.0):
    return [(cx + r * math.cos(math.radians(a0 + (a1 - a0) * i / n)), cy + r * math.sin(math.radians(a0 + (a1 - a0) * i / n)), z) for i in range(n + 1)]


def bezier(p0, p1, p2, p3, n=12):
    out = []
    for i in range(n + 1):
        t = i / float(n)
        a = (1 - t) ** 3
        b = 3 * (1 - t) ** 2 * t
        c = 3 * (1 - t) * t * t
        d = t ** 3
        out.append(tuple(a * p0[k] + b * p1[k] + c * p2[k] + d * p3[k] for k in range(3)))
    return out


def heightfield(nx, ny, w, d, fn, x0=0.0, y0=0.0, base=None):
    """Grid surface z = fn(x, y) over [x0, x0+w] x [y0, y0+d]. With base set,
    closes it into a solid down to z = base."""
    m = mnew()
    ids = []
    for j in range(ny + 1):
        row = []
        for i in range(nx + 1):
            x = x0 + w * i / nx
            y = y0 + d * j / ny
            row.append(vadd(m, (x, y, fn(x, y))))
        ids.append(row)
    for j in range(ny):
        for i in range(nx):
            quad(m, ids[j][i], ids[j][i + 1], ids[j + 1][i + 1], ids[j + 1][i])
    if base is not None:
        edge = [ids[0][i] for i in range(nx + 1)] + [ids[j][nx] for j in range(1, ny + 1)]
        edge += [ids[ny][i] for i in range(nx - 1, -1, -1)] + [ids[j][0] for j in range(ny - 1, 0, -1)]
        low = [vadd(m, (m["v"][e][0], m["v"][e][1], base)) for e in edge]
        k = len(edge)
        for i in range(k):
            ii = (i + 1) % k
            quad(m, edge[ii], edge[i], low[i], low[ii])
        fadd(m, low[::-1])
    return m


# ------------------------------------------------------- organic shapes

def hash1(x, y=0.0, z=0.0):
    """Deterministic pseudo-random in [0, 1) (no imports in the sandbox)."""
    v = math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453
    return v - math.floor(v)


def vnoise3(x, y, z):
    """Smooth value noise in [0, 1)."""
    xi = math.floor(x)
    yi = math.floor(y)
    zi = math.floor(z)
    xf_ = x - xi
    yf_ = y - yi
    zf_ = z - zi
    u = xf_ * xf_ * (3 - 2 * xf_)
    v = yf_ * yf_ * (3 - 2 * yf_)
    w = zf_ * zf_ * (3 - 2 * zf_)

    def h(i, j, k):
        return hash1(xi + i, yi + j, zi + k)

    x00 = h(0, 0, 0) + (h(1, 0, 0) - h(0, 0, 0)) * u
    x10 = h(0, 1, 0) + (h(1, 1, 0) - h(0, 1, 0)) * u
    x01 = h(0, 0, 1) + (h(1, 0, 1) - h(0, 0, 1)) * u
    x11 = h(0, 1, 1) + (h(1, 1, 1) - h(0, 1, 1)) * u
    y0 = x00 + (x10 - x00) * v
    y1 = x01 + (x11 - x01) * v
    return y0 + (y1 - y0) * w


def blob(r, n=12, rings=8, cx=0.0, cy=0.0, cz=0.0, amp=0.18, freq=2.2, seed=0.0, sz=1.0):
    """Lumpy sphere (foliage clumps, rocks): a UV sphere whose rings are
    pushed in and out by smooth noise. Closed and watertight."""
    m = mnew()
    top = vadd(m, (cx, cy, cz + r * sz))
    bot = vadd(m, (cx, cy, cz - r * sz))
    rows = []
    for i in range(1, rings):
        a = -math.pi / 2 + math.pi * i / rings
        row = []
        for j in range(n):
            t = 2 * math.pi * j / n
            dx = math.cos(a) * math.cos(t)
            dy = math.cos(a) * math.sin(t)
            dz = math.sin(a)
            k = 1.0 + amp * (2.0 * vnoise3(dx * freq + seed, dy * freq + seed * 1.7, dz * freq - seed) - 1.0)
            row.append(vadd(m, (cx + r * k * dx, cy + r * k * dy, cz + r * k * dz * sz)))
        rows.append(row)
    for j in range(n):
        tri(m, bot, rows[0][(j + 1) % n], rows[0][j])
        tri(m, rows[-1][j], rows[-1][(j + 1) % n], top)
    for i in range(len(rows) - 1):
        for j in range(n):
            jj = (j + 1) % n
            quad(m, rows[i][j], rows[i][jj], rows[i + 1][jj], rows[i + 1][j])
    return m


def organic_revolve(profile, n=12, amp=0.1, freq=1.5, seed=0.0, cx=0.0, cy=0.0):
    """Like revolve, but every ring's radius is modulated by smooth noise
    (tree crowns, rough stone). Poles allowed at both ends."""
    m = mnew()
    rings = []
    last = len(profile) - 1
    for i, (z, r) in enumerate(profile):
        if r < 1e-6 and (i == 0 or i == last):
            rings.append(("p", vadd(m, (cx, cy, z))))
            continue
        ring = []
        for j in range(n):
            t = 2 * math.pi * j / n
            k = 1.0 + amp * (2.0 * vnoise3(math.cos(t) * freq + seed, math.sin(t) * freq, z * 0.02 * freq) - 1.0)
            ring.append(vadd(m, (cx + r * k * math.cos(t), cy + r * k * math.sin(t), z)))
        rings.append(("r", ring))
    for i in range(len(rings) - 1):
        ka, A = rings[i]
        kb, B = rings[i + 1]
        if ka == "r" and kb == "r":
            for j in range(n):
                jj = (j + 1) % n
                quad(m, A[j], A[jj], B[jj], B[j])
        elif ka == "p":
            for j in range(n):
                tri(m, A, B[(j + 1) % n], B[j])
        else:
            for j in range(n):
                tri(m, A[j], A[(j + 1) % n], B)
    if rings[0][0] == "r":
        fadd(m, rings[0][1][::-1])
    if rings[-1][0] == "r":
        fadd(m, rings[-1][1])
    return m


# --------------------------------------------------------------- materials

def mat(name, r, g, b, a=255):
    for x in model.get_materials():
        if x.get_name() == name:
            return x
    mm = Material()
    mm.set_name(name)
    mm.set_color(SUColor(r, g, b, a))
    model.add_materials([mm])
    return mm


def layer(name):
    for x in model.get_layers():
        if x.get_name() == name:
            return x
    lay = Layer()
    lay.set_name(name)
    model.add_layers([lay])
    return lay


# ------------------------------------------------------------- SketchUp IO

def fill(ents, m):
    gi = GeometryInput()
    gi.set_vertices([SUPoint3D(p[0], p[1], p[2]) for p in m["v"]])
    for outer, holes in m["f"]:
        lp = LoopInput()
        for i in outer:
            lp.add_vertex_index(i)
        fi, gi = gi.add_face(lp)
        for h in holes:
            il = LoopInput()
            for i in h:
                il.add_vertex_index(i)
            gi = gi.face_add_inner_loop(fi, il)
    ents.fill(gi, weld_vertices=True)


def paint(owner, material):
    for f in owner.get_entities().get_faces():
        f.set_front_material(material)
        f.set_back_material(material)


def soften(ents, deg=30.0):
    """SketchUp's Soften/Smooth Edges by angle: edges whose faces meet at
    less than deg degrees become soft + smooth (normals blend across them)."""
    lim = math.cos(math.radians(deg))
    for e in ents.get_edges():
        fs = e.get_faces()
        if len(fs) == 2:
            a = fs[0].get_normal()
            b = fs[1].get_normal()
            if a.x * b.x + a.y * b.y + a.z * b.z > lim:
                e.set_soft(True)
                e.set_smooth(True)


def part(parent, name, m, material=None, smooth=None):
    """One leaf Group holding one mesh with one material (inside parent, a
    Group/ComponentDefinition entities collection)."""
    g = Group()
    parent.add_group(g)
    fill(g.get_entities(), m)
    if material is not None:
        paint(g, material)
    if smooth:
        soften(g.get_entities(), 89.0 if smooth == "all" else smooth)
    g.set_name(name)
    return g


def xf(x=0.0, y=0.0, z=0.0, rz=0.0, ry=0.0, rx=0.0, s=1.0):
    """Column-major 4x4: scale, then rotate X, Y, Z (degrees), then move."""
    cx, sx = math.cos(math.radians(rx)), math.sin(math.radians(rx))
    cy, sy = math.cos(math.radians(ry)), math.sin(math.radians(ry))
    cz, sz = math.cos(math.radians(rz)), math.sin(math.radians(rz))
    # R = Rz * Ry * Rx
    r00 = cz * cy
    r01 = cz * sy * sx - sz * cx
    r02 = cz * sy * cx + sz * sx
    r10 = sz * cy
    r11 = sz * sy * sx + cz * cx
    r12 = sz * sy * cx - cz * sx
    r20 = -sy
    r21 = cy * sx
    r22 = cy * cx
    return SUTransformation([r00 * s, r10 * s, r20 * s, 0, r01 * s, r11 * s, r21 * s, 0, r02 * s, r12 * s, r22 * s, 0, x, y, z, 1])


def defn(name):
    for d in model.get_component_definitions():
        if d.get_name() == name:
            return d, False
    cd = ComponentDefinition()
    cd.set_name(name)
    model.add_component_definitions([cd])
    return cd, True


def place(cd, parent, t, name=None):
    i = cd.create_instance()
    i.set_transform(t)
    parent.add_instance(i)
    if name:
        i.set_name(name)
    return i


def collider(parent, name, x0, y0, z0, x1, y1, z1):
    """Hidden physics proxy box (layer Colliders), exported as COL_<name>."""
    g = part(parent, "COL_" + name, box(x0, y0, z0, x1, y1, z1))
    g.set_layer(layer("Colliders"))
    g.set_hidden(True)
    return g


def volume(parent, name, x0, y0, z0, x1, y1, z1):
    """Hidden box marking a volume (water, trigger), exported as VOL_<name>."""
    g = part(parent, "VOL_" + name, box(x0, y0, z0, x1, y1, z1))
    g.set_layer(layer("Volumes"))
    g.set_hidden(True)
    return g


def marker(parent, kind, name, x, y, z, rz=0.0):
    """Hidden locator (seat, door hinge, wheel...). The exporter reads its
    transform; a tiny box keeps it a real entity in SketchUp."""
    g = part(parent, kind + "_" + name, boxc(0.4, 0.4, 0.4, 0.0, 0.0, -0.2))
    g.set_transform(xf(x, y, z, rz))
    g.set_layer(layer("Markers"))
    g.set_hidden(True)
    return g


# ------------------------------------------------------------- fingerprint

def fp_ents(ents, acc, seen):
    for f in ents.get_faces():
        a = f.get_area()
        n = f.get_normal()
        p = f.get_vertices()[0].get_position()
        acc["F"] += 1
        acc["A"] += a
        acc["V"] += a * (n.x * p.x + n.y * p.y + n.z * p.z) / 3.0
        acc["NX"] += a * abs(n.x)
        acc["NY"] += a * abs(n.y)
        acc["NZ"] += a * abs(n.z)
    for e in ents.get_edges():
        if e.get_num_faces() > 0:
            acc["E"] += 1
            if e.get_soft():
                acc["S"] += 1
    for g in ents.get_groups():
        fp_ents(g.get_entities(), acc, seen)
        acc["G"] += 1
    for i in ents.get_instances():
        acc["I"] += 1
        d = i.get_component_definition()
        if d.get_name() not in seen:
            seen[d.get_name()] = True
            fp_ents(d.get_entities(), acc, seen)
    return acc


def fingerprint(cd):
    """Geometry summary of a definition and every component nested in it
    (each nested definition counted once). Identical in SketchUp and shim."""
    acc = {"F": 0, "E": 0, "S": 0, "G": 0, "I": 0, "A": 0.0, "V": 0.0, "NX": 0.0, "NY": 0.0, "NZ": 0.0}
    fp_ents(cd.get_entities(), acc, {cd.get_name(): True})
    return "F%d E%d S%d G%d I%d A%.1f V%.1f N%.0f/%.0f/%.0f" % (
        acc["F"], acc["E"], acc["S"], acc["G"], acc["I"], acc["A"], acc["V"], acc["NX"], acc["NY"], acc["NZ"])
