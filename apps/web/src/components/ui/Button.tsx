"use client";

import { forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800",
  secondary:
    "bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300 border border-gray-300",
  danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800",
  ghost: "text-gray-700 hover:bg-gray-100 active:bg-gray-200",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-[44px] min-w-[44px] px-3 py-2 text-sm",
  md: "min-h-[44px] min-w-[44px] px-4 py-2.5 text-base",
  lg: "min-h-[48px] min-w-[48px] px-6 py-3 text-lg",
};

interface ButtonProps
  extends React.ComponentPropsWithoutRef<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      className = "",
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {loading ? (
          <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";

export { Button };
export type { ButtonProps };
