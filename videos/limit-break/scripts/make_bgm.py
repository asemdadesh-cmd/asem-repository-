"""Synthesize the original 20s, 120 BPM soundtrack for LIMIT BREAK.

Pure stdlib (no numpy) so it runs anywhere: python3 scripts/make_bgm.py
Structure mirrors the edit: intro 0-2s, groove 2-7s, build 7-10s,
drop 10-12s, full groove 12-17s, outro 17-20s. Deterministic (seeded noise).
"""
import math
import random
import struct
import wave

SR = 44100
DUR = 20.0
BPM = 120
BEAT = 60 / BPM
N = int(SR * DUR)
L = [0.0] * N
R = [0.0] * N
rng = random.Random(7)
NOISE = [rng.uniform(-1, 1) for _ in range(SR)]


def add(start, samples, gain=1.0, pan=0.0):
    i0 = int(start * SR)
    gl, gr = gain * (1 - max(0, pan)), gain * (1 + min(0, pan))
    for k, s in enumerate(samples):
        i = i0 + k
        if 0 <= i < N:
            L[i] += s * gl
            R[i] += s * gr


def kick(length=0.45, f0=150, f1=42):
    out, ph = [], 0.0
    for k in range(int(length * SR)):
        t = k / SR
        f = f1 + (f0 - f1) * math.exp(-t * 28)
        ph += 2 * math.pi * f / SR
        out.append(math.sin(ph) * math.exp(-t * 7) + (NOISE[k % SR] * 0.3 * math.exp(-t * 300)))
    return out


def snare(length=0.28):
    out = []
    for k in range(int(length * SR)):
        t = k / SR
        tone = math.sin(2 * math.pi * 190 * t) * math.exp(-t * 30)
        out.append(0.55 * tone + NOISE[(k * 3) % SR] * math.exp(-t * 16))
    return out


def hat(length=0.05):
    out, prev = [], 0.0
    for k in range(int(length * SR)):
        n = NOISE[(k * 7 + 991) % SR]
        hp = n - prev  # crude high-pass
        prev = n
        out.append(hp * math.exp(-k / SR * 90))
    return out


def cowbell(freq, length=0.22):
    # phonk-style detuned square bell
    out = []
    for k in range(int(length * SR)):
        t = k / SR
        s = sum(1 if math.sin(2 * math.pi * f * t) > 0 else -1 for f in (freq, freq * 1.48))
        out.append(s * 0.5 * math.exp(-t * 11))
    return out


def sub(freq, length):
    out = []
    for k in range(int(length * SR)):
        t = k / SR
        env = min(1, t * 60) * math.exp(-t * 1.6)
        out.append(math.tanh(2.2 * math.sin(2 * math.pi * freq * t)) * env)
    return out


def riser(length):
    out, lp = [], 0.0
    for k in range(int(length * SR)):
        t = k / SR
        p = t / length
        a = 0.02 + 0.5 * p ** 2  # filter opens
        lp += a * (NOISE[(k * 5) % SR] - lp)
        tone = math.sin(2 * math.pi * (200 + 1400 * p ** 2) * t) * 0.25
        out.append((lp * 1.4 + tone) * p ** 1.5)
    return out


def boom(length=2.2):
    out, ph = [], 0.0
    for k in range(int(length * SR)):
        t = k / SR
        f = 30 + 90 * math.exp(-t * 6)
        ph += 2 * math.pi * f / SR
        out.append(math.tanh(3 * math.sin(ph)) * math.exp(-t * 1.4) + NOISE[k % SR] * math.exp(-t * 9) * 0.6)
    return out


def whoosh(length=0.5):
    out, lp = [], 0.0
    for k in range(int(length * SR)):
        t = k / SR
        p = t / length
        lp += (0.05 + 0.4 * math.sin(math.pi * p)) * (NOISE[(k * 11) % SR] - lp)
        out.append(lp * math.sin(math.pi * p) * 1.6)
    return out


def pad(freqs, start, length, gain):
    for k in range(int(length * SR)):
        t = k / SR
        env = min(1, t / 1.2) * min(1, (length - t) / 1.5)
        s = sum(math.sin(2 * math.pi * f * t + i) for i, f in enumerate(freqs)) / len(freqs)
        i = int(start * SR) + k
        if i < N:
            L[i] += s * env * gain
            R[i] += math.sin(2 * math.pi * freqs[0] * 1.003 * t) * env * gain * 0.8


K, S, H = kick(), snare(), hat()
# D minor-ish phonk bell riff (Hz)
RIFF = [587, 698, 587, 523, 440, 523, 587, 440]
BASS = [73.4, 73.4, 58.3, 65.4]  # D2, D2, Bb1, C2

# Intro pad + distant bells
pad([146.8, 220.0, 293.7], 0.0, 4.0, 0.12)
add(1.5, whoosh(0.5), 0.5)


def groove(t0, t1, full=False):
    t = t0
    step = 0
    while t < t1 - 1e-6:
        beat_in_bar = step % 4
        add(t, K, 0.9)
        if beat_in_bar in (1, 3):
            add(t, S, 0.5)
        add(t + BEAT / 2, H, 0.25, pan=0.3)
        add(t, H, 0.18, pan=-0.3)
        if full:
            add(t + BEAT * 0.75, K, 0.55)
            add(t + BEAT / 4, H, 0.12, pan=0.5)
        if step % 2 == 0:
            add(t, sub(BASS[(step // 4) % 4], BEAT * 2), 0.45)
        add(t, cowbell(RIFF[step % 8]), 0.16 if full else 0.1, pan=0.2 if step % 2 else -0.2)
        t += BEAT
        step += 1


groove(2.0, 7.0)
# Build: accelerating snare roll + riser
add(7.0, riser(3.0), 0.55)
t, gap = 7.0, BEAT
while t < 10.0 - 1e-6:
    add(t, S, 0.25 + 0.35 * (t - 7) / 3)
    gap = BEAT if t < 8 else (BEAT / 2 if t < 9 else BEAT / 4)
    t += gap
for i in range(3):
    add(7.0 + i, K, 0.7)
# Drop
add(10.0, boom(), 1.0)
add(10.0, K, 1.0)
add(11.5, whoosh(0.5), 0.6)
groove(12.0, 17.0, full=True)
add(12.0, whoosh(0.6), 0.7)
# Outro: final hit + pad
add(17.0, boom(2.5), 0.6)
pad([146.8, 174.6, 220.0], 17.0, 3.0, 0.14)

# master: soft clip + fade out, normalize
peak = 0.0
for i in range(N):
    fade = min(1.0, (N - i) / (SR * 1.5))
    L[i] = math.tanh(L[i] * 0.9) * fade
    R[i] = math.tanh(R[i] * 0.9) * fade
    peak = max(peak, abs(L[i]), abs(R[i]))
g = 0.89 / peak
with wave.open("assets/bgm.wav", "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(b"".join(struct.pack("<hh", int(L[i] * g * 32767), int(R[i] * g * 32767)) for i in range(N)))
print("wrote assets/bgm.wav")
