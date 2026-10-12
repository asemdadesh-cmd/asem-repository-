# The headland lighthouse: an octagonal stone plinth, a tapering striped
# tower (round outside, a constant 1.25 m shaft inside so a spiral stair can
# hug the wall), 67 stair treads (one component), a gallery with a railing
# and a glazed lantern room you climb into through a hatch.
# Origin: ground level at the centre; the door faces -Y.

R_IN = 1.25  # inner shaft radius


def _r_out(z):
    return 2.2 - 0.6 * (z - 0.6) / 13.4


def _tube(z0, z1, n, gap=None, ro=None, ri=R_IN):
    """Round wall segment between z0 and z1: outside radius ro(z) (the
    tower's taper by default), inside radius ri. gap=(a0, a1) in radians
    leaves a door opening closed off with jambs."""
    ro = ro or _r_out
    m = mnew()
    if gap:
        a0, a1 = gap
        angles = [a1 + (2 * math.pi - (a1 - a0)) * j / float(n) for j in range(n + 1)]
    else:
        angles = [2 * math.pi * j / n for j in range(n)]
    ring = []
    for a in angles:
        c = math.cos(a)
        s = math.sin(a)
        ring.append((
            vadd(m, (ro(z0) * c * M, ro(z0) * s * M, z0 * M)),
            vadd(m, (ro(z1) * c * M, ro(z1) * s * M, z1 * M)),
            vadd(m, (ri * c * M, ri * s * M, z1 * M)),
            vadd(m, (ri * c * M, ri * s * M, z0 * M)),
        ))
    k = len(ring)
    segs = k - 1 if gap else k
    for j in range(segs):
        A = ring[j]
        B = ring[(j + 1) % k]
        quad(m, A[0], B[0], B[1], A[1])  # outside
        quad(m, A[2], B[2], B[3], A[3])  # inside
        fadd(m, [A[1], B[1], B[2], A[2]])  # top
        fadd(m, [A[3], B[3], B[0], A[0]])  # bottom
    if gap:
        s0 = ring[0]
        s1 = ring[-1]
        fadd(m, [s0[0], s0[1], s0[2], s0[3]])  # jamb at the start of the wall
        fadd(m, [s1[3], s1[2], s1[1], s1[0]])  # jamb at the end
    return m


