# Two parasols: a teak market umbrella on a granite base (terrace) and a
# thatched beach parasol on a driftwood pole (beach). Origin: pole on ground.

def _ribs(E, mat_, n, a0, r_in, z_in, r_out, z_out, rad, prefix):
    for j in range(n):
        a = a0 + 2 * math.pi * j / n
        c = math.cos(a)
        s = math.sin(a)
        part(E, "%s_%d" % (prefix, j + 1), sweep([(r_in * c, r_in * s, z_in), (r_out * c, r_out * s, z_out)], rad, 6), mat_, 40)


def build():
    out = []
    teak = mat("Teak", 150, 101, 62)
    canvas = mat("Canvas_Cream", 236, 228, 210)
    granite = mat("Granite_Charcoal", 72, 72, 74)
    iron = mat("Iron_Black", 38, 38, 40)

    cd, new = defn("Parasol")
    if new:
        E = cd.get_entities()
        base = rr_lathe(0.56 * M, 0.56 * M, 0.04 * M, 3, pill_profile(0.075 * M, 0.012 * M, 2))
        part(E, "Base", base, granite, 40)
        part(E, "Stand", revolve([(0.075 * M, 0.05 * M), (0.09 * M, 0.035 * M), (0.30 * M, 0.03 * M), (0.31 * M, 0.034 * M), (0.33 * M, 0.034 * M)], 16), iron, 40)
        part(E, "Pole", cylinder(0.022 * M, 2.5 * M, 16, 0, 0, 0.33 * M), teak, 40)
        part(E, "Runner", revolve([(1.78 * M, 0.035 * M), (1.80 * M, 0.04 * M), (1.86 * M, 0.04 * M), (1.88 * M, 0.035 * M)], 16), teak, 40)
        a0 = math.pi / 8
        # octagonal canopy: underside -> valance -> top surface, flat panels between ribs
        prof = [(2.44 * M, 0), (2.12 * M, 1.44 * M), (2.00 * M, 1.455 * M), (2.00 * M, 1.485 * M), (2.12 * M, 1.505 * M), (2.15 * M, 1.50 * M), (2.62 * M, 0)]
        part(E, "Canopy", revolve(prof, 8, 0, 0, a0), canvas, 25)
        _ribs(E, teak, 8, a0, 0.045 * M, 2.40 * M, 1.40 * M, 2.10 * M, 0.011 * M, "Rib")
        _ribs(E, teak, 8, a0, 0.04 * M, 1.84 * M, 0.70 * M, 2.24 * M, 0.008 * M, "Strut")
        part(E, "Hub", revolve([(2.36 * M, 0.04 * M), (2.44 * M, 0.05 * M), (2.47 * M, 0.04 * M)], 16), teak, 40)
        part(E, "Finial", revolve([(2.60 * M, 0.03 * M), (2.64 * M, 0.035 * M), (2.68 * M, 0.025 * M), (2.71 * M, 0)], 12), teak, 50)
        collider(E, "Base", -0.28 * M, -0.28 * M, 0, 0.28 * M, 0.28 * M, 0.08 * M)
        collider(E, "Pole", -0.035 * M, -0.035 * M, 0.08 * M, 0.035 * M, 0.035 * M, 2.3 * M)
        collider(E, "Canopy", -1.05 * M, -1.05 * M, 2.15 * M, 1.05 * M, 1.05 * M, 2.55 * M)
    out.append(cd)

    straw = mat("Straw_Thatch", 196, 166, 112)
    drift = mat("Driftwood", 168, 150, 128)
    rope = mat("Rope_Natural", 196, 176, 140)
    cd2, new2 = defn("ParasolStraw")
    if new2:
        E = cd2.get_entities()
        part(E, "Pole", revolve([(-0.35 * M, 0.04 * M), (1.2 * M, 0.042 * M), (2.35 * M, 0.036 * M), (2.40 * M, 0.03 * M)], 12), drift, 40)
        part(E, "Lashing", revolve([(1.20 * M, 0.046 * M), (1.21 * M, 0.05 * M), (1.29 * M, 0.05 * M), (1.30 * M, 0.046 * M)], 12), rope, 40)
        # two-tier thatch with a ragged fringe (12 sides reads as round straw)
        prof = [(2.18 * M, 0), (1.90 * M, 1.30 * M), (1.78 * M, 1.38 * M), (1.80 * M, 1.44 * M), (1.97 * M, 1.40 * M),
                (2.03 * M, 1.02 * M), (2.12 * M, 1.06 * M), (2.62 * M, 0.12 * M), (2.70 * M, 0)]
        part(E, "Thatch", revolve(prof, 12), straw, 35)
        _ribs(E, drift, 6, 0.0, 0.05 * M, 2.10 * M, 1.20 * M, 1.86 * M, 0.016 * M, "Spoke")
        part(E, "Topknot", revolve([(2.66 * M, 0.07 * M), (2.74 * M, 0.06 * M), (2.84 * M, 0)], 10), straw, 50)
        collider(E, "Pole", -0.045 * M, -0.045 * M, 0, 0.045 * M, 0.045 * M, 1.95 * M)
        collider(E, "Canopy", -1.0 * M, -1.0 * M, 1.95 * M, 1.0 * M, 1.0 * M, 2.6 * M)
    out.append(cd2)
    return out
