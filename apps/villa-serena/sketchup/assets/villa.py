# Villa Serena: a single-storey modern Mediterranean house with a deep loggia,
# floor-to-ceiling sliding glass, a bedroom wing, a kitchen and an outdoor
# stair to a roof terrace. Origin: interior floor level (z = 0) at the centre
# of the main volume; the sea side faces -Y.
#
# Walls are single solids with their openings cut as inner loops (they start
# 0.4 m below the floor so door openings are true holes, not notches).

WALL = 0.25  # exterior wall thickness (m)
PART = 0.127  # interior partition: 5 in
FLOOR_Z = 0.0
CEIL = 3.4
ROOF_T = 0.35
FOUND = -0.4


def _wall_xz(E, name, x0, x1, y0, y1, z0, z1, holes, m):
    """Wall in the XZ plane (faces +/-Y), extruded from y0 to y1.
    holes: list of (x0, z0, x1, z1) openings in metres."""
    poly = rect2(x0 * M, z0 * M, x1 * M, z1 * M)
    hs = [rect2(a * M, b * M, c * M, d * M) for (a, b, c, d) in holes]
    return part(E, name, plane_map(prism(poly, y0 * M, y1 * M, hs), "xz"), m)


def _wall_yz(E, name, y0, y1, x0, x1, z0, z1, holes, m, notches=None):
    """Wall in the YZ plane (faces +/-X), extruded from x0 to x1.
    holes: (y0, z0, y1, z1) openings; notches: (y0, y1, z1) door cut-outs
    from the bottom edge (for partitions standing on the floor)."""
    if notches:
        pts = [(y0, z0)]
        for (a, b, top) in sorted(notches):
            pts += [(a, z0), (a, top), (b, top), (b, z0)]
        pts += [(y1, z0), (y1, z1), (y0, z1)]
        poly = [(p[0] * M, p[1] * M) for p in pts]
    else:
        poly = rect2(y0 * M, z0 * M, y1 * M, z1 * M)
    hs = [rect2(a * M, b * M, c * M, d * M) for (a, b, c, d) in holes]
    return part(E, name, plane_map(prism(poly, x0 * M, x1 * M, hs), "yz"), m)


def _frame(E, name, a0, b0, a1, b1, c0, c1, bar, plane, m):
    """Rectangular frame ring (window/door frame). a/b span the opening in
    the wall plane, c0..c1 its depth."""
    outer = rect2(a0 * M, b0 * M, a1 * M, b1 * M)
    inner = rect2((a0 + bar) * M, (b0 + bar) * M, (a1 - bar) * M, (b1 - bar) * M)
    return part(E, name, plane_map(prism(outer, c0 * M, c1 * M, [inner]), plane), m)


def _pane(E, name, a0, b0, a1, b1, c0, c1, plane, m):
    return part(E, name, plane_map(prism(rect2(a0 * M, b0 * M, a1 * M, b1 * M), c0 * M, c1 * M), plane), m)


def _slider_xz(E, name, x0, x1, z0, z1, ywall0, ywall1, frame_m, glass_m, open_side):
    """Two-panel sliding door in an XZ opening. One panel is slid open over
    the other (on the inner track)."""
    g = Group()
    E.add_group(g)
    g.set_name(name)
    G = g.get_entities()
    mid = (ywall0 + ywall1) / 2
    _frame(G, "Frame", x0, z0, x1, z1, mid - 0.05, mid + 0.05, 0.05, "xz", frame_m)
    w = (x1 - x0 - 0.1) / 2 + 0.03
    bar = 0.045
    tracks = (mid - 0.035, mid + 0.005)
    # fixed panel stays on its side; the sliding panel overlaps it on the inner track
    if open_side < 0:
        fixed = (x1 - 0.05 - w, x1 - 0.05)
        moving = (fixed[0] - 0.04, fixed[1] - 0.04)
    else:
        fixed = (x0 + 0.05, x0 + 0.05 + w)
        moving = (fixed[0] + 0.04, fixed[1] + 0.04)
    for (pa, pb), (t0, nm) in ((fixed, (tracks[0], "Fixed")), (moving, (tracks[1], "Sliding"))):
        _frame(G, nm + "_Frame", pa, z0 + 0.05, pb, z1 - 0.05, t0, t0 + 0.03, bar, "xz", frame_m)
        _pane(G, nm + "_Glass", pa + bar, z0 + 0.05 + bar, pb - bar, z1 - 0.05 - bar, t0 + 0.009, t0 + 0.021, "xz", glass_m)
    return g


