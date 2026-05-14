/**
 * Decoupage feature — قارئو الملفات النصية (txt/md/docx) في المتصفح.
 *
 * يستخدم حزمة `mammoth` المحلية (موجودة في apps/web/package.json كـ ^1.11.0)
 * بدلًا من CDN الذي كان في D-COUPAGE المصدر.
 */

export interface TextReadResult {
  success: boolean;
  content: string;
  error: string | null;
}

async function readPlainText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        resolve(result);
      } else {
        reject(new Error("نوع المحتوى غير مدعوم"));
      }
    };
    reader.onerror = () => reject(new Error("فشل قراءة الملف النصي"));
    reader.readAsText(file, "UTF-8");
  });
}

async function readDocx(file: File): Promise<string> {
  // dynamic import حتى لا يتم تضمين mammoth في bundle الأولي
  const mammoth = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

/**
 * يقرأ ملف txt/md أو docx ويعيد نصه الخام.
 */
export async function readAnyTextFile(file: File): Promise<TextReadResult> {
  try {
    const lower = file.name.toLowerCase();
    const content = lower.endsWith(".docx")
      ? await readDocx(file)
      : await readPlainText(file);
    return { success: true, content, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "فشل قراءة الملف";
    return { success: false, content: "", error: message };
  }
}
