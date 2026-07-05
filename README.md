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

## Install (available in all your projects)

In Claude Code, run:

```
/plugin marketplace add asemdadesh-cmd/asem-repository-
/plugin install agency-review@nht-skills
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
