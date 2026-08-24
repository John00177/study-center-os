import type { ReactNode, SelectHTMLAttributes, InputHTMLAttributes } from "react";

interface FieldWrapperProps {
  label: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  children: ReactNode;
  htmlFor?: string;
}

function FieldWrapper({ label, required, error, helperText, children, htmlFor }: FieldWrapperProps) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      ) : (
        helperText && <p className="mt-1 text-xs text-slate-500">{helperText}</p>
      )}
    </div>
  );
}

const baseInputClass =
  "w-full rounded-lg border px-3 py-2 text-sm text-slate-900 transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

function inputBorderClass(hasError?: string) {
  return hasError
    ? "border-red-300 focus:border-red-500 focus:ring-red-500 animate-shake"
    : "border-slate-300 focus:border-primary focus:ring-primary/30";
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  required?: boolean;
  error?: string;
  helperText?: string;
}

export function TextField({ label, required, error, helperText, id, className, ...rest }: TextFieldProps) {
  return (
    <FieldWrapper label={label} required={required} error={error} helperText={helperText} htmlFor={id}>
      <input
        id={id}
        className={`${baseInputClass} ${inputBorderClass(error)} ${className ?? ""}`}
        {...rest}
      />
    </FieldWrapper>
  );
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  children: ReactNode;
}

export function SelectField({
  label,
  required,
  error,
  helperText,
  id,
  className,
  children,
  ...rest
}: SelectFieldProps) {
  return (
    <FieldWrapper label={label} required={required} error={error} helperText={helperText} htmlFor={id}>
      <select
        id={id}
        className={`${baseInputClass} ${inputBorderClass(error)} bg-white ${className ?? ""}`}
        {...rest}
      >
        {children}
      </select>
    </FieldWrapper>
  );
}
