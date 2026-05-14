"use client";

/**
 * ============================================================================
 * QRScanner — مكون مسح QR بمستوى إنتاج كامل
 * ============================================================================
 *
 * @description
 * يقدم ثلاث مسارات مُعتمدة رسمياً:
 *   1) الكاميرا الحية (المسار الأساسي)
 *   2) رفع صورة تحتوي رمز QR (fallback أول)
 *   3) إدخال الرمز يدوياً (fallback ثانٍ)
 *
 * المسار البديل ليس التفافاً — هو جزء رسمي من تجربة المنتج
 * لضمان عدم حجب المستخدم مهما كانت ظروف الكاميرا.
 *
 * التصميم:
 *   - آلة حالة واضحة (useQRCamera)
 *   - رسائل خطأ عربية قابلة للتصرف
 *   - أزرار بديلة ظاهرة في كل الحالات المحجوبة
 *   - تنظيف stream آمن عند unmount
 * ============================================================================
 */

import { useCallback, useRef, useState } from "react";
import {
  useQRCamera,
  type QRCameraFailureReason,
} from "../../hooks/useQRCamera";
import { QRTokenSchema } from "../../lib/types";

/**
 * مخرجات الخطأ إلى الأعلى
 */
export interface QRScannerErrorDetail {
  reason:
    | QRCameraFailureReason
    | "manual-entry-invalid"
    | "image-decode-failed";
  message: string;
}

/**
 * خصائص المكون
 */
export interface QRScannerProps {
  /** يُستدعى عند نجاح أي من مسارات المسح الثلاثة */
  onScan: (decodedText: string) => void;
  /** يُستدعى عند حدوث خطأ ملموس — اختياري */
  onError?: (detail: QRScannerErrorDetail) => void;
  /** معرّف اختبار لعنصر الحاوية الجذر — يساعد Playwright */
  testId?: string;
}

const VIEWPORT_ELEMENT_ID = "qr-scanner-viewport";

/**
 * مكون مسح QR الرئيسي
 */
