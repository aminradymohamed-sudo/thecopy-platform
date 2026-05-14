"use client";

import type { NotificationState } from "../../types/studio";

interface StudioNotificationProps {
  notification: NotificationState | null;
}

export function StudioNotification({ notification }: StudioNotificationProps) {
  if (!notification) return null;

  const variants = {
    success: "border-emerald-400/35 bg-emerald-500/15 text-emerald-50",
    error: "border-red-400/35 bg-red-500/15 text-red-50",
    warning: "border-amber-400/35 bg-amber-500/15 text-amber-50",
    info: "border-cyan-400/35 bg-cyan-500/15 text-cyan-50",
  };

  return (
    <div
      role="status"
      aria-label="تنبيه الاستوديو"
      aria-live={notification.type === "error" ? "assertive" : "polite"}
      aria-atomic="true"
      className={`pointer-events-none fixed left-4 top-4 z-50 max-w-sm rounded-[20px] border px-4 py-3 text-sm shadow-lg backdrop-blur-2xl ${variants[notification.type]}`}
    >
      <span>{notification.message}</span>
    </div>
  );
}
