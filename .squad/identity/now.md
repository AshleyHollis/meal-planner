---
updated_at: 2026-03-04T13:00:00Z
focus_area: Grocery Enhancements feature (005) + UX Quality + Max Throughput
active_issues:
  [
    "Finishing 005-grocery-enhancements",
    "UX completeness audit of all existing features",
    "Max throughput execution mode active",
  ]
---

# What We're Focused On

Building grocery list enhancements for the AI meal planner (branch 005-grocery-enhancements). Two user stories: (P18) Map ingredients to specific products with brand, size, price, and preferred shop so grocery lists show exact items to buy at each store. (P24) Filter the grocery list by shop for per-trip shopping with per-trip check-off tracking.

## Max Throughput Mode (2026-03-04) — ACTIVE

**The team operates at maximum parallelism.** Cost is not a concern. Read the `max-throughput` skill before every routing decision. Key behaviors:
- Default to Full mode (multi-agent fan-out) for ALL work
- Always anticipate downstream work and spawn extra agents
- Chain follow-ups immediately — never stop between batches
- Process tasks.md in waves — all parallel tasks launch simultaneously
- Ralph processes all work categories in parallel

## Quality Standard Change (2026-03-04)

Team quality standard upgraded. New agent Ash (UX Reviewer) added. All features now require UX completeness review before being marked done. Kane's charter updated to build "complete" features, not "minimal" ones. See `ux-completeness` skill for standards. Every meal must be clickable with an image everywhere it appears.
