"use client";

type SkeletonVariant = "text" | "circular" | "rectangular";

interface SkeletonProps extends React.ComponentPropsWithoutRef<"div"> {
  variant?: SkeletonVariant;
  width?: string;
  height?: string;
}

function Skeleton({
  variant = "rectangular",
  width,
  height,
  className = "",
  style,
  ...props
}: SkeletonProps) {
  const variantClass = {
    text: "rounded",
    circular: "rounded-full",
    rectangular: "rounded-md",
  }[variant];

  const defaultHeight = variant === "text" ? "1rem" : "4rem";

  return (
    <div
      className={`animate-pulse bg-gray-200 ${variantClass} ${className}`}
      style={{
        width: width || "100%",
        height: height || defaultHeight,
        ...style,
      }}
      {...props}
    />
  );
}

export { Skeleton };
export type { SkeletonProps };
