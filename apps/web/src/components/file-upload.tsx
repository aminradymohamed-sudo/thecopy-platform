"use client";

import { Upload, File, X, CheckCircle, AlertCircle } from "lucide-react";
import { useState, useCallback } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { createModuleLogger } from "@/lib/logger";
import { isUnknownRecord } from "@/lib/utils/unknown-values";

const logger = createModuleLogger("components.file-upload");

interface FileUploadProps {
  onFileContent: (content: string, filename: string) => void;
  onUploadError?: (message: string) => void;
  accept?: string;
  maxSize?: number; // in MB
  className?: string;
}

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  content: string;
  status: "uploading" | "success" | "error";
  progress: number;
  errorMessage?: string;
}

interface PdfTextItem {
  str: string;
}

const isPdfTextItem = (item: unknown): item is PdfTextItem =>
  typeof item === "object" &&
  item !== null &&
  "str" in item &&
  typeof (item as { str?: unknown }).str === "string";

function getSupportedFileKind(file: File): "text" | "pdf" | "docx" | null {
  const lowerName = file.name.toLowerCase();
  if (file.type === "text/plain" || lowerName.endsWith(".txt")) {
    return "text";
  }
  if (file.type === "application/pdf" || lowerName.endsWith(".pdf")) {
    return "pdf";
  }
  if (
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lowerName.endsWith(".docx")
  ) {
    return "docx";
  }
  return null;
}