def build():
    out = []
    white = mat("Paint_White", 238, 236, 230)
    red = mat("Paint_Red", 196, 46, 42)
    stone = mat("Stone_Granite", 150, 146, 138)
    iron = mat("Iron_Black", 38, 38, 40)
    glass = mat("Glass_Clear", 188, 214, 220, 70)
    brass = mat("Brass", 196, 160, 92)
    oak = mat("Oak_Weathered", 150, 132, 108)
    beacon = mat("Light_Beacon", 255, 236, 180)
    lens = mat("Glass_Amber", 170, 110, 40, 200)

    tread, tn = defn("Lighthouse_Tread")
    if tn:
        a1 = math.radians(24.0)
        pts = [(0.17 * M, 0.0)]
        for i in range(7):
            a = a1 * i / 6.0
            pts.append((1.22 * math.cos(a) * M, 1.22 * math.sin(a) * M))
        pts.append((0.17 * math.cos(a1) * M, 0.17 * math.sin(a1) * M))
        part(tread.get_entities(), "Tread", prism(pts, -0.06 * M, 0.0), oak)

    cd, new = defn("Lighthouse")
    if not new:
        return [cd, tread]
    E = cd.get_entities()
    part(E, "Plinth", revolve([(0, 3.1 * M), (0.5 * M, 3.1 * M), (0.6 * M, 2.95 * M)], 8, 0, 0, math.pi / 8), stone, 20)
    part(E, "Step", box(-0.7 * M, -3.6 * M, 0, 0.7 * M, -2.9 * M, 0.3 * M), stone)
    part(E, "Floor", cylinder(R_IN * M, 0.02 * M, 32, 0, 0, 0.6 * M), oak, 30)
    top = 14.0  # gallery deck surface
    deck_t = 0.22
    door = (math.radians(270 - 20), math.radians(270 + 20))
    bands = [(0.6, 2.8, white, door), (2.8, 4.6, white, None), (4.6, 6.6, red, None), (6.6, 8.6, white, None),
             (8.6, 10.6, red, None), (10.6, 12.6, white, None), (12.6, top - deck_t, red, None)]
    for k, (z0, z1, m_, gap) in enumerate(bands):
        part(E, "Tower_Band_%d" % (k + 1), _tube(z0, z1, 32, gap), m_, 15)

    # spiral stair around a central column
    part(E, "Column", cylinder(0.17 * M, (top - deck_t - 0.6) * M, 16, 0, 0, 0.6 * M), white, 40)
    rise = 0.2
    a0 = 300.0
    k = 0
    z = 0.6 + rise
    while z < top - 0.1:
        place(tread, E, xf(0, 0, z * M, a0 + k * 22.0), "Tread_%02d" % (k + 1))
        k += 1
        z += rise

    # gallery deck: the stairwell stays open above the last ~2 m of treads
    # (head room), the lamp pedestal stands on the column
    last = k - 1
    first_open = last - int(2.0 / rise)
    h0 = math.radians(a0 + first_open * 22.0 - 5.0)
    h1 = math.radians(a0 + last * 22.0 + 29.0)
    hatch = []
    for i in range(25):
        a = h0 + (h1 - h0) * i / 24.0
        hatch.append((1.2 * math.cos(a) * M, 1.2 * math.sin(a) * M))
    for i in range(24, -1, -1):
        a = h0 + (h1 - h0) * i / 24.0
        hatch.append((0.3 * math.cos(a) * M, 0.3 * math.sin(a) * M))
    deck = [(2.45 * math.cos(2 * math.pi * i / 32) * M, 2.45 * math.sin(2 * math.pi * i / 32) * M) for i in range(32)]
    part(E, "Gallery_Deck", prism(deck, (top - deck_t) * M, top * M, [hatch]), white)
    for j in range(16):
        a = 2 * math.pi * j / 16
        prof = [(1.6, top - deck_t - 0.6), (1.66, top - deck_t - 0.6), (2.35, top - deck_t - 0.02), (2.35, top - deck_t), (1.6, top - deck_t)]
        g = part(E, "Corbel_%02d" % (j + 1), plane_map(prism([(u * M, v * M) for u, v in prof], -0.08 * M, 0.08 * M), "xz"), white)
        g.set_transform(xf(0, 0, 0, math.degrees(a)))
    # railing
    for j in range(32):
        a = 2 * math.pi * (j + 0.5) / 32
        part(E, "Baluster_%02d" % (j + 1), cylinder(0.022 * M, 1.0 * M, 8, 2.32 * math.cos(a) * M, 2.32 * math.sin(a) * M, top * M), iron, 40)
    part(E, "Rail", torus(2.32 * M, 0.035 * M, 48, 8, 0, 0, (top + 1.03) * M), iron, 40)
    part(E, "Rail_Mid", torus(2.32 * M, 0.015 * M, 48, 6, 0, 0, (top + 0.5) * M), iron, 40)

    # lantern room: low wall, eight glazed panes (one left open as a door),
    # mullions, a red dome with a ventilator ball
    lr = 1.32
    part(E, "Lantern_Wall", _tube(top, top + 0.8, 32, (math.radians(271.0), math.radians(314.0)), lambda z: lr, lr - 0.08), red, 20)
    for j in range(8):
        a = 2 * math.pi * j / 8
        a2 = 2 * math.pi * (j + 1) / 8
        p0 = (lr * math.cos(a), lr * math.sin(a))
        p1 = (lr * math.cos(a2), lr * math.sin(a2))
        part(E, "Mullion_%d" % (j + 1), cylinder(0.035 * M, 1.6 * M, 8, p0[0] * M, p0[1] * M, (top + 0.8) * M), iron, 40)
        if j == 6:
            continue  # the doorway onto the gallery (gap in the low wall too)
        mx = (p0[0] + p1[0]) / 2
        my = (p0[1] + p1[1]) / 2
        ln_ = math.sqrt((p1[0] - p0[0]) ** 2 + (p1[1] - p0[1]) ** 2)
        g = part(E, "Pane_%d" % (j + 1), box(-(ln_ / 2 - 0.04) * M, -0.008 * M, 0, (ln_ / 2 - 0.04) * M, 0.008 * M, 1.6 * M), glass)
        g.set_transform(xf(mx * M, my * M, (top + 0.8) * M, math.degrees((a + a2) / 2) + 90.0))
    part(E, "Lantern_Ring", torus(lr * M, 0.05 * M, 32, 8, 0, 0, (top + 2.4) * M), iron, 40)
    part(E, "Dome", revolve([((top + 2.4) * M, (lr + 0.12) * M), ((top + 2.48) * M, (lr + 0.12) * M), ((top + 2.9) * M, (lr * 0.75) * M), ((top + 3.2) * M, (lr * 0.32) * M), ((top + 3.3) * M, 0)], 32), red, 40)
    part(E, "Vent", sphere(0.18 * M, 16, 8, 0, 0, (top + 3.42) * M), iron, 40)
    part(E, "Rod", cylinder(0.015 * M, 0.9 * M, 8, 0, 0, (top + 3.55) * M), brass, 40)
    # the light: pedestal, Fresnel-style lens, glowing lamp
    part(E, "Pedestal", revolve([(top * M, 0.17 * M), ((top + 0.9) * M, 0.12 * M), ((top + 1.0) * M, 0.32 * M), ((top + 1.05) * M, 0.32 * M)], 16), brass, 40)
    shell = [(1.05, 0.3), (1.35, 0.42), (1.75, 0.42), (2.05, 0.3), (2.1, 0.06), (2.06, 0.06), (2.01, 0.28), (1.73, 0.39), (1.37, 0.39), (1.09, 0.28)]
    part(E, "Lens", revolve([((top + z) * M, r * M) for z, r in shell], 16, closed=True), lens, 40)
    part(E, "Lamp", sphere(0.16 * M, 16, 8, 0, 0, (top + 1.55) * M), beacon, 60)
    marker(E, "BEACON", "1", 0, 0, (top + 1.55) * M, 0)
    marker(E, "SPAWN", "gallery", 0, -1.85 * M, top * M, 0)
    marker(E, "SPAWN", "door", 0, -4.2 * M, 0.0, 0)
    return [cd, tread]
