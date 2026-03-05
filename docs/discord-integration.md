# Discord Integration for Copilot CLI

Control your Copilot CLI agent from Discord. Send messages in a Discord channel → Copilot processes them → results posted back to Discord.

---

## Quick Start

**Prerequisites:** Discord bot token stored as `DISCORD_TOKEN` User env var, Discord MCP server installed at `~/.copilot/tools/discordmcp/`. See [First-Time Setup](#first-time-setup) if you haven't done this yet.

### Launch the Bridge

Open any terminal and run:

```powershell
node "$env:USERPROFILE\.copilot\tools\discordmcp\copilot-bridge.cjs" --repo-dir "C:\path\to\your\repo"
```

That's it. You don't launch Copilot CLI separately — the bridge spawns and manages it for you.

### What You'll See

**In your terminal:**

```
[Bridge] Starting Copilot Bridge...
[Bridge] Discord connected → #meal-planner
[Bridge] Copilot session ready
[Bridge] Online — polling Discord and accepting commands
```

**In Discord:**

> 🟢 **Copilot Bridge online** — send messages here to start work.
> _Single persistent session. Responses posted asynchronously._

### Send Work

Type a message in the Discord channel:

> Please fix the login bug in src/auth.ts

Discord will show:

1. `📨 Message received from ashley` — your message was picked up
2. `🤖 Processing (from ashley): "Please fix the login bug..."` — Copilot started working
3. `✅ Task complete: Fixed null check in login handler` — Copilot finished

### Stop the Bridge

Press `Ctrl+C` in the terminal, or:

```powershell
Get-Process -Name node | Where-Object { $_.CommandLine -like '*copilot-bridge*' } | Stop-Process
```

---

## How It Works

```
You (Discord)                    Bridge (terminal)                 Copilot CLI (PTY)
     │                                │                                │
     │  "Fix the login bug"           │                                │
     │ ──────────────────────────────>│                                │
     │                                │  types message into PTY        │
     │  📨 Message received           │ ──────────────────────────────>│
     │ <──────────────────────────────│                                │
     │  🤖 Processing...              │                                │
     │ <──────────────────────────────│                                │
     │                                │                   (works on it)│
     │                                │                                │
     │  ✅ Task complete: Fixed bug   │                                │
     │ <───────────────────────────────────────────────────────────────│
     │                                │              (Copilot posts    │
     │                                │               to Discord       │
     │                                │               via CLAUDE.md)   │
```

The bridge is a single Node.js process that:

1. **Connects to Discord** and polls your channel every 10 seconds for new human messages
2. **Spawns Copilot CLI** in a pseudo-terminal (PTY) using `node-pty` — the same library VS Code uses for its terminal
3. **Injects messages** by typing them into the Copilot PTY, just like you would type in the CLI
4. **Confirms receipt** on Discord so you know your message was picked up
5. **Copilot handles the rest** — it processes the request and posts results back to Discord using notification rules in `CLAUDE.md`

The bridge does **not** parse Copilot's output. It's fire-and-forget: inject the message, confirm it was accepted, done. Copilot posts its own results.

---

## User Guide

### Bridge Options

```powershell
node copilot-bridge.cjs --repo-dir <path> [--channel <id>] [--interval <seconds>]
```

| Flag         | Default               | Description                           |
| ------------ | --------------------- | ------------------------------------- |
| `--repo-dir` | (required)            | Path to your repo — Copilot runs here |
| `--channel`  | `1479061992772997202` | Discord channel ID to monitor         |
| `--interval` | `10`                  | How often to check Discord (seconds)  |

### Sending Follow-Up Messages

You can send messages while Copilot is still working. They queue and process in order:

> Also check the API timeout issue

→ `📨 Message received from ashley`

### Checking Bridge Status

```powershell
Get-Content "$env:USERPROFILE\.copilot\tools\discordmcp\bridge-status.json" | ConvertFrom-Json
```

Returns: `state` (ready/processing/restarting), `busy`, `queueLength`, `timestamp`.

### Running in the Background

To keep the bridge running after you close the terminal:

```powershell
Start-Process -NoNewWindow node -ArgumentList `
  "$env:USERPROFILE\.copilot\tools\discordmcp\copilot-bridge.cjs", `
  "--repo-dir", "C:\path\to\your\repo"
```

### What Happens If Copilot Crashes

The bridge auto-restarts Copilot after 5 seconds and posts a warning to Discord:

> ⚠️ **Copilot session exited** (code 1). Restarting in 5s...

A new session starts fresh (no memory of the previous session).

### Interactive Mode (No Bridge)

If you prefer to type directly in the Copilot CLI terminal (the old way), you can still do that. The bridge is optional. In interactive mode, Copilot sends a "session started" notification to Discord but doesn't receive messages from it.

---

## Limitations

1. **~10 second latency** — The bridge polls Discord every 10s, so there's a short delay before your message is picked up.
2. **One channel** — The bridge watches one Discord channel. Use `--channel` to change it.
3. **Sequential processing** — Messages queue and process one at a time. Long tasks block subsequent messages.
4. **No session resume** — If the bridge restarts, Copilot starts a fresh session. Context from the previous session is lost.
5. **Premium request cost** — Each Discord message uses Copilot premium requests, same as typing in the CLI.
6. **Windows-focused** — Token fallback uses PowerShell. On macOS/Linux, export `DISCORD_TOKEN` in your shell.

---

---

# Technical Reference

> Everything below is implementation detail for Copilot CLI agents to read and configure. If you're a human user, the sections above are all you need.

---

## First-Time Setup

### 1. Create a Discord Bot

1. Go to https://discord.com/developers/applications → **New Application** (e.g., "Squad Bot")
2. **Bot** tab → **Reset Token** → copy the token
3. Under **Privileged Gateway Intents**, enable:
   - ✅ Message Content Intent
   - ✅ Server Members Intent
4. **OAuth2** → **URL Generator**:
   - Scopes: `bot`
   - Bot Permissions: `Send Messages`, `Read Message History`, `View Channels`
5. Open the generated URL → add bot to your Discord server

### 2. Store the Bot Token

```powershell
[Environment]::SetEnvironmentVariable("DISCORD_TOKEN", "your-bot-token-here", "User")

# Verify:
[Environment]::GetEnvironmentVariable("DISCORD_TOKEN", "User")
```

> ⚠️ Do NOT commit the token to source control.

### 3. Find Your Channel ID

Enable Developer Mode in Discord (Settings → Advanced → Developer Mode), then right-click a channel → Copy Channel ID.

Or after installation:

```powershell
node -e "
const{Client,GatewayIntentBits}=require(process.env.USERPROFILE+'/.copilot/tools/discordmcp/node_modules/discord.js');
const c=new Client({intents:[GatewayIntentBits.Guilds]});
c.once('ready',()=>{
  c.guilds.cache.forEach(g=>{
    console.log('Guild: '+g.name);
    g.channels.cache.filter(ch=>ch.type===0).forEach(ch=>console.log('  #'+ch.name+' → '+ch.id));
  });
  c.destroy()
});
c.login(process.env.DISCORD_TOKEN);
"
```

### 4. Install the Discord MCP Server

```powershell
New-Item -ItemType Directory -Path "$env:USERPROFILE\.copilot\tools" -Force
cd "$env:USERPROFILE\.copilot\tools"
git clone https://github.com/v-3/discordmcp.git
cd discordmcp
npm install
npm run build

# Install node-pty (required for the bridge)
npm install node-pty
```

### 5. Configure Copilot CLI MCP

Add to `~/.copilot/mcp-config.json` (user-level, all repos) or `.copilot/mcp-config.json` (repo-level):

```json
{
  "mcpServers": {
    "discord": {
      "type": "local",
      "command": "node",
      "args": [
        "C:\\Users\\YOUR_USERNAME\\.copilot\\tools\\discordmcp\\build\\index.js"
      ],
      "env": {
        "DISCORD_TOKEN": "${DISCORD_TOKEN}"
      },
      "tools": ["*"]
    }
  }
}
```

> ⚠️ Use **absolute paths** — `${USERPROFILE}` does not expand in the `args` array.
> ⚠️ **Restart Copilot CLI** after editing MCP config files.

### 6. Initialize Last-Read Marker

Run once to skip old Discord messages:

```powershell
$token = [Environment]::GetEnvironmentVariable("DISCORD_TOKEN", "User")
node -e "
const{Client,GatewayIntentBits}=require(process.env.USERPROFILE+'/.copilot/tools/discordmcp/node_modules/discord.js');
const fs=require('fs');
const c=new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMessages,GatewayIntentBits.MessageContent]});
c.once('ready',async()=>{
  const ch=await c.channels.fetch('YOUR_CHANNEL_ID');
  const msgs=await ch.messages.fetch({limit:1});
  const latest=msgs.first();
  if(latest){fs.writeFileSync(process.env.USERPROFILE+'/.copilot/tools/discordmcp/.last-read-id',latest.id);
  console.log('Marked last read: '+latest.id)}
  c.destroy()
});
c.login('$token');
"
```

### 7. Configure CLAUDE.md

Add this to your repo's `CLAUDE.md` so Copilot knows to post results to Discord:

```markdown
## Discord Integration

**Bridge mode** (primary): If the environment variable `COPILOT_BRIDGE` is `1`, you are running
inside the Copilot Bridge — a persistent PTY session fed by Discord messages. The bridge handles
all Discord I/O. On task completion, post a summary to Discord:

$token = [Environment]::GetEnvironmentVariable("DISCORD_TOKEN", "User")
node -e "const{Client,GatewayIntentBits}=require(process.env.USERPROFILE+'/.copilot/tools/discordmcp/node_modules/discord.js');const c=new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMessages]});c.once('ready',async()=>{const ch=await c.channels.fetch('YOUR_CHANNEL_ID');await ch.send(process.argv[1]);c.destroy()});c.login('$token')" "✅ **Task complete**: <brief summary>"

**Interactive mode** (fallback): If `COPILOT_BRIDGE` is not set, send a session-started notification
on first message using the same pattern.
```

### 8. Verify

```powershell
# Start the bridge
node "$env:USERPROFILE\.copilot\tools\discordmcp\copilot-bridge.cjs" --repo-dir "C:\path\to\your\repo"

# Send a test message in Discord — you should see:
#   📨 Message received
#   🤖 Processing...
```

---

## Architecture

### Bridge Mode (Primary)

```
┌─────────────────────────────────────────────────────────┐
│                    Discord Server                        │
│  ┌─────────────────────────────────────────────────┐    │
│  │ #project-channel                                │    │
│  │   Human: "Please fix the login bug"             │    │
│  │   Bot: "📨 Message received from ashley"        │    │
│  │   Bot: "🤖 Processing (from ashley)..."         │    │
│  │   Bot: "✅ Task complete: Fixed login bug"      │    │
│  └──────────────┬───────────────────▲──────────────┘    │
└─────────────────┼───────────────────┼───────────────────┘
                  │ polls every 10s   │ sends messages
                  ▼                   │
┌─────────────────────────────────────────────────────────┐
│  copilot-bridge.cjs (single process)                    │
│  ┌─────────────────┐  ┌─────────────────────────────┐   │
│  │ Discord Client   │  │ PTY (node-pty)             │   │
│  │ - Poll channel   │──│ - Spawns copilot --yolo    │   │
│  │ - Auto-ack msgs  │  │ - Injects messages via     │   │
│  │ - Post status    │  │   ptyProcess.write()       │   │
│  └─────────────────┘  │ - Auto-restarts on exit     │   │
│                        └─────────────┬───────────────┘   │
│                        ┌─────────────▼───────────────┐   │
│                        │ Copilot CLI Session          │   │
│                        │ - COPILOT_BRIDGE=1           │   │
│                        │ - Reads CLAUDE.md            │   │
│                        │ - Posts results to Discord   │   │
│                        │ - Single persistent session  │   │
│                        └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Interactive Mode (Fallback)

```
Discord ◄── node one-liner ──── Copilot CLI (human types in terminal)
```

---

## Sending Messages from Copilot (One-Liner)

Any Copilot agent can send a Discord message using this pattern:

```powershell
$token = [Environment]::GetEnvironmentVariable("DISCORD_TOKEN", "User")
$channelId = "YOUR_CHANNEL_ID"
$message = "Your message here"

node -e "const{Client,GatewayIntentBits}=require(process.env.USERPROFILE+'/.copilot/tools/discordmcp/node_modules/discord.js');const c=new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMessages]});c.once('ready',async()=>{const ch=await c.channels.fetch('$channelId');await ch.send(process.argv[1]);c.destroy()});c.login('$token')" $message
```

---

## File Reference

| File                  | Location                       | Purpose                                         |
| --------------------- | ------------------------------ | ----------------------------------------------- |
| `copilot-bridge.cjs`  | `~/.copilot/tools/discordmcp/` | Bridge: Discord polling + PTY management        |
| `discord-watcher.cjs` | `~/.copilot/tools/discordmcp/` | Standalone watcher (legacy, for non-bridge use) |
| `build/index.js`      | `~/.copilot/tools/discordmcp/` | MCP server entry point                          |
| `bridge-status.json`  | `~/.copilot/tools/discordmcp/` | Bridge runtime state                            |
| `.last-read-id`       | `~/.copilot/tools/discordmcp/` | Last processed Discord message ID               |
| `mcp-config.json`     | `~/.copilot/` or `.copilot/`   | Copilot CLI MCP server configuration            |

---

## Troubleshooting

| Problem                                            | Fix                                                                                  |
| -------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Bridge says "DISCORD_TOKEN not found"              | Set token: `[Environment]::SetEnvironmentVariable("DISCORD_TOKEN", "token", "User")` |
| Bridge says "File not found" when spawning Copilot | Install Copilot CLI via WinGet: `winget install GitHub.Copilot`                      |
| Discord MCP tools not appearing in Copilot         | Use absolute paths in `mcp-config.json`, restart Copilot CLI                         |
| Bot doesn't see messages                           | Enable **Message Content Intent** in Discord Developer Portal → Bot                  |
| Bridge picks up old messages on first run          | Initialize `.last-read-id` (see step 6 in setup)                                     |
| `require is not defined` error                     | Rename file to `.cjs` (the discordmcp package uses ESM)                              |

---

## Squad Integration (Optional)

Add these rules to `.squad/routing.md`:

```markdown
### Discord Notifications (Mandatory)

N. **Every agent MUST send Discord notifications** — Read the `squad-human-notification` skill.
Notify on: task completion, errors blocking progress, questions needing input, CI results.
N+1. **Coordinator sends summary notifications** — After agent batches, summarize what completed.
```

---

## Copy-Paste Setup Prompt

Give this to a Copilot CLI session to configure Discord integration from scratch:

```
Set up Discord two-way communication for this repo per docs/discord-integration.md:

1. Install Discord MCP server at ~/.copilot/tools/discordmcp/ (clone v-3/discordmcp, npm install, npm build)
2. Install node-pty: cd ~/.copilot/tools/discordmcp && npm install node-pty
3. Create copilot-bridge.cjs at ~/.copilot/tools/discordmcp/
4. Configure MCP in ~/.copilot/mcp-config.json (use ABSOLUTE paths, not ${USERPROFILE})
5. Add Discord Integration block to CLAUDE.md (update channel ID)
6. Set DISCORD_TOKEN as User env var if not already set
7. Initialize last-read-id marker
8. Start the bridge and verify with a test message from Discord

DISCORD_TOKEN should already be set as a User env var. If not, ask me for it.
```
