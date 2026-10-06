import { describe, expect, it } from 'vitest';
import { eventKey, parseEventKey, replay, type ScoreEvent } from '../server/rules.ts';

const ev = (ts: number, scorer: 1 | 2, id: string, reporter: 1 | 2 = scorer): ScoreEvent => ({ ts, scorer, reporter, id });

describe('replay', () => {
  it('counts goals and ends the round at 3', () => {
    const r = replay('football', [ev(0, 1, 'a'), ev(5000, 2, 'b'), ev(10000, 1, 'c'), ev(15000, 1, 'd')]);
    expect(r.roundsWon).toEqual([1, 0]);
    expect(r.round).toBe(2);
    expect(r.scores).toEqual([0, 0]);
    expect(r.lastWinner).toBe(1);
    expect(r.roundEnders.get('d')).toEqual({ winner: 1, round: 1 });
  });

  it('ignores duplicate ids even with different timestamps', () => {
    const r = replay('football', [ev(0, 1, 'k1'), ev(9000, 1, 'k1')]);
    expect(r.scores).toEqual([1, 0]);
    expect(r.acceptedEvents).toBe(1);
  });

  it('rate-limits goals that are too close together', () => {
    const r = replay('football', [ev(0, 1, 'a'), ev(1000, 2, 'b')]);
    expect(r.scores).toEqual([1, 0]);
    expect(r.verdicts.get('b')).toBe('rate-limited');
  });

  it('rate-limits splashes per thrower only', () => {
    const r = replay('pool', [ev(0, 1, 'a'), ev(100, 2, 'b'), ev(200, 1, 'c'), ev(700, 1, 'd')]);
    expect(r.scores).toEqual([2, 1]);
    expect(r.verdicts.get('c')).toBe('rate-limited');
  });

  it('pool battle ends at 5 and ignores the round break', () => {
    const evs = [0, 1000, 2000, 3000, 4000].map((t, i) => ev(t, 2, `s${i}`));
    evs.push(ev(4500, 1, 'late'));
    evs.push(ev(8000, 1, 'next'));
    const r = replay('pool', evs);
    expect(r.roundsWon).toEqual([0, 1]);
    expect(r.verdicts.get('late')).toBe('round-break');
    expect(r.scores).toEqual([1, 0]);
    expect(r.round).toBe(2);
  });

  it('is order independent', () => {
    const evs = [ev(0, 1, 'a'), ev(3000, 2, 'b'), ev(6000, 1, 'c'), ev(6500, 2, 'x')];
    const a = replay('football', evs);
    const b = replay('football', [...evs].reverse());
    expect(a.scores).toEqual(b.scores);
    expect([...a.verdicts]).toEqual([...b.verdicts]);
  });

  it('round-trips event keys', () => {
    const e = ev(1700000000123, 2, 'k-abc_1', 1);
    expect(parseEventKey(eventKey('room/X/ev/football/', e))).toEqual(e);
  });
});
