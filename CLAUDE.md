# meal-planner-005-grocery-enhancements Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-03

## Active Technologies

- Python 3.12 (backend/workers), TypeScript 5 (frontend) + FastAPI + SQLAlchemy 2.0 async + Pydantic v2 (API), Next.js 16 + React 19 + Tailwind CSS 4 (web) (005-grocery-enhancements)

## Project Structure

```text
backend/
frontend/
tests/
```

## Commands

cd src; pytest; ruff check .

## Code Style

Python 3.12 (backend/workers), TypeScript 5 (frontend): Follow standard conventions

## Recent Changes

- 005-grocery-enhancements: Added Python 3.12 (backend/workers), TypeScript 5 (frontend) + FastAPI + SQLAlchemy 2.0 async + Pydantic v2 (API), Next.js 16 + React 19 + Tailwind CSS 4 (web)

<!-- MANUAL ADDITIONS START -->

## Session Startup — Discord Notifications

**On EVERY session start, BEFORE doing anything else:**

1. Check inbox for any messages sent while offline (from previous watcher session):
   ```powershell
   if (Test-Path "$env:USERPROFILE\.copilot\tools\discordmcp\inbox.json") {
       Get-Content "$env:USERPROFILE\.copilot\tools\discordmcp\inbox.json" | ConvertFrom-Json | Format-Table
   }
   ```
2. Start the Discord watcher daemon (detached background process):
   ```powershell
   node "$env:USERPROFILE\.copilot\tools\discordmcp\discord-watcher.cjs" --interval 10
   ```
3. Send a "session started" notification to Discord `#meal-planner` (channel `1479061992772997202`):
   ```powershell
   $token = [Environment]::GetEnvironmentVariable("DISCORD_TOKEN", "User")
   node -e "const{Client,GatewayIntentBits}=require(process.env.USERPROFILE+'/.copilot/tools/discordmcp/node_modules/discord.js');const c=new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMessages]});c.once('ready',async()=>{const ch=await c.channels.fetch('1479061992772997202');await ch.send(process.argv[1]);c.destroy()});c.login('$token')" "🟢 **Session started** — Copilot CLI is online and monitoring this channel. Send messages here to start work."
   ```
4. Wait 15 seconds for the watcher to connect and do its first poll, then check inbox again:
   ```powershell
   Start-Sleep -Seconds 15
   if (Test-Path "$env:USERPROFILE\.copilot\tools\discordmcp\inbox.json") {
       Get-Content "$env:USERPROFILE\.copilot\tools\discordmcp\inbox.json" | ConvertFrom-Json | Format-Table
   }
   ```
5. If inbox has messages, process them BEFORE doing anything else.
6. Start the inbox notifier (NON-detached async — triggers system_notification on new messages):
   ```powershell
   # Start as mode="async" (NOT detached) with shellId="inbox-notifier"
   node "$env:USERPROFILE\.copilot\tools\discordmcp\inbox-notifier.cjs"
   ```

**Continuous Discord Monitoring (via inbox-notifier):**

The inbox-notifier watches inbox.json and **exits** when new messages appear. This exit triggers a `system_notification` that wakes the agent even when idle. When you receive a system_notification about the inbox-notifier exiting:

1. Read the notifier output (it contains the message content)
2. Process the Discord message (route work, reply on Discord, etc.)
3. Clear the inbox: `Remove-Item "$env:USERPROFILE\.copilot\tools\discordmcp\inbox.json"`
4. **Restart the notifier** (same command as step 6 above) to watch for the next message

**Additional rules (MANDATORY):**

- **Before EVERY `task_complete` call**: Check inbox.json first. If there are unread messages, process them instead of completing.
- **After every agent batch**: Check inbox.json for new messages.
- **NEVER call `task_complete` within 60 seconds of sending the session-started notification** — give the user time to respond.

See `docs/discord-integration.md` for full setup reference.

<!-- MANUAL ADDITIONS END -->
