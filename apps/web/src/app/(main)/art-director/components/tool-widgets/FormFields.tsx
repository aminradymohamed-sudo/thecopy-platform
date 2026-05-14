"use client";

import { InputField } from "./InputField";

import type { FormFieldsProps } from "./types";

export function FormFields({
  inputs,
  formData,
  fieldErrors,
  onFieldChange,
}: FormFieldsProps) {
  return (
    <>
      {inputs.map((input) => {
        const fieldId = `art-tool-field-${input.name}`;
        const errorId = `${fieldId}-error`;
        const error = fieldErrors[input.name];

        return (
          <div
            key={input.name}
            className={`art-form-group ${input.type === "textarea" ? "full-width" : ""}`}
          >
            <label htmlFor={fieldId}>{input.label}</label>
            <InputField
              input={input}
              id={fieldId}
              errorId={errorId}
              value={formData[input.name] ?? ""}
              {...(error ? { error } : {})}
              onChange={onFieldChange}
            />
            {error ? (
              <p id={errorId} className="art-field-error" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        );
      })}
    </>
  );
}
