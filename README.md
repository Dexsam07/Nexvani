# Nexvani

A feature-rich, multi-session WhatsApp bot with a plugin system, group moderation, media utilities, localized responses, and an optional HTTP API.

> **Brand:** Nexvani  
> **Session format:** configured non-empty session IDs must start with `DEX~`  
> **Footer:** Made by dex with ❣

## Features

- Multi-session WhatsApp support.
- Plugin-based command architecture.
- Group moderation with anti-link, anti-spam, anti-word, warning, welcome, and goodbye tools.
- Media utilities, stickers, downloads, conversions, and QR tools.
- Optional API mode for sending messages and receiving webhook events.
- Localized responses in English, Spanish, French, Hindi, Bengali, Indonesian, Urdu, Turkish, Russian, Arabic, Malayalam, and Chinese.
- Deployment support for a VPS or compatible container platform.

## Requirements

Use **Node.js 20 or newer**, Git, FFmpeg, and Yarn. A valid WhatsApp session ID or access to the QR/pairing flow is required for a connected bot session.

## Quick start

```bash
git clone https://github.com/Dexsam07/Nexvani.git Nexvani
cd Nexvani
yarn install
```

Create `config.env` in the project root. Do not commit this file because it can contain credentials and session data.

```env
SESSION_ID=DEX~your_generated_session_id
PREFIX=.
STICKER_PACKNAME=dex
BOT_LANG=en
VPS=true
AUTO_UPDATE=true
ALWAYS_ONLINE=false
SEND_READ=false
```

The `SESSION_ID` value may be empty when using QR or pairing mode. When a value is configured, it must start with `DEX~` and contain a token after the prefix. Do not manually rename an old session token; generate a new compatible token instead.

## Session dashboard

Use the session dashboard for QR-code and phone-number pairing:

[Open Nexvani session dashboard](https://shyam-session.zone.id/)

The dashboard is a separate web service. It is not the bot runtime itself, and its session generator must produce a token compatible with the `DEX~` format enforced by this repository.

## Run the bot

Run directly with Node.js:

```bash
yarn start
```

Run with PM2:

```bash
pm2 start . --name Nexvani --attach --time
pm2 save
```

Stop the process with:

```bash
pm2 stop Nexvani
```

## Configuration

The repository includes `config.env.example` and `config.json.example`. Copy the relevant example and replace every placeholder with your own values.

| Variable | Purpose |
|---|---|
| `SESSION_ID` | WhatsApp session token. A configured value must use the `DEX~` prefix. |
| `PREFIX` | Command prefix, for example `.`. |
| `SUDO` | Comma-separated owner numbers, including country code. |
| `BOT_LANG` | Response language code. |
| `STICKER_PACKNAME` | Sticker pack name and author. |
| `VPS` | Enables VPS-oriented behavior when set to `true`. |
| `AUTO_UPDATE` | Enables the repository update check. The configured branch is `master`. |
| `ALWAYS_ONLINE` | Keeps the bot presence online when supported. |
| `SEND_READ` | Controls read receipts. |
| `API_MODE` | `false` for bot only, `true` for bot plus API, or `only` for API only. |
| `API_KEY` | Secret required by API requests. |
| `API_PUBLIC_URL` | Public base URL used in media links. |
| `API_WEBHOOK_URL` | Optional URL receiving incoming-message webhooks. |

## API mode

Set the following values to enable the optional API:

```env
API_MODE=true
API_KEY=replace_with_a_long_random_secret
PORT=3000
API_PUBLIC_URL=https://bot.example.com
API_WEBHOOK_URL=https://your-app.example.com/webhook
```

Every API request must include the configured key:

```text
x-api-key: replace_with_a_long_random_secret
```

The API supports sending messages, listing sessions, downloading recently received media, and forwarding incoming messages to a webhook. The exact endpoint behavior is implemented in the current source under `lib/` and should be tested in the deployment environment before production use.

## Supported languages

Set `BOT_LANG` to one of these values:

| Code | Language |
|---|---|
| `en` | English |
| `es` | Spanish |
| `fr` | French |
| `hi` | Hindi |
| `bn` | Bengali |
| `id` | Indonesian |
| `ur` | Urdu |
| `tr` | Turkish |
| `ru` | Russian |
| `ar` | Arabic |
| `ml` | Malayalam |
| `zh` | Chinese |

## Deployment on Ubuntu VPS

Install system dependencies:

```bash
sudo apt update
sudo apt install -y git ffmpeg curl
```

Install Node.js 20 or newer, then install Yarn and PM2:

```bash
sudo npm install -g yarn pm2
```

Clone and install Nexvani:

```bash
git clone https://github.com/Dexsam07/Nexvani.git Nexvani
cd Nexvani
yarn install
```

Create `config.env`, set a valid `DEX~...` session ID and the required environment variables, then start the process:

```bash
pm2 start . --name Nexvani --time
pm2 save
```

## Docker

The included `Dockerfile` uses the project repository as its build source and runs `yarn install` before starting the bot. Review the base image and set all secrets through the deployment platform rather than committing them to the repository.

## Safety notes

Never publish `config.env`, a real `SESSION_ID`, API keys, cookies, or owner phone numbers. Use a private deployment for testing and rotate any credential that is accidentally exposed. The `news` and URL-based `qr` plugins depend on their configured HTTP endpoints; verify that those endpoints return the expected JSON or image response before enabling those commands in production.

## Repository

- GitHub: [Dexsam07/Nexvani](https://github.com/Dexsam07/Nexvani)
- Default branch: `master`
- Session dashboard: [shyam-session.zone.id](https://shyam-session.zone.id/)

## Credits

Nexvani includes community libraries and ideas from the WhatsApp bot ecosystem, including WhatsAsena and Baileys. See `package.json` and the source headers for dependency details.

**Made by dex with ❣**