def build():
    plaster = mat("Plaster_White", 242, 238, 229)
    trav = mat("Travertine", 226, 212, 190)
    bronze = mat("Bronze_Frame", 74, 62, 50)
    glass = mat("Glass_Clear", 188, 214, 220, 70)
    oak = mat("Oak_Natural", 190, 150, 104)
    marble = mat("Marble_White", 236, 234, 228)
    walnut = mat("Walnut", 98, 68, 46)
    stone = mat("Stone_Limestone", 214, 200, 176)
    flame = mat("Flame", 255, 150, 60)
    light = mat("Light_Warm", 255, 214, 160)

    cd, new = defn("Villa")
    if not new:
        return cd
    E = cd.get_entities()
    X0, X1 = -8.0, 8.0
    Y0, Y1 = -1.5, 7.5  # front (sea) and back faces, outside
    xi0, xi1 = X0 + WALL, X1 - WALL
    yi0, yi1 = Y0 + WALL, Y1 - WALL
    H = CEIL

    # ---------------------------------------------------------------- walls
    front_open = [(-7.0, 0.0, -3.0, 2.8), (-2.2, 0.0, 1.8, 2.8), (3.8, 0.0, 7.0, 2.8)]
    _wall_xz(E, "Wall_Front", X0, X1, Y0, yi0, FOUND, H, front_open, plaster)
    back_open = [(-0.55, 0.0, 0.55, 2.45), (-6.5, 1.2, -3.5, 2.4), (4.5, 0.9, 6.5, 2.4)]
    _wall_xz(E, "Wall_Back", X0, X1, yi1, Y1, FOUND, H, back_open, plaster)
    west_win = (5.2, 0.9, 6.5, 2.4)
    east_win = (5.2, 0.9, 6.6, 2.4)
    _wall_yz(E, "Wall_West", yi0, yi1, X0, xi0, FOUND, H, [west_win], plaster)
    _wall_yz(E, "Wall_East", yi0, yi1, xi1, X1, FOUND, H, [east_win], plaster)
    _wall_yz(E, "Wall_Bedroom", yi0, yi1, 3.0, 3.0 + PART, 0.0, H, [], plaster, notches=[(5.5, 6.4, 2.3)])
    part(E, "Floor", box(xi0 * M, yi0 * M, FOUND * M, xi1 * M, yi1 * M, FLOOR_Z * M), trav)

    # ------------------------------------------------- glazing and the door
    _slider_xz(E, "Slider_Living", -7.0, -3.0, 0.0, 2.8, Y0, yi0, bronze, glass, -1)
    _slider_xz(E, "Slider_Dining", -2.2, 1.8, 0.0, 2.8, Y0, yi0, bronze, glass, 1)
    _slider_xz(E, "Slider_Bedroom", 3.8, 7.0, 0.0, 2.8, Y0, yi0, bronze, glass, -1)
    for nm, (a0, b0, a1, b1) in (("Kitchen", (-6.5, 1.2, -3.5, 2.4)), ("Bed", (4.5, 0.9, 6.5, 2.4))):
        mid = (yi1 + Y1) / 2
        _frame(E, "Window_%s_Frame" % nm, a0, b0, a1, b1, mid - 0.03, mid + 0.03, 0.05, "xz", bronze)
        _pane(E, "Window_%s_Glass" % nm, a0 + 0.05, b0 + 0.05, a1 - 0.05, b1 - 0.05, mid - 0.006, mid + 0.006, "xz", glass)
    for nm, (a0, b0, a1, b1), (c0, c1) in (("West", west_win, (X0, xi0)), ("East", east_win, (xi1, X1))):
        mid = (c0 + c1) / 2
        _frame(E, "Window_%s_Frame" % nm, a0, b0, a1, b1, mid - 0.03, mid + 0.03, 0.05, "yz", bronze)
        _pane(E, "Window_%s_Glass" % nm, a0 + 0.05, b0 + 0.05, a1 - 0.05, b1 - 0.05, mid - 0.006, mid + 0.006, "yz", glass)
    # entrance: walnut pivot door standing open
    _frame(E, "Door_Frame", -0.55, 0.0, 0.55, 2.45, yi1, Y1, 0.04, "xz", walnut)
    door = part(E, "Door", box(0, -0.025 * M, 0, 1.0 * M, 0.025 * M, 2.4 * M), walnut)
    door.set_transform(xf(-0.5 * M, (yi1 + 0.12) * M, 0.02 * M, -80.0))
    part(E, "Door_Handle", box(0.86 * M, -0.06 * M, 0.95 * M, 0.88 * M, 0.06 * M, 1.35 * M), bronze).set_transform(xf(-0.5 * M, (yi1 + 0.12) * M, 0.02 * M, -80.0))

    # ----------------------------------------------- loggia, roof and deck
    for k, x in enumerate((-7.65, -2.55, 2.55, 7.65)):
        part(E, "Column_%d" % (k + 1), box((x - 0.17) * M, -4.0 * M, FLOOR_Z * M, (x + 0.17) * M, -3.66 * M, (H - 0.025) * M), plaster)
    RX0, RX1, RY0, RY1 = -8.4, X1, -4.2, 7.9
    part(E, "Roof_Slab", box(RX0 * M, RY0 * M, H * M, RX1 * M, RY1 * M, (H + ROOF_T) * M), plaster)
    top = H + ROOF_T
    pt = 0.2
    # parapets (the sea side is glass), with a gap where the stair arrives
    part(E, "Parapet_Back", box(RX0 * M, (RY1 - pt) * M, top * M, RX1 * M, RY1 * M, (top + 1.0) * M), plaster)
    part(E, "Parapet_West", box(RX0 * M, (RY0 + pt) * M, top * M, (RX0 + pt) * M, (RY1 - pt) * M, (top + 1.0) * M), plaster)
    part(E, "Parapet_East_A", box((RX1 - pt) * M, -1.3 * M, top * M, RX1 * M, (RY1 - pt) * M, (top + 1.0) * M), plaster)
    part(E, "Parapet_East_B", box((RX1 - pt) * M, (RY0 + pt) * M, top * M, RX1 * M, -2.6 * M, (top + 1.0) * M), plaster)
    part(E, "Parapet_Front_Curb", box(RX0 * M, RY0 * M, top * M, RX1 * M, (RY0 + pt) * M, (top + 0.1) * M), plaster)
    span = (RX1 - RX0) / 6.0
    for k in range(6):
        a = RX0 + k * span + 0.03
        b = RX0 + (k + 1) * span - 0.03
        _pane(E, "Balustrade_Glass_%d" % (k + 1), a, top + 0.1, b, top + 1.0, RY0 + 0.08, RY0 + 0.1, "xz", glass)
    part(E, "Balustrade_Rail", box(RX0 * M, (RY0 + 0.04) * M, (top + 1.0) * M, RX1 * M, (RY0 + 0.14) * M, (top + 1.05) * M), bronze)
    part(E, "Roof_Deck", box((RX0 + pt) * M, (RY0 + pt) * M, top * M, (RX1 - pt) * M, (RY1 - pt) * M, (top + 0.02) * M), trav)

    # ------------------------------------------------ stair to the roof
    # 22 risers hugging the east wall, rising toward the sea to a landing
    # that meets the roof deck through a gap in the parapet.
    sx0, sx1 = X1, X1 + 1.2
    rise = (top + 0.02) / 22.0
    run = 0.28
    y_top = -1.3
    y_land = -2.6
    y_bot = y_top + 22 * run
    prof = [(y_bot, 0.0)]
    for k in range(22):
        y = y_bot - k * run
        prof.append((y, (k + 1) * rise))
        prof.append((y - run, (k + 1) * rise))
    prof[-1] = (y_land, 22 * rise)
    prof.append((y_land, 22 * rise - 0.3))
    prof.append((y_bot - 2 * run, 0.0))
    part(E, "Stair", plane_map(prism([(p[0] * M, p[1] * M) for p in prof], sx0 * M, sx1 * M), "yz"), stone)
    wall_pts = [(y_bot, 0.0), (y_bot, 1.0), (y_top, top + 1.0), (y_land, top + 1.0), (y_land, top - 0.3), (y_bot - 2 * run, 0.0)]
    part(E, "Stair_Wall", plane_map(prism([(p[0] * M, p[1] * M) for p in wall_pts], sx1 * M, (sx1 + 0.2) * M), "yz"), plaster)
    part(E, "Landing_Rail", box(sx0 * M, y_land * M, (top + 0.02) * M, sx1 * M, (y_land + 0.2) * M, (top + 1.0) * M), plaster)

    # ------------------------------------------------- kitchen + fireplace
    kx0, kx1 = -7.75, -2.6
    part(E, "Kitchen_Base", box(kx0 * M, (yi1 - 0.62) * M, 0, kx1 * M, (yi1 - 0.02) * M, 0.06 * M), walnut)
    part(E, "Kitchen_Cabinets", box(kx0 * M, (yi1 - 0.6) * M, 0.06 * M, kx1 * M, yi1 * M, 0.88 * M), oak)
    part(E, "Kitchen_Counter", box(kx0 * M, (yi1 - 0.64) * M, 0.88 * M, kx1 * M, yi1 * M, 0.92 * M), marble)
    part(E, "Kitchen_Shelf", box(-2.9 * M, (yi1 - 0.28) * M, 2.55 * M, -0.9 * M, yi1 * M, 2.6 * M), oak)
    for k in range(7):
        x = kx0 + 0.05 + k * (kx1 - kx0 - 0.1) / 7.0
        part(E, "Cabinet_Groove_%d" % (k + 1), box((x - 0.004) * M, (yi1 - 0.605) * M, 0.1 * M, (x + 0.004) * M, (yi1 - 0.6) * M, 0.84 * M), walnut)
    part(E, "Island", box(-6.2 * M, 4.3 * M, 0, -3.4 * M, 5.2 * M, 0.88 * M), oak)
    part(E, "Island_Top", box(-6.3 * M, 4.2 * M, 0.88 * M, -3.3 * M, 5.5 * M, 0.92 * M), marble)
    part(E, "Fireplace", plane_map(prism(rect2(2.2 * M, 0.0, 5.0 * M, 1.1 * M), xi0 * M, (xi0 + 0.45) * M, [rect2(3.1 * M, 0.25 * M, 4.1 * M, 0.85 * M)]), "yz"), plaster)
    part(E, "Fireplace_Back", box(xi0 * M, 3.1 * M, 0.25 * M, (xi0 + 0.1) * M, 4.1 * M, 0.85 * M), stone)
    part(E, "Fireplace_Hearth", box((xi0 + 0.1) * M, 3.1 * M, 0.25 * M, (xi0 + 0.45) * M, 4.1 * M, 0.3 * M), stone)
    part(E, "Fire", revolve([(0.30 * M, 0.16 * M), (0.42 * M, 0.12 * M), (0.62 * M, 0.0)], 10, (xi0 + 0.27) * M, 3.6 * M), flame)

    # --------------------------------------------- character and detail
    teak = mat("Teak", 150, 101, 62)
    # stone-clad chimney breast outside the west wall, rising past the parapet
    part(E, "Chimney", box((X0 - 0.95) * M, 2.7 * M, 0.0, X0 * M, 4.5 * M, (top + 1.6) * M), stone)
    part(E, "Chimney_Cap", box((X0 - 1.05) * M, 2.6 * M, (top + 1.6) * M, (X0 + 0.1) * M, 4.6 * M, (top + 1.7) * M), plaster)
    # travertine coping on every parapet
    cop = 0.03
    for nm, (a, b, c, d) in (("Back", (RX0, RY1 - pt - 0.03, RX1, RY1 + 0.03)), ("West", (RX0 - 0.03, RY0 + pt, RX0 + pt + 0.03, RY1 - pt - 0.03)),
                             ("East_A", (RX1 - pt - 0.03, -1.3, RX1 + 0.03, RY1 - pt - 0.03)), ("East_B", (RX1 - pt - 0.03, RY0 + pt, RX1 + 0.03, -2.6))):
        part(E, "Coping_" + nm, box(a * M, b * M, (top + 1.0) * M, c * M, d * M, (top + 1.0 + cop) * M), trav)
    # warm teak boards under the loggia roof
    part(E, "Loggia_Ceiling", box((RX0 + 0.05) * M, (RY0 + 0.05) * M, (H - 0.025) * M, (RX1 - 0.05) * M, Y0 * M, H * M), teak)
    # roof-terrace pergola: four posts, two beams, slatted shade
    px = (-6.0, 0.6)
    py = (-3.4, 0.4)
    ph = 2.5
    for i, x in enumerate(px):
        for j, y in enumerate(py):
            part(E, "Pergola_Post_%d%d" % (i, j), box((x - 0.07) * M, (y - 0.07) * M, (top + 0.02) * M, (x + 0.07) * M, (y + 0.07) * M, (top + ph) * M), teak)
    for j, y in enumerate(py):
        part(E, "Pergola_Beam_%d" % j, box((px[0] - 0.4) * M, (y - 0.06) * M, (top + ph) * M, (px[1] + 0.4) * M, (y + 0.06) * M, (top + ph + 0.18) * M), teak)
    slat_cd, sn = defn("Pergola_Slat")
    if sn:
        part(slat_cd.get_entities(), "Slat", box(-0.025 * M, (py[0] - 0.35) * M, 0, 0.025 * M, (py[1] + 0.35) * M, 0.12 * M), teak)
    k = 0
    x = px[0] - 0.3
    while x <= px[1] + 0.3:
        k += 1
        place(slat_cd, E, xf(x * M, 0, (top + ph + 0.18) * M), "Pergola_Slat_%02d" % k)
        x += 0.22
    # wall sconces either side of the entrance
    for k, x in enumerate((-0.95, 0.95)):
        part(E, "Sconce_%d" % (k + 1), box((x - 0.06) * M, Y1 * M, 1.85 * M, (x + 0.06) * M, (Y1 + 0.1) * M, 2.15 * M), bronze)
        part(E, "Sconce_Glow_%d" % (k + 1), box((x - 0.045) * M, (Y1 + 0.1) * M, 1.88 * M, (x + 0.045) * M, (Y1 + 0.102) * M, 2.12 * M), light)
        marker(E, "LIGHT", "sconce%d" % (k + 1), x * M, (Y1 + 0.3) * M, 2.0 * M, 0)

    # -------------------------------------------- lights and locators
    for k, (x, y) in enumerate(((-4.8, 4.75), (-0.2, 3.0), (5.4, 3.0), (-5.0, -2.6), (0.0, -2.6), (5.0, -2.6))):
        part(E, "Downlight_%d" % (k + 1), cylinder(0.075 * M, 0.01 * M, 16, x * M, y * M, (H - 0.01) * M), light)
        marker(E, "LIGHT", str(k + 1), x * M, y * M, (H - 0.3) * M, 0)
    marker(E, "LIGHT", "fire", (xi0 + 0.5) * M, 3.6 * M, 0.6 * M, 0)
    marker(E, "SPAWN", "door", 0.0, (Y1 + 1.5) * M, 0.0, 180.0)
    marker(E, "SPAWN", "loggia", 0.0, -3.0 * M, 0.0, 0.0)
    return cd
