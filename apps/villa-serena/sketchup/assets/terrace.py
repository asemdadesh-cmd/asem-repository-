# The pool terrace around the villa: a travertine deck with an infinity pool
# spilling toward the sea, a stone retaining wall, steps down to the garden,
# planters with lavender and a chrome pool ladder. Shares the villa's origin
# (interior floor level, centre of the house).

def _lavender(cd, leaf, bloom):
    E = cd.get_entities()
    blobs = [(0.0, 0.0, 0.16), (0.14, 0.05, 0.12), (-0.12, 0.08, 0.13), (0.03, -0.13, 0.12), (-0.06, 0.15, 0.11), (0.12, -0.1, 0.1)]
    leaves = []
    for k, (x, y, r) in enumerate(blobs):
        leaves.append(sphere(r * M, 10, 6, x * M, y * M, r * 0.45 * M, 0.75))
    part(E, "Leaves", mjoin(leaves), leaf, 60)
    spikes = []
    for k in range(14):
        a = k * 2.399963
        rr = 0.03 + 0.012 * k
        x = rr * math.cos(a)
        y = rr * math.sin(a)
        z = 0.2 + 0.06 * ((k * 7) % 5) / 4.0
        spikes.append(revolve([(z * M, 0), (z * M + 0.01 * M, 0.012 * M), (z * M + 0.09 * M, 0.009 * M), (z * M + 0.11 * M, 0)], 6, (x * 1.3) * M, (y * 1.3) * M))
    part(E, "Blooms", mjoin(spikes), bloom, 60)


