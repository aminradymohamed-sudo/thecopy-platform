import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

import FileUpload from "./file-upload";

beforeEach(() => {
  vi.spyOn(window, "alert").mockImplementation(() => undefined);
});

it("يعرض رفض الملف غير المدعوم داخل الواجهة دون تمريره للمعالجة", async () => {
  const onFileContent = vi.fn();
  const onUploadError = vi.fn();
  const file = new File(["bad"], "payload.exe", {
    type: "application/x-msdownload",
  });

  render(
    <FileUpload onFileContent={onFileContent} onUploadError={onUploadError} />
  );

  const input = document.querySelector('input[type="file"]')!;
  fireEvent.change(input, { target: { files: [file] } });

  expect((await screen.findByRole("alert")).textContent).toMatch(/غير مدعوم/);
  expect(screen.queryByText("payload.exe")).not.toBeInTheDocument();
  expect(onFileContent).not.toHaveBeenCalled();
  expect(onUploadError).toHaveBeenCalledWith(
    expect.stringMatching(/غير مدعوم/)
  );
});
