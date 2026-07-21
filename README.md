# Discord `/checkcommands` Bot

A minimal Discord bot (discord.js v14) with one slash command, `/checkcommands`,
that replies with a live list of every command the bot currently has
registered. Add more commands later and this list updates itself — nothing
to maintain by hand. Ready to deploy on [Railway](https://railway.app).

## What's included

```
.
├── commands/
│   └── checkcommands.js   # the /checkcommands command
├── deploy-commands.js     # one-time script to register slash commands
├── index.js               # bot entry point
├── package.json
├── railway.json           # Railway build/deploy config
├── .env.example
└── .gitignore
```

## 1. Create the Discord application

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) → **New Application**.
2. Under **Bot**, click **Reset Token** to generate a bot token and copy it.
   No privileged intents (Message Content / Presence / Server Members) are
   needed for this bot — leave them off.
3. Under **General Information**, copy the **Application ID** — this is your `CLIENT_ID`.
4. Under **OAuth2 → URL Generator**, check the `bot` and `applications.commands`
   scopes, then under bot permissions check **Send Messages** and **Embed Links**.
   Open the generated URL to invite the bot to your server.

## 2. Local setup

```bash
npm install
cp .env.example .env
```

Fill in `.env` with the token and client ID from step 1. `GUILD_ID` is
optional — set it to a test server's ID for instant command updates while
developing, or leave it blank to register commands globally.

Register the command, then start the bot:

```bash
npm run deploy-commands
npm start
```

Type `/checkcommands` in Discord — you should get back an embed listing it.

## 3. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
gh repo create discord-checkcommands-bot --public --source=. --push
```

No `gh` CLI? Create an empty repo on github.com instead, then:
`git remote add origin <your-repo-url> && git push -u origin main`

## 4. Deploy on Railway

1. On [railway.app](https://railway.app): **New Project → Deploy from GitHub repo** → select this repo.
2. In the service's **Variables** tab, add `DISCORD_TOKEN` and `CLIENT_ID`.
   Skip `GUILD_ID` for a production bot — global commands work in every
   server it's in.
3. Railway builds and runs it automatically via `railway.json`. No web
   server or exposed port is needed — this runs as a background worker
   connected to Discord's gateway, not an HTTP service.
4. Command registration is a separate, one-time step from the running bot —
   run `npm run deploy-commands` locally (pointed at the same token/client
   ID) whenever you add or change a command. You don't need to re-run it on
   every deploy.

## Adding more commands

Add a new file to `commands/` that exports `data` (a `SlashCommandBuilder`)
and `execute(interaction)`, same shape as `checkcommands.js`. Run
`npm run deploy-commands` again and it'll show up in `/checkcommands`
automatically.

## Requirements

Node.js 22.12.0+ locally (Railway provisions this automatically from
`package.json`). Check your version with `node -v`; upgrade with
[nvm](https://github.com/nvm-sh/nvm) if needed.
