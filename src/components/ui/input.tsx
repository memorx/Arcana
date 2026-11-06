"use client";

import { forwardRef, InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

/**
 * Campo de pliego: sin caja, un filete inferior y la letra en Newsreader.
 * Al enfocarse el filete se vuelve rosa y más grueso; con error, el filete y
 * el mensaje van en el semántico de error del suelo (#B3261E / #FF8A80).
 */
const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, type = "text", id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    const errorId = error ? `${inputId}-error` : undefined;
    const hintId = hint ? `${inputId}-hint` : undefined;
    const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block font-dato text-[0.6875rem] leading-[1.4] tracking-[0.12em] text-letra-suave uppercase"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={cn(
            "w-full rounded-none border-0 border-b border-filete/50 bg-transparent px-0 py-2.5",
            "font-lectura text-[1.0625rem] text-letra placeholder:text-letra-suave",
            "transition-[border-color,box-shadow] duration-200",
            "focus:border-rosa focus:shadow-[0_1px_0_0_var(--color-rosa)] focus:outline-none focus-visible:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error &&
              "border-letra-error focus:border-letra-error focus:shadow-[0_1px_0_0_var(--letra-error)]",
            className
          )}
          {...props}
        />
        {hint && !error && (
          <p id={hintId} className="mt-1.5 text-sm text-letra-suave">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} role="alert" className="mt-1.5 text-sm text-letra-error">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
