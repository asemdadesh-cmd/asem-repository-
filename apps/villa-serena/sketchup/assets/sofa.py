# Deep linen sofa and matching armchair on recessed oak plinths, with loose
# seat/back cushions and throw pillows. Front faces -Y; origin at the centre
# of the footprint on the floor.

def _cushion(E, name, w, d, h, e, x, y, z, linen, tilt=0.0, ry=0.0):
    g = part(E, name, rr_lathe(w, d, min(w, d) * 0.12, 4, pill_profile(h, e, 3)), linen, 55)
    g.set_transform(xf(x, y, z, 0, ry, tilt))
    return g


def _upholstered(cd, W, seats, linen, accent, oak, pillow_sides):
    E = cd.get_entities()
    D = 0.98 * M
    arm = 0.20 * M
    plinth_h = 0.10 * M
    body_top = 0.30 * M
    part(E, "Plinth", rr_lathe(W - 0.12 * M, D - 0.12 * M, 0.02 * M, 2, [(0, 0), (plinth_h, 0)]), oak, 40)
    part(E, "Base", rr_lathe(W - 2 * arm + 0.02 * M, D, 0.04 * M, 3, pill_profile(body_top - plinth_h, 0.03 * M, 3, plinth_h)), linen, 55)
    for sx, nm in ((-1, "Arm_L"), (1, "Arm_R")):
        x = sx * (W / 2 - arm / 2)
        part(E, nm, rr_lathe(arm, D, 0.07 * M, 4, pill_profile(0.62 * M - plinth_h, 0.06 * M, 3, plinth_h), x, 0), linen, 55)
    inner = W - 2 * arm
    back_t = 0.20 * M
    part(E, "Back", rr_lathe(inner + 0.02 * M, back_t, 0.05 * M, 3, pill_profile(0.72 * M - plinth_h, 0.06 * M, 3, plinth_h), 0, D / 2 - back_t / 2), linen, 55)
    gap = 0.008 * M
    cw_ = (inner - gap * (seats - 1)) / seats
    seat_d = D - back_t - 0.02 * M
    for i in range(seats):
        x = -inner / 2 + cw_ / 2 + i * (cw_ + gap)
        _cushion(E, "Seat_Cushion_%d" % (i + 1), cw_, seat_d, 0.15 * M, 0.06 * M, x, -D / 2 + seat_d / 2 + 0.005 * M, body_top, linen)
        _cushion(E, "Back_Cushion_%d" % (i + 1), cw_ - 0.01 * M, 0.17 * M, 0.42 * M, 0.07 * M, x, D / 2 - back_t - 0.10 * M, body_top + 0.15 * M, linen, -10.0)
        marker(E, "SEAT", str(i + 1), x, -0.12 * M, body_top + 0.12 * M, 0)
    # throw pillows leaning into the arms
    for sx in pillow_sides:
        nm = "Pillow_L" if sx < 0 else "Pillow_R"
        x = sx * (inner / 2 - 0.16 * M)
        g = part(E, nm, rr_lathe(0.46 * M, 0.13 * M, 0.08 * M, 4, pill_profile(0.46 * M, 0.06 * M, 3)), accent, 60)
        g.set_transform(xf(x, D / 2 - back_t - 0.20 * M, body_top + 0.12 * M, -sx * 12.0, sx * 14.0, -14.0))
    collider(E, "Seat", -W / 2, -D / 2, 0, W / 2, D / 2 - back_t, body_top + 0.12 * M)
    collider(E, "Back", -W / 2, D / 2 - back_t - 0.1 * M, 0, W / 2, D / 2, 0.72 * M)
    collider(E, "ArmL", -W / 2, -D / 2, 0, -W / 2 + arm, D / 2, 0.62 * M)
    collider(E, "ArmR", W / 2 - arm, -D / 2, 0, W / 2, D / 2, 0.62 * M)


def build():
    linen = mat("Linen_Oat", 222, 212, 192)
    accent = mat("Linen_Terracotta", 186, 104, 72)
    accent2 = mat("Linen_Olive", 128, 132, 92)
    oak = mat("Oak_Natural", 190, 150, 104)
    cd, new = defn("Sofa")
    if new:
        _upholstered(cd, 2.40 * M, 3, linen, accent, oak, (-1, 1))
    cd2, new2 = defn("Armchair")
    if new2:
        _upholstered(cd2, 1.02 * M, 1, linen, accent2, oak, (1,))
    return [cd, cd2]
