# Discord Integration for Copilot CLI + Squad

> **Portable reference** — copy this file into any repo's `.squad/` or `.copilot/` directory to enable Discord two-way communication with Copilot CLI sessions.

## Overview

This integration enables two-way communication between Discord and Copilot CLI sessions:

- **Outbound**: Copilot agents post status updates, results, and questions to Discord
- **Inbound**: The bridge polls Discord for human messages and injects them into Copilot
- **Persistent**: A single long-running Copilot session per repo, fed by Discord messages

### Two Modes

| Mode                       | How it works                                                            | When to use                |
| -------------------------- | ----------------------------------------------------------------------- | -------------------------- |
| **Bridge** (primary)       | Single process spawns Copilot in a PTY, polls Discord, injects messages | Always-on autonomous agent |
| **Interactive** (fallback) | Human types in terminal, agent sends notifications to Discord           | Manual CLI sessions        |

## Prerequisites

### 1. Discord Bot

Create a Discord bot at https://discord.com/developers/applications:

1. Click **New Application** → name it (e.g., "Squad Bot")
2. Go to **Bot** tab → click **Reset Token** → **copy the token** (you'll need it below)
3. Under **Privileged Gateway Intents**, enable:
   - ✅ Message Content Intent
   - ✅ Server Members Intent
   - ✅ Presence Intent (optional)
4. Go to **OAuth2** → **URL Generator**:
   - Scopes: `bot`
   - Bot Permissions: `Send Messages`, `Read Message History`, `View Channels`
5. Copy the generated URL → open in browser → add bot to your Discord server

### 2. Store the Bot Token

Set `DISCORD_TOKEN` as a **persistent User environment variable** (not a system/machine variable — user-level survives reboots and is accessible to detached processes):

**PowerShell:**

```powershell
[Environment]::SetEnvironmentVariable("DISCORD_TOKEN", "your-bot-token-here", "User")
```

**Verify:**

```powershell
[Environment]::GetEnvironmentVariable("DISCORD_TOKEN", "User")
# Should print your token
```

> ⚠️ **Do NOT commit the token to source control.** It's stored in the Windows registry under HKCU, not in any file.

### 3. Find Your Channel IDs

After the bot joins your server, find channel IDs by:

- Enabling Developer Mode in Discord (Settings → Advanced → Developer Mode)
- Right-clicking a channel → Copy Channel ID

Or run this after setup:

```powershell
node -e "
const{Client,GatewayIntentBits}=require(process.env.USERPROFILE+'/.copilot/tools/discordmcp/node_modules/discord.js');
const c=new Client({intents:[GatewayIntentBits.Guilds]});
c.once('ready',()=>{
  c.guilds.cache.forEach(g=>{
    console.log('Guild: '+g.name+' ('+g.id+')');
    g.channels.cache.filter(ch=>ch.type===0).forEach(ch=>console.log('  #'+ch.name+' ('+ch.id+')'));
  });
  c.destroy()
});
c.login(process.env.DISCORD_TOKEN);
"
```

---

## Installation

### Step 1: Install the Discord MCP Server

```powershell
# Create tools directory
New-Item -ItemType Directory -Path "$env:USERPROFILE\.copilot\tools" -Force

# Clone and build the Discord MCP server
cd "$env:USERPROFILE\.copilot\tools"
git clone https://github.com/v-3/discordmcp.git
cd discordmcp
npm install
npm run build

# Verify
Test-Path "$env:USERPROFILE\.copilot\tools\discordmcp\build\index.js"
# Should return True
```

### Step 2: Configure Copilot CLI MCP

Add the Discord MCP server to your Copilot CLI config. Choose one or both locations:

**User-level** (`~/.copilot/mcp-config.json`) — applies to all repos:

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

**Repo-level** (`.copilot/mcp-config.json`) — applies to this repo only:

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

> ⚠️ **Use absolute paths** — `${USERPROFILE}` variable expansion does not work in the `args` array. Replace `YOUR_USERNAME` with your actual Windows username.

> ⚠️ **Restart Copilot CLI** after editing MCP config files. MCP servers are loaded at session start.

### Step 3: Install the Discord Watcher (Two-Way Communication)

The watcher is a Node.js script that runs as a background daemon, polling Discord for human messages and writing them to an inbox file.

**Create the file** at `~/.copilot/tools/discordmcp/discord-watcher.cjs`:

```javascript
#!/usr/bin/env node
/**
 * Discord watcher for Squad — polls a channel for new human messages
 * and writes them to a file that the Copilot CLI session can monitor.
 *
 * Usage: node discord-watcher.cjs [--interval 10] [--channel CHANNEL_ID]
 * Env: DISCORD_TOKEN (reads from User env vars if not in process.env)
 */
const { Client, GatewayIntentBits } = require("discord.js");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function getToken() {
  if (process.env.DISCORD_TOKEN) return process.env.DISCORD_TOKEN;
  try {
    const result = execSync(
      "powershell -NoProfile -Command \"[Environment]::GetEnvironmentVariable('DISCORD_TOKEN', 'User')\"",
      { encoding: "utf8" },
    ).trim();
    if (result) return result;
  } catch {}
  throw new Error("DISCORD_TOKEN not found");
}

const DISCORD_TOKEN = getToken();
const args = process.argv.slice(2);
const intervalIdx = args.indexOf("--interval");
const channelIdx = args.indexOf("--channel");
const POLL_INTERVAL =
  intervalIdx !== -1 ? parseInt(args[intervalIdx + 1]) * 1000 : 10000;
const CHANNEL_ID =
  channelIdx !== -1 ? args[channelIdx + 1] : "YOUR_DEFAULT_CHANNEL_ID";
const INBOX_FILE = path.join(__dirname, "inbox.json");
const LAST_READ_FILE = path.join(__dirname, ".last-read-id");

let lastReadId = null;
try {
  lastReadId = fs.readFileSync(LAST_READ_FILE, "utf8").trim();
} catch {}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("ready", () => {
  console.log(`[Discord Watcher] Online as ${client.user.tag}`);
  console.log(
    `[Discord Watcher] Monitoring channel ${CHANNEL_ID} every ${POLL_INTERVAL / 1000}s`,
  );
  poll();
  setInterval(poll, POLL_INTERVAL);
});

async function poll() {
  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    const opts = { limit: 10 };
    if (lastReadId) opts.after = lastReadId;
    const messages = await channel.messages.fetch(opts);
    const humanMsgs = messages
      .filter((m) => !m.author.bot)
      .sort((a, b) => a.createdTimestamp - b.createdTimestamp);
    if (humanMsgs.size > 0) {
      const inbox = humanMsgs.map((m) => ({
        id: m.id,
        author: m.author.username,
        content: m.content,
        timestamp: m.createdAt.toISOString(),
      }));
      let existing = [];
      try {
        existing = JSON.parse(fs.readFileSync(INBOX_FILE, "utf8"));
      } catch {}
      const allIds = new Set(existing.map((e) => e.id));
      const newMsgs = inbox.filter((m) => !allIds.has(m.id));
      if (newMsgs.length > 0) {
        existing.push(...newMsgs);
        fs.writeFileSync(INBOX_FILE, JSON.stringify(existing, null, 2));
        console.log(
          `[Discord Watcher] ${newMsgs.length} new message(s) from: ${newMsgs.map((m) => m.author).join(", ")}`,
        );
      }
      const lastMsg = humanMsgs.last();
      lastReadId = lastMsg.id;
      fs.writeFileSync(LAST_READ_FILE, lastReadId);
    }
  } catch (err) {
    console.error(`[Discord Watcher] Error: ${err.message}`);
  }
}

client.login(DISCORD_TOKEN);
```

> ⚠️ **File must be `.cjs`** (CommonJS), not `.js`. The discordmcp package uses `"type": "module"` in its `package.json`, so `.js` files are treated as ESM and `require()` won't work.

> ⚠️ **Replace `YOUR_DEFAULT_CHANNEL_ID`** with your project's default Discord channel ID.

### Step 3b: Install the Inbox Notifier (Continuous Monitoring)

The inbox notifier watches `inbox.json` for new messages and **exits** when found. When run as a non-detached async process in Copilot CLI, the exit triggers a `system_notification` that wakes the agent — even when idle. This solves the "agent can't poll continuously" limitation.

**Create the file** at `~/.copilot/tools/discordmcp/inbox-notifier.cjs`:

```javascript
#!/usr/bin/env node
/**
 * Inbox notifier — watches inbox.json for new messages and exits when found.
 * Designed to run as a NON-DETACHED async process in Copilot CLI.
 * When this process exits, the runtime sends a system_notification,
 * waking the agent to process the Discord message.
 *
 * Usage: node inbox-notifier.cjs
 * The agent should restart this after processing each batch of messages.
 */
const fs = require("fs");
const path = require("path");

const INBOX_FILE = path.join(__dirname, "inbox.json");
const POLL_INTERVAL = 2000; // check every 2 seconds

// Baseline: count of messages already in inbox (already seen by agent)
let baselineCount = 0;
try {
  const data = JSON.parse(fs.readFileSync(INBOX_FILE, "utf8"));
  baselineCount = data.length;
} catch {}

console.log(
  `[Inbox Notifier] Watching for new messages (baseline: ${baselineCount})`,
);

const timer = setInterval(() => {
  try {
    if (!fs.existsSync(INBOX_FILE)) return;
    const data = JSON.parse(fs.readFileSync(INBOX_FILE, "utf8"));
    if (data.length > baselineCount) {
      const newMsgs = data.slice(baselineCount);
      console.log(`\n📨 NEW DISCORD MESSAGE(S):`);
      for (const msg of newMsgs) {
        console.log(`  From: ${msg.author} | Time: ${msg.timestamp}`);
        console.log(`  Message: ${msg.content}\n`);
      }
      clearInterval(timer);
      process.exit(0);
    }
  } catch {
    // inbox.json being written or doesn't exist yet — retry next cycle
  }
}, POLL_INTERVAL);
```

> ⚠️ **File must be `.cjs`** (CommonJS), same as the watcher.

**Architecture: How continuous monitoring works:**

```
Discord → Watcher (detached, polls Discord, writes inbox.json)
               ↓
         inbox.json ← Notifier (non-detached, polls file every 2s)
               ↓
         Notifier exits when new messages appear
               ↓
         system_notification → Agent wakes up
               ↓
         Agent processes message → clears inbox → restarts notifier
```

### Step 4: Verify Everything Works

```powershell
# 1. Test the MCP server starts
$env:DISCORD_TOKEN = [Environment]::GetEnvironmentVariable("DISCORD_TOKEN", "User")
node -e "
  try { require('$($env:USERPROFILE -replace '\\','/')/.copilot/tools/discordmcp/build/index.js');
  setTimeout(()=>process.exit(0), 2000) } catch(e) { console.error(e.message); process.exit(1) }
"
# Should print: "Discord MCP Server running on stdio" and "Discord bot is ready!"

# 2. Test sending a message
node -e "
const{Client,GatewayIntentBits}=require('$($env:USERPROFILE -replace '\\','/')/.copilot/tools/discordmcp/node_modules/discord.js');
const c=new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMessages]});
c.once('ready',async()=>{
  const ch=await c.channels.fetch('YOUR_CHANNEL_ID');
  await ch.send('🤖 Test message from Copilot CLI');
  console.log('Message sent!');
  c.destroy()
});
c.login(process.env.DISCORD_TOKEN);
"

# 3. Test reading messages
node -e "
const{Client,GatewayIntentBits}=require('$($env:USERPROFILE -replace '\\','/')/.copilot/tools/discordmcp/node_modules/discord.js');
const c=new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMessages,GatewayIntentBits.MessageContent]});
c.once('ready',async()=>{
  const ch=await c.channels.fetch('YOUR_CHANNEL_ID');
  const msgs=await ch.messages.fetch({limit:3});
  msgs.forEach(m=>console.log('['+m.createdAt.toISOString()+'] '+m.author.username+': '+m.content.substring(0,100)));
  c.destroy()
});
c.login(process.env.DISCORD_TOKEN);
"
```

---

## Usage in Copilot CLI Sessions

### Sending Messages (Outbound)

Any Copilot agent can send a message using this one-liner:

```powershell
$token = [Environment]::GetEnvironmentVariable("DISCORD_TOKEN", "User")
$channelId = "YOUR_CHANNEL_ID"
$message = "Your message here"

node -e "const{Client,GatewayIntentBits}=require('$($env:USERPROFILE -replace '\\','/')/.copilot/tools/discordmcp/node_modules/discord.js');const c=new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMessages]});c.once('ready',async()=>{const ch=await c.channels.fetch('$channelId');await ch.send(process.argv[1]);c.destroy()});c.login('$token')" $message
```

### Reading Messages (Inbound)

**One-shot read** (get recent messages):

```powershell
$token = [Environment]::GetEnvironmentVariable("DISCORD_TOKEN", "User")

node -e "
const{Client,GatewayIntentBits}=require('$($env:USERPROFILE -replace '\\','/')/.copilot/tools/discordmcp/node_modules/discord.js');
const c=new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMessages,GatewayIntentBits.MessageContent]});
c.once('ready',async()=>{
  const ch=await c.channels.fetch('YOUR_CHANNEL_ID');
  const msgs=await ch.messages.fetch({limit:10});
  msgs.filter(m=>!m.author.bot).forEach(m=>console.log('['+m.createdAt.toISOString()+'] '+m.author.username+': '+m.content));
  c.destroy()
});
c.login('$token');
"
```

**Continuous monitoring** (watcher daemon):

```powershell
# Start as detached background process (survives session end)
node "$env:USERPROFILE\.copilot\tools\discordmcp\discord-watcher.cjs" --interval 10 --channel YOUR_CHANNEL_ID
# Run with: mode="async", detach=true

# Check for new messages
if (Test-Path "$env:USERPROFILE\.copilot\tools\discordmcp\inbox.json") {
    Get-Content "$env:USERPROFILE\.copilot\tools\discordmcp\inbox.json" | ConvertFrom-Json | Format-Table
    # Process messages, then clear inbox:
    Remove-Item "$env:USERPROFILE\.copilot\tools\discordmcp\inbox.json"
}
```

---

## Squad Integration

### Add to Squad Routing Rules

Add these rules to `.squad/routing.md` under `## Rules`:

```markdown
### Discord Notifications (Mandatory)

N. **Every agent MUST send Discord notifications** — Read the `squad-human-notification` skill before starting work. Agents must notify on: phase/task completion, errors blocking progress, questions needing input, and CI/pipeline results.
N+1. **Coordinator sends summary notifications** — After collecting results from agent batches, the coordinator sends a Discord summary with what completed and what's next.
N+2. **Start Discord watcher on every session** — The coordinator MUST start the Discord watcher daemon as a detached background process at the beginning of every session. Check inbox.json after every agent batch and before calling task_complete.
N+3. **Process Discord inbox like user input** — When the inbox contains messages, treat them as if the user typed them in the CLI. Acknowledge on Discord, then route the work.
```

### Add the Notification Skill

Create `.squad/skills/squad-human-notification/SKILL.md` — see the full skill file in this repo for the template. Key sections:

- **When to Notify**: Always on phase completion, errors, questions, CI results
- **How to Send**: Node.js one-liner (always works) or Discord MCP tools (when available)
- **Message Format**: `**{AgentName}: {Subject}**` + Status/Context/Next
- **Watcher Architecture**: How the two-way inbox system works

### Session Startup Protocol

Add this block to your `CLAUDE.md` (the Copilot CLI custom instruction file). This ensures it runs at the very start of every session, before any user request is processed:

````markdown
## Session Startup

### Bridge Mode (Primary — Recommended)

Start the bridge as a detached background process. It spawns a single Copilot CLI session in a PTY, polls Discord for messages, and injects them as user input:

```powershell
node "$env:USERPROFILE\.copilot\tools\discordmcp\copilot-bridge.cjs" --repo-dir "C:\path\to\your\repo"
```

**Options:**

| Flag         | Default               | Description                            |
| ------------ | --------------------- | -------------------------------------- |
| `--repo-dir` | (required)            | Repo directory for the Copilot session |
| `--channel`  | `1479061992772997202` | Discord channel ID to monitor          |
| `--interval` | `10`                  | Poll interval in seconds               |

**What the bridge does:**

1. Connects to Discord and spawns `copilot --yolo` in a PTY
2. Announces "🟢 Copilot Bridge online" on Discord
3. Polls channel every 10s for new human messages
4. Auto-acks each message: "📨 Message received"
5. Types the message into the Copilot PTY
6. Confirms input accepted: "🤖 Processing"
7. Copilot processes the request asynchronously
8. Copilot posts results back to Discord itself (via CLAUDE.md rules)
9. If Copilot exits, bridge auto-restarts it in 5s

**CLAUDE.md configuration for bridge mode:**

Add this to your repo's `CLAUDE.md` so the inner Copilot session knows to post results to Discord:

````markdown
## Discord Integration

**Bridge mode** (primary): If the environment variable `COPILOT_BRIDGE` is `1`, you are running
inside the Copilot Bridge. The bridge handles all Discord I/O. On task completion, post a summary:
\```powershell
$token = [Environment]::GetEnvironmentVariable("DISCORD_TOKEN", "User")
node -e "const{Client,GatewayIntentBits}=require(process.env.USERPROFILE+'/.copilot/tools/discordmcp/node_modules/discord.js');const c=new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMessages]});c.once('ready',async()=>{const ch=await c.channels.fetch('YOUR_CHANNEL_ID');await ch.send(process.argv[1]);c.destroy()});c.login('$token')" "✅ **Task complete**: <brief summary>"
\```
````

### Interactive Mode (Fallback)

For manual CLI sessions where a human types in the terminal, add a session-started notification to CLAUDE.md:

```powershell
$token = [Environment]::GetEnvironmentVariable("DISCORD_TOKEN", "User")
node -e "const{Client,GatewayIntentBits}=require(process.env.USERPROFILE+'/.copilot/tools/discordmcp/node_modules/discord.js');const c=new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMessages]});c.once('ready',async()=>{const ch=await c.channels.fetch('YOUR_CHANNEL_ID');await ch.send(process.argv[1]);c.destroy()});c.login('$token')" "🟢 **Session started** — Copilot CLI is online."
```

### First-Time Setup: Initialize Last-Read Marker

Run this once to skip old messages (or the watcher will replay all channel history):

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
│                                      │                   │
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

## File Reference

| File                             | Location            | Purpose                                                        |
| -------------------------------- | ------------------- | -------------------------------------------------------------- |
| `discordmcp/`                    | `~/.copilot/tools/` | Discord MCP server + bridge tools                              |
| `discordmcp/copilot-bridge.cjs`  | `~/.copilot/tools/` | **Primary**: Bridge process (Discord polling + PTY management) |
| `discordmcp/discord-watcher.cjs` | `~/.copilot/tools/` | Standalone watcher (legacy, for non-bridge use)                |
| `discordmcp/build/index.js`      | `~/.copilot/tools/` | MCP server entry point (stdio protocol)                        |
| `discordmcp/bridge-status.json`  | `~/.copilot/tools/` | Bridge state file (created at runtime)                         |
| `discordmcp/.last-read-id`       | `~/.copilot/tools/` | Last processed Discord message ID                              |
| `mcp-config.json`                | `~/.copilot/`       | User-level MCP config (all repos)                              |
| `mcp-config.json`                | `.copilot/` (repo)  | Repo-level MCP config (this repo only)                         |

## Troubleshooting

| Problem                                         | Cause                                     | Fix                                                      |
| ----------------------------------------------- | ----------------------------------------- | -------------------------------------------------------- |
| Discord MCP tools not appearing                 | MCP config uses `${USERPROFILE}` in args  | Use absolute path instead                                |
| Discord MCP tools not appearing                 | Session started before config was saved   | Restart Copilot CLI session                              |
| `TokenInvalid` error                            | `DISCORD_TOKEN` not in environment        | Set as User env var (see Prerequisites)                  |
| Watcher crashes with `require is not defined`   | File has `.js` extension                  | Rename to `.cjs` (CommonJS)                              |
| Watcher doesn't pick up messages                | `Message Content Intent` not enabled      | Enable in Discord Developer Portal → Bot                 |
| Watcher picks up old messages                   | `.last-read-id` not initialized           | Run the initialization script (see Session Startup)      |
| Bot can't see channels                          | Bot not added to server                   | Re-generate OAuth2 URL and add bot                       |
| `${DISCORD_TOKEN}` is empty in detached process | Detached processes don't inherit env vars | Watcher uses `getToken()` fallback to read from User env |

## Limitations

1. **Polling, not real-time**: The bridge polls Discord every ~10s. Worst-case latency from Discord message to Copilot processing: ~10 seconds.
2. **Single channel**: The bridge monitors one channel at a time. Use `--channel` to change the target.
3. **One message at a time**: Messages are queued and processed sequentially. If Copilot is working on a long task, new messages wait.
4. **Windows-only token fallback**: The `getToken()` function uses PowerShell to read User env vars. On macOS/Linux, ensure `DISCORD_TOKEN` is exported in the shell environment.
5. **Premium request cost**: Each Discord message consumes Copilot premium requests (same as typing in the CLI).
6. **No session resume**: If the bridge process dies, a new Copilot session starts (no `--continue`). Session context is lost.

## How to Use (User Guide)

### Starting the Bridge

Open a terminal in your repo directory and run:

```powershell
node "$env:USERPROFILE\.copilot\tools\discordmcp\copilot-bridge.cjs" --repo-dir "C:\path\to\your\repo"
```

You'll see in the terminal:

```
[Bridge] Starting Copilot Bridge...
[Bridge] Discord connected → #meal-planner
[Bridge] Spawning copilot --yolo in C:\path\to\your\repo
[Bridge] Copilot session ready
[Bridge] Online — polling Discord and accepting commands
```

And in Discord:

```
🟢 Copilot Bridge online — send messages here to start work.
Single persistent session. Responses posted asynchronously.
```

**That's it.** The bridge is now running. You don't need to open Copilot CLI separately — the bridge spawns and manages it for you.

### Sending Work via Discord

Just type a message in the Discord channel:

```
Please fix the login bug in src/auth.ts
```

You'll see these responses in Discord:

1. `📨 Message received from ashley` — bridge acknowledged your message
2. `🤖 Processing (from ashley): "Please fix the login bug..."` — Copilot started working
3. `✅ Task complete: Fixed null check in login handler` — Copilot finished (posted by the inner session)

### Sending Follow-up Messages

You can send messages while Copilot is still working. They're queued and processed in order:

```
Also check the API timeout issue
```

→ `📨 Message received from ashley — agent is busy, queued for processing.`

### Checking Status

The bridge writes its current state to `~/.copilot/tools/discordmcp/bridge-status.json`:

```powershell
Get-Content "$env:USERPROFILE\.copilot\tools\discordmcp\bridge-status.json" | ConvertFrom-Json
```

### Stopping the Bridge

Press `Ctrl+C` in the terminal where the bridge is running. Or if running detached, find and stop the process:

```powershell
Get-Process -Name node | Where-Object { $_.CommandLine -like '*copilot-bridge*' } | Stop-Process
```

### Running as a Background Service

To run the bridge detached (survives terminal close):

```powershell
Start-Process -NoNewWindow node -ArgumentList "$env:USERPROFILE\.copilot\tools\discordmcp\copilot-bridge.cjs", "--repo-dir", "C:\path\to\your\repo"
```

Or from within a Copilot CLI session (detached async):

```powershell
# mode="async", detach: true
node "$env:USERPROFILE\.copilot\tools\discordmcp\copilot-bridge.cjs" --repo-dir "C:\path\to\your\repo"
```

## Copy-Paste Setup Prompt

Use this prompt in a new Copilot CLI session to set up Discord integration from scratch:

```
Please set up Discord two-way communication for this repo. Follow the instructions in docs/discord-integration.md. Specifically:

1. Install the Discord MCP server at ~/.copilot/tools/discordmcp/ (clone v-3/discordmcp, npm install, npm build)
2. Install node-pty: cd ~/.copilot/tools/discordmcp && npm install node-pty
3. Create the copilot-bridge.cjs file at ~/.copilot/tools/discordmcp/
4. Configure MCP in both ~/.copilot/mcp-config.json and .copilot/mcp-config.json (use ABSOLUTE paths, not ${USERPROFILE})
5. Add the Discord Integration block to CLAUDE.md (update the channel ID to match our project's Discord channel)
6. Set DISCORD_TOKEN as a User env var if not already set
7. Initialize the last-read-id marker
8. Verify by starting the bridge and sending a test message from Discord

The DISCORD_TOKEN should already be set as a User env var. If not, ask me for it.
```
````
