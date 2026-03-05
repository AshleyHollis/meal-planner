# Squad Human Notification Skill

Agents use Microsoft Teams to notify the user when they need attention. Messages go to the project's Teams channel via the `teams` MCP server.

## When to Notify

| Situation | Priority | Action |
|-----------|----------|--------|
| Blocked — need decision or input | High | `create_thread` with clear question |
| Error — can't recover autonomously | High | `create_thread` with error details |
| Work complete — milestone or feature done | Normal | `create_thread` with summary |
| FYI — progress update on long task | Low | `reply_to_thread` on existing thread |

Do NOT notify for routine operations (commits, test runs, file edits). Only notify when the user's attention is genuinely needed or when significant work completes.

## How to Send Notifications

### Start a new thread (most notifications)

Use the `create_thread` MCP tool:
- **Subject**: `{AgentName}: {Brief subject}` (e.g., "Ripley: Blocked on API design")
- **Body**: Keep it concise. Include:
  - What happened or what's needed
  - Options if asking for a decision (numbered list)
  - What you'll do next (or what's blocked)

### Reply to an existing thread

Use `reply_to_thread` when adding context to an ongoing conversation (e.g., progress updates, follow-up info).

### Check for user replies

Use `read_thread_replies` to poll for responses after posting a question. Check periodically if waiting on a decision. When a reply is found, acknowledge it and act on the decision.

## Message Format

Keep messages scannable. Use this structure:

```
**Status**: Blocked / Complete / Error / FYI
**Context**: [1-2 sentences of what's happening]

[Details, options, or summary as needed]

**Next**: [What happens next, or what you need from the user]
```

## Thread Naming Convention

Always prefix with the agent name so the user can scan threads quickly:
- `Ripley: DB migration needs review`
- `Kane: Frontend build failing — missing env var`
- `Parker: Preview deployment complete`
- `Lambert: E2E tests passing — 14/14 green`
- `Dallas: Architecture decision needed — caching strategy`

## Rules

1. **One thread per topic.** Don't mix unrelated issues in a single thread.
2. **Don't spam.** Batch related updates into a single message rather than sending many small ones.
3. **Include actionable info.** Don't just say "something failed" — include the error, what you tried, and what you need.
4. **Respect the channel.** This channel is shared across all feature branches for the project. Include the branch/feature name when relevant.
5. **Two-way comms.** After posting a question, check for replies before proceeding with a default action. Give the user reasonable time to respond.
