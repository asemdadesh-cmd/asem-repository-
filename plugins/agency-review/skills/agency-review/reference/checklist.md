# Final Approval Checklist

Run this at the end of every website deliverable. Mark each item pass/fail and
loop back to refine until all pass. Do not present until everything is ✓.

## Design & Brand
- [ ] Looks premium (would justify a £25,000+ agency price)
- [ ] Brand consistent (color, type, tone, imagery all intentional)
- [ ] Clear visual hierarchy and generous white space
- [ ] Memorable — at least one distinctive, non-generic element
- [ ] Modern, not a template-clone

## UX & Content
- [ ] Mobile-first and fully responsive (test 360px, 768px, 1280px)
- [ ] Primary CTA obvious above the fold and repeated logically
- [ ] Scannable copy: strong headline, short paragraphs, meaningful subheads
- [ ] Every headline and CTA rewritten from generic → specific & persuasive
- [ ] Trust signals present (social proof, guarantees, credentials)
- [ ] Low cognitive load; one clear action per section

## Accessibility (WCAG 2.2 — target 100)
- [ ] Text contrast ≥ 4.5:1 (≥ 3:1 for large text and UI components)
- [ ] Full keyboard navigation with visible focus states
- [ ] Semantic landmarks (`header`, `nav`, `main`, `footer`) and heading order
- [ ] All meaningful images have alt text; decorative images `alt=""`
- [ ] ARIA labels on icon-only controls; forms have associated `<label>`s
- [ ] `prefers-reduced-motion` respected for animations

## SEO (target 100)
- [ ] `<title>` + meta description, unique and keyword-relevant
- [ ] One `<h1>`; logical h2/h3 nesting
- [ ] Open Graph / Twitter card tags
- [ ] Structured data (JSON-LD) appropriate to the page type
- [ ] Descriptive `alt`, sensible file names, `width`/`height` on images
- [ ] Clean semantic HTML; internal links use descriptive anchor text

## Performance (Lighthouse Perf 95+, Best Practices 100)
- [ ] Images optimized, lazy-loaded, correctly sized (modern formats)
- [ ] Minimal JS; no unused libraries
- [ ] CSS/JS minified for production
- [ ] No layout shift (reserve space for media; CLS ≈ 0)
- [ ] Fonts loaded efficiently (`font-display: swap`, preconnect/preload)

## Security
- [ ] Client + server-side form validation and input sanitization
- [ ] External links use `rel="noopener noreferrer"`
- [ ] Security headers considered (CSP, X-Content-Type-Options, etc.)
- [ ] XSS/CSRF protections where forms or dynamic content exist
- [ ] No secrets, keys, or sensitive info exposed in source

## Engineering
- [ ] Clean folder structure; reusable components; no duplication
- [ ] Maintainable and scalable; consistent naming
- [ ] Cross-browser checked
- [ ] Production ready
