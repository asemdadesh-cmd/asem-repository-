# Beach and sea: a modular timber pier (section + end platform), pier lamp,
# mooring bollard, park bench, lifebuoy, a clinker-style rowboat with oars,
# a thatched beach bar, a sit-on-top kayak, a surfboard and a volleyball net.
# Pier pieces: deck top at z = 0, running along Y (sea toward -Y).

def _offset_open(pts, d):
    """Offsets an open 2D polyline (x, z) by d along its left normal."""
    out = []
    k = len(pts)
    for i in range(k):
        a = pts[max(i - 1, 0)]
        b = pts[min(i + 1, k - 1)]
        tx = b[0] - a[0]
        tz = b[1] - a[1]
        ln = math.sqrt(tx * tx + tz * tz) or 1.0
        out.append((pts[i][0] - tz / ln * d, pts[i][1] + tx / ln * d))
    return out


BOAT_L = 3.6
BOAT_B = 1.36


def _boat_t(y):
    return (BOAT_L / 2 - y) / BOAT_L


def _boat_b(t):
    """Half-beam (m) along the boat: t = 0 at the transom, 1 at the stem."""
    if t < 0.45:
        f = 0.72 + 0.28 * math.sin(math.pi * t / 0.45 * 0.5)
    else:
        f = math.cos((t - 0.45) / 0.55 * math.pi * 0.5) ** 0.85
    return max(0.02, 0.5 * BOAT_B * f)


def _boat_keel(t):
    return 0.06 * (t ** 3) + 0.04 * ((1 - t) ** 4)


def _boat_sheer(t):
    return 0.52 + 0.16 * (t ** 2.2) + 0.07 * ((1 - t) ** 3)


def _boat_half_width_at(t, z):
    """Inside half-width of the hull at height z (m) above the keel line."""
    depth = 0.48 - _boat_keel(t)
    zz = max(0.0, z - _boat_keel(t))
    u = min(1.0, (zz / (depth * 0.92)) ** (1 / 1.6))
    return u * _boat_b(t) - 0.03


def _hull_ring(y, b, depth, sheer, thick):
    """One cross-section of a hollow hull: outer skin from the -X gunwale
    over the keel to +X, then the inner skin back (CCW about -Y)."""
    outer = []
    for i in range(9):
        u = -1.0 + 2.0 * i / 8.0
        x = u * b
        z = depth * (abs(u) ** 1.6) * 0.92
        outer.append((x, z))
    outer[0] = (-b, sheer)
    outer[-1] = (b, sheer)
    inner = _offset_open(outer, thick)
    inner[0] = (-b + thick, sheer)
    inner[-1] = (b - thick, sheer)
    ring = [(p[0], y, p[1]) for p in outer] + [(p[0], y, p[1]) for p in inner[::-1]]
    return ring, inner


