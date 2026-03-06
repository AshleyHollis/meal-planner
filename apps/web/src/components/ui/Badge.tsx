"use client";

type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "active"
  | "completed"
  | "failed"
  | "draft";

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-gray-100 text-gray-800",
  success: "bg-green-100 text-green-800",
  warning: "bg-yellow-100 text-yellow-800",
  error: "bg-red-100 text-red-800",
  info: "bg-blue-100 text-blue-800",
  active: "bg-green-100 text-green-800",
  completed: "bg-blue-100 text-blue-800",
  failed: "bg-red-100 text-red-800",
  draft: "bg-gray-100 text-gray-800",
};

const variantIcons: Record<BadgeVariant, string | null> = {
  default: null,
  success: null,
  warning: null,
  error: null,
  info: null,
  active: "●",
  completed: "✓",
  failed: "✕",
  draft: "○",
};

interface BadgeProps extends React.ComponentPropsWithoutRef<"span"> {
  variant?: BadgeVariant;
}

function Badge({
  variant = "default",
  className = "",
  children,
  ...props
}: BadgeProps) {
  const icon = variantIcons[variant];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {icon && <span>{icon}</span>}
      {children}
    </span>
  );
}

export { Badge };
export type { BadgeProps };
