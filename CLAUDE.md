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

## Discord Integration

**Bridge mode** (primary): If the environment variable `COPILOT_BRIDGE` is `1`, you are running inside the Copilot Bridge — a persistent PTY session fed by Discord messages. The bridge handles all Discord I/O. On task completion, post a summary to Discord:

```powershell
$token = [Environment]::GetEnvironmentVariable("DISCORD_TOKEN", "User")
node -e "const{Client,GatewayIntentBits}=require(process.env.USERPROFILE+'/.copilot/tools/discordmcp/node_modules/discord.js');const c=new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMessages]});c.once('ready',async()=>{const ch=await c.channels.fetch('1479061992772997202');await ch.send(process.argv[1]);c.destroy()});c.login('$token')" "✅ **Task complete**: <brief summary>"
```

**Interactive mode** (fallback): If `COPILOT_BRIDGE` is not set, send a session-started notification on first message:

```powershell
$token = [Environment]::GetEnvironmentVariable("DISCORD_TOKEN", "User")
node -e "const{Client,GatewayIntentBits}=require(process.env.USERPROFILE+'/.copilot/tools/discordmcp/node_modules/discord.js');const c=new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMessages]});c.once('ready',async()=>{const ch=await c.channels.fetch('1479061992772997202');await ch.send(process.argv[1]);c.destroy()});c.login('$token')" "🟢 **Session started** — Copilot CLI is online."
```

See `docs/discord-integration.md` for full setup reference.

<!-- MANUAL ADDITIONS END -->
