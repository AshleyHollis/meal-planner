"use client";

import { forwardRef } from "react";

interface InputProps extends React.ComponentPropsWithoutRef<"input"> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, className = "", ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="w-full">
        {label ? (
          <label
            htmlFor={inputId}
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            {label}
          </label>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          className={`min-h-[44px] w-full rounded-lg border px-3 py-2 text-base transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            error
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:border-blue-500"
          } disabled:bg-gray-50 disabled:opacity-50 ${className}`}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error && inputId ? `${inputId}-error` : undefined}
          {...props}
        />
        {error ? (
          <p
            id={inputId ? `${inputId}-error` : undefined}
            className="mt-1 text-sm text-red-600"
          >
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);

Input.displayName = "Input";

export { Input };
export type { InputProps };
