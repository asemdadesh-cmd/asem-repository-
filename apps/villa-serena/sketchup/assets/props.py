# Physics props and interior pieces: crate, barrel, beach ball, football,
# bed, nightstand, table/floor/pendant lamps, rug and a candle lantern.
# Origins on the floor at the centre (balls: at their centre).

def _gore(r, a0, a1, lat, n_lon=4, n_lat=8):
    """An orange-segment wedge of a sphere between longitudes a0..a1 and
    latitudes -lat..lat, closed by two flat faces through the axis."""
    m = mnew()
    rows = []
    for i in range(n_lat + 1):
        phi = -lat + 2 * lat * i / n_lat
        row = []
        for j in range(n_lon + 1):
            th = a0 + (a1 - a0) * j / n_lon
            row.append(vadd(m, (r * math.cos(phi) * math.cos(th), r * math.cos(phi) * math.sin(th), r * math.sin(phi))))
        rows.append(row)
    zb = vadd(m, (0, 0, r * math.sin(-lat)))
    zt = vadd(m, (0, 0, r * math.sin(lat)))
    for i in range(n_lat):
        for j in range(n_lon):
            quad(m, rows[i][j], rows[i][j + 1], rows[i + 1][j + 1], rows[i + 1][j])
    # flat side at a0 (facing -theta) and at a1 (facing +theta)
    fadd(m, [zt, zb] + [rows[i][0] for i in range(n_lat + 1)])
    fadd(m, [zb, zt] + [rows[i][n_lon] for i in range(n_lat, -1, -1)])
    # bottom and top: flat fans at +/-lat
    fadd(m, [zb] + [rows[0][j] for j in range(n_lon, -1, -1)])
    fadd(m, [zt] + [rows[n_lat][j] for j in range(n_lon + 1)])
    return m


