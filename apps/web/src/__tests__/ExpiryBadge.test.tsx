import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { ExpiryBadge } from "../components/inventory/ExpiryBadge";

function today(): Date {
  return new Date("2025-06-15T00:00:00");
}

describe("ExpiryBadge", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function renderBadge(expiryDate: string | null) {
    vi.useFakeTimers();
    vi.setSystemTime(today());
    return render(<ExpiryBadge expiryDate={expiryDate} />);
  }

  describe("safe items (default style)", () => {
    it("renders success variant when expiry is more than 2 days away", () => {
      renderBadge("2025-06-25");
      const badge = screen.getByText("10d left");
      expect(badge).toBeDefined();
      expect(badge.className).toContain("bg-green-100");
    });

    it("renders default variant when expiryDate is null", () => {
      renderBadge(null);
      const badge = screen.getByText("No expiry");
      expect(badge).toBeDefined();
      expect(badge.className).toContain("bg-gray-100");
    });
  });

  describe("items expiring within 2 days (amber)", () => {
    it("renders warning variant when expiring tomorrow", () => {
      renderBadge("2025-06-16");
      const badge = screen.getByText("Expires in 1d");
      expect(badge).toBeDefined();
      expect(badge.className).toContain("bg-yellow-100");
    });

    it("renders warning variant when expiring in 2 days", () => {
      renderBadge("2025-06-17");
      const badge = screen.getByText("Expires in 2d");
      expect(badge).toBeDefined();
      expect(badge.className).toContain("bg-yellow-100");
    });

    it("renders warning variant when expiring today", () => {
      renderBadge("2025-06-15");
      const badge = screen.getByText("Expires in 0d");
      expect(badge).toBeDefined();
      expect(badge.className).toContain("bg-yellow-100");
    });
  });

  describe("expired items (red)", () => {
    it("renders error variant when item expired yesterday", () => {
      renderBadge("2025-06-14");
      const badge = screen.getByText("Expired");
      expect(badge).toBeDefined();
      expect(badge.className).toContain("bg-red-100");
    });

    it("renders error variant when item expired a week ago", () => {
      renderBadge("2025-06-08");
      const badge = screen.getByText("Expired");
      expect(badge).toBeDefined();
      expect(badge.className).toContain("bg-red-100");
    });
  });
});
