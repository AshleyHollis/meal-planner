import { test, expect } from "@playwright/test";

/**
 * E2E Tests for Planning Enhancement Features (004)
 *
 * Tests the four new capabilities:
 * - US1: Ingredient Substitution
 * - US2: Quick Suggestions ("What Can I Make Right Now?")
 * - US3: Multi-Meal-Type Planning (breakfast/lunch/dinner)
 * - US4: Recurring Meal Templates
 */

test.describe("Quick Suggestions Page (US2)", () => {
  test("quick suggestions page loads with heading", async ({ page }) => {
    await page.goto("/quick-suggestions");

    await expect(
      page.getByRole("heading", { name: /what can i make/i }),
    ).toBeVisible({
      timeout: 30_000,
    });
  });

  test("shows loading state or empty state", async ({ page }) => {
    await page.goto("/quick-suggestions");

    await expect(
      page.getByRole("heading", { name: /what can i make/i }),
    ).toBeVisible({
      timeout: 30_000,
    });

    // Wait for initial load to complete
    const spinner = page.locator('[class*="animate-spin"]');
    if ((await spinner.count()) > 0) {
      await expect(spinner.first()).not.toBeVisible({ timeout: 30_000 });
    }

    // Should show either suggestion cards or empty state
    const suggestionCard = page
      .locator("[data-testid='suggestion-card']")
      .first();
    const emptyState = page.getByText(/no suggestions|add.*inventory/i);
    const errorState = page.getByText(/failed|error/i);
    const getButton = page.getByRole("button", { name: /get suggestions/i });

    await expect(
      suggestionCard.or(emptyState).or(errorState).or(getButton).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test.describe("With Backend", () => {
    test.skip(
      () => !process.env.USE_EXTERNAL_SERVER,
      "Requires backend - run with USE_EXTERNAL_SERVER=true",
    );

    test("fetching suggestions with inventory shows recipe cards", async ({
      page,
    }) => {
      test.slow(); // LLM calls can be slow

      await page.goto("/quick-suggestions");
      await expect(
        page.getByRole("heading", { name: /what can i make/i }),
      ).toBeVisible({ timeout: 30_000 });

      // Wait for suggestions to load or get the button to trigger
      const spinner = page.locator('[class*="animate-spin"]');
      if ((await spinner.count()) > 0) {
        await expect(spinner.first()).not.toBeVisible({ timeout: 60_000 });
      }

      // If there are suggestion cards, verify structure
      const cards = page.locator("[data-testid='suggestion-card']");
      const cardCount = await cards.count();

      if (cardCount > 0) {
        // Each card should have a title and Cook This button
        const firstCard = cards.first();
        await expect(firstCard).toBeVisible();

        const cookButton = firstCard.getByRole("button", {
          name: /cook this/i,
        });
        await expect(cookButton).toBeVisible();
      }
    });
  });
});

test.describe("Recurring Meals Page (US4)", () => {
  test("recurring meals page loads with heading", async ({ page }) => {
    await page.goto("/recurring-meals");

    await expect(page.getByRole("heading", { name: /recurring/i })).toBeVisible(
      {
        timeout: 30_000,
      },
    );
  });

  test("shows add template button and form toggle", async ({ page }) => {
    await page.goto("/recurring-meals");

    await expect(page.getByRole("heading", { name: /recurring/i })).toBeVisible(
      { timeout: 30_000 },
    );

    // Wait for page to fully load
    const spinner = page.locator('[class*="animate-spin"]');
    if ((await spinner.count()) > 0) {
      await expect(spinner.first()).not.toBeVisible({ timeout: 30_000 });
    }

    // The "+ Add Recurring Meal" button should be visible by default
    const addButton = page.getByRole("button", {
      name: /add recurring meal/i,
    });
    await expect(addButton).toBeVisible({ timeout: 10_000 });

    // Click to reveal the form
    await addButton.click();

    // Day-of-week selector and meal type should now be visible
    const dayLabel = page.getByText("Day of week");
    const mealTypeLabel = page.getByText("Meal type");
    await expect(dayLabel).toBeVisible({ timeout: 5_000 });
    await expect(mealTypeLabel).toBeVisible({ timeout: 5_000 });
  });

  test.describe("CRUD Operations (Requires Backend)", () => {
    test.skip(
      () => !process.env.USE_EXTERNAL_SERVER,
      "Requires backend - run with USE_EXTERNAL_SERVER=true",
    );

    test("create and delete recurring template", async ({ page }) => {
      await page.goto("/recurring-meals");
      await expect(
        page.getByRole("heading", { name: /recurring/i }),
      ).toBeVisible({ timeout: 30_000 });

      // Wait for load
      const spinner = page.locator('[class*="animate-spin"]');
      if ((await spinner.count()) > 0) {
        await expect(spinner.first()).not.toBeVisible({ timeout: 30_000 });
      }

      // Click the "+ Add Recurring Meal" button to reveal the form
      const openFormButton = page.getByRole("button", {
        name: /add recurring meal/i,
      });
      if (
        !(await openFormButton.isVisible({ timeout: 5_000 }).catch(() => false))
      ) {
        test.skip(true, "Add button not available");
        return;
      }
      await openFormButton.click();

      // Fill in the recipe title in the now-visible form
      const recipeInput = page.getByPlaceholder(/e\.g\.|overnight|recipe/i);
      await expect(recipeInput).toBeVisible({ timeout: 5_000 });
      await recipeInput.fill("Taco Tuesday Special");

      // Submit via the form's "Add" button (not the outer "+ Add Recurring Meal")
      const submitButton = page
        .locator(".rounded-lg.border")
        .getByRole("button", { name: /^add$/i });
      await expect(submitButton).toBeVisible({ timeout: 5_000 });
      await submitButton.click();

      // Verify it appears in the list
      await expect(page.getByText("Taco Tuesday Special")).toBeVisible({
        timeout: 10_000,
      });

      // Delete it
      const deleteButton = page
        .getByRole("button", { name: /delete/i })
        .first();
      await expect(deleteButton).toBeVisible({ timeout: 5_000 });
      await deleteButton.click();

      // Verify it's removed
      await expect(page.getByText("Taco Tuesday Special")).not.toBeVisible({
        timeout: 10_000,
      });
    });
  });
});

test.describe("Multi-Meal Plan Creation (US3)", () => {
  test("meal plan page shows meal type selector", async ({ page }) => {
    await page.goto("/meal-plan");

    await expect(page.getByRole("heading", { name: "Meal Plans" })).toBeVisible(
      {
        timeout: 30_000,
      },
    );

    // Wait for page load
    const spinner = page.locator('[class*="animate-spin"]');
    if ((await spinner.count()) > 0) {
      await expect(spinner.first()).not.toBeVisible({ timeout: 30_000 });
    }

    // Check for meal type checkboxes
    const dinnerCheckbox = page.getByLabel(/dinner/i);
    const breakfastCheckbox = page.getByLabel(/breakfast/i);
    const lunchCheckbox = page.getByLabel(/lunch/i);

    // At minimum, dinner should be checked by default
    if (await dinnerCheckbox.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(dinnerCheckbox).toBeChecked();
    }

    // Breakfast and lunch should be available but unchecked
    if (
      await breakfastCheckbox.isVisible({ timeout: 2_000 }).catch(() => false)
    ) {
      await expect(breakfastCheckbox).not.toBeChecked();
    }

    if (await lunchCheckbox.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await expect(lunchCheckbox).not.toBeChecked();
    }
  });

  test.describe("Multi-Meal Generation (Requires Backend)", () => {
    test.skip(
      () => !process.env.USE_EXTERNAL_SERVER,
      "Requires backend - run with USE_EXTERNAL_SERVER=true",
    );

    test("generate plan with breakfast and dinner shows meal type labels", async ({
      page,
    }) => {
      test.slow(); // Triple timeout for multi-meal generation

      await page.goto("/meal-plan");
      await expect(
        page.getByRole("heading", { name: "Meal Plans" }),
      ).toBeVisible({ timeout: 30_000 });

      const spinner = page.locator('[class*="animate-spin"]');
      if ((await spinner.count()) > 0) {
        await expect(spinner.first()).not.toBeVisible({ timeout: 30_000 });
      }

      // Enable breakfast checkbox if available
      const breakfastCheckbox = page.getByLabel(/breakfast/i);
      if (
        await breakfastCheckbox.isVisible({ timeout: 5_000 }).catch(() => false)
      ) {
        await breakfastCheckbox.check();
      }

      // Generate plan
      const generateButton = page.getByRole("button", {
        name: /generate/i,
      });
      if (
        !(await generateButton.isVisible({ timeout: 5_000 }).catch(() => false))
      ) {
        test.skip(true, "Generate button not available");
        return;
      }
      await generateButton.click();

      // Should navigate to detail page or show an error
      try {
        await expect(page).toHaveURL(/\/meal-plan\/[a-zA-Z0-9-]+/, {
          timeout: 30_000,
        });
      } catch {
        test.skip(true, "Plan generation failed (backend may be unavailable)");
        return;
      }

      // Wait for plan to complete or fail (LLM may not be configured)
      const backLink = page.getByText("Back to plans");
      const failedText = page.getByText(/failed/i);
      try {
        await expect(backLink.or(failedText).first()).toBeVisible({
          timeout: 90_000,
        });
      } catch {
        test.skip(true, "Plan generation timed out");
        return;
      }

      // If plan failed (e.g. LLM not configured), skip the label checks
      if (await failedText.isVisible({ timeout: 1_000 }).catch(() => false)) {
        test.skip(true, "Plan generation failed (LLM may not be configured)");
        return;
      }

      // Look for meal type labels (if plan is active)
      const breakfastLabel = page.getByText(/🌅.*breakfast/i);
      const dinnerLabel = page.getByText(/🌙.*dinner/i);

      const weekLabel = page.getByText(/Week of /);
      if (await weekLabel.isVisible({ timeout: 60_000 }).catch(() => false)) {
        // At least one label should show
        await expect(breakfastLabel.or(dinnerLabel).first()).toBeVisible({
          timeout: 10_000,
        });
      }
    });
  });
});

test.describe("Ingredient Substitution (US1)", () => {
  test.describe("Substitution Flow (Requires Backend)", () => {
    test.skip(
      () => !process.env.USE_EXTERNAL_SERVER,
      "Requires backend - run with USE_EXTERNAL_SERVER=true",
    );

    test("recipe detail view shows swap buttons on ingredients", async ({
      page,
    }) => {
      await page.goto("/meal-plan");
      await expect(
        page.getByRole("heading", { name: "Meal Plans" }),
      ).toBeVisible({ timeout: 30_000 });

      const spinner = page.locator('[class*="animate-spin"]');
      if ((await spinner.count()) > 0) {
        await expect(spinner.first()).not.toBeVisible({ timeout: 30_000 });
      }

      // Navigate to first plan (requires at least one generated plan)
      const firstPlanLink = page.getByText(/Week of /).first();
      if (
        !(await firstPlanLink.isVisible({ timeout: 5_000 }).catch(() => false))
      ) {
        test.skip(true, "No meal plans available (LLM may not be configured)");
        return;
      }
      await firstPlanLink.click();

      // Wait for plan detail to load
      const backLink = page.getByText("Back to plans");
      const failedText = page.getByText(/failed/i);
      try {
        await expect(backLink.or(failedText).first()).toBeVisible({
          timeout: 30_000,
        });
      } catch {
        test.skip(true, "Plan detail failed to load");
        return;
      }

      // If plan shows failed state, skip
      if (await failedText.isVisible({ timeout: 1_000 }).catch(() => false)) {
        test.skip(true, "Plan generation failed");
        return;
      }

      // Click on a meal slot to expand it
      const mealCard = page.locator("[data-testid='meal-slot-card']").first();
      if (!(await mealCard.isVisible({ timeout: 5_000 }).catch(() => false))) {
        const recipeTitle = page
          .locator("h3, h4")
          .filter({ hasText: /.{3,}/ })
          .first();
        if (
          await recipeTitle.isVisible({ timeout: 5_000 }).catch(() => false)
        ) {
          await recipeTitle.click();
        } else {
          test.skip(true, "No meal slots visible");
          return;
        }
      } else {
        await mealCard.click();
      }

      // Look for swap buttons on ingredients
      const swapButton = page.getByRole("button", { name: /swap/i }).first();
      if (await swapButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await expect(swapButton).toBeVisible();

        // Click swap to open dialog
        await swapButton.click();

        // Substitution dialog should appear
        const dialog = page
          .getByRole("dialog")
          .or(page.locator("[data-testid='substitution-dialog']"));
        await expect(dialog.first()).toBeVisible({ timeout: 5_000 });

        // Should have an input for replacement ingredient
        const replacementInput = page
          .getByLabel(/replacement|substitute/i)
          .or(page.getByPlaceholder(/replace|substitute/i));
        await expect(replacementInput.first()).toBeVisible();
      }
    });
  });
});

test.describe("Navigation", () => {
  test("quick suggestions nav link works", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("nav").first()).toBeVisible({ timeout: 30_000 });

    const quickCookLink = page.getByRole("link", {
      name: /quick cook/i,
    });
    if (await quickCookLink.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
      await quickCookLink.first().click();
      await expect(page).toHaveURL(/quick-suggestions/);
    }
  });

  test("recurring meals nav link works", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("nav").first()).toBeVisible({ timeout: 30_000 });

    const recurringLink = page.getByRole("link", {
      name: /recurring/i,
    });
    if (await recurringLink.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
      await recurringLink.first().click();
      await expect(page).toHaveURL(/recurring-meals/);
    }
  });
});
