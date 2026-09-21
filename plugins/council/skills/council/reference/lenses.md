# The three lenses

Three is the minimum that produces real disagreement. Two polarise into a
binary; four or more mostly restate each other at four times the token cost.

| Lens | Asks | Fails by |
|---|---|---|
| **Skeptic** | Is this the right question, and is the evidence real? | Questioning a cheap, reversible choice to death |
| **Builder** | What is the smallest thing we can ship, and what does it cost? | Speed through a one-way door |
| **Risk** | What is our exposure, and who pays? | Treating bounded problems as catastrophes |

Each agent file ends with a "What you tend to miss" section naming the other
two. That is deliberate: it is the anti-sycophancy mechanism. It licenses each
lens to concede, which is what makes an actual concession informative rather
than politeness.

## Duo pairings

For `--duo`, pick the pair that matches the tension:

| Tension | Pair |
|---|---|
| Speed vs. safety | Builder + Risk |
| Is this even the problem? | Skeptic + Builder |
| Real exposure or theatre? | Skeptic + Risk |

## Evidence labels

| Label | Means |
|---|---|
| `FACT` | Directly supported by supplied or retrieved evidence — cite it |
| `INFERENCE` | Follows from evidence, not directly observed |
| `ASSUMPTION` | Asserted, would need checking |
| `UNKNOWN` | A named gap, stated rather than papered over |

A recommendation resting mainly on `ASSUMPTION` must say so in its confidence
line. This is the check that stops a well-formatted verdict from reading as
more certain than its inputs.

## Worked kill criteria

| Bad | Good |
|---|---|
| "If it doesn't work out" | "If p95 is still >400ms on 1 Nov" |
| "If costs get high" | "If monthly spend passes £800 in any month before Q2" |
| "If the team hates it" | "If two of three engineers can't ship a feature in it by sprint 4" |