def build():
    out = []
    oak = mat("Oak_Weathered", 150, 132, 108)
    teak = mat("Teak", 150, 101, 62)
    iron = mat("Iron_Black", 38, 38, 40)
    white = mat("Paint_White", 238, 236, 230)

    crate, cn = defn("Crate")
    if cn:
        E = crate.get_entities()
        s = 0.6
        b = 0.045
        part(E, "Core", box(-(s / 2 - 0.01) * M, -(s / 2 - 0.01) * M, 0.01 * M, (s / 2 - 0.01) * M, (s / 2 - 0.01) * M, (s - 0.01) * M), oak)
        h = s / 2
        # 12 edge battens: verticals, then the top and bottom rims
        for sx in (-1, 1):
            for sy in (-1, 1):
                part(E, "Post_%d%d" % (sx + 1, sy + 1), box((sx * h - (b if sx > 0 else 0)) * M, (sy * h - (b if sy > 0 else 0)) * M, 0, (sx * h + (0 if sx > 0 else b)) * M, (sy * h + (0 if sy > 0 else b)) * M, s * M), teak)
        for z0, nm in ((0.0, "Bottom"), (s - b, "Top")):
            for sy in (-1, 1):
                y0 = sy * h - (b if sy > 0 else 0)
                part(E, "Rim_%s_Y%d" % (nm, sy + 1), box(-(h - b) * M, y0 * M, z0 * M, (h - b) * M, (y0 + b) * M, (z0 + b) * M), teak)
            for sx in (-1, 1):
                x0 = sx * h - (b if sx > 0 else 0)
                part(E, "Rim_%s_X%d" % (nm, sx + 1), box(x0 * M, -(h - b) * M, z0 * M, (x0 + b) * M, (h - b) * M, (z0 + b) * M), teak)
        collider(E, "Body", -h * M, -h * M, 0, h * M, h * M, s * M)
    out.append(crate)

    barrel, bn = defn("Barrel")
    if bn:
        E = barrel.get_entities()
        prof = [(0.0, 0.0), (0.0, 0.25)]
        for i in range(1, 8):
            t = i / 8.0
            prof.append((0.88 * t, 0.25 + 0.06 * math.sin(math.pi * t)))
        prof += [(0.88, 0.25), (0.88, 0.235), (0.86, 0.235), (0.86, 0.0)]
        part(E, "Staves", revolve([(z * M, r * M) for z, r in prof], 18), oak, 30)
        for k, z in enumerate((0.1, 0.24, 0.64, 0.78)):
            r = 0.25 + 0.06 * math.sin(math.pi * z / 0.88) + 0.004
            part(E, "Hoop_%d" % (k + 1), revolve([((z - 0.025) * M, r * M), ((z - 0.025) * M, (r + 0.008) * M), ((z + 0.025) * M, (r + 0.008) * M), ((z + 0.025) * M, r * M)], 18, closed=True), iron, 30)
        collider(E, "Body", -0.3 * M, -0.3 * M, 0, 0.3 * M, 0.3 * M, 0.88 * M)
    out.append(barrel)

    ball, bln = defn("BeachBall")
    if bln:
        E = ball.get_entities()
        R = 0.2
        lat = math.radians(78)
        cols = [mat("Paint_Red", 196, 46, 42), mat("Paint_Sun", 240, 196, 74), mat("Paint_Ocean", 40, 120, 190),
                white, mat("Paint_Green", 70, 160, 90), mat("Paint_Coral", 232, 104, 82)]
        for k in range(6):
            a0 = 2 * math.pi * k / 6
            part(E, "Gore_%d" % (k + 1), _gore(R * M, a0, a0 + 2 * math.pi / 6, lat), cols[k], 50)
        for sz, nm in ((1, "Top"), (-1, "Bottom")):
            prof = []
            for i in range(4):
                phi = lat + (math.pi / 2 - lat) * i / 3.0
                prof.append((R * math.sin(phi) * M, R * math.cos(phi) * M if i < 3 else 0.0))
            prof = [(R * math.sin(lat) * M, 0.0)] + prof
            cap = revolve(prof, 24)
            if sz < 0:
                cap = mscale(cap, 1, 1, -1)
            part(E, "Cap_" + nm, cap, white, 50)
    out.append(ball)

    fb, fbn = defn("Football")
    if fbn:
        E = fb.get_entities()
        R = 0.11
        lat = math.radians(80)
        leather = mat("Leather_White", 240, 238, 232)
        black = mat("Leather_Black", 30, 30, 32)
        for k in range(10):
            a0 = 2 * math.pi * k / 10
            part(E, "Panel_%d" % (k + 1), _gore(R * M, a0, a0 + 2 * math.pi / 10, lat, 3, 8), leather if k % 2 == 0 else black, 50)
        for sz, nm in ((1, "Top"), (-1, "Bottom")):
            prof = [(R * math.sin(lat) * M, 0.0)]
            for i in range(4):
                phi = lat + (math.pi / 2 - lat) * i / 3.0
                prof.append((R * math.sin(phi) * M, R * math.cos(phi) * M if i < 3 else 0.0))
            cap = revolve(prof, 20)
            if sz < 0:
                cap = mscale(cap, 1, 1, -1)
            part(E, "Cap_" + nm, cap, black, 50)
    out.append(fb)

    # ---------------------------------------------------------- bedroom
    linen_w = mat("Linen_White", 242, 240, 234)
    linen_s = mat("Linen_Sand", 214, 200, 176)
    wool = mat("Wool_Terracotta", 186, 110, 80)
    walnut = mat("Walnut", 98, 68, 46)
    brass = mat("Brass", 196, 160, 92)
    ceramic = mat("Ceramic_Sand", 220, 206, 182)
    shade = mat("Linen_Shade", 240, 232, 214, 235)
    light = mat("Light_Warm", 255, 214, 160)

    bed, bdn = defn("Bed")
    if bdn:
        E = bed.get_entities()
        part(E, "Platform", rr_lathe(1.78 * M, 2.12 * M, 0.03 * M, 2, [(0.0, 0.06 * M), (0.08 * M, 0.06 * M), (0.08 * M, 0.0), (0.26 * M, 0.0)]), walnut, 40)
        part(E, "Headboard", rr_lathe(1.9 * M, 0.12 * M, 0.04 * M, 3, pill_profile(1.1 * M, 0.04 * M, 3), 0, 1.12 * M), linen_s, 55)
        part(E, "Mattress", rr_lathe(1.6 * M, 2.0 * M, 0.06 * M, 4, pill_profile(0.22 * M, 0.04 * M, 3, 0.26 * M), 0, -0.02 * M), linen_w, 55)
        # thick duvet over the lower two thirds, overhanging the mattress edges
        part(E, "Duvet", rr_lathe(1.7 * M, 1.42 * M, 0.08 * M, 4, pill_profile(0.07 * M, 0.03 * M, 3, 0.475 * M), 0, -0.33 * M), linen_w, 55)
        part(E, "Throw", rr_lathe(1.6 * M, 0.42 * M, 0.04 * M, 3, pill_profile(0.03 * M, 0.012 * M, 2, 0.545 * M), 0, -0.75 * M), wool, 55)
        for sx in (-1, 1):
            g = part(E, "Pillow_%s" % ("L" if sx < 0 else "R"), rr_lathe(0.66 * M, 0.42 * M, 0.12 * M, 4, pill_profile(0.15 * M, 0.07 * M, 3)), linen_w, 60)
            g.set_transform(xf(sx * 0.38 * M, 0.74 * M, 0.47 * M, 0, 0, 18.0))
        marker(E, "SEAT", "edge", 0.0, -0.85 * M, 0.55 * M, 0)
        collider(E, "Body", -0.9 * M, -1.06 * M, 0, 0.9 * M, 1.06 * M, 0.55 * M)
        collider(E, "Head", -0.95 * M, 1.06 * M, 0, 0.95 * M, 1.18 * M, 1.1 * M)
    out.append(bed)

    ns, nsn = defn("Nightstand")
    if nsn:
        E = ns.get_entities()
        part(E, "Carcass", rr_lathe(0.5 * M, 0.4 * M, 0.02 * M, 2, top_round_profile(0.5 * M, 0.01 * M, 2)), walnut, 40)
        part(E, "Drawer", box(-0.22 * M, -0.205 * M, 0.3 * M, 0.22 * M, -0.2 * M, 0.46 * M), walnut)
        part(E, "Knob", sphere(0.015 * M, 10, 6, 0, -0.215 * M, 0.38 * M), brass, 60)
        part(E, "Lamp_Base", revolve([(0.5 * M, 0.06 * M), (0.52 * M, 0.07 * M), (0.6 * M, 0.08 * M), (0.7 * M, 0.06 * M), (0.75 * M, 0.02 * M), (0.8 * M, 0.012 * M)], 20, 0.1 * M, 0.05 * M), ceramic, 50)
        part(E, "Lamp_Shade", revolve([(0.75 * M, 0.12 * M), (0.95 * M, 0.09 * M), (0.95 * M, 0.085 * M), (0.75 * M, 0.115 * M)], 24, 0.1 * M, 0.05 * M, closed=True), shade, 40)
        part(E, "Lamp_Bulb", sphere(0.035 * M, 12, 6, 0.1 * M, 0.05 * M, 0.84 * M), light, 60)
        marker(E, "LIGHT", "lamp", 0.1 * M, 0.05 * M, 0.84 * M, 0)
        collider(E, "Body", -0.25 * M, -0.2 * M, 0, 0.25 * M, 0.2 * M, 0.5 * M)
    out.append(ns)

    fl, fln = defn("FloorLamp")
    if fln:
        E = fl.get_entities()
        for k in range(3):
            a = 2 * math.pi * k / 3 + math.pi / 2
            part(E, "Leg_%d" % (k + 1), sweep([(0.28 * math.cos(a) * M, 0.28 * math.sin(a) * M, 0), (0.02 * math.cos(a) * M, 0.02 * math.sin(a) * M, 1.2 * M)], 0.014 * M, 8), walnut, 40)
        part(E, "Stem", cylinder(0.012 * M, 0.35 * M, 8, 0, 0, 1.2 * M), brass, 40)
        part(E, "Shade", revolve([(1.42 * M, 0.25 * M), (1.75 * M, 0.2 * M), (1.75 * M, 0.193 * M), (1.42 * M, 0.243 * M)], 32, closed=True), shade, 40)
        part(E, "Bulb", sphere(0.045 * M, 12, 6, 0, 0, 1.58 * M), light, 60)
        marker(E, "LIGHT", "1", 0, 0, 1.58 * M, 0)
        collider(E, "Body", -0.25 * M, -0.25 * M, 0, 0.25 * M, 0.25 * M, 1.75 * M)
    out.append(fl)

    pl, pln = defn("PendantLamp")
    if pln:
        # origin at the ceiling rose; hangs down 1.1 m
        E = pl.get_entities()
        rattan = mat("Rattan", 196, 160, 110)
        part(E, "Rose", cylinder(0.06 * M, 0.02 * M, 16, 0, 0, -0.02 * M), brass, 40)
        part(E, "Cord", cylinder(0.005 * M, 0.75 * M, 6, 0, 0, -0.77 * M), iron, 40)
        dome = [(-0.77 * M, 0.04 * M), (-0.8 * M, 0.12 * M), (-0.9 * M, 0.22 * M), (-1.05 * M, 0.27 * M), (-1.1 * M, 0.275 * M),
                (-1.1 * M, 0.265 * M), (-1.05 * M, 0.26 * M), (-0.9 * M, 0.21 * M), (-0.81 * M, 0.11 * M), (-0.785 * M, 0.04 * M)]
        # walked outside-up so the normals face out
        part(E, "Dome", revolve(dome[::-1], 28, closed=True), rattan, 50)
        part(E, "Bulb", sphere(0.05 * M, 12, 6, 0, 0, -0.92 * M), light, 60)
        marker(E, "LIGHT", "1", 0, 0, -0.95 * M, 0)
    out.append(pl)

    rug, rn = defn("Rug")
    if rn:
        E = rug.get_entities()
        part(E, "Field", rr_lathe(3.0 * M, 2.1 * M, 0.04 * M, 3, pill_profile(0.012 * M, 0.004 * M, 1)), mat("Wool_Rug", 214, 196, 170), 40)
    out.append(rug)

    lan, lnn = defn("Lantern")
    if lnn:
        E = lan.get_entities()
        glass = mat("Glass_Amber", 170, 110, 40, 200)
        flame = mat("Flame", 255, 150, 60)
        part(E, "Base", revolve([(0, 0.13 * M), (0.04 * M, 0.13 * M), (0.06 * M, 0.11 * M), (0.06 * M, 0.0)], 6, 0, 0, math.pi / 6), iron, 20)
        part(E, "Glass", revolve([(0.06 * M, 0.1 * M), (0.36 * M, 0.12 * M), (0.36 * M, 0.112 * M), (0.06 * M, 0.092 * M)], 6, 0, 0, math.pi / 6, closed=True), glass, 20)
        for k in range(6):
            a = math.pi / 6 + 2 * math.pi * k / 6
            part(E, "Bar_%d" % (k + 1), sweep([(0.11 * math.cos(a) * M, 0.11 * math.sin(a) * M, 0.06 * M), (0.13 * math.cos(a) * M, 0.13 * math.sin(a) * M, 0.36 * M)], 0.008 * M, 6), iron, 40)
        part(E, "Roof", revolve([(0.36 * M, 0.15 * M), (0.39 * M, 0.15 * M), (0.5 * M, 0.04 * M), (0.53 * M, 0)], 6, 0, 0, math.pi / 6), iron, 20)
        part(E, "Ring", torus(0.05 * M, 0.008 * M, 16, 6), iron, 40).set_transform(xf(0, 0, 0.58 * M, 0, 0, 90.0))
        part(E, "Candle", cylinder(0.035 * M, 0.12 * M, 12, 0, 0, 0.06 * M), white, 40)
        part(E, "Candle_Flame", revolve([(0.185 * M, 0.0), (0.2 * M, 0.012 * M), (0.24 * M, 0)], 8), flame, 60)
        marker(E, "LIGHT", "1", 0, 0, 0.22 * M, 0)
        collider(E, "Body", -0.15 * M, -0.15 * M, 0, 0.15 * M, 0.15 * M, 0.55 * M)
    out.append(lan)
    return out
