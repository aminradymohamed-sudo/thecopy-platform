"use client";

/**
 * صفحة تسجيل الدخول بـ QR - QR Login Page
 *
 * @description
 * تتيح للمستخدمين الانضمام للمشروع بمسح رمز QR
 * بدلاً من إنشاء حساب تقليدي
 *
 * السبب: تسريع عملية إضافة أعضاء الفريق للمشروع
 * خاصة في بيئات التصوير الميدانية السريعة
 */

import {
  QRTokenSchema,
  generateDeviceHash,
  scanQRAndLogin,
  storeToken,
  type AuthResponse,
} from "@the-copy/breakapp";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";

import { toast } from "@/hooks/use-toast";

import type { QRScannerErrorDetail } from "@the-copy/breakapp/components/scanner/QRScanner";

const QRScanner = dynamic(
  () => import("@the-copy/breakapp/components/scanner/QRScanner"),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-lg border border-slate-700 bg-slate-900 p-6 text-center text-sm text-slate-200">
        جارٍ تحميل ماسح QR...
      </div>
    ),
  }
);

/**
 * عناوين الأخطاء العربية لكل سبب فشل ممكن
 */
const ERROR_TITLES: Record<QRScannerErrorDetail["reason"], string> = {
  "insecure-context": "اتصال غير آمن",
  "mediadevices-unavailable": "المتصفح غير مدعوم",
  "permissions-policy-blocked": "الكاميرا محجوبة بواسطة سياسة الموقع",
  "permission-denied": "رفض الإذن للكاميرا",
  "no-camera-device": "لا توجد كاميرا",
  "device-in-use": "الكاميرا مستخدمة من تطبيق آخر",
  overconstrained: "إعدادات الكاميرا غير مدعومة",
  "manual-entry-invalid": "صيغة الرمز غير صحيحة",
  "image-decode-failed": "تعذر استخراج الرمز من الصورة",
  unknown: "خطأ غير متوقع",
};

/**
 * استجابة خطأ API
 */
interface ApiErrorResponse {
  response?: { data?: { message?: string } };
  message?: string;
}

const SAFE_AUTH_FAILURE_MESSAGE =
  "تعذر إتمام المصادقة. تحقق من الرمز وحاول مرة أخرى.";

function isUnsafeAuthErrorMessage(value: string): boolean {
  return /eyJ[A-Za-z0-9_-]+\.|qr_token|access_token|refreshToken|<!doctype|<html|stack trace|syntaxerror|cannot\s+(get|post)/i.test(
    value
  );
}

function safeAuthErrorMessage(err: unknown): string {
  const apiError = err as ApiErrorResponse;
  const message =
    apiError?.response?.data?.message ?? apiError?.message ?? null;

  if (!message || isUnsafeAuthErrorMessage(message)) {
    return SAFE_AUTH_FAILURE_MESSAGE;
  }

  return message;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function SuccessView() {
  return (
    <div className="text-center p-8">
      <div className="mb-4">
        <svg
          className="mx-auto h-16 w-16 text-emerald-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-white mb-2 font-cairo">نجاح!</h2>
      <p className="text-slate-200 font-cairo">جارٍ التوجيه للوحة التحكم...</p>
    </div>
  );
}

interface ScannerViewProps {
  loading: boolean;
  error: string | null;
  onScan: (token: string) => void;
  onError: (detail: QRScannerErrorDetail) => void;
}

function ScannerView({ loading, error, onScan, onError }: ScannerViewProps) {
  return (
    <>
      <QRScanner onScan={onScan} onError={onError} />
      {loading && (
        <div className="mt-6 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-300" />
          <p className="mt-2 text-sm text-slate-200 font-cairo">
            جارٍ المصادقة...
          </p>
        </div>
      )}
      {error && (
        <div className="mt-6 p-4 bg-red-950 text-red-100 rounded-lg border border-red-700">
          <p className="text-sm font-medium font-cairo">فشلت المصادقة</p>
          <p className="text-sm mt-1 font-cairo">{error}</p>
        </div>
      )}
    </>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function QRLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleQRScan = useCallback(
    async (qrToken: string): Promise<void> => {
      try {
        setLoading(true);
        setError(null);

        const validation = QRTokenSchema.safeParse(qrToken);
        if (!validation.success) {
          setError("صيغة رمز QR غير صالحة");
          toast({
            title: "خطأ في المسح",
            description: "صيغة رمز QR غير صالحة",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        const deviceHash = generateDeviceHash();
        const result: AuthResponse = await scanQRAndLogin(qrToken, deviceHash);
        storeToken(result.access_token);

        setSuccess(true);
        toast({
          title: "تم بنجاح",
          description: "تم المصادقة بنجاح، جارٍ التوجيه...",
        });

        setTimeout(() => {
          router.push("/BREAKAPP/dashboard");
        }, 1500);
      } catch (err: unknown) {
        const errorMsg = safeAuthErrorMessage(err);
        setError(errorMsg);
        toast({
          title: "فشل المصادقة",
          description: errorMsg,
          variant: "destructive",
        });
        setLoading(false);
      }
    },
    [router]
  );

  const handleScanError = useCallback((detail: QRScannerErrorDetail): void => {
    const title = ERROR_TITLES[detail.reason] ?? "خطأ في المسح";
    setError(detail.message);
    toast({ title, description: detail.message, variant: "destructive" });
  }, []);

  return (
    <div
      dir="rtl"
      className="min-h-screen w-full overflow-x-hidden flex flex-col items-center justify-center bg-slate-950 p-4 text-white"
    >
      <section className="max-w-md w-full overflow-hidden rounded-lg bg-slate-900 border border-slate-700 p-6 shadow-xl sm:p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 font-cairo">
            Break Break
          </h1>
          <p className="text-slate-200 font-cairo">
            امسح رمز QR للانضمام لمشروعك
          </p>
        </div>

        {success ? (
          <SuccessView />
        ) : (
          <ScannerView
            loading={loading}
            error={error}
            onScan={(token) => void handleQRScan(token)}
            onError={handleScanError}
          />
        )}
      </section>

      <div className="mt-8 max-w-md text-center text-sm text-slate-200">
        <p className="font-cairo">
          إذا لم تعمل الكاميرا، استخدم رفع الصورة أو الإدخال اليدوي.
        </p>
      </div>
    </div>
  );
}
