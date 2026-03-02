"use client";

type SpinnerSize = "sm" | "md" | "lg";

const sizeClasses: Record<SpinnerSize, string> = {
  sm: "h-4 w-4 border-2",
  md: "h-8 w-8 border-3",
  lg: "h-12 w-12 border-4",
};

interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
}

function Spinner({ size = "md", className = "" }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`inline-block animate-spin rounded-full border-blue-600 border-t-transparent ${sizeClasses[size]} ${className}`}
    />
  );
}

export { Spinner };
export type { SpinnerProps };
