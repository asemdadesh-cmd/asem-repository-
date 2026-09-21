# asem-repository- — NHT Skills Marketplace

A Claude Code **plugin marketplace**. Install the plugin once and its skill
becomes available in **every** project on your machine.

## `agency-review` plugin

Turns Claude into an elite web agency review board. It triggers automatically
whenever you ask Claude to make, build, design, or improve a website, landing
page, or web page — or invoke it explicitly with `/agency-review`.

Claude builds the site, then runs a full internal review — Creative Director,
UX, UI, Branding, Copywriting, Marketing, CRO, SEO, Accessibility (WCAG 2.2),
Front-End Engineering, Performance, and Security — followed by a brutally honest
critic pass, an innovation pass, and a final production-readiness checklist.
Every issue is fixed before the result is presented.

## `council` plugin

Three-lens deliberation for decisions that are costly, contested, or hard to
reverse. Triggers on "should we…", "which option", "is it worth", "help me
decide" — or invoke it explicitly with `/council`.

Three analysts run **blind and in parallel** so none anchors on the others:

| Lens | Asks | Fails by |
|---|---|---|
| **Skeptic** | Is this the right question, and is the evidence real? | Questioning a cheap, reversible choice to death |
| **Builder** | What's the smallest thing we can ship, and what does it cost? | Speed through a one-way door |
| **Risk** | What's our exposure, and who pays? | Treating bounded problems as catastrophes |

Then a **forced disagreement round** (premature agreement, restatement, and
unsupported confidence all trigger a re-run), then a verdict that leads with
what's *unresolved* and carries dissent verbatim, kill criteria with a
threshold and a date, and exactly one next action.

```
/council Should we rebuild the portal in Next.js or patch the current one?
/council --quick Should we add Redis here?
/council --duo Monolith or services?
```

Use `--quick` for day-to-day calls; full mode is for decisions you'd regret
quietly for a year. Claims are labelled `FACT` / `INFERENCE` / `ASSUMPTION` /
`UNKNOWN`, and a recommendation resting on assumptions has to say so.

## Install (available in all your projects)

In Claude Code, run:

```
/plugin marketplace add asemdadesh-cmd/asem-repository-
/plugin install agency-review@nht-skills
/plugin install council@nht-skills
```

That's it — the skill now loads in every project. To update later, use
`/plugin marketplace update nht-skills`.

> Tip: if the marketplace lives on a feature branch rather than the default
> branch, add it by URL/branch, e.g.
> `/plugin marketplace add https://github.com/asemdadesh-cmd/asem-repository-`
> once the branch is merged to the default branch.

## Repository layout

```
.
├── .claude-plugin/
│   └── marketplace.json          # marketplace manifest (lists plugins)
├── plugins/
│   ├── council/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── agents/                    # council-skeptic / -builder / -risk
│   │   └── skills/council/
│   │       ├── SKILL.md               # the 3-round protocol
│   │       └── reference/lenses.md    # lens roles, evidence labels, kill criteria
│   └── agency-review/
│       ├── .claude-plugin/
│       │   └── plugin.json        # plugin manifest
│       └── skills/
│           └── agency-review/
│               ├── SKILL.md        # the review framework + roles
│               └── reference/
│                   ├── checklist.md
│                   └── rewrite-guide.md
├── PROJECT.md                     # living single source of truth
├── TASKS.md                       # work checklist
├── DECISIONS.md                   # technical decision log
└── CLAUDE.md                      # repo instructions for Claude Code
```