export default function QRScanner({
  onScan,
  onError,
  testId = "qr-scanner",
}: QRScannerProps) {
  const camera = useQRCamera({
    elementId: VIEWPORT_ELEMENT_ID,
    onDecoded: onScan,
  });

  const [manualValue, setManualValue] = useState<string>("");
  const [manualError, setManualError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadBusy, setUploadBusy] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isManualEmpty = manualValue.trim().length === 0;
  const visibleManualError =
    manualError ?? (isManualEmpty ? "رمز QR مطلوب" : null);

  /**
   * تسليم الإدخال اليدوي
   * يتوقع صيغة "a:b:c" وفق QRTokenSchema — التحقق النهائي في الصفحة الأم
   */
  const submitManual = useCallback((): void => {
    const trimmed = manualValue.trim();
    if (trimmed.length === 0) {
      setManualError("رمز QR مطلوب");
      return;
    }
    const validation = QRTokenSchema.safeParse(trimmed);
    if (!validation.success) {
      const message =
        validation.error.issues[0]?.message ??
        "صيغة رمز QR غير صالحة - يجب أن يحتوي على ثلاثة أجزاء";
      setManualError(message);
      onError?.({
        reason: "manual-entry-invalid",
        message,
      });
      return;
    }
    setManualError(null);
    onScan(trimmed);
  }, [manualValue, onError, onScan]);

  /**
   * معالجة رفع صورة QR — fallback أول
   */
  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
      const file = event.target.files?.[0];
      if (!file) return;

      setUploadError(null);
      setUploadBusy(true);
      try {
        const decoded = await camera.scanImageFile(file);
        onScan(decoded);
      } catch (err) {
        const message =
          (err as Error)?.message ||
          "تعذر استخراج QR من الصورة — تأكد من وضوح الرمز في الصورة";
        setUploadError(message);
        onError?.({ reason: "image-decode-failed", message });
      } finally {
        setUploadBusy(false);
        // إعادة تعيين الـ input ليتيح رفع نفس الصورة مرة أخرى
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [camera, onError, onScan],
  );

  /**
   * هل نعرض مسارات fallback؟
   * نعرضها دائماً، لكن بعناوين مناسبة عندما تكون الكاميرا محجوبة
   */
  const isCameraBlocked =
    camera.status === "unsupported" ||
    camera.status === "permission-denied" ||
    camera.status === "no-device" ||
    camera.status === "error";

  return (
    <div
      data-testid={testId}
      data-status={camera.status}
      className="flex w-full max-w-full flex-col items-center gap-4 overflow-x-hidden"
    >
      {/* منطقة معاينة الكاميرا */}
      <div
        id={VIEWPORT_ELEMENT_ID}
        data-testid="qr-scanner-viewport"
        className="w-full max-w-md overflow-hidden rounded-lg bg-slate-950"
        style={{
          minHeight: camera.status === "scanning" ? "300px" : "0",
        }}
      />

      {/* أزرار الكاميرا الأساسية */}
      <div className="flex flex-wrap gap-2 justify-center">
        {camera.status !== "scanning" && !isCameraBlocked && (
          <button
            type="button"
            data-testid="qr-start-camera"
            onClick={() => {
              void camera.start();
            }}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            بدء المسح بالكاميرا
          </button>
        )}

        {camera.status === "scanning" && (
          <button
            type="button"
            data-testid="qr-stop-camera"
            onClick={() => {
              void camera.stop();
            }}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            إيقاف المسح
          </button>
        )}

        {isCameraBlocked && (
          <button
            type="button"
            data-testid="qr-retry-camera"
            onClick={() => {
              void camera.retry();
            }}
            className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-white transition-colors hover:bg-slate-600"
          >
            إعادة محاولة تشغيل الكاميرا
          </button>
        )}
      </div>

      {/* إظهار السبب وكيفية التصرف */}
      {isCameraBlocked && camera.errorMessage && (
        <div
          role="alert"
          data-testid="qr-camera-error"
          className="w-full max-w-md rounded-lg border border-amber-700 bg-amber-950 p-4 text-amber-100"
        >
          <p className="text-sm font-medium">الكاميرا غير متاحة الآن</p>
          <p className="text-sm mt-1">{camera.errorMessage}</p>
          <p className="text-xs mt-2 opacity-80">
            يمكنك إكمال الدخول الآن برفع صورة للرمز أو إدخاله يدوياً أدناه.
          </p>
        </div>
      )}

      {/* تعليمات أثناء المسح */}
      {camera.status === "scanning" && (
        <div className="max-w-md text-center text-sm text-slate-200">
          <p>ضع رمز QR داخل الإطار</p>
          <p className="text-xs mt-1">تأكد من وجود إضاءة جيدة وأن الرمز واضح</p>
        </div>
      )}

      {/* ======================================================== */}
      {/* fallback #1 — رفع صورة تحتوي على QR                      */}
      {/* ======================================================== */}
      <div
        data-testid="qr-fallback-upload"
        className="w-full max-w-md border-t border-slate-700 pt-4"
      >
        <label
          htmlFor="qr-image-upload-input"
          className="mb-2 block cursor-pointer text-sm text-slate-200"
        >
          أو ارفع صورة تحتوي على رمز QR
        </label>
        <input
          id="qr-image-upload-input"
          ref={fileInputRef}
          type="file"
          accept="image/*"
          data-testid="qr-image-upload"
          disabled={uploadBusy}
          onChange={(event) => {
            void handleFileChange(event);
          }}
          className="block w-full min-w-0 text-sm text-slate-100 file:mr-4 file:rounded-md file:border-0 file:bg-blue-700 file:px-4 file:py-2 file:text-sm file:text-white hover:file:bg-blue-600"
        />
        {uploadBusy && (
          <p className="mt-2 text-xs text-slate-200">جارٍ تحليل الصورة...</p>
        )}
        {uploadError && (
          <p
            role="alert"
            data-testid="qr-upload-error"
            className="mt-2 text-xs text-red-300"
          >
            {uploadError}
          </p>
        )}
      </div>

      {/* ======================================================== */}
      {/* fallback #2 — إدخال الرمز يدوياً                          */}
      {/* ======================================================== */}
      <div
        data-testid="qr-fallback-manual"
        className="w-full max-w-md border-t border-slate-700 pt-4"
      >
        <label
          htmlFor="qr-manual-input"
          className="mb-2 block text-sm text-slate-200"
        >
          أو أدخل رمز الدعوة يدوياً
        </label>
        <div className="flex w-full max-w-full flex-col gap-2 sm:flex-row">
          <input
            id="qr-manual-input"
            type="text"
            data-testid="qr-manual-entry"
            value={manualValue}
            onChange={(e) => {
              setManualValue(e.target.value);
              setManualError(null);
            }}
            placeholder="الصق رمز الدعوة هنا"
            maxLength={500}
            className="min-w-0 flex-1 rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-blue-400 focus:outline-none"
          />
          <button
            type="button"
            data-testid="qr-manual-submit"
            disabled={isManualEmpty}
            onClick={submitManual}
            className="shrink-0 rounded-md bg-blue-700 px-4 py-2 text-sm text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
          >
            تأكيد
          </button>
        </div>
        {visibleManualError && (
          <p
            role="alert"
            data-testid="qr-manual-error"
            className="mt-2 text-xs text-red-300"
          >
            {visibleManualError}
          </p>
        )}
      </div>
    </div>
  );
}
