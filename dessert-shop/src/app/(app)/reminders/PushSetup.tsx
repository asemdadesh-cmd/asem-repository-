"use client";

import { useEffect, useState, useTransition } from "react";
import { sendTestNotification, subscribePush, unsubscribePush } from "@/app/actions";
import { BellIcon, CheckIcon } from "@/components/icons";

type Status = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function PushSetup({ vapidKey, devices, schedule }: { vapidKey: string; devices: number; schedule: string }) {
  const [status, setStatus] = useState<Status>("loading");
  const [msg, setMsg] = useState<string>("");
  const [pending, start] = useTransition();

  useEffect(() => {
    (async () => {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !vapidKey) {
        setStatus(ios && !standalone ? "ios-install" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") return setStatus("denied");
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.getSubscription();
      setStatus(sub ? "on" : "off");
    })().catch(() => setStatus("unsupported"));
  }, [vapidKey]);

  const enable = () =>
    start(async () => {
      setMsg("");
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return setStatus(permission === "denied" ? "denied" : "off");
        const reg = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;
        const sub =
          (await reg.pushManager.getSubscription()) ??
          (await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey),
          }));
        const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
        await subscribePush(json);
        setStatus("on");
        setMsg("تم التفعيل على هذا الجهاز.");
      } catch {
        setMsg("تعذّر التفعيل. حاول مرة أخرى.");
      }
    });

  const disable = () =>
    start(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await unsubscribePush(sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus("off");
      setMsg("");
    });

  const test = () =>
    start(async () => {
      const { sent } = await sendTestNotification();
      setMsg(sent ? "تم الإرسال — سيصل الإشعار خلال ثوانٍ." : "لا توجد أجهزة مفعّلة.");
    });

  return (
    <section className="card card-pad stack-sm" aria-labelledby="push-h">
      <div className="row" style={{ alignItems: "flex-start", gap: 12 }}>
        <span className="tx-icon take" aria-hidden="true">
          <BellIcon size={18} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 id="push-h" style={{ fontSize: "1rem" }}>
            الملخص الأسبوعي على الهاتف
          </h2>
          <p className="small muted">
            {schedule} يصلك إشعار بمن لديهم صواني لم تُرجع.
            {devices > 0 && (
              <>
                {" "}
                مفعّل على <span className="num">{devices}</span> {devices === 1 ? "جهاز" : "أجهزة"}.
              </>
            )}
          </p>
        </div>
      </div>

      {status === "on" && (
        <div className="row wrap">
          <span className="tag ok">
            <CheckIcon size={14} /> مفعّل على هذا الجهاز
          </span>
          <span style={{ flex: 1 }} />
          <button type="button" className="btn btn-secondary btn-sm" onClick={test} disabled={pending}>
            إرسال تجربة
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={disable} disabled={pending}>
            إيقاف
          </button>
        </div>
      )}
      {status === "off" && (
        <button type="button" className="btn btn-block" onClick={enable} disabled={pending}>
          {pending ? "جارٍ التفعيل…" : "تفعيل الإشعارات على هذا الجهاز"}
        </button>
      )}
      {status === "ios-install" && (
        <p className="banner warn small">
          على الآيفون: افتح الموقع في Safari ← زر المشاركة ← «إضافة إلى الشاشة الرئيسية»، ثم افتح التطبيق من
          الأيقونة وفعّل الإشعارات من هنا.
        </p>
      )}
      {status === "denied" && (
        <p className="banner warn small">الإشعارات محظورة لهذا الموقع. فعّلها من إعدادات المتصفح ثم أعد المحاولة.</p>
      )}
      {status === "unsupported" && <p className="small muted">هذا المتصفح لا يدعم الإشعارات.</p>}
      {msg && (
        <p className="small" role="status" style={{ color: "var(--brand)" }}>
          {msg}
        </p>
      )}
    </section>
  );
}
