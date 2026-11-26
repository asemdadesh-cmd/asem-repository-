# Resolved: screen error after tapping (Chrome 154+ / Brave on Android)

**Symptom:** every tap that changed screen showed a blank page / «حدث خطأ في عرض هذه الصفحة»;
a reload always fixed it.

**Root cause (found from the on-phone error log):** `TypeError: l is not a function` in React's
effect cleanup. `App.tsx` had `useEffect(() => window.scrollTo(0, 0), [pathname])` — a concise
arrow that *returns* scrollTo's result. Chrome 154 (and Brave on it) made scroll methods return a
Promise, so React stored a Promise as the effect's cleanup and crashed calling it on the next
navigation. Older Chromium (our test browser) returns `undefined`, so it never reproduced.

**Fix:** braces around the effect body (never return a value from an effect unless it's a cleanup).
Verified by emulating Promise-returning scroll methods in Playwright: crash reproduced at the
exact minified position from the phone (`yl` 8:95413), gone after the fix; full flows pass.

The safety nets added while hunting it (DOM guard, self-heal reload, error log, build stamp)
stay in place.
