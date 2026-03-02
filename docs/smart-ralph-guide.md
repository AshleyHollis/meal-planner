# Smart Ralph Automation Guide

All 23 remaining features (P5-P27) grouped into 7 specs across 4 tiers.
Two specs per tier run in parallel using git worktrees.

---

## How It Works

- Each tier has two specs that touch different parts of the codebase
- You create two git worktrees as **sibling folders** next to `meal-planner/`
- Open two terminals, `cd` into each worktree folder, run `claude` in each
- Both specs execute simultaneously
- When both finish, merge both PRs, delete worktrees, start next tier

All commands below are run from your main repo:

```
C:\Users\ashle\Source\GitHub\AshleyHollis\meal-planner
```

Worktrees are created at:

```
C:\Users\ashle\Source\GitHub\AshleyHollis\meal-planner-<branch-name>
```

This keeps them outside the repo so they don't show as untracked files.

---

## Utility Commands (use anytime)

Check progress if context runs out or you reconnect:

```
/ralph-specum:status
```

Resume execution:

```
/ralph-specum:implement --recovery-mode
```

Cancel:

```
/ralph-specum:cancel
```

---

## Tier 1: Inventory + Personalization

### Setup (run once in your main repo terminal)

```
git checkout master && git pull
```

```
git worktree add ../meal-planner-002-inventory-enhancements -b 002-inventory-enhancements
```

```
git worktree add ../meal-planner-003-personalization-ai -b 003-personalization-ai
```

### Terminal 1: Inventory Enhancements (P5, P11, P14, P15)

```
cd C:\Users\ashle\Source\GitHub\AshleyHollis\meal-planner-002-inventory-enhancements
```

```
claude
```

Then paste:

```
/ralph-specum:new 002-inventory-enhancements "Enhance the inventory system with four features: (P5) Record leftover portions after cooking so AI incorporates them into future plans before they expire. (P11) Add freezer as a third storage location with defrost time tracking and reminders to move items to fridge before cooking. (P14) Auto-deduct inventory quantities when a meal is marked as cooked, subtracting recipe ingredient amounts from current stock. (P15) Let users mark ingredients as staples with minimum threshold quantities and auto-add to grocery list when stock drops below threshold." --quick --recovery-mode
```

When complete:

```
git push -u origin 002-inventory-enhancements
```

```
gh pr create --fill
```

### Terminal 2: Personalization and AI (P6, P7, P17, P22)

```
cd C:\Users\ashle\Source\GitHub\AshleyHollis\meal-planner-003-personalization-ai
```

```
claude
```

Then paste:

```
/ralph-specum:new 003-personalization-ai "Add personalization features that improve AI meal plan quality: (P6) Per-member food preferences, likes, dislikes, and dietary restrictions so the AI avoids disliked ingredients. (P7) Track meal history and favorites so the AI avoids repeating recent meals and can re-suggest favorites. (P17) Recipe ratings and text feedback after cooking that feed back into AI prompts for future plans. (P22) Let users request specific cuisine types when generating a plan, e.g. 'I want Mexican this week'." --quick --recovery-mode
```

When complete:

```
git push -u origin 003-personalization-ai
```

```
gh pr create --fill
```

### Tier 1 Cleanup (after both PRs merged)

```
cd C:\Users\ashle\Source\GitHub\AshleyHollis\meal-planner
```

```
git checkout master && git pull
```

```
git worktree remove ../meal-planner-002-inventory-enhancements
```

```
git worktree remove ../meal-planner-003-personalization-ai
```

---

## Tier 2: Planning + Grocery (after Tier 1 PRs merged)

### Setup

```
git checkout master && git pull
```

```
git worktree add ../meal-planner-004-planning-enhancements -b 004-planning-enhancements
```

```
git worktree add ../meal-planner-005-grocery-enhancements -b 005-grocery-enhancements
```

### Terminal 1: Planning Enhancements (P8, P13, P20, P25)

```
cd C:\Users\ashle\Source\GitHub\AshleyHollis\meal-planner-004-planning-enhancements
```

```
claude
```

Then paste:

```
/ralph-specum:new 004-planning-enhancements "Enhance meal planning capabilities: (P8) AI-powered ingredient substitution that lets users swap an ingredient and auto-updates cooking steps, quantities, and grocery list. (P13) 'What can I make right now?' feature that suggests recipes from current inventory without a full weekly plan. (P20) Enable breakfast and lunch planning in addition to dinner using the existing MealSlot schema. (P25) Recurring meal slots like 'Taco Tuesday every week' that auto-populate into new weekly plans." --quick --recovery-mode
```

When complete:

```
git push -u origin 004-planning-enhancements
```

```
gh pr create --fill
```

### Terminal 2: Grocery Enhancements (P18, P24)

```
cd C:\Users\ashle\Source\GitHub\AshleyHollis\meal-planner-005-grocery-enhancements
```

