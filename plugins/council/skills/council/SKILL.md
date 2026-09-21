---
name: council
description: >-
  Three-lens deliberation protocol for decisions that are costly, contested, or
  hard to reverse. Use when the user asks "should we…", weighs two architectures
  or vendors, considers a pricing model, a rewrite, a launch, a hire, or any
  choice with real downside and incomplete evidence. Runs three independent
  analysts (Skeptic, Builder, Risk) blind, forces a direct disagreement round,
  then returns a verdict with dissent, kill criteria, and one next action.
  Triggers on: "should we", "should I", "which option", "is it worth", "help me
  decide", "trade-offs", "go / no-go", "pros and cons of X vs Y".
---

# Council — Three-Lens Deliberation

Three analysts, three rounds, one verdict. The protocol exists to stop the two
failure modes of asking an AI for a decision: **premature agreement** and
**confident prose covering thin evidence**.

## When NOT to run this

Say so in one line and answer directly instead:

- Factual lookup, or the answer is in the docs.
- The choice is cheap and reversible — run the experiment, don't deliberate.
- The user has already decided and wants support. Name that, don't supply it.
- Only one lens matters (pure security question, pure cost question).

Never run the council to decorate a conclusion you already reached.

## STEP 0 — Frame the decision

Before any analysis, write the frame. If the user's question doesn't supply it,
infer it and mark the inference.

```
DECISION:      the choice, stated as a fork with named options
CONSTRAINTS:   budget, deadline, team size, tech, legal
EVIDENCE:      what is actually known (cite source)
REVERSIBILITY: cheap to undo / costly / one-way door
DEADLINE:      when this must be decided
```

If two of these five are unknown and the unknowns would change the answer, ask
the user before proceeding. Otherwise state assumptions and continue.

## STEP 1 — Blind analysis (independent)

Launch the three agents **in one message, in parallel**, so none sees another's
output. This is load-bearing: sequential runs anchor.

- `council-skeptic` — attacks the premise and the evidence
- `council-builder` — the shortest path that actually ships
- `council-risk` — exposure, tail cases, what breaks and who pays

Give each the same STEP 0 frame verbatim. Ask for **≤300 words**:
a position, its strongest support, and its own weakest point.

Every claim carries a label:

- `FACT` — directly supported by supplied or retrieved evidence, with source
- `INFERENCE` — follows from evidence, not directly observed
- `ASSUMPTION` — asserted, would need checking
- `UNKNOWN` — named gap

An unlabeled claim is not admissible. Strip it or label it.

## STEP 2 — Forced disagreement

Show all three positions to each agent. Each must produce, in **≤200 words**:

```
### Strongest objection to: {other lens}
{the specific failure their position causes — not a restatement}

### Where they change my position
{what you actually concede, or "nothing, because …"}

### Final stance
{one sentence}
```

Enforcement — re-run the round if any of these appear:

| Check | Fails when |
|---|---|
| Premature agreement | All three converge in round 1 with no objection raised |
| Restatement | An "objection" repeats a round-1 claim without engaging |
| Unsupported confidence | A strong recommendation rests only on `ASSUMPTION` |
| No dissent | Nobody holds a minority position and no one conceded |

Genuine unanimity is possible. It just has to survive the round, not skip it.

## STEP 3 — Verdict

You synthesize. Do not average the three into mush. Use this order —
**unresolved first**, so the reader can't skim to a false certainty:

```markdown
## Still unresolved
- {the question that would most change this decision if answered}
- {what we'd need to learn, and how}

## Recommendation
{one option, stated plainly, with the reason in one sentence}

## Dissent
{the minority position and who holds it — verbatim, not softened.
 If the three genuinely split, say SPLIT and return the split.}

## Acceptable compromise
{what a smaller or staged version of this decision looks like}

## Kill criteria
- {observable signal that means back this out — with a threshold and a date}

## Next action
{exactly one concrete step, doable this week, with an owner}
```

Rules for the verdict:

- A split stays a split. Never prose it into consensus.
- Kill criteria must be observable and dated. "If it doesn't work out" is not
  a kill criterion; "if p95 is still >400ms on 1 Nov" is.
- Exactly one next action. A list of five is a decision not taken.
- Confidence gets a number and a reason: `Confidence: 60% — the cost model is
  ASSUMPTION, not measured.`

## Modes

| Mode | Shape | Use when |
|---|---|---|
| Default | All 3 rounds | Costly or one-way-door decisions |
| `--quick` | STEP 0 + 1 + verdict, no disagreement round | Need breadth, cross-examination won't move it |
| `--duo` | Two lenses only (pick the two that define the tension) | One polarity dominates |

`--quick` is the right default for most day-to-day calls. Full mode is for
decisions you'd regret quietly for a year.

See `reference/lenses.md` for what each lens covers and where each is wrong.
