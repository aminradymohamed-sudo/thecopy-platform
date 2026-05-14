"use client";

import { useCallback, type ChangeEvent } from "react";

import type { InputFieldProps } from "./types";

export function InputField({
  input,
  id,
  errorId,
  value,
  error,
  onChange,
}: InputFieldProps) {
  const handleChange = useCallback(
    (
      e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
      onChange(input.name, e.target.value);
    },
    [input.name, onChange]
  );

  if (input.type === "select" && input.options) {
    return (
      <select
        id={id}
        name={input.name}
        className="art-input"
        value={value}
        onChange={handleChange}
        aria-label={input.label}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? errorId : undefined}
        required={input.required !== false}
      >
        <option value="">اختر...</option>
        {input.options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  if (input.type === "textarea") {
    return (
      <textarea
        id={id}
        name={input.name}
        className="art-input"
        placeholder={input.placeholder}
        value={value}
        onChange={handleChange}
        rows={4}
        style={{ resize: "none" }}
        aria-label={input.label}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? errorId : undefined}
        required={input.required !== false}
      />
    );
  }

  return (
    <input
      id={id}
      name={input.name}
      type={input.type}
      className="art-input"
      placeholder={input.placeholder}
      value={value}
      onChange={handleChange}
      aria-label={input.label}
      aria-invalid={error ? "true" : "false"}
      aria-describedby={error ? errorId : undefined}
      required={input.required !== false}
    />
  );
}