def build():
    trav = mat("Travertine", 226, 212, 190)
    tile = mat("Tile_Pool", 168, 204, 206)
    stone = mat("Stone_Limestone", 214, 200, 176)
    chrome = mat("Chrome", 210, 212, 216)
    conc = mat("Concrete_Warm", 196, 186, 170)
    soil = mat("Soil", 96, 74, 56)
    leaf = mat("Leaf_Lavender", 120, 138, 108)
    bloom = mat("Leaf_Bloom_Purple", 132, 102, 176)

    lav, lnew = defn("Lavender")
    if lnew:
        _lavender(lav, leaf, bloom)

    cd, new = defn("Terrace")
    if not new:
        return [cd, lav]
    E = cd.get_entities()
    DX0, DX1, DY0, DY1 = -12.0, 12.0, -11.25, 9.5
    PX0, PX1, PY0, PY1 = -6.0, 6.0, -11.25, -6.5
    # deck: one slab, notched for the infinity pool, holed around the house
    deck = [(DX0, DY0), (PX0, DY0), (PX0, PY1), (PX1, PY1), (PX1, DY0), (DX1, DY0), (DX1, DY1), (DX0, DY1)]
    house = rect2(-8.0 * M, -1.5 * M, 8.0 * M, 7.5 * M)
    part(E, "Deck", prism([(x * M, y * M) for x, y in deck], -0.3 * M, 0.0, [house]), trav)

    # infinity pool: floor, three walls under the deck and a weir just below the waterline
    part(E, "Pool_Floor", box((PX0 - 0.25) * M, PY0 * M, -1.8 * M, (PX1 + 0.25) * M, (PY1 + 0.25) * M, -1.5 * M), tile)
    part(E, "Pool_Wall_N", box((PX0 - 0.25) * M, PY1 * M, -1.5 * M, (PX1 + 0.25) * M, (PY1 + 0.25) * M, -0.3 * M), tile)
    part(E, "Pool_Wall_W", box((PX0 - 0.25) * M, PY0 * M, -1.5 * M, PX0 * M, PY1 * M, -0.3 * M), tile)
    part(E, "Pool_Wall_E", box(PX1 * M, PY0 * M, -1.5 * M, (PX1 + 0.25) * M, PY1 * M, -0.3 * M), tile)
    part(E, "Pool_Weir", box(PX0 * M, PY0 * M, -1.5 * M, PX1 * M, (PY0 + 0.25) * M, -0.07 * M), tile)
    for k, (x1, z0, z1) in enumerate(((-4.6, -1.5, -1.2), (-5.1, -1.2, -0.9), (-5.6, -0.9, -0.6))):
        part(E, "Pool_Step_%d" % (k + 1), box(PX0 * M, (PY0 + 0.25) * M, z0 * M, x1 * M, PY1 * M, z1 * M), tile)
    volume(E, "Pool", PX0 * M, (PY0 + 0.25) * M, -1.5 * M, PX1 * M, PY1 * M, -0.06 * M)

    # chrome ladder at the deep (east) end
    for k, x in enumerate((4.6, 5.1)):
        path = [(x, PY1 + 0.35, 0.0), (x, PY1 + 0.32, 0.55), (x, PY1 + 0.18, 0.78), (x, PY1 + 0.0, 0.72), (x, PY1 - 0.1, 0.4), (x, PY1 - 0.12, -0.9)]
        part(E, "Ladder_Rail_%d" % (k + 1), sweep([(p[0] * M, p[1] * M, p[2] * M) for p in bezier_path(path)], 0.021 * M, 10), chrome, 40)
    for k, z in enumerate((-0.25, -0.55, -0.85)):
        part(E, "Ladder_Step_%d" % (k + 1), box(4.6 * M, (PY1 - 0.2) * M, (z - 0.02) * M, 5.1 * M, (PY1 - 0.08) * M, z * M), chrome)

    # retaining wall below the deck edge, dropped under the weir to read as a catch channel
    part(E, "Retaining_Wall_W", box(DX0 * M, (DY0 - 0.5) * M, -5.0 * M, (PX0 - 0.25) * M, DY0 * M, 0.0), stone)
    part(E, "Retaining_Wall_Mid", box((PX0 - 0.25) * M, (DY0 - 0.5) * M, -5.0 * M, (PX1 + 0.25) * M, DY0 * M, -0.4 * M), stone)
    part(E, "Retaining_Wall_E", box((PX1 + 0.25) * M, (DY0 - 0.5) * M, -5.0 * M, 9.0 * M, DY0 * M, 0.0), stone)
    part(E, "Retaining_Wall_E2", box(11.0 * M, (DY0 - 0.5) * M, -5.0 * M, DX1 * M, DY0 * M, 0.0), stone)
    part(E, "Wall_Side_W", box((DX0 - 0.5) * M, (DY0 - 0.5) * M, -5.0 * M, DX0 * M, DY1 * M, 0.0), stone)
    part(E, "Wall_Side_E", box(DX1 * M, (DY0 - 0.5) * M, -5.0 * M, (DX1 + 0.5) * M, DY1 * M, 0.0), stone)
    for nm, (a, b, c, d) in (("W", (DX0 - 0.55, DY0 - 0.55, PX0 - 0.25, DY0)), ("E", (PX1 + 0.25, DY0 - 0.55, 9.0, DY0)), ("E2", (11.0, DY0 - 0.55, DX1 + 0.55, DY0)),
                             ("SideW", (DX0 - 0.55, DY0, DX0, DY1)), ("SideE", (DX1, DY0, DX1 + 0.55, DY1))):
        part(E, "Coping_" + nm, box(a * M, b * M, 0.0, c * M, d * M, 0.05 * M), trav)

    # garden steps down the south-east corner: a landing, then 20 risers
    # between flanking walls, through the gap in the retaining wall
    rise = 3.5 / 20.0
    run = 0.32
    sx0, sx1 = 9.0, 11.0
    y0 = DY0 - 0.5
    prof = [(DY0, -5.0), (DY0, 0.0)]
    for k in range(20):
        y = y0 - (k + 1) * run
        prof.append((y, -k * rise))
        prof.append((y, -(k + 1) * rise))
    prof.append((y0 - 20 * run, -5.0))
    part(E, "Garden_Steps", plane_map(prism([(p[0] * M, p[1] * M) for p in prof], sx0 * M, sx1 * M), "yz"), stone)
    for k, (a, b) in enumerate(((sx0 - 0.3, sx0), (sx1, sx1 + 0.3))):
        wp = [(y0, -5.0), (y0, 0.9), (y0 - 20 * run, -3.5 + 0.9), (y0 - 20 * run, -5.0)]
        part(E, "Step_Wall_%d" % (k + 1), plane_map(prism([(p[0] * M, p[1] * M) for p in wp], a * M, b * M), "yz"), stone)

    # planters along the west side with lavender
    for k, (cx, cy) in enumerate(((-10.6, -4.0), (-10.6, 3.5), (10.6, 3.5))):
        w, d = 1.6, 4.0
        part(E, "Planter_%d" % (k + 1), rr_lathe(w * M, d * M, 0.05 * M, 3, [(0.0, 0.0), (0.55 * M, 0.0), (0.55 * M, 0.08 * M), (0.45 * M, 0.08 * M)], cx * M, cy * M), conc, 40)
        part(E, "Planter_Soil_%d" % (k + 1), box((cx - w / 2 + 0.08) * M, (cy - d / 2 + 0.08) * M, 0.45 * M, (cx + w / 2 - 0.08) * M, (cy + d / 2 - 0.08) * M, 0.5 * M), soil)
        for j in range(5):
            place(lav, E, xf((cx + (0.25 if j % 2 else -0.25)) * M, (cy - 1.6 + j * 0.8) * M, 0.5 * M, j * 47.0), "Lavender_%d_%d" % (k + 1, j + 1))
    marker(E, "SPAWN", "terrace", 0.0, -5.2 * M, 0.0, 0.0)
    return [cd, lav]


def bezier_path(pts):
    """Smooths a short polyline with Chaikin corner cutting (keeps the ends)."""
    out = pts
    for _ in range(2):
        nxt = [out[0]]
        for i in range(len(out) - 1):
            a = out[i]
            b = out[i + 1]
            nxt.append(tuple(0.75 * a[k] + 0.25 * b[k] for k in range(3)))
            nxt.append(tuple(0.25 * a[k] + 0.75 * b[k] for k in range(3)))
        nxt.append(out[-1])
        out = nxt
    return out
