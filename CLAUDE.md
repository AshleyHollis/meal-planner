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

1. Start the Discord watcher daemon (detached background process):
   ```powershell
   node "$env:USERPROFILE\.copilot\tools\discordmcp\discord-watcher.cjs" --interval 10
   ```
2. Send a "session started" notification to Discord `#meal-planner` (channel `1479061992772997202`):
   ```powershell
   $token = [Environment]::GetEnvironmentVariable("DISCORD_TOKEN", "User")
   node -e "const{Client,GatewayIntentBits}=require(process.env.USERPROFILE+'/.copilot/tools/discordmcp/node_modules/discord.js');const c=new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMessages]});c.once('ready',async()=>{const ch=await c.channels.fetch('1479061992772997202');await ch.send(process.argv[1]);c.destroy()});c.login('$token')" "🟢 **Session started** — Copilot CLI is online and monitoring this channel. Send messages here to start work."
   ```
3. Check inbox for any messages sent while offline:
   ```powershell
   if (Test-Path "$env:USERPROFILE\.copilot\tools\discordmcp\inbox.json") {
       Get-Content "$env:USERPROFILE\.copilot\tools\discordmcp\inbox.json" | ConvertFrom-Json | Format-Table
   }
   ```
4. Throughout the session, check inbox after every agent batch and before calling task_complete.

See `docs/discord-integration.md` for full setup reference.

<!-- MANUAL ADDITIONS END -->
