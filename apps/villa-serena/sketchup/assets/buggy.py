# A two-seat electric beach buggy (golf-cart style) with a canvas canopy,
# and its wheel as a separate component (the game spins and steers them).
# Origin: ground level, centre of the wheelbase; the nose faces -Y; the
# driver sits on the +X side (left when facing forward).

def build():
    out = []
    body_m = mat("CarPaint_Sage", 156, 178, 160)
    cream = mat("CarPaint_Cream", 238, 230, 212)
    dark = mat("Metal_Graphite", 54, 56, 60)
    chrome = mat("Chrome", 210, 212, 216)
    rubber = mat("Rubber_Black", 32, 32, 34)
    leather = mat("Leather_Tan", 176, 120, 78)
    glass = mat("Glass_Clear", 188, 214, 220, 70)
    lamp = mat("Light_Warm", 255, 214, 160)
    tail = mat("Light_Red", 230, 40, 30)
    canvas = mat("Canvas_Cream", 236, 228, 210)

    wheel, wn = defn("BuggyWheel")
    if wn:
        E = wheel.get_entities()
        R = 0.28
        Wd = 0.2
        tyre = revolve([(-Wd / 2 * M, 0.17 * M), (-Wd / 2 * M, 0.25 * M), (-0.085 * M, 0.27 * M), (-0.06 * M, R * M), (0.06 * M, R * M),
                        (0.085 * M, 0.27 * M), (Wd / 2 * M, 0.25 * M), (Wd / 2 * M, 0.17 * M)], 28, closed=True)
        part(E, "Tyre", mrot(tyre, "y", 90), rubber, 35)
        rim = revolve([(-0.07 * M, 0.0), (-0.07 * M, 0.17 * M), (0.07 * M, 0.17 * M), (0.08 * M, 0.12 * M), (0.085 * M, 0.05 * M), (0.09 * M, 0)], 20)
        part(E, "Rim", mrot(rim, "y", 90), chrome, 35)
        for k in range(5):
            a = 2 * math.pi * k / 5
            part(E, "Lug_%d" % (k + 1), mrot(cylinder(0.012 * M, 0.012 * M, 8, 0.06 * M * math.cos(a), 0.06 * M * math.sin(a), 0.088 * M), "y", 90), dark, 40)
        collider(E, "Wheel", -Wd / 2 * M, -R * M, -R * M, Wd / 2 * M, R * M, R * M)
    out.append(wheel)

    cd, new = defn("Buggy")
    if not new:
        out.insert(0, cd)
        return out
    E = cd.get_entities()
    WB = 0.85  # half wheelbase
    TR = 0.56  # half track
    WR = 0.28
    part(E, "Chassis", box(-0.48 * M, -1.15 * M, 0.2 * M, 0.48 * M, 1.2 * M, 0.3 * M), dark)
    # nose with a sculpted cowl
    part(E, "Nose", rr_lathe(1.18 * M, 0.62 * M, 0.22 * M, 5, top_round_profile(0.42 * M, 0.12 * M, 4, 0.3 * M), 0, -0.98 * M), body_m, 40)
    part(E, "Front_Bumper", rr_lathe(1.24 * M, 0.1 * M, 0.04 * M, 3, pill_profile(0.1 * M, 0.03 * M, 2, 0.3 * M), 0, -1.32 * M), rubber, 40)
    for sx in (-1, 1):
        part(E, "Headlight_%s" % ("L" if sx > 0 else "R"), mrot(cylinder(0.06 * M, 0.02 * M, 16, 0, 0, 0), "x", 90), lamp, 40).set_transform(xf(sx * 0.38 * M, -1.28 * M, 0.56 * M))
        part(E, "Bezel_%s" % ("L" if sx > 0 else "R"), mrot(revolve([(0, 0.06 * M), (0, 0.07 * M), (0.015 * M, 0.072 * M), (0.025 * M, 0.066 * M), (0.025 * M, 0.06 * M)], 16, closed=True), "x", 90), chrome, 40).set_transform(xf(sx * 0.38 * M, -1.265 * M, 0.56 * M))
    part(E, "Footwell", box(-0.58 * M, -0.67 * M, 0.3 * M, 0.58 * M, 0.17 * M, 0.34 * M), rubber)
    part(E, "Dash", rr_lathe(1.14 * M, 0.16 * M, 0.04 * M, 3, pill_profile(0.32 * M, 0.04 * M, 3, 0.4 * M), 0, -0.59 * M), cream, 40)
    # seat box, bench and backrest
    part(E, "Seat_Box", rr_lathe(1.2 * M, 0.66 * M, 0.06 * M, 3, top_round_profile(0.32 * M, 0.03 * M, 3, 0.3 * M), 0, 0.5 * M), body_m, 40)
    part(E, "Seat_Cushion", rr_lathe(1.12 * M, 0.56 * M, 0.08 * M, 4, pill_profile(0.13 * M, 0.05 * M, 3, 0.62 * M), 0, 0.48 * M), leather, 55)
    back = part(E, "Seat_Back", rr_lathe(1.12 * M, 0.14 * M, 0.06 * M, 4, pill_profile(0.5 * M, 0.05 * M, 3)), leather, 55)
    back.set_transform(xf(0, 0.86 * M, 0.72 * M, 0, 0, -12.0))
    part(E, "Rear_Deck", rr_lathe(1.2 * M, 0.42 * M, 0.08 * M, 4, top_round_profile(0.36 * M, 0.06 * M, 3, 0.3 * M), 0, 1.06 * M), body_m, 40)
    part(E, "Rear_Bumper", rr_lathe(1.24 * M, 0.1 * M, 0.04 * M, 3, pill_profile(0.1 * M, 0.03 * M, 2, 0.3 * M), 0, 1.33 * M), rubber, 40)
    for sx in (-1, 1):
        part(E, "Taillight_%s" % ("L" if sx > 0 else "R"), box((sx * 0.45 - 0.06) * M, 1.27 * M, 0.52 * M, (sx * 0.45 + 0.06) * M, 1.28 * M, 0.58 * M), tail)
    # fenders arching over the wheels
    for sx in (-1, 1):
        for sy in (-1, 1):
            pts = []
            for i in range(9):
                a = math.radians(180 * i / 8.0)
                pts.append((sx * TR * M, (sy * WB - 0.36 * math.cos(a)) * M, (WR + 0.36 * math.sin(a) * 0.95) * M))
            # section: wide across the tyre (frame N = X), thin radially (B)
            sec = [(-0.12 * M, -0.012 * M), (0.12 * M, -0.012 * M), (0.12 * M, 0.012 * M), (-0.12 * M, 0.012 * M)]
            part(E, "Fender_%s%s" % ("L" if sx > 0 else "R", "F" if sy < 0 else "R"), sweep(pts, 1.0, section=sec), body_m, 40)
    # steering: column + wheel on the driver's (+X) side
    part(E, "Column", sweep([(0.3 * M, -0.58 * M, 0.62 * M), (0.3 * M, -0.45 * M, 0.95 * M)], 0.022 * M, 10), dark, 40)
    sw = mjoin([torus(0.17 * M, 0.018 * M, 32, 8), boxc(0.3 * M, 0.025 * M, 0.02 * M, 0, 0, -0.01 * M), cylinder(0.04 * M, 0.04 * M, 16, 0, 0, -0.02 * M)])
    part(E, "Steering_Wheel", sw, dark, 40).set_transform(xf(0.3 * M, -0.44 * M, 0.97 * M, 0, 0, -62.0))
    marker(E, "STEER", "1", 0.3 * M, -0.44 * M, 0.97 * M, 0)
    # canopy on four posts, raked windscreen
    for sx in (-1, 1):
        part(E, "Post_F_%s" % ("L" if sx > 0 else "R"), sweep([(sx * 0.55 * M, -0.62 * M, 0.7 * M), (sx * 0.55 * M, -0.5 * M, 1.86 * M)], 0.022 * M, 10), chrome, 40)
        part(E, "Post_R_%s" % ("L" if sx > 0 else "R"), sweep([(sx * 0.55 * M, 1.12 * M, 0.66 * M), (sx * 0.55 * M, 1.04 * M, 1.86 * M)], 0.022 * M, 10), chrome, 40)
    part(E, "Canopy", rr_lathe(1.36 * M, 1.95 * M, 0.12 * M, 4, pill_profile(0.07 * M, 0.025 * M, 2, 1.86 * M), 0, 0.26 * M), canvas, 40)
    ws = [(-0.53, 0.9), (0.53, 0.9), (0.53, 1.8), (-0.53, 1.8)]
    screen = mrot(plane_map(prism([(u * M, v * M) for u, v in ws], -0.006 * M, 0.006 * M), "xz"), "x", -6.3, (0, 0, 0.9 * M))
    part(E, "Windscreen", mmove(screen, 0, -0.6 * M, 0), glass)

    for nm, sx, sy in (("FL", 1, -1), ("FR", -1, -1), ("RL", 1, 1), ("RR", -1, 1)):
        marker(E, "WHEEL", nm, sx * TR * M, sy * WB * M, WR * M, 0)
        place(wheel, E, xf(sx * TR * M, sy * WB * M, WR * M), "Wheel_" + nm)
    marker(E, "SEAT", "driver", 0.28 * M, 0.42 * M, 0.72 * M, 0)
    marker(E, "SEAT", "passenger", -0.28 * M, 0.42 * M, 0.72 * M, 0)
    collider(E, "Body", -0.62 * M, -1.36 * M, 0.2 * M, 0.62 * M, 1.38 * M, 0.66 * M)
    collider(E, "Back", -0.6 * M, 0.82 * M, 0.66 * M, 0.6 * M, 1.0 * M, 1.2 * M)
    collider(E, "Roof", -0.68 * M, -0.72 * M, 1.86 * M, 0.68 * M, 1.24 * M, 1.93 * M)
    out.insert(0, cd)
    return out