def build():
    out = []
    deck = mat("Deck_Teak", 160, 126, 92)
    oak = mat("Oak_Weathered", 150, 132, 108)
    pile = mat("Driftwood", 168, 150, 128)
    rope = mat("Rope_Natural", 196, 176, 140)
    iron = mat("Iron_Black", 38, 38, 40)
    brass = mat("Brass", 196, 160, 92)
    glass = mat("Glass_Clear", 188, 214, 220, 70)
    light = mat("Light_Warm", 255, 214, 160)
    teak = mat("Teak", 150, 101, 62)

    # ----------------------------------------------------------- plank
    plank, pn = defn("Pier_Plank")
    if pn:
        part(plank.get_entities(), "Plank", rr_lathe(2.4 * M, 0.14 * M, 0.004 * M, 1, top_round_profile(0.04 * M, 0.008 * M, 2, -0.04 * M)), deck, 40)

    def railing(E, y0, y1, posts):
        for sx in (-1, 1):
            x = sx * 1.16
            for y in posts:
                part(E, "Post_%s_%d" % ("L" if sx < 0 else "R", int(round((y + 10) * 10))), rr_lathe(0.09 * M, 0.09 * M, 0.01 * M, 2, top_round_profile(1.0 * M, 0.02 * M, 2)), oak, 40).set_transform(xf(x * M, y * M, 0))
            pts = []
            for i in range(13):
                t = i / 12.0
                y = y0 + (y1 - y0) * t
                pts.append((x * M, y * M, (0.93 - 0.09 * math.sin(math.pi * t)) * M))
            part(E, "Rope_%s" % ("L" if sx < 0 else "R"), sweep(pts, 0.016 * M, 8), rope, 50)

    sec, sn = defn("PierSection")
    if sn:
        E = sec.get_entities()
        for k in range(20):
            place(plank, E, xf(0, (-1.5 + 0.075 + k * 0.15) * M, 0), "Plank_%02d" % (k + 1))
        for k, x in enumerate((-1.0, 0.0, 1.0)):
            part(E, "Stringer_%d" % (k + 1), box((x - 0.04) * M, -1.5 * M, -0.24 * M, (x + 0.04) * M, 1.5 * M, -0.04 * M), oak)
        part(E, "Cap", box(-1.3 * M, -1.5 * M, -0.44 * M, 1.3 * M, -1.3 * M, -0.24 * M), oak)
        for sx in (-1, 1):
            part(E, "Pile_%s" % ("L" if sx < 0 else "R"), organic_revolve([(-5.5 * M, 0.14 * M), (-1.0 * M, 0.135 * M), (-0.44 * M, 0.13 * M)], 12, 0.05, 3.0, sx * 2.0, sx * 1.12 * M, -1.4 * M), pile, 50)
        railing(E, -1.5, 1.5, (-1.5, 0.0))
        collider(E, "Deck", -1.2 * M, -1.5 * M, -0.24 * M, 1.2 * M, 1.5 * M, 0.0)
        collider(E, "RailL", -1.22 * M, -1.5 * M, 0.0, -1.1 * M, 1.5 * M, 1.0 * M)
        collider(E, "RailR", 1.1 * M, -1.5 * M, 0.0, 1.22 * M, 1.5 * M, 1.0 * M)
    out.append(sec)

    # ---------------------------------------------------------- pier lamp
    lamp, ln = defn("PierLamp")
    if ln:
        E = lamp.get_entities()
        part(E, "Post", revolve([(0, 0.09 * M), (0.06 * M, 0.09 * M), (0.08 * M, 0.06 * M), (0.25 * M, 0.045 * M), (2.3 * M, 0.035 * M), (2.34 * M, 0.05 * M), (2.38 * M, 0.05 * M)], 16), iron, 40)
        part(E, "Lantern_Frame", revolve([(2.38 * M, 0.11 * M), (2.42 * M, 0.12 * M), (2.44 * M, 0.12 * M), (2.44 * M, 0.0)], 6, 0, 0, math.pi / 6), iron, 20)
        part(E, "Lantern_Glass", revolve([(2.44 * M, 0.115 * M), (2.72 * M, 0.14 * M)], 6, 0, 0, math.pi / 6), glass, 20)
        part(E, "Lantern_Roof", revolve([(2.72 * M, 0.17 * M), (2.75 * M, 0.17 * M), (2.86 * M, 0.06 * M), (2.9 * M, 0.04 * M), (2.96 * M, 0)], 6, 0, 0, math.pi / 6), iron, 20)
        part(E, "Bulb", sphere(0.05 * M, 12, 6, 0, 0, 2.56 * M), light, 60)
        marker(E, "LIGHT", "1", 0, 0, 2.56 * M, 0)
        collider(E, "Post", -0.09 * M, -0.09 * M, 0, 0.09 * M, 0.09 * M, 2.4 * M)
    out.append(lamp)

    # ------------------------------------------------------------ bollard
    bol, bn = defn("Bollard")
    if bn:
        E = bol.get_entities()
        part(E, "Body", revolve([(0, 0.13 * M), (0.04 * M, 0.13 * M), (0.06 * M, 0.1 * M), (0.38 * M, 0.09 * M), (0.42 * M, 0.13 * M), (0.47 * M, 0.13 * M), (0.5 * M, 0.08 * M), (0.52 * M, 0)], 20), iron, 40)
        collider(E, "Body", -0.13 * M, -0.13 * M, 0, 0.13 * M, 0.13 * M, 0.52 * M)
    out.append(bol)

    # -------------------------------------------------------------- bench
    bench, bnn = defn("Bench")
    if bnn:
        E = bench.get_entities()
        W = 1.8
        for sx in (-1, 1):
            x = sx * (W / 2 - 0.1)
            frame = [(-0.24, 0.0), (-0.18, 0.0), (-0.16, 0.38), (0.16, 0.38), (0.2, 0.0), (0.26, 0.0), (0.22, 0.44), (0.3, 0.9), (0.24, 0.9), (0.16, 0.45), (-0.2, 0.45)]
            part(E, "Frame_%s" % ("L" if sx < 0 else "R"), plane_map(prism([(u * M, v * M) for u, v in frame], (x - 0.025) * M, (x + 0.025) * M), "yz"), iron)
        for k in range(4):
            y = -0.2 + k * 0.1
            part(E, "Seat_Slat_%d" % (k + 1), rr_lathe(W * M, 0.085 * M, 0.01 * M, 2, top_round_profile(0.035 * M, 0.01 * M, 2, 0.45 * M), 0, y * M), teak, 40)
        for k in range(3):
            z = 0.58 + k * 0.11
            y = 0.17 + (z - 0.45) * 0.17
            g = part(E, "Back_Slat_%d" % (k + 1), rr_lathe(W * M, 0.085 * M, 0.01 * M, 2, pill_profile(0.03 * M, 0.01 * M, 2)), teak, 40)
            g.set_transform(xf(0, y * M, z * M, 0, 0, 70.0))
        marker(E, "SEAT", "1", -0.4 * M, -0.12 * M, 0.485 * M, 0)
        marker(E, "SEAT", "2", 0.4 * M, -0.12 * M, 0.485 * M, 0)
        collider(E, "Seat", -W / 2 * M, -0.25 * M, 0, W / 2 * M, 0.3 * M, 0.49 * M)
        collider(E, "Back", -W / 2 * M, 0.2 * M, 0.49 * M, W / 2 * M, 0.32 * M, 0.9 * M)
    out.append(bench)

    # ----------------------------------------------------------- pier end
    end, en = defn("PierEnd")
    if en:
        E = end.get_entities()
        half = 3.0
        k = 0
        y = half - 0.075
        while y > -half:
            k += 1
            part(E, "Deck_Board_%02d" % k, rr_lathe((2 * half) * M, 0.14 * M, 0.004 * M, 1, top_round_profile(0.04 * M, 0.008 * M, 2, -0.04 * M), 0, y * M), deck, 40)
            y -= 0.15
        for k, x in enumerate((-2.5, -1.0, 0.0, 1.0, 2.5)):
            part(E, "Joist_%d" % (k + 1), box((x - 0.04) * M, -half * M, -0.24 * M, (x + 0.04) * M, half * M, -0.04 * M), oak)
        for k, yy in enumerate((half, 0.0, -half + 0.2)):
            part(E, "Cap_%d" % (k + 1), box(-(half + 0.1) * M, (yy - 0.2) * M, -0.44 * M, (half + 0.1) * M, yy * M, -0.24 * M), oak)
            for sx in (-1, 0, 1):
                part(E, "Pile_%d_%d" % (k + 1, sx + 2), organic_revolve([(-5.5 * M, 0.15 * M), (-0.44 * M, 0.14 * M)], 12, 0.05, 3.0, k * 3.0 + sx), pile, 50).set_transform(xf(sx * 2.9 * M, (yy - 0.1) * M, 0))
        # posts and rope on three sides, an opening on the west side for the boat
        posts = [(-2.9, 2.9), (-2.9, 0.0), (-2.9, -2.9), (0.0, -2.9), (2.9, -2.9), (2.9, 0.0), (2.9, 2.9)]
        for k, (x, y_) in enumerate(posts):
            part(E, "Post_%d" % (k + 1), rr_lathe(0.1 * M, 0.1 * M, 0.01 * M, 2, top_round_profile(1.0 * M, 0.02 * M, 2), x * M, y_ * M), oak, 40)
        for k in range(len(posts) - 1):
            if k == 0:
                continue
            a = posts[k]
            b = posts[k + 1]
            pts = []
            for i in range(13):
                t = i / 12.0
                pts.append(((a[0] + (b[0] - a[0]) * t) * M, (a[1] + (b[1] - a[1]) * t) * M, (0.93 - 0.12 * math.sin(math.pi * t)) * M))
            part(E, "Rope_%d" % k, sweep(pts, 0.016 * M, 8), rope, 50)
        # ladder down to the water on the west side
        for sy in (-1, 1):
            part(E, "Ladder_Rail_%d" % (sy + 2), sweep([(-3.05 * M, (1.2 + sy * 0.25) * M, 0.9 * M), (-3.12 * M, (1.2 + sy * 0.25) * M, -0.1 * M), (-3.12 * M, (1.2 + sy * 0.25) * M, -2.2 * M)], 0.022 * M, 10), brass, 40)
        for k in range(5):
            z = -0.35 - k * 0.35
            part(E, "Ladder_Rung_%d" % (k + 1), box(-3.16 * M, 0.95 * M, (z - 0.02) * M, -3.08 * M, 1.45 * M, z * M), brass)
        place(bench, E, xf(0, 2.2 * M, 0, 180.0), "Bench")
        place(lamp, E, xf(2.5 * M, -2.5 * M, 0), "Lamp")
        place(bol, E, xf(-2.6 * M, -0.8 * M, 0), "Bollard_1")
        place(bol, E, xf(-2.6 * M, 2.4 * M, 0), "Bollard_2")
        marker(E, "MOOR", "boat", -4.4 * M, 0.8 * M, -1.3 * M, 0)
        collider(E, "Deck", -half * M, -half * M, -0.24 * M, half * M, half * M, 0.0)
        collider(E, "RailS", -half * M, -half * M, 0, half * M, (-half + 0.15) * M, 1.0 * M)
        collider(E, "RailE", (half - 0.15) * M, -half * M, 0, half * M, half * M, 1.0 * M)
        collider(E, "RailWs", -half * M, -half * M, 0, (-half + 0.15) * M, 0.0, 1.0 * M)
    out.append(end)

    # ------------------------------------------------------------ rowboat
    navy = mat("Paint_Navy", 38, 62, 92)
    white = mat("Paint_White", 238, 236, 230)
    boat, rn = defn("Rowboat")
    if rn:
        E = boat.get_entities()
        L = BOAT_L
        rings = []
        inner_mid = None
        n = 22
        for i in range(n + 1):
            t = i / float(n)  # 0 = transom (stern, +Y), 1 = stem (bow, -Y)
            y = L / 2 - t * L
            b = _boat_b(t)
            keel = _boat_keel(t)
            sheer = _boat_sheer(t)
            ring, inner = _hull_ring(y * M, b * M, (0.48 - keel) * M, sheer * M, 0.022 * M)
            ring = [(p[0], p[1], p[2] + keel * M) for p in ring]
            rings.append(ring)
            if i == 0:
                inner_mid = [(p[0], p[1] + keel * M) for p in inner]
        part(E, "Hull", loft(rings), navy, 30)
        # transom board closing the stern
        tpoly = [(p[0], p[1]) for p in inner_mid]
        part(E, "Transom", plane_map(prism(tpoly, (L / 2 - 0.03) * M, L / 2 * M), "xz"), white)
        for k, y in enumerate((0.95, 0.0, -0.9)):
            # each thwart ends against the inner skin at its own station
            hw = min(_boat_half_width_at(_boat_t(y - 0.13), 0.30), _boat_half_width_at(_boat_t(y + 0.13), 0.30)) - 0.005
            part(E, "Thwart_%d" % (k + 1), box(-hw * M, (y - 0.13) * M, 0.30 * M, hw * M, (y + 0.13) * M, 0.34 * M), teak)
        fw = min(_boat_half_width_at(_boat_t(-1.0), 0.13), _boat_half_width_at(_boat_t(1.3), 0.13)) - 0.01
        part(E, "Floorboards", box(-fw * M, -1.0 * M, 0.11 * M, fw * M, 1.3 * M, 0.13 * M), teak)
        mid_sheer = _boat_sheer(_boat_t(0.0))
        mid_b = _boat_b(_boat_t(0.0))
        for sx in (-1, 1):
            x = sx * (mid_b - 0.035)
            part(E, "Oarlock_%s" % ("L" if sx < 0 else "R"), revolve([((mid_sheer - 0.02) * M, 0.025 * M), ((mid_sheer + 0.07) * M, 0.025 * M), ((mid_sheer + 0.09) * M, 0)], 8, x * M, 0.0), brass, 40)
            marker(E, "OAR", "L" if sx < 0 else "R", x * M, 0.0, (mid_sheer + 0.07) * M, 0)
        marker(E, "SEAT", "row", 0, 0.0, 0.34 * M, 180.0)
        marker(E, "SEAT", "stern", 0, 0.95 * M, 0.34 * M, 180.0)
        collider(E, "Hull", -0.62 * M, -1.6 * M, 0, 0.62 * M, 1.8 * M, 0.55 * M)
    out.append(boat)

    oar, on = defn("Oar")
    if on:
        E = oar.get_entities()
        part(E, "Shaft", sweep([(0, 0, 0), (0, -1.9 * M, 0)], 0.022 * M, 10), teak, 40)
        part(E, "Grip", sweep([(0, 0.18 * M, 0), (0, 0, 0)], 0.018 * M, 10), oak, 40)
        blade = [(-0.075, -1.6), (0.075, -1.6), (0.08, -2.25), (0.05, -2.32), (-0.05, -2.32), (-0.08, -2.25)]
        part(E, "Blade", prism([(u * M, v * M) for u, v in blade], -0.008 * M, 0.008 * M), white)
    out.append(oar)

    # --------------------------------------------------------- beach bar
    straw = mat("Straw_Thatch", 196, 166, 112)
    bar, brn = defn("BeachBar")
    if brn:
        E = bar.get_entities()
        part(E, "Platform", box(-1.8 * M, -1.6 * M, 0, 1.8 * M, 1.6 * M, 0.15 * M), deck)
        for x in (-1.6, 1.6):
            for y in (-1.4, 1.4):
                part(E, "Post_%d_%d" % (int(x > 0), int(y > 0)), cylinder(0.07 * M, 2.35 * M, 10, x * M, y * M, 0.15 * M), pile, 40)
        part(E, "Back_Wall", box(-1.6 * M, 1.33 * M, 0.15 * M, 1.6 * M, 1.4 * M, 2.4 * M), oak)
        for k, z in enumerate((1.2, 1.6)):
            part(E, "Shelf_%d" % (k + 1), box(-1.3 * M, 1.1 * M, z * M, 1.3 * M, 1.33 * M, (z + 0.03) * M), teak)
        part(E, "Counter_Front", box(-1.5 * M, -1.2 * M, 0.15 * M, 1.5 * M, -1.0 * M, 1.05 * M), oak)
        part(E, "Counter_Top", rr_lathe(3.3 * M, 0.5 * M, 0.04 * M, 3, pill_profile(0.05 * M, 0.015 * M, 2, 1.05 * M), 0, -1.08 * M), teak, 40)
        cols = [mat("Glass_Green", 70, 120, 80, 200), mat("Glass_Amber", 170, 110, 40, 200), mat("Glass_Blue", 70, 110, 170, 200)]
        for k in range(14):
            x = -1.2 + k * 0.18
            z = 1.23 if k % 2 == 0 else 1.63
            prof = [(z, 0.035), (z + 0.18, 0.035), (z + 0.22, 0.015), (z + 0.28, 0.012), (z + 0.29, 0)]
            part(E, "Bottle_%02d" % (k + 1), revolve([(a * M, r * M) for a, r in prof], 10, x * M, 1.2 * M), cols[k % 3], 50)
        part(E, "Roof", revolve([(2.45 * M, 0), (2.4 * M, 2.6 * M), (2.5 * M, 2.62 * M), (3.6 * M, 0)], 4, 0, 0, math.pi / 4), straw, 30)
        marker(E, "LIGHT", "bar", 0, 0, 2.2 * M, 0)
        collider(E, "Platform", -1.8 * M, -1.6 * M, 0, 1.8 * M, 1.6 * M, 0.15 * M)
        collider(E, "Counter", -1.65 * M, -1.35 * M, 0.15 * M, 1.65 * M, -0.85 * M, 1.1 * M)
        collider(E, "Back", -1.6 * M, 1.1 * M, 0.15 * M, 1.6 * M, 1.4 * M, 2.4 * M)
        collider(E, "Roof", -2.0 * M, -2.0 * M, 2.4 * M, 2.0 * M, 2.0 * M, 3.0 * M)
    out.append(bar)

    # ------------------------------------------------- kayak + surfboard
    coral = mat("Paint_Coral", 232, 104, 82)
    yellow = mat("Paint_Sun", 240, 196, 74)
    kay, kn = defn("Kayak")
    if kn:
        E = kay.get_entities()
        rings = []
        for i in range(19):
            t = i / 18.0
            y = (1.5 - 3.0 * t)
            b = max(0.015, 0.36 * math.sin(math.pi * t) ** 0.7)
            h = 0.12 + 0.2 * math.sin(math.pi * t) ** 0.5
            zb = 0.05 * (1 - math.sin(math.pi * t)) ** 2
            ring = []
            for j in range(12):
                a = 2 * math.pi * j / 12
                c = math.cos(a)
                s = math.sin(a)
                z = zb + (h * 0.55) * (1 + s) if s > 0 else zb + (h * 0.55) * (1 + s * 0.85)
                ring.append((c * b * M, y * M, z * M))
            rings.append(ring)
        part(E, "Hull", loft(rings), coral, 50)
        part(E, "Seat_Well", rr_lathe(0.42 * M, 0.7 * M, 0.15 * M, 4, [(0.30 * M, 0), (0.33 * M, 0)], 0, 0.1 * M), iron, 40)
        collider(E, "Hull", -0.36 * M, -1.5 * M, 0, 0.36 * M, 1.5 * M, 0.33 * M)
    out.append(kay)

    surf, sfn = defn("Surfboard")
    if sfn:
        E = surf.get_entities()
        rings = []
        for i in range(17):
            t = i / 16.0
            y = 1.05 - 2.1 * t
            w = max(0.01, 0.28 * (math.sin(math.pi * min(1.0, t * 1.05)) ** 0.6) * (1.0 - 0.25 * t))
            th = max(0.004, 0.035 * math.sin(math.pi * t) ** 0.5)
            ring = []
            for j in range(10):
                a = 2 * math.pi * j / 10
                ring.append((math.cos(a) * w * M, y * M, (0.04 + math.sin(a) * th + 0.05 * t ** 3) * M))
            rings.append(ring)
        part(E, "Board", loft(rings), yellow, 60)
        collider(E, "Board", -0.28 * M, -1.05 * M, 0, 0.28 * M, 1.05 * M, 0.12 * M)
    out.append(surf)

    # ----------------------------------------------------- volleyball net
    net_m = mat("Rope_Net", 236, 236, 230, 180)
    vn, vnn = defn("VolleyNet")
    if vnn:
        E = vn.get_entities()
        for sx in (-1, 1):
            part(E, "Pole_%s" % ("L" if sx < 0 else "R"), cylinder(0.04 * M, 2.6 * M, 12, sx * 4.8 * M, 0, -0.3 * M), white, 40)
        part(E, "Net", box(-4.7 * M, -0.006 * M, 1.43 * M, 4.7 * M, 0.006 * M, 2.38 * M), net_m)
        part(E, "Band_Top", box(-4.7 * M, -0.012 * M, 2.38 * M, 4.7 * M, 0.012 * M, 2.45 * M), white)
        collider(E, "Net", -4.85 * M, -0.05 * M, 0, 4.85 * M, 0.05 * M, 2.45 * M)
    out.append(vn)

    # ---------------------------------------------------------- lifebuoy
    buoy, byn = defn("Lifebuoy")
    if byn:
        E = buoy.get_entities()
        red = mat("Paint_Red", 196, 46, 42)
        for k in range(8):
            seg = []
            for i in range(5):
                a = 2 * math.pi * (k + i / 4.0) / 8.0
                seg.append((0.3 * math.cos(a) * M, 0.0, (0.9 + 0.3 * math.sin(a)) * M))
            part(E, "Band_%d" % (k + 1), sweep(seg, 0.07 * M, 10), red if k % 2 == 0 else white, 50)
        part(E, "Post", box(-0.05 * M, 0.08 * M, 0, 0.05 * M, 0.18 * M, 1.3 * M), oak)
    out.append(buoy)
    return out
