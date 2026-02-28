"use client";

import { Badge } from "../ui/Badge";

interface ExpiryBadgeProps {
  expiryDate: string | null;
}

function getExpiryStatus(expiryDate: string | null): {
  label: string;
  variant: "default" | "success" | "warning" | "error";
} {
  if (!expiryDate) {
    return { label: "No expiry", variant: "default" };
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);

  const diffMs = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: "Expired", variant: "error" };
  }

  if (diffDays <= 2) {
    return { label: `Expires in ${diffDays}d`, variant: "warning" };
  }

  return { label: `${diffDays}d left`, variant: "success" };
}

function ExpiryBadge({ expiryDate }: ExpiryBadgeProps) {
  const { label, variant } = getExpiryStatus(expiryDate);

  return <Badge variant={variant}>{label}</Badge>;
}

export { ExpiryBadge };
export type { ExpiryBadgeProps };