export default function FileUpload({
  onFileContent,
  onUploadError,
  accept = ".pdf,.docx,.txt",
  maxSize = 10,
  className = "",
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const extractTextFromFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;

          if (!arrayBuffer) {
            reject(new Error("فشل في قراءة الملف"));
            return;
          }

          const fileKind = getSupportedFileKind(file);

          if (fileKind === "text") {
            // Handle TXT files
            const text = new TextDecoder().decode(arrayBuffer);
            resolve(text);
          } else if (fileKind === "pdf") {
            // Handle PDF files using PDF.js with proper worker setup
            const pdfjsLib = await import("pdfjs-dist");

            // Use CDN worker that works in production
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs`;

            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer })
              .promise;
            let fullText = "";

            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const textContent = await page.getTextContent();
              const textItems: unknown[] = Array.isArray(textContent.items)
                ? textContent.items
                : [];
              const pageText = textItems
                .filter(isPdfTextItem)
                .map((item) => item.str)
                .join(" ");
              fullText += pageText + "\n";
            }

            resolve(fullText);
          } else if (fileKind === "docx") {
            // Handle DOCX files using mammoth
            const mammoth = await import("mammoth");
            const result: unknown = await mammoth.extractRawText({
              arrayBuffer,
            });
            if (
              isUnknownRecord(result) &&
              typeof result["value"] === "string"
            ) {
              resolve(result["value"]);
              return;
            }
            reject(new Error("فشل في استخراج نص الملف"));
          } else {
            reject(new Error("نوع الملف غير مدعوم"));
          }
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      };

      reader.onerror = () => reject(new Error("فشل في قراءة الملف"));
      reader.readAsArrayBuffer(file);
    });
  };

  const processFile = useCallback(
    async (file: File) => {
      // Add file to state with uploading status
      const newFile: UploadedFile = {
        name: file.name,
        size: file.size,
        type: file.type,
        content: "",
        status: "uploading",
        progress: 0,
      };

      setFiles((prev) => [...prev, newFile]);
      setMessage(null);

      let progressInterval: ReturnType<typeof setInterval> | null = null;

      try {
        // Simulate progress
        progressInterval = setInterval(() => {
          setFiles((prev) =>
            prev.map((f) =>
              f.name === file.name
                ? { ...f, progress: Math.min(f.progress + 10, 90) }
                : f
            )
          );
        }, 100);

        // Extract text content
        const content = await extractTextFromFile(file);

        // Update file status
        setFiles((prev) =>
          prev.map((f) =>
            f.name === file.name
              ? { ...f, content, status: "success", progress: 100 }
              : f
          )
        );

        // Call callback with content
        onFileContent(content, file.name);
      } catch (error) {
        setFiles((prev) =>
          prev.map((f) =>
            f.name === file.name
              ? {
                  ...f,
                  status: "error",
                  progress: 0,
                  errorMessage: "فشل في معالجة الملف",
                }
              : f
          )
        );
        const errorMessage = "فشل في معالجة الملف";
        setMessage(errorMessage);
        onUploadError?.(errorMessage);
        logger.error(
          { err: error, fileName: file.name },
          "خطأ في معالجة الملف"
        );
      } finally {
        if (progressInterval) {
          clearInterval(progressInterval);
        }
      }
    },
    [onFileContent, onUploadError]
  );

  const handleFileSelect = useCallback(
    (selectedFiles: FileList | null) => {
      if (!selectedFiles) return;

      const rejectFile = (file: File, errorMessage: string) => {
        setMessage(errorMessage);
        onUploadError?.(errorMessage);
        setFiles((prev) =>
          prev.filter((existing) => existing.name !== file.name)
        );
      };

      Array.from(selectedFiles).forEach((file) => {
        // Check file size
        if (file.size > maxSize * 1024 * 1024) {
          rejectFile(
            file,
            `الملف ${file.name} كبير جداً. الحد الأقصى ${maxSize} ميجابايت`
          );
          return;
        }

        // Check file type
        if (!getSupportedFileKind(file)) {
          rejectFile(
            file,
            `نوع الملف ${file.name} غير مدعوم. الأنواع المدعومة: PDF و DOCX و TXT`
          );
          return;
        }

        processFile(file).catch((error: unknown) => {
          logger.error(
            { err: error, fileName: file.name },
            "خطأ غير متوقع في معالجة الملف"
          );
        });
      });
    },
    [maxSize, onUploadError, processFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const removeFile = (fileName: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== fileName));
    setMessage(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 بايت";
    const k = 1024;
    const sizes = ["بايت", "كيلوبايت", "ميجابايت", "جيجابايت"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {message ? (
        <p
          role="alert"
          className="rounded-md border border-red-400/35 bg-red-950/35 px-3 py-2 text-sm text-red-100"
        >
          {message}
        </p>
      ) : null}

      {/* Upload Area */}
      <Card
        className={`border-2 border-dashed transition-colors ${isDragging ? "border-blue-400 bg-blue-950/50" : "border-white/20 bg-zinc-950/72 hover:border-white/35"}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <CardContent className="p-8 text-center">
          <Upload className="w-12 h-12 mx-auto mb-4 text-white/65" />
          <h3 className="text-lg font-semibold mb-2 text-white">
            تحميل الملفات
          </h3>
          <p className="text-white/68 mb-4">
            اسحب الملفات هنا أو انقر للاختيار
          </p>
          <p className="text-sm text-white/55 mb-4">
            الأنواع المدعومة: PDF, DOCX, TXT (حتى {maxSize}MB)
          </p>

          <input
            type="file"
            multiple
            accept={accept}
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
            id="file-upload"
            aria-label="اختيار ملفات الملخص"
          />

          <Button asChild>
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="w-4 h-4 mr-2" />
              اختيار الملفات
            </label>
          </Button>
        </CardContent>
      </Card>

      {/* Uploaded Files List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">الملفات المحملة:</h4>
          {files.map((file, index) => (
            <Card
              key={index}
              className="border-white/10 bg-zinc-950/72 p-4 text-white"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 space-x-reverse">
                  <File className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="font-medium text-sm">{file.name}</p>
                    <p className="text-xs text-white/55">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 space-x-reverse">
                  {file.status === "uploading" && (
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Progress value={file.progress} className="w-20" />
                      <span className="text-xs text-white/55">
                        {file.progress}%
                      </span>
                    </div>
                  )}

                  {file.status === "success" && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}

                  {file.status === "error" && (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(file.name)}
                    aria-label={`إزالة ${file.name}`}
                    title={`إزالة ${file.name}`}
                  >
                    <X className="w-4 h-4" aria-hidden />
                  </Button>
                </div>
              </div>

              {file.status === "error" && file.errorMessage ? (
                <p className="mt-2 text-xs text-red-600">{file.errorMessage}</p>
              ) : null}

              {file.status === "uploading" && (
                <Progress value={file.progress} className="mt-2" />
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
