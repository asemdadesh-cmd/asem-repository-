# Mediterranean planting: Italian cypress, olive tree, date palm, a round
# shrub and two boulders. Origins at the base of the trunk on the ground.
# Foliage is modelled as lumpy, closed volumes (the game adds leaf detail
# and wind in its shader).

def _branch(path, r0, r1, n=8):
    radii = [r0 + (r1 - r0) * i / (len(path) - 1.0) for i in range(len(path))]
    return sweep(path, radii, n)


def _smooth(pts, it=2):
    out = pts
    for _ in range(it):
        nxt = [out[0]]
        for i in range(len(out) - 1):
            a = out[i]
            b = out[i + 1]
            nxt.append(tuple(0.75 * a[k] + 0.25 * b[k] for k in range(3)))
            nxt.append(tuple(0.25 * a[k] + 0.75 * b[k] for k in range(3)))
        nxt.append(out[-1])
        out = nxt
    return out


def build():
    out = []
    bark = mat("Bark_Grey", 120, 112, 100)
    bark_olive = mat("Bark_Olive", 112, 100, 86)
    bark_palm = mat("Bark_Palm", 150, 128, 98)
    cyp = mat("Leaf_Cypress", 52, 72, 44)
    olive = mat("Leaf_Olive", 120, 136, 104)
    frond_m = mat("Leaf_Palm", 92, 120, 58)
    shrub = mat("Leaf_Shrub", 74, 104, 56)
    coco = mat("Leaf_Dates", 180, 120, 52)
    rock = mat("Rock_Limestone", 196, 186, 168)

    # ---------------------------------------------------------- cypress
    cd, new = defn("Cypress")
    if new:
        E = cd.get_entities()
        part(E, "Trunk", revolve([(-0.2 * M, 0.17 * M), (0.6 * M, 0.13 * M), (2.0 * M, 0.08 * M)], 10), bark, 40)
        prof = [(0.45 * M, 0)]
        for i in range(1, 15):
            t = i / 15.0
            z = 0.45 + t * 9.3
            r = 0.62 * math.sin(math.pi * min(1.0, t * 1.12)) ** 0.75 * (1.0 - 0.55 * t) + 0.08
            prof.append((z * M, r * M))
        prof.append((10.0 * M, 0))
        part(E, "Crown", organic_revolve(prof, 14, 0.16, 2.6, 1.3), cyp, 70)
        collider(E, "Trunk", -0.25 * M, -0.25 * M, 0, 0.25 * M, 0.25 * M, 6.0 * M)
    out.append(cd)

    # ------------------------------------------------------------- olive
    cd2, new2 = defn("OliveTree")
    if new2:
        E = cd2.get_entities()
        # gnarled trunk: two twisting leaders from a swollen base
        base = organic_revolve([(-0.2 * M, 0.34 * M), (0.0, 0.33 * M), (0.35 * M, 0.25 * M), (0.8 * M, 0.2 * M), (1.1 * M, 0.22 * M)], 10, 0.22, 2.0, 4.2)
        part(E, "Trunk_Base", base, bark_olive, 60)
        limbs = [
            ([(0.0, 0.0, 1.0), (0.25, 0.1, 1.6), (0.7, 0.05, 2.2), (1.3, -0.2, 2.8)], 0.17, 0.06),
            ([(0.0, 0.0, 1.0), (-0.2, 0.15, 1.7), (-0.5, 0.4, 2.4), (-1.1, 0.6, 3.0)], 0.16, 0.06),
            ([(0.0, 0.0, 1.0), (0.05, -0.25, 1.8), (-0.1, -0.7, 2.5), (0.1, -1.2, 3.2)], 0.14, 0.05),
            ([(0.05, 0.05, 1.0), (0.1, 0.2, 2.0), (0.2, 0.3, 3.0), (0.25, 0.25, 3.6)], 0.13, 0.05),
        ]
        for k, (pts, r0, r1) in enumerate(limbs):
            path = _smooth([(p[0] * M, p[1] * M, p[2] * M) for p in pts], 2)
            part(E, "Limb_%d" % (k + 1), _branch(path, r0 * M, r1 * M, 8), bark_olive, 70)
        clumps = [(1.4, -0.3, 3.0, 0.95), (-1.2, 0.7, 3.2, 1.0), (0.1, -1.3, 3.4, 0.9), (0.3, 0.3, 3.9, 1.1),
                  (-0.6, -0.5, 3.6, 0.85), (0.9, 0.8, 3.5, 0.8), (-0.2, 1.2, 3.7, 0.75), (1.0, -1.0, 3.7, 0.7),
                  (1.9, 0.2, 2.8, 0.55), (-1.8, -0.1, 2.9, 0.6), (0.6, 1.5, 3.1, 0.55), (-0.9, -1.4, 3.1, 0.55), (0.4, -0.2, 4.4, 0.6)]
        for k, (x, y, z, r) in enumerate(clumps):
            part(E, "Foliage_%d" % (k + 1), blob(r * M, 12, 7, x * M, y * M, z * M, 0.28, 2.4, k * 3.1, 0.72), olive, 75)
        collider(E, "Trunk", -0.35 * M, -0.35 * M, 0, 0.35 * M, 0.35 * M, 2.2 * M)
    out.append(cd2)

    # -------------------------------------------------------------- palm
    cd3, new3 = defn("Palm")
    if new3:
        E = cd3.get_entities()
        # gently curved trunk with leaf-scar rings
        H = 7.2
        pts = []
        radii = []
        for i in range(25):
            t = i / 24.0
            pts.append(((0.9 * t * t) * M, (0.25 * t * t) * M, (t * H - 0.3) * M))
            ring = 1.0 + 0.05 * (1 if i % 2 == 0 else -1)
            radii.append((0.24 - 0.06 * t) * ring * M)
        part(E, "Trunk", sweep(pts, radii, 12), bark_palm, 30)
        top = pts[-1]
        part(E, "Crown_Base", organic_revolve([(top[2] - 0.35 * M, 0.2 * M), (top[2], 0.26 * M), (top[2] + 0.25 * M, 0.18 * M), (top[2] + 0.45 * M, 0)], 12, 0.12, 3.0, 2.0, top[0], top[1]), bark_palm, 60)
        # fronds: arching, V-folded, serrated ribbons
        nf = 18
        for k in range(nf):
            yaw = 2 * math.pi * k / nf + 0.3 * hash1(k, 1.0)
            lift = 0.6 + 0.45 * hash1(k, 2.0) - (0.45 if k % 3 == 1 else 0.0)
            L = (3.0 + 0.6 * hash1(k, 3.0)) * M
            rings = []
            steps = 16
            for s in range(steps + 1):
                t = s / float(steps)
                d = t * L
                h = d * math.sin(lift) - (t * t) * L * 0.75
                c = (top[0] + math.cos(yaw) * d * math.cos(lift * 0.6), top[1] + math.sin(yaw) * d * math.cos(lift * 0.6), top[2] + 0.25 * M + h)
                w = (0.04 + 0.42 * math.sin(math.pi * min(1.0, t * 1.15)) * (1.0 - 0.6 * t)) * M
                if 0 < s < steps:
                    w *= 0.8 + 0.35 * (s % 2)
                side = (-math.sin(yaw), math.cos(yaw), 0.0)
                fold = 0.35
                thick = 0.012 * M
                lt = (c[0] - side[0] * w, c[1] - side[1] * w, c[2] + w * fold)
                rt = (c[0] + side[0] * w, c[1] + side[1] * w, c[2] + w * fold)
                up = (c[0], c[1], c[2] + thick)
                dn = (c[0], c[1], c[2] - thick)
                rings.append([rt, up, lt, dn])
            part(E, "Frond_%02d" % (k + 1), loft(rings), frond_m, 70)
        dates = []
        for k in range(9):
            a = 2 * math.pi * k / 9
            dates.append(blob(0.1 * M, 8, 5, top[0] + math.cos(a) * 0.3 * M, top[1] + math.sin(a) * 0.3 * M, top[2] - 0.25 * M - 0.08 * M * (k % 3), 0.2, 3.0, k))
        part(E, "Dates", mjoin(dates), coco, 60)
        collider(E, "Trunk", -0.3 * M, -0.3 * M, 0, 0.3 * M, 0.3 * M, 2.5 * M)
    out.append(cd3)

    # ------------------------------------------------------------- shrub
    cd4, new4 = defn("Shrub")
    if new4:
        E = cd4.get_entities()
        parts_ = [blob(0.55 * M, 12, 7, 0, 0, 0.45 * M, 0.25, 2.2, 0.5, 0.8), blob(0.4 * M, 10, 6, 0.4 * M, 0.2 * M, 0.35 * M, 0.25, 2.2, 1.5, 0.8),
                  blob(0.38 * M, 10, 6, -0.35 * M, -0.25 * M, 0.32 * M, 0.25, 2.2, 2.5, 0.8)]
        part(E, "Foliage", mjoin(parts_), shrub, 75)
    out.append(cd4)

    # ------------------------------------------------------------ rocks
    for k, (nm, w, h, seed) in enumerate((("Boulder", 1.4, 0.9, 7.0), ("RockFlat", 2.2, 0.6, 3.0))):
        cdr, nr = defn(nm)
        if nr:
            E = cdr.get_entities()
            part(E, "Rock", blob((w / 2) * M, 14, 8, 0, 0, (h * 0.15) * M, 0.3, 1.6, seed, h / w * 1.4), rock, 35)
            collider(E, "Body", -(w / 2) * M, -(w / 2) * M, 0, (w / 2) * M, (w / 2) * M, (h * 0.15 + h * 0.65) * M)
        out.append(cdr)
    return out
