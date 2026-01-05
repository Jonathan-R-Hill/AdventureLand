# What it does

Launches headless Chromium instances that open Adventure Land, log in, and start bots for the characters listed in runBot.ts.

## Requirements

Node.js >= 18
npm
Disk space for Chromium (puppeteer downloads it)

## Setup

Create config.json (project root)

```js
{
	"email": "you@example.com",
	"password": "your-password"
}
```

Create or edit package.json in the same folder and add "type": "module":

```js
{
  "name": "al-headless",
  "version": "1.0.0",
  "type": "module"
}
```

Install dependencies (run in the project folder)

```bash
npm install puppeteer
npm install --save-dev typescript @types/node
```

Compile + run (recommended)

```bash
npx tsc
node .\runBot.js
```

Alternative — run directly with ts-node (dev)

```bash
npm install --save-dev ts-node
npx ts-node .\runBot.ts
```

# Linny Setup

sudo apt update

## Install Node.js (if not already there)

curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

## Install Chromium dependencies

sudo apt install -y libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libasound2 \
libpango-1.0-0 libcairo2 libxshmfence1

## Notes / troubleshooting

-   If you keep "verbatimModuleSyntax": true in tsconfig, you must set "type":"module" in package.json (recommended) or set verbatimModuleSyntax to false and adjust module/moduleResolution.
-   The script will create ./profiles/<CharacterName> for browser user data automatically.
