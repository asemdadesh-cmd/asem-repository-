# Teak sun lounger with a reclined backrest, linen cushions and rear wheels.
# Origin: centre of the footprint on the ground. Foot end faces -Y.

def build():
    cd, new = defn("Lounger")
    if not new:
        return cd
    E = cd.get_entities()
    teak = mat("Teak", 150, 101, 62)
    linen = mat("Linen_Cushion", 236, 229, 214)
    rubber = mat("Rubber_Black", 32, 32, 34)
    steel = mat("Steel_Brushed", 178, 180, 184)

    L = 1.95 * M
    W = 0.70 * M
    rail_h = 0.10 * M
    rail_t = 0.045 * M
    z_top = 0.34 * M
    y_hinge = 0.28 * M
    inner = W / 2 - rail_t

    # side rails with softly rounded edges
    for sx, nm in ((-1, "Rail_L"), (1, "Rail_R")):
        x = sx * (W / 2 - rail_t / 2)
        part(E, nm, rr_lathe(rail_t, L, 0.012 * M, 3, pill_profile(rail_h, 0.01 * M, 2, z_top - rail_h), x, 0), teak, 40)

    # cross members between the rails
    for y, nm in ((-L / 2 + 0.05 * M, "Cross_Foot"), (L / 2 - 0.05 * M, "Cross_Head"), (y_hinge, "Cross_Mid")):
        part(E, nm, box(-inner, y - 0.022 * M, z_top - rail_h, inner, y + 0.022 * M, z_top - 0.035 * M), teak)

    # legs (square, softened) under the rails
    leg_cd, leg_new = defn("Lounger_Leg")
    if leg_new:
        part(leg_cd.get_entities(), "Leg", rr_lathe(0.05 * M, 0.05 * M, 0.008 * M, 2, top_round_profile(z_top - rail_h, 0.004 * M, 1)), teak, 40)
    for sx in (-1, 1):
        for sy in (-1, 1):
            place(leg_cd, E, xf(sx * (W / 2 - rail_t / 2), sy * (L / 2 - 0.14 * M), 0), "Leg_%s%s" % ("L" if sx < 0 else "R", "F" if sy < 0 else "B"))

    # rear wheels on a steel axle
    wr = 0.085 * M
    wy = L / 2 - 0.14 * M
    wz = wr + 0.015 * M
    for sx in (-1, 1):
        x0 = sx * (W / 2 + 0.004 * M)
        x1 = sx * (W / 2 + 0.034 * M)
        tyre = mrot(revolve([(0, wr * 0.82), (0, wr * 0.95), (0.006 * M, wr), (0.024 * M, wr), (0.03 * M, wr * 0.95), (0.03 * M, wr * 0.82)], 20, closed=True), "y", 90)
        hub = mrot(cylinder(wr * 0.82, 0.026 * M, 20, 0, 0, 0.002 * M), "y", 90)
        lo = min(x0, x1)
        part(E, "Wheel_" + ("L" if sx < 0 else "R"), mmove(tyre, lo, wy, wz), rubber, 40)
        part(E, "Hub_" + ("L" if sx < 0 else "R"), mmove(hub, lo, wy, wz), teak, 40)
    axle = mrot(cylinder(0.008 * M, W + 0.07 * M, 10, 0, 0, -(W + 0.07 * M) / 2), "y", 90)
    part(E, "Axle", mmove(axle, 0, wy, wz), steel, 40)

    # seat slats (one component, many instances)
    slat_cd, slat_new = defn("Lounger_Slat")
    slat_t = 0.02 * M
    slat_w = 0.07 * M
    if slat_new:
        prof = top_round_profile(slat_t, 0.006 * M, 2)
        part(slat_cd.get_entities(), "Slat", rr_lathe(2 * inner, slat_w, 0.003 * M, 1, prof), teak, 40)
    y = -L / 2 + 0.11 * M
    k = 0
    while y < y_hinge - 0.06 * M:
        k += 1
        place(slat_cd, E, xf(0, y, z_top - 0.035 * M - slat_t + 0.0001 * M), "Slat_%02d" % k)
        y += 0.088 * M

    # reclined backrest: frame + slats + cushion, tilted 38 degrees at the hinge
    tilt = 38.0
    back_len = 0.72 * M
    bar = 0.032 * M
    bg = Group()
    E.add_group(bg)
    bg.set_name("Backrest")
    BE = bg.get_entities()
    for sx, nm in ((-1, "Back_Bar_L"), (1, "Back_Bar_R")):
        x = sx * (inner - bar / 2)
        part(BE, nm, rr_lathe(bar, back_len, 0.008 * M, 2, pill_profile(0.045 * M, 0.008 * M, 2, 0), x, back_len / 2), teak, 40)
    yy = 0.06 * M
    j = 0
    while yy < back_len - 0.04 * M:
        j += 1
        part(BE, "Back_Slat_%02d" % j, box(-inner + bar, yy - slat_w / 2, 0.045 * M - slat_t, inner - bar, yy + slat_w / 2, 0.045 * M), teak)
        yy += 0.09 * M
    cush_back = rr_lathe(W - 0.10 * M, back_len - 0.05 * M, 0.06 * M, 4, pill_profile(0.07 * M, 0.03 * M, 3, 0.045 * M), 0, back_len / 2 + 0.01 * M)
    part(BE, "Cushion_Back", cush_back, linen, 50)
    bg.set_transform(xf(0, y_hinge, z_top - 0.035 * M, 0, 0, tilt))

    # adjustable strut propping the backrest
    sy0 = y_hinge + 0.42 * M
    sa = math.radians(tilt)
    tip = (y_hinge + 0.38 * M * math.cos(sa), z_top - 0.035 * M + 0.38 * M * math.sin(sa) - 0.01 * M)
    for sx in (-1, 1):
        x = sx * (inner - bar - 0.02 * M)
        part(E, "Strut_" + ("L" if sx < 0 else "R"), sweep([(x, sy0, z_top - rail_h + 0.02 * M), (x, tip[0], tip[1])], 0.011 * M, 8), teak, 40)

    # seat cushion
    seat_y0 = -L / 2 + 0.05 * M
    seat_y1 = y_hinge - 0.015 * M
    part(E, "Cushion_Seat", rr_lathe(W - 0.10 * M, seat_y1 - seat_y0, 0.06 * M, 4, pill_profile(0.07 * M, 0.03 * M, 3, z_top - 0.035 * M), 0, (seat_y0 + seat_y1) / 2), linen, 50)

    # physics proxies + seat locator
    collider(E, "Body", -W / 2 - 0.035 * M, -L / 2, 0, W / 2 + 0.035 * M, L / 2, z_top + 0.07 * M)
    cb = collider(E, "Back", -W / 2 + 0.02 * M, 0, 0, W / 2 - 0.02 * M, back_len, 0.12 * M)
    cb.set_transform(xf(0, y_hinge, z_top - 0.035 * M, 0, 0, tilt))
    marker(E, "SEAT", "1", 0, -0.05 * M, z_top + 0.035 * M, 0)
    return cd
