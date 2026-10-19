# Known issue: screen error after tapping (Brave on Android)

**Symptom (owner's phone, Brave Android):** tapping any button that changes screen
(بيع جديد, تعبئة مياه, الزبائن…) shows a blank page / «حدث خطأ في عرض هذه الصفحة».
Reloading the page always shows the screen correctly.

**Could not reproduce** in Chromium/Playwright, including simulated DOM rewriting.

## What is already in place
| Layer | File | What it does |
|---|---|---|
| Router | `src/App.tsx` | `BrowserRouter useTransitions={false}` (no React transition / Navigation-API fake navigation) |
| DOM guard | `src/lib/domGuard.ts` | `removeChild`/`insertBefore` tolerate nodes re-parented by the browser (React #11538) |
| Boundaries | `src/components/ErrorBoundary.tsx` | root + per-route; logs the error and **reloads once** (self-heal) |
| Crash overlay | `src/lib/crash.ts` | if React unmounts entirely: log, reload once, else plain-DOM error screen |
| Error log | `src/lib/errorLog.ts` + الإعدادات → سجل الأخطاء | last 10 errors with stack, cause, build stamp, user agent |
| Version | `__BUILD__` (vite define), shown in المزيد and الإعدادات | confirms the phone runs the latest deploy |

## How to get the real cause
1. On the phone open **المزيد** and check the version timestamp matches the latest deploy.
2. Reproduce once, then open **الإعدادات → سجل الأخطاء → مشاركة** and send the text.
3. Or: connect the phone via USB, open `brave://inspect` on a desktop, and read the console.