```
claude
```

Then paste:

```
/ralph-specum:new 005-grocery-enhancements "Enhance the grocery list system: (P18) Map ingredients to specific products with brand, size, price, and preferred shop so grocery lists show exact items to buy at each store. (P24) Filter the grocery list by shop for per-trip shopping with per-trip check-off tracking." --quick --recovery-mode
```

When complete:

```
git push -u origin 005-grocery-enhancements
```

```
gh pr create --fill
```

### Tier 2 Cleanup (after both PRs merged)

```
cd C:\Users\ashle\Source\GitHub\AshleyHollis\meal-planner
```

```
git checkout master && git pull
```

```
git worktree remove ../meal-planner-004-planning-enhancements
```

```
git worktree remove ../meal-planner-005-grocery-enhancements
```

---

## Tier 3: Cooking Experience + Notifications (after Tier 2 PRs merged)

### Setup

```
git checkout master && git pull
```

```
git worktree add ../meal-planner-006-cooking-experience -b 006-cooking-experience
```

```
git worktree add ../meal-planner-007-notifications-tracking -b 007-notifications-tracking
```

### Terminal 1: Cooking Experience (P9, P10, P26)

```
cd C:\Users\ashle\Source\GitHub\AshleyHollis\meal-planner-006-cooking-experience
```

```
claude
```

Then paste:

```
/ralph-specum:new 006-cooking-experience "Build the cook-time experience: (P9) In-app countdown timers for each recipe step with push notifications on completion and auto-detection of durations from recipe text. (P10) Hands-free voice control during cooking using Web Speech API for commands like 'next step', 'repeat', 'start timer'. (P26) Dedicated step-by-step cooking mode UI with large text, screen wake lock, swipe navigation between steps, and active timer display." --quick --recovery-mode
```

When complete:

```
git push -u origin 006-cooking-experience
```

```
gh pr create --fill
```

### Terminal 2: Notifications and Tracking (P16, P27)

```
cd C:\Users\ashle\Source\GitHub\AshleyHollis\meal-planner-007-notifications-tracking
```

```
claude
```

Then paste:

```
/ralph-specum:new 007-notifications-tracking "Add notifications and plan tracking: (P16) Push notifications for advance prep tasks like marinating, defrosting, and soaking, timed based on the meal plan schedule. (P27) Track when users deviate from the meal plan by eating something different and feed deviations back into AI planning and grocery list adjustments." --quick --recovery-mode
```

When complete:

```
git push -u origin 007-notifications-tracking
```

```
gh pr create --fill
```

### Tier 3 Cleanup (after both PRs merged)

```
cd C:\Users\ashle\Source\GitHub\AshleyHollis\meal-planner
```

```
git checkout master && git pull
```

```
git worktree remove ../meal-planner-006-cooking-experience
```

```
git worktree remove ../meal-planner-007-notifications-tracking
```

---

## Tier 4: Platform (after all above merged)

### Setup

```
git checkout master && git pull
```

```
git worktree add ../meal-planner-008-platform -b 008-platform
```

### Terminal 1: Platform (P12, P19)

```
cd C:\Users\ashle\Source\GitHub\AshleyHollis\meal-planner-008-platform
```

```
claude
```

Then paste:

```
/ralph-specum:new 008-platform "Cross-cutting platform features: (P12) Multi-user household support with shared inventory, meal plans, and real-time grocery list sync so both adults can update simultaneously. (P19) Progressive Web App with service worker caching so recipes, meal plans, and grocery lists are accessible offline during shopping and cooking." --quick --recovery-mode
```

When complete:

```
git push -u origin 008-platform
```

```
gh pr create --fill
```

### Tier 4 Cleanup (after PR merged)

```
cd C:\Users\ashle\Source\GitHub\AshleyHollis\meal-planner
```

```
git checkout master && git pull
```

```
git worktree remove ../meal-planner-008-platform
```

---

## Summary

| Tier | Spec | Branch                     | Features          | Parallel With |
| ---- | ---- | -------------------------- | ----------------- | ------------- |
| 1    | 002  | 002-inventory-enhancements | P5, P11, P14, P15 | 003           |
| 1    | 003  | 003-personalization-ai     | P6, P7, P17, P22  | 002           |
| 2    | 004  | 004-planning-enhancements  | P8, P13, P20, P25 | 005           |
| 2    | 005  | 005-grocery-enhancements   | P18, P24          | 004           |
| 3    | 006  | 006-cooking-experience     | P9, P10, P26      | 007           |
| 3    | 007  | 007-notifications-tracking | P16, P27          | 006           |
| 4    | 008  | 008-platform               | P12, P19          | -             |

Total: 7 specs, 4 tiers, 23 features.
With parallel execution, you run 7 specs in the wall-clock time of 4.
