# asem-repository-

## `agency-review` skill

A Claude Code skill that turns Claude into an elite web agency review board.

**It triggers automatically whenever you ask Claude to make, build, design, or
improve a website, landing page, or web page.** You can also invoke it
explicitly with `/agency-review`.

When active, Claude builds the site and then runs a full internal review —
Creative Director, UX, UI, Branding, Copywriting, Marketing, CRO, SEO,
Accessibility (WCAG 2.2), Front-End Engineering, Performance, and Security —
followed by a brutally honest critic pass, an innovation pass, and a final
production-readiness checklist. Every issue is fixed before the result is
presented.

### Files

```
.claude/skills/agency-review/
├── SKILL.md                    # the review framework + role definitions
└── reference/
    ├── checklist.md            # final pass/fail approval checklist
    └── rewrite-guide.md        # copywriting & conversion patterns
```

### Usage

Just say what you want, e.g. *"make me a landing page for my estate agency."*
Claude will load the skill, build the page, run the full agency review, and
deliver a production-ready result.
