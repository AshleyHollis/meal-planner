---
updated_at: 2026-03-05T07:39:00Z
focus_area: Grocery Enhancements feature (005) + UX Quality + Max Throughput
active_issues:
  [
    "Finishing 005-grocery-enhancements",
    "UX completeness audit of all existing features",
    "Max throughput execution mode active",
    "Kimi K2.5 optimization — Tiers 1-3 complete, PoC validation pending",
  ]
---

# ⚠️ COORDINATOR: READ THIS FIRST — NON-NEGOTIABLE

## Session Startup — Discord (do this BEFORE anything else)

1. **Check inbox.json** (may have messages from previous session's watcher)
2. **Start Discord watcher** (detached): `node "$env:USERPROFILE\.copilot\tools\discordmcp\discord-watcher.cjs" --interval 10`
3. **Send "session started" notification** to `#meal-planner` (channel `1479061992772997202`)
4. **Wait 15 seconds** for watcher's first poll, then check inbox again — process any messages found
5. **Start inbox notifier** (NON-detached async, shellId="inbox-notifier"): `node "$env:USERPROFILE\.copilot\tools\discordmcp\inbox-notifier.cjs"`
6. **NEVER call task_complete within 60s of session-started notification** — give user time to respond

**Continuous monitoring**: The inbox-notifier exits when new messages arrive, triggering a system_notification. When notified: read output → process message → clear inbox → restart notifier.

**Throughout session**: Check inbox before EVERY task_complete and after every agent batch.

## Continuous Execution — NEVER stop between work phases

**NEVER call task_complete or stop between work phases.** After collecting agent results:

1. Identify ALL follow-up work (review, tests, next tier, docs, CI monitoring)
2. Launch it IMMEDIATELY — no status report pause, no "want me to continue?"
3. Only stop when there is genuinely NOTHING left to do AND tests pass AND CI is green

**NEVER ask the user what to do next.** If the optimization plan has Tier 2 after Tier 1, launch Tier 2. If code was just committed, push it. If it was pushed, monitor CI. If CI passes, check for more work. The user said "implement" — that means ALL of it, not one piece at a time.

**The pattern to break:** Coordinator completes one batch → presents results → asks user → waits → user says "keep going" → Coordinator does next batch → repeats. This wastes the user's time. Instead: complete batch → launch next batch → report both → keep going.

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
- **AFTER each wave: launch the next wave BEFORE reporting results to user**

## Quality Standard Change (2026-03-04)

Team quality standard upgraded. New agent Ash (UX Reviewer) added. All features now require UX completeness review before being marked done. Kane's charter updated to build "complete" features, not "minimal" ones. See `ux-completeness` skill for standards. Every meal must be clickable with an image everywhere it appears.
