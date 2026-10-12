# Garden games: a giant Staunton chess set on a stone board, and a teak
# A-frame swing bench for two. Chess pieces carry no material of their own:
# each instance is painted ivory or ebony (SketchUp's component material
# inheritance); the game does the same.

def _staunton(name, prof, extra=None):
    cd, new = defn(name)
    if new:
        E = cd.get_entities()
        part(E, "Body", revolve([(z * M, r * M) for z, r in prof], 24), None, 30)
        if extra:
            extra(E)
    return cd


def build():
    out = []
    ivory = mat("Ceramic_Ivory", 236, 228, 210)
    ebony = mat("Ceramic_Ebony", 46, 40, 36)

    pawn = _staunton("Pawn", [(0, 0.125), (0.03, 0.13), (0.055, 0.12), (0.07, 0.1), (0.09, 0.095), (0.11, 0.076), (0.2, 0.052), (0.225, 0.075),
                              (0.245, 0.075), (0.26, 0.05), (0.275, 0.058), (0.3, 0.074), (0.33, 0.078), (0.36, 0.072), (0.385, 0.055),
                              (0.405, 0.03), (0.413, 0)])

    def merlons(E):
        for k in range(4):
            part(E, "Merlon_%d" % (k + 1), mrot(box(-0.035 * M, 0.06 * M, 0.5 * M, 0.035 * M, 0.125 * M, 0.56 * M), "z", 90 * k + 45), None)

    rook = _staunton("Rook", [(0, 0.15), (0.03, 0.155), (0.06, 0.14), (0.075, 0.12), (0.095, 0.115), (0.12, 0.1), (0.36, 0.085), (0.4, 0.11),
                              (0.42, 0.13), (0.5, 0.13), (0.5, 0)], merlons)

    def head(E):
        sil = [(-0.10, 0.12), (0.10, 0.12), (0.09, 0.22), (0.06, 0.30), (0.10, 0.36), (0.17, 0.40), (0.195, 0.44), (0.17, 0.48),
               (0.09, 0.52), (0.065, 0.575), (0.035, 0.625), (0.005, 0.575), (-0.05, 0.55), (-0.10, 0.46), (-0.13, 0.33), (-0.12, 0.2)]
        poly = [(-u * M, v * M) for u, v in sil]
        part(E, "Head", plane_map(prism(poly, -0.065 * M, 0.065 * M), "yz"), None)
        part(E, "Mane", plane_map(prism([(-u * M, v * M) for u, v in [(-0.05, 0.55), (-0.10, 0.46), (-0.13, 0.33), (-0.12, 0.2), (-0.15, 0.22), (-0.16, 0.34), (-0.13, 0.47), (-0.075, 0.57)]], -0.045 * M, 0.045 * M), "yz"), None)
        for sx in (-1, 1):
            part(E, "Eye_%s" % ("L" if sx < 0 else "R"), boxc(0.01 * M, 0.03 * M, 0.02 * M, sx * 0.07 * M, -0.08 * M, 0.47 * M), None)

    knight = _staunton("Knight", [(0, 0.15), (0.03, 0.155), (0.06, 0.14), (0.075, 0.125), (0.1, 0.12), (0.12, 0.11), (0.12, 0)], head)
    bishop = _staunton("Bishop", [(0, 0.14), (0.03, 0.145), (0.06, 0.13), (0.075, 0.11), (0.095, 0.105), (0.12, 0.085), (0.34, 0.055),
                                  (0.37, 0.09), (0.39, 0.09), (0.405, 0.06), (0.43, 0.07), (0.5, 0.085), (0.56, 0.07), (0.6, 0.045),
                                  (0.625, 0.02), (0.64, 0.025), (0.66, 0.03), (0.68, 0.02), (0.69, 0)])

    def crown(E):
        for k in range(8):
            a = 2 * math.pi * k / 8
            part(E, "Point_%d" % (k + 1), sphere(0.022 * M, 8, 5, 0.098 * M * math.cos(a), 0.098 * M * math.sin(a), 0.71 * M), None)

    queen = _staunton("Queen", [(0, 0.155), (0.03, 0.16), (0.06, 0.145), (0.08, 0.125), (0.1, 0.12), (0.13, 0.1), (0.45, 0.06), (0.48, 0.1),
                                (0.5, 0.1), (0.52, 0.065), (0.6, 0.075), (0.68, 0.11), (0.7, 0.1), (0.71, 0.07), (0.73, 0.045),
                                (0.76, 0.04), (0.79, 0.03), (0.81, 0)], crown)

    def cross(E):
        part(E, "Cross_V", boxc(0.04 * M, 0.04 * M, 0.16 * M, 0, 0, 0.8 * M), None)
        part(E, "Cross_H", boxc(0.12 * M, 0.04 * M, 0.04 * M, 0, 0, 0.87 * M), None)

    king = _staunton("King", [(0, 0.16), (0.03, 0.165), (0.06, 0.15), (0.08, 0.13), (0.1, 0.125), (0.13, 0.105), (0.5, 0.065), (0.53, 0.105),
                              (0.55, 0.105), (0.57, 0.07), (0.66, 0.085), (0.72, 0.115), (0.74, 0.1), (0.76, 0.07), (0.79, 0.06), (0.8, 0)], cross)
    pieces = [pawn, rook, knight, bishop, queen, king]
    out += pieces

    # board: 8 x 8 stone squares set in a travertine frame
    trav = mat("Travertine", 226, 212, 190)
    light = mat("Stone_Light", 230, 222, 204)
    dark = mat("Stone_Slate", 74, 76, 78)
    S = 0.6
    tile_cd, tn = defn("Chess_Tile")
    if tn:
        part(tile_cd.get_entities(), "Tile", rr_lathe((S - 0.012) * M, (S - 0.012) * M, 0.01 * M, 2, top_round_profile(0.05 * M, 0.006 * M, 2)), None, 40)
    board, bn = defn("ChessBoard")
    if bn:
        E = board.get_entities()
        half = 4 * S
        frame = rect2(-(half + 0.25) * M, -(half + 0.25) * M, (half + 0.25) * M, (half + 0.25) * M)
        part(E, "Frame", prism(frame, -0.15 * M, 0.05 * M, [rect2(-half * M, -half * M, half * M, half * M)]), trav)
        part(E, "Bed", box(-half * M, -half * M, -0.15 * M, half * M, half * M, 0.0), trav)
        for i in range(8):
            for j in range(8):
                t = place(tile_cd, E, xf((-half + S / 2 + i * S) * M, (-half + S / 2 + j * S) * M, 0), "Square_%s%d" % ("abcdefgh"[i], j + 1))
                t.set_material(dark if (i + j) % 2 == 0 else light)
        collider(E, "Board", -(half + 0.25) * M, -(half + 0.25) * M, -0.15 * M, (half + 0.25) * M, (half + 0.25) * M, 0.05 * M)
    out.append(board)

    # the whole set, pieces painted per side (kit preview only)
    chess, cn = defn("ChessSet")
    if cn:
        E = chess.get_entities()
        place(board, E, xf(0, 0, 0), "Board")
        order = [rook, knight, bishop, queen, king, bishop, knight, rook]
        for i in range(8):
            x = (-4 * S + S / 2 + i * S) * M
            for (row, cdp, m_, rz) in ((0, order[i], ivory, 0), (1, pawn, ivory, 0), (6, pawn, ebony, 180), (7, order[i], ebony, 180)):
                y = (-4 * S + S / 2 + row * S) * M
                p_ = place(cdp, E, xf(x, y, 0.05 * M, rz + 180.0), "%s_%s%d" % (cdp.get_name(), "abcdefgh"[i], row + 1))
                p_.set_material(m_)
    out.append(chess)

    # ---------------------------------------------------------------- swing
    teak = mat("Teak", 150, 101, 62)
    linen = mat("Linen_Sand", 214, 200, 176)
    iron = mat("Iron_Black", 38, 38, 40)
    frame, fn = defn("SwingFrame")
    if fn:
        E = frame.get_entities()
        top = 2.3
        sec = [(-0.045 * M, -0.045 * M), (0.045 * M, -0.045 * M), (0.045 * M, 0.045 * M), (-0.045 * M, 0.045 * M)]
        for sx in (-1, 1):
            x = sx * 1.08
            for sy in (-1, 1):
                part(E, "Leg_%s%s" % ("L" if sx < 0 else "R", "F" if sy < 0 else "B"), sweep([(x * M, sy * 0.85 * M, 0), (x * M, sy * 0.055 * M, (top - 0.05) * M)], 1.0, section=sec), teak, 20)
            part(E, "Brace_%s" % ("L" if sx < 0 else "R"), box((x - 0.035) * M, -0.62 * M, 0.72 * M, (x + 0.035) * M, 0.62 * M, 0.82 * M), teak)
        part(E, "Beam", rr_lathe(2.5 * M, 0.12 * M, 0.01 * M, 2, pill_profile(0.15 * M, 0.01 * M, 2, (top - 0.05) * M)), teak, 40)
        for sx in (-1, 1):
            x = sx * 0.62
            part(E, "Hook_%s" % ("L" if sx < 0 else "R"), mrot(torus(0.035 * M, 0.008 * M, 16, 6), "y", 90, (0, 0, 0)), iron, 40).set_transform(xf(x * M, 0, (top - 0.09) * M))
            marker(E, "HOOK", "L" if sx < 0 else "R", x * M, 0, (top - 0.09) * M, 0)
        collider(E, "Beam", -1.25 * M, -0.08 * M, (top - 0.05) * M, 1.25 * M, 0.08 * M, (top + 0.1) * M)
        for sx in (-1, 1):
            collider(E, "Legs%s" % ("L" if sx < 0 else "R"), (sx * 1.08 - 0.06) * M, -0.85 * M, 0, (sx * 1.08 + 0.06) * M, 0.85 * M, 1.4 * M)
    out.append(frame)

    seat, sn = defn("SwingSeat")
    if sn:
        # origin = centre of the seat's underside; it hangs ~0.45 m above ground
        E = seat.get_entities()
        W = 1.32
        D = 0.5
        for sx in (-1, 1):
            x = sx * (W / 2 - 0.03)
            part(E, "Side_Rail_%s" % ("L" if sx < 0 else "R"), box((x - 0.03) * M, -D / 2 * M, 0, (x + 0.03) * M, D / 2 * M, 0.07 * M), teak)
            part(E, "Arm_Post_%s" % ("L" if sx < 0 else "R"), box((x - 0.025) * M, (-D / 2 + 0.02) * M, 0.07 * M, (x + 0.025) * M, (-D / 2 + 0.07) * M, 0.3 * M), teak)
            part(E, "Arm_%s" % ("L" if sx < 0 else "R"), rr_lathe(0.07 * M, (D + 0.06) * M, 0.02 * M, 3, pill_profile(0.035 * M, 0.01 * M, 2, 0.3 * M), x * M, 0.0), teak, 40)
            part(E, "Back_Post_%s" % ("L" if sx < 0 else "R"), sweep([(x * M, (D / 2 - 0.03) * M, 0.0), (x * M, (D / 2 + 0.06) * M, 0.62 * M)], 1.0,
                                                                   section=[(-0.025 * M, -0.03 * M), (0.025 * M, -0.03 * M), (0.025 * M, 0.03 * M), (-0.025 * M, 0.03 * M)]), teak, 20)
        for k in range(6):
            y = -D / 2 + 0.05 + k * (D - 0.1) / 5.0
            part(E, "Seat_Slat_%d" % (k + 1), box(-(W / 2 - 0.06) * M, (y - 0.03) * M, 0.04 * M, (W / 2 - 0.06) * M, (y + 0.03) * M, 0.07 * M), teak)
        for k in range(3):
            z = 0.2 + k * 0.15
            y = D / 2 - 0.03 + 0.09 * z / 0.62
            part(E, "Back_Slat_%d" % (k + 1), box(-(W / 2 - 0.06) * M, (y - 0.01) * M, (z - 0.04) * M, (W / 2 - 0.06) * M, (y + 0.015) * M, (z + 0.04) * M), teak)
        part(E, "Cushion", rr_lathe((W - 0.14) * M, (D - 0.06) * M, 0.05 * M, 4, pill_profile(0.06 * M, 0.025 * M, 3, 0.07 * M), 0, -0.01 * M), linen, 55)
        for sx in (-1, 1):
            x = sx * (W / 2 - 0.03)
            marker(E, "ROPE", ("L" if sx < 0 else "R") + "F", x * M, (-D / 2 + 0.03) * M, 0.335 * M, 0)
            marker(E, "ROPE", ("L" if sx < 0 else "R") + "B", x * M, (D / 2 + 0.06) * M, 0.62 * M, 0)
        marker(E, "SEAT", "1", -0.3 * M, -0.04 * M, 0.13 * M, 0)
        marker(E, "SEAT", "2", 0.3 * M, -0.04 * M, 0.13 * M, 0)
        collider(E, "Seat", -W / 2 * M, -D / 2 * M, 0, W / 2 * M, D / 2 * M, 0.13 * M)
        collider(E, "Back", -W / 2 * M, (D / 2 - 0.04) * M, 0.07 * M, W / 2 * M, (D / 2 + 0.08) * M, 0.62 * M)
    out.append(seat)
    return out
