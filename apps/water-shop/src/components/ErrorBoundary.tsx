import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, Copy, RotateCw } from 'lucide-react';
import { BUILD, errorReport, healByReload, logError } from '@/lib/errorLog';

/**
 * Last line of defence: a crash in any screen shows a friendly Arabic message
 * with a reload button instead of a blank white page. Data is never affected —
 * everything is already saved on the phone.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Screen crashed', error, info.componentStack);
    logError(error);
    // A fresh load of the same screen always works, so try that once first.
    healByReload();
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-6 pb-32 text-center">
        <div className="mb-4 grid size-20 place-items-center rounded-[1.75rem] bg-warn-50 text-warn-600">
          <AlertTriangle className="size-9" />
        </div>
        <h1 className="text-xl font-black">حدث خطأ في عرض هذه الصفحة</h1>
        <p className="mt-2 text-ink-2">بياناتك محفوظة على الهاتف ولم يُفقد شيء. أعد تحميل التطبيق للمتابعة.</p>
        <button type="button" onClick={() => location.reload()}
          className="mt-6 inline-flex h-14 items-center gap-2 rounded-2xl bg-brand-700 px-6 text-lg font-bold text-white active:scale-[0.97]">
          <RotateCw className="size-5" /> إعادة التحميل
        </button>
        <a href="/" className="mt-3 font-bold text-brand-700">العودة للرئيسية</a>
        <div className="mt-6 w-full rounded-2xl bg-surface-2 p-3 text-start text-xs text-ink-2">
          <div className="mb-1 font-bold">تفاصيل الخطأ (أرسلها للمطوّر) · <span className="num">{BUILD}</span></div>
          <pre dir="ltr" className="max-h-48 overflow-auto whitespace-pre-wrap">{error.name}: {error.message}{'\n'}{error.stack?.split('\n').slice(0, 6).join('\n')}</pre>
          <button type="button" className="mt-2 inline-flex items-center gap-1 font-bold text-brand-700"
            onClick={() => navigator.clipboard?.writeText(errorReport([{ at: new Date().toISOString(), path: location.pathname, message: `${error.name}: ${error.message}`, stack: error.stack, build: BUILD, ua: navigator.userAgent }]))}>
            <Copy className="size-4" /> نسخ التفاصيل
          </button>
        </div>
      </main>
    );
  }
}
