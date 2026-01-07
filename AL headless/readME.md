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

## QoL scripts to launch in one click!

1. Create a luanch .sh script comment/uncomment according to your setup

```bash
#!/bin/bash

# using Xvfb
# Function to kill all chrome/chromium and xvfb instances
cleanup() {
    echo "Terminal closed. Killing all bot instances..."
    pkill -f chrome
    pkill -f chromium
    pkill -f Xvfb
    exit
}

# Trap the EXIT signal (covers terminal closing, Ctrl+C, etc.)
trap cleanup EXIT

# Navigate to directory
cd /home/hilly/al-headless || exit

# Ensure Xvfb is installed before running
if ! command -v xvfb-run &> /dev/null; then
    echo "Error: xvfb-run is not installed. Run: sudo apt install xvfb"
    exit 1
fi

echo "Starting bots in virtual framebuffer..."

# Start the bots using Xvfb
# --server-args defines the 'fake' monitor resolution and bit depth
xvfb-run --server-args="-screen 0 800x600x24" npm start


# OLD using shell in code
#!/bin/bash

# Function to kill all chrome/chromium instances
#cleanup() {
#    echo "Terminal closed. Killing all bot instances..."
#    pkill -f chrome
#    pkill -f chromium
#    exit
#}

# Trap the EXIT signal (covers terminal closing, Ctrl+C, etc.)
#trap cleanup EXIT

# Navigate and start the bots
#cd /home/hilly/al-headless || exit
#npm start


```

2. Create a desktop launcher

```bash
[Desktop Entry]
Version=1.0
Type=Application
Name=AL Party Launcher
Comment=Launch 4 Adventure Land Bots
Exec=/bin/bash /home/USER/headlessBots.sh # your file path here
Icon=chromium
Terminal=true
Categories=Network;WebBrowser;
```

# Notes / troubleshooting

-   If you keep "verbatimModuleSyntax": true in tsconfig, you must set "type":"module" in package.json (recommended) or set verbatimModuleSyntax to false and adjust module/moduleResolution.
-   The script will create ./profiles/<CharacterName> for browser user data automatically.
