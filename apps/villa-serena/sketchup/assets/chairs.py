# Seating: a teak dining chair with curved back slats and a linen seat pad,
# and a teak bar stool with a brushed-steel foot ring. Front faces -Y.

def _rect_section(w, t):
    return [(-w / 2, -t / 2), (w / 2, -t / 2), (w / 2, t / 2), (-w / 2, t / 2)]


def build():
    out = []
    teak = mat("Teak", 150, 101, 62)
    linen = mat("Linen_Sand", 214, 200, 176)
    steel = mat("Steel_Brushed", 178, 180, 184)

    cd, new = defn("DiningChair")
    if new:
        E = cd.get_entities()
        sw = 0.48 * M  # leg-to-leg width (outside)
        sd = 0.50 * M
        seat = 0.45 * M
        leg = 0.04 * M
        fx = sw / 2 - leg / 2
        fy = -sd / 2 + leg / 2
        by = sd / 2 - leg / 2
        lp = top_round_profile(seat - 0.02 * M, 0.004 * M, 1)
        part(E, "Leg_FL", rr_lathe(leg, leg, 0.006 * M, 2, lp, -fx, fy), teak, 40)
        part(E, "Leg_FR", rr_lathe(leg, leg, 0.006 * M, 2, lp, fx, fy), teak, 40)
        # rear legs: one swept square section rising and raking back for the backrest
        top_z = 0.90 * M

        def rear_y(z):
            if z <= seat:
                return by
            t = (z - seat) / (top_z - seat)
            return by + 0.075 * M * t * t

        path_z = [0.0, 0.15 * M, 0.30 * M, seat, seat + 0.1 * M, seat + 0.2 * M, seat + 0.3 * M, top_z]
        for sx, nm in ((-1, "Leg_BL"), (1, "Leg_BR")):
            path = [(sx * fx, rear_y(z), z) for z in path_z]
            part(E, nm, sweep(path, 1.0, section=_rect_section(leg, leg)), teak, 30)
        # seat frame
        az0 = seat - 0.09 * M
        az1 = seat - 0.02 * M
        part(E, "Apron_F", box(-fx + leg / 2, fy - 0.01 * M, az0, fx - leg / 2, fy + 0.012 * M, az1), teak)
        part(E, "Apron_B", box(-fx + leg / 2, by - 0.012 * M, az0, fx - leg / 2, by + 0.01 * M, az1), teak)
        part(E, "Apron_L", box(-fx - 0.01 * M, fy + leg / 2, az0, -fx + 0.012 * M, by - leg / 2, az1), teak)
        part(E, "Apron_R", box(fx - 0.012 * M, fy + leg / 2, az0, fx + 0.01 * M, by - leg / 2, az1), teak)
        part(E, "Seat_Board", rr_lathe(sw - 0.01 * M, sd - 0.01 * M, 0.02 * M, 3, pill_profile(0.02 * M, 0.005 * M, 1, az1), 0, 0), teak, 40)
        part(E, "Seat_Pad", rr_lathe(sw - 0.04 * M, sd - 0.06 * M, 0.04 * M, 4, pill_profile(0.045 * M, 0.018 * M, 3, az1 + 0.02 * M), 0, -0.01 * M), linen, 50)
        # three back slats curving gently around the sitter
        for k, z in enumerate((seat + 0.17 * M, seat + 0.29 * M, seat + 0.40 * M)):
            yc = rear_y(z)
            pts = []
            for i in range(9):
                u = -1 + 2 * i / 8.0
                x = u * (fx - leg / 2 + 0.002 * M)
                pts.append((x, yc + 0.02 * M * (1 - u * u), z))
            part(E, "Back_Slat_%d" % (k + 1), sweep(pts, 1.0, section=_rect_section(0.065 * M, 0.018 * M)), teak, 35)
        collider(E, "Seat", -sw / 2, -sd / 2, 0, sw / 2, sd / 2, az1 + 0.065 * M)
        collider(E, "Back", -sw / 2, by - 0.03 * M, seat, sw / 2, by + 0.10 * M, top_z)
        marker(E, "SEAT", "1", 0, -0.03 * M, az1 + 0.065 * M, 0)
    out.append(cd)

    cd2, new2 = defn("BarStool")
    if new2:
        E = cd2.get_entities()
        h = 0.76 * M
        part(E, "Seat", revolve([(h - 0.04 * M, 0), (h - 0.04 * M, 0.17 * M), (h - 0.03 * M, 0.185 * M), (h - 0.012 * M, 0.19 * M), (h, 0.18 * M), (h - 0.006 * M, 0.08 * M), (h - 0.008 * M, 0)], 32), teak, 35)
        for j in range(4):
            a = math.pi / 4 + j * math.pi / 2
            c = math.cos(a)
            s = math.sin(a)
            part(E, "Leg_%d" % (j + 1), sweep([(0.12 * M * c, 0.12 * M * s, h - 0.04 * M), (0.215 * M * c, 0.215 * M * s, 0.012 * M)], 0.016 * M, 10), teak, 40)
            part(E, "Foot_%d" % (j + 1), revolve([(0, 0.016 * M), (0.012 * M, 0.017 * M)], 10, 0.2165 * M * c, 0.2165 * M * s), steel, 40)
        part(E, "Foot_Ring", torus(0.188 * M, 0.009 * M, 32, 8, 0, 0, 0.28 * M), steel, 40)
        collider(E, "Body", -0.22 * M, -0.22 * M, 0, 0.22 * M, 0.22 * M, h)
        marker(E, "SEAT", "1", 0, 0, h, 0)
    out.append(cd2)
    return out
