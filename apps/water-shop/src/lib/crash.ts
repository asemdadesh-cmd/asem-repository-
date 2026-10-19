/**
 * Plain-DOM crash screen, independent of React. If React ever unmounts the
 * whole app (an error outside every boundary), the owner sees an Arabic message,
 * a reload button and the error text to send us — never a silent white page.
 */
function show(message: string) {
  const root = document.getElementById('root');
  // Only take over when the app has actually disappeared.
  if (root && root.childElementCount > 0 && root.innerText.trim().length > 0) return;
  if (document.getElementById('wsm-crash')) return;
  const box = document.createElement('div');
  box.id = 'wsm-crash';
  box.setAttribute('dir', 'rtl');
  box.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#f4f7f8;color:#0f1d22;font-family:system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;gap:12px';
  const h = document.createElement('h1');
  h.textContent = 'حدث خطأ في التطبيق';
  h.style.cssText = 'font-size:22px;font-weight:800;margin:0';
  const p = document.createElement('p');
  p.textContent = 'بياناتك محفوظة على الهاتف. اضغط «إعادة التحميل» للمتابعة.';
  p.style.cssText = 'margin:0;color:#4a5b62';
  const btn = document.createElement('button');
  btn.textContent = 'إعادة التحميل';
  btn.style.cssText = 'height:56px;padding:0 24px;border:0;border-radius:16px;background:#0e5e6f;color:#fff;font-size:18px;font-weight:700';
  btn.onclick = () => location.reload();
  const pre = document.createElement('pre');
  pre.dir = 'ltr';
  pre.textContent = `${message}\n${navigator.userAgent}`;
  pre.style.cssText = 'max-width:100%;white-space:pre-wrap;font-size:11px;color:#8597a0;margin-top:16px';
  box.append(h, p, btn, pre);
  document.body.appendChild(box);
}

export function installCrashOverlay() {
  const check = (msg: string) => setTimeout(() => show(msg), 300);
  window.addEventListener('error', (e) => check(String(e.error?.stack ?? e.message)));
  window.addEventListener('unhandledrejection', (e) => check(String((e.reason as Error)?.stack ?? e.reason)));
}
