# CLAUDE.md — مذاق البسبوسة

Standalone repo for the مذاق البسبوسة online tray shop. The repo root is the deployable app; `main` is production.

- **Menu, prices, sizes, serving counts, photos:** `src/config/menu.ts` only. **Shop details:** `src/config/store.ts`.
- The shop sells **whole trays / boxes / cakes — never per piece.** Keep that in wording, cart and the WhatsApp message.
- Not related to the tray ledger app (`dessert-shop-ledger` / دفتر الصواني) — never touch that repo or its Vercel projects.
- Before finishing: `npm test` and `npm run build` (the build runs `scripts/predeploy.mjs dist` and fails on broken references).
- Deploy = push to `main` (Vercel project `madhaq-albasbousa`, Git-linked). Verify the live URL returns 200 before saying it's live.
- Keep `PROJECT.md`, `TASKS.md`, `DECISIONS.md` current with a dated entry for every meaningful change.
