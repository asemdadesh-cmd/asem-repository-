# Tables: a teak outdoor dining table, a travertine drum coffee table and a
# small teak side table. Origin: centre of the footprint on the ground.

def build():
    out = []
    teak = mat("Teak", 150, 101, 62)
    trav = mat("Travertine", 226, 212, 190)
    oak = mat("Oak_Natural", 190, 150, 104)

    cd, new = defn("DiningTable")
    if new:
        E = cd.get_entities()
        W = 2.0 * M
        D = 0.95 * M
        H = 0.76 * M
        top_t = 0.04 * M
        part(E, "Top", rr_lathe(W, D, 0.03 * M, 4, pill_profile(top_t, 0.01 * M, 2, H - top_t)), teak, 40)
        leg_cd, ln = defn("DiningTable_Leg")
        if ln:
            prof = [(0, 0.012 * M), (H - top_t - 0.0 * M, 0.0)]
            part(leg_cd.get_entities(), "Leg", rr_lathe(0.075 * M, 0.075 * M, 0.008 * M, 2, prof), teak, 40)
        lx = W / 2 - 0.13 * M
        ly = D / 2 - 0.11 * M
        for sx in (-1, 1):
            for sy in (-1, 1):
                place(leg_cd, E, xf(sx * lx, sy * ly, 0), "Leg_%s%s" % ("L" if sx < 0 else "R", "F" if sy < 0 else "B"))
        az0 = H - top_t - 0.09 * M
        az1 = H - top_t
        lh = 0.0375 * M
        for sy in (-1, 1):
            part(E, "Apron_" + ("F" if sy < 0 else "B"), box(-lx + lh, sy * ly - 0.012 * M, az0, lx - lh, sy * ly + 0.012 * M, az1), teak)
        for sx in (-1, 1):
            part(E, "Apron_" + ("L" if sx < 0 else "R"), box(sx * lx - 0.012 * M, -ly + lh, az0, sx * lx + 0.012 * M, ly - lh, az1), teak)
        collider(E, "Top", -W / 2, -D / 2, H - top_t - 0.09 * M, W / 2, D / 2, H)
        for sx in (-1, 1):
            for sy in (-1, 1):
                collider(E, "Leg%d%d" % (sx + 1, sy + 1), sx * lx - 0.04 * M, sy * ly - 0.04 * M, 0, sx * lx + 0.04 * M, sy * ly + 0.04 * M, H - top_t - 0.09 * M)
    out.append(cd)

    cd2, new2 = defn("CoffeeTable")
    if new2:
        E = cd2.get_entities()
        R = 0.48 * M
        part(E, "Top", revolve([(0.33 * M, 0), (0.33 * M, R - 0.015 * M), (0.336 * M, R - 0.004 * M), (0.35 * M, R), (0.364 * M, R - 0.004 * M), (0.37 * M, R - 0.015 * M), (0.37 * M, 0)], 48), trav, 30)
        part(E, "Drum", revolve([(0.0, 0.30 * M), (0.01 * M, 0.31 * M), (0.33 * M, 0.31 * M)], 48), trav, 30)
        collider(E, "Body", -R, -R, 0, R, R, 0.37 * M)
    out.append(cd2)

    cd3, new3 = defn("SideTable")
    if new3:
        E = cd3.get_entities()
        part(E, "Top", revolve([(0.50 * M, 0), (0.50 * M, 0.215 * M), (0.51 * M, 0.225 * M), (0.52 * M, 0.215 * M), (0.52 * M, 0)], 40), oak, 30)
        part(E, "Stem", revolve([(0.03 * M, 0.025 * M), (0.25 * M, 0.02 * M), (0.50 * M, 0.03 * M)], 16), oak, 40)
        part(E, "Foot", revolve([(0, 0.0), (0, 0.17 * M), (0.012 * M, 0.17 * M), (0.03 * M, 0.12 * M), (0.03 * M, 0.0)], 40), oak, 30)
        collider(E, "Body", -0.23 * M, -0.23 * M, 0, 0.23 * M, 0.23 * M, 0.52 * M)
    out.append(cd3)
    return out
