"use client";

import { AlertCircle, LogIn, PlayCircle } from "lucide-react";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { Button } from "@/components/ui/button";

export function AuthRequiredCard({
  message,
  onLogin,
  onOpenDemo,
}: {
  message: string;
  onLogin: () => void;
  onOpenDemo: () => void;
}) {
  return (
    <CardSpotlight className="overflow-hidden rounded-[28px] border border-red-500/25 bg-red-950/18 p-4 backdrop-blur-xl md:p-5">
      <div className="space-y-3 text-right">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-300" />
          <h3 className="text-sm font-semibold text-red-100">
            يلزم تسجيل الدخول لإنشاء مشروع محفوظ
          </h3>
        </div>
        <p className="text-xs leading-relaxed text-red-100/72">{message}</p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onOpenDemo}
            data-testid="button-auth-fallback-demo"
          >
            <PlayCircle className="ml-2 h-4 w-4" />
            فتح المشروع التجريبي
          </Button>
          <Button
            type="button"
            onClick={onLogin}
            data-testid="button-auth-fallback-login"
          >
            <LogIn className="ml-2 h-4 w-4" />
            تسجيل الدخول
          </Button>
        </div>
      </div>
    </CardSpotlight>
  );
}
