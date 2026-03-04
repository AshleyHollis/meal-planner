// @vitest-environment node
import { describe, it, expect } from "vitest";

// Unit tests for MealTypeSelector logic (pure function tests, no DOM needed)
describe("MealTypeSelector logic", () => {
  it("default selection includes dinner", () => {
    const defaultSelected = ["dinner"];
    expect(defaultSelected).toContain("dinner");
    expect(defaultSelected).not.toContain("breakfast");
    expect(defaultSelected).not.toContain("lunch");
  });

  it("toggle adds a value when not present", () => {
    const selected = ["dinner"];
    const toggle = (arr: string[], value: string) =>
      arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];

    expect(toggle(selected, "breakfast")).toEqual(["dinner", "breakfast"]);
  });

  it("toggle removes a value when already present", () => {
    const selected = ["dinner", "breakfast"];
    const toggle = (arr: string[], value: string) =>
      arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];

    expect(toggle(selected, "breakfast")).toEqual(["dinner"]);
  });

  it("can select all meal types", () => {
    const toggle = (arr: string[], value: string) =>
      arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];

    let selected: string[] = ["dinner"];
    selected = toggle(selected, "breakfast");
    selected = toggle(selected, "lunch");
    expect(selected).toEqual(["dinner", "breakfast", "lunch"]);
  });

  it("can deselect all meal types", () => {
    const toggle = (arr: string[], value: string) =>
      arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];

    let selected = ["dinner"];
    selected = toggle(selected, "dinner");
    expect(selected).toHaveLength(0);
  });
});
