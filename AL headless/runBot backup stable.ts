import puppeteer from "puppeteer";
import fs from "fs/promises";
import path from "path";

const characters: string[] = [`Jhlwarrior`, `Jhlpriest`, `Jhlmage`, `Jhlmerch`];
const region: string = `EU/II/`;

async function clearCache(userDataDir: string) {
	try {
		const cachePath = path.join(userDataDir, "Default", "Cache");
		const codeCachePath = path.join(userDataDir, "Default", "Code Cache");

		// We only delete the Cache, not the LocalStorage (which holds your settings/code)
		await fs.rm(cachePath, { recursive: true, force: true }).catch(() => {});
		await fs.rm(codeCachePath, { recursive: true, force: true }).catch(() => {});
		console.log(`[System] Cleared cache for ${path.basename(userDataDir)}`);
	} catch (e) {
		// Ignore errors
	}
}

async function startCharacter(charName: string, config: any) {
	const userDataDir = path.join(process.env.HOME || "", ".adventure_land_profiles", charName);

	// Clear the old cache we don't care for old files..
	await clearCache(userDataDir);

	// Launch browser
	// xvfb-run --server-args="-screen 0 640x480x24" npm start
	const browser = await puppeteer.launch({
		headless: false, // Alt: "shell"
		executablePath: "/usr/bin/chromium", // check: which chromium for le path   alt: comment this line out
		defaultViewport: { width: 640, height: 480 },
		userDataDir: userDataDir,
		args: [
			"--window-size=640,480",
			"--no-sandbox",
			"--disable-setuid-sandbox",
			"--disable-gpu",
			"--disable-software-rasterizer",
			"--single-process",
			"--no-zygote",
			"--disable-web-security",
			"--mute-audio",
			"--no-first-run",
			"--disable-dev-shm-usage",
			"--disable-background-networking",
			"--disable-background-timer-throttling",
			"--disable-backgrounding-occluded-windows",
			"--disable-renderer-backgrounding",
			"--disable-ipc-flooding-protection",
			"--disable-breakpad",
			"--js-flags=--max-old-space-size=512 --expose-gc",
			"--proxy-server=direct://",
			"--proxy-bypass-list=*",
		],
	});

	try {
		const page = await browser.newPage();

		await page.evaluateOnNewDocument(() => {
			const style = document.createElement("style");
			style.innerHTML = `
                /* Stop all CSS animations */
                * { animation: none !important; transition: none !important; }
                
                /* Hide background images */
                body { background-image: none !important; background: #000 !important; }
                
                /* Hide heavy UI elements */
                #game, #bottommode, .utop { visibility: hidden !important; }
            `;
			document.head.appendChild(style);
		});

		console.log(`[${charName}] Navigating to Adventure Land...`);
		await page.goto(`https://adventure.land/`, { waitUntil: "networkidle2" });

		// Login Logic
		const loginVisible = await page.$("#loginbuttons");
		if (loginVisible) {
			console.log(`[${charName}] Starting login flow...`);

			const startLoginSelector = "#loginbuttons > div.whiteheader.mb4.clickable";

			await page.waitForSelector(startLoginSelector, { visible: true, timeout: 5000 });
			await page.evaluate((s) => (document.querySelector(s) as HTMLElement)?.click(), startLoginSelector);

			await page.waitForSelector("#email2", { visible: true });
			await page.type("#email2", config.email, { delay: 50 });
			await page.type("#password2", config.password, { delay: 50 });

			await page.click("#loginlogin > div.textbutton.mt5.lbutton");

			await page.waitForFunction(() => !document.querySelector("#email2"), { timeout: 10000 });
		}

		console.log(`[${charName}] Entering game...`);
		await page.goto(`https://adventure.land/character/${charName}/in/${region}`, { waitUntil: "networkidle2" });

		// ---------- Start Logic ---------- //
		let codeStarted = false;
		let attempts = 0;
		while (!codeStarted && attempts < 10) {
			const iframeExists = await page.$("#iframelist > div");
			if (!iframeExists) {
				console.log(`[${charName}] Iframe not found (Attempt ${attempts + 1}). Starting code...`);

				await page.keyboard.press("\\");

				// Backup - Click the UI if the keypress didn't trigger the modal
				const engageButton = `#codeui > div:nth-child(3) > div.clickable.iengagebutton`;
				const isModalVisible = await page.$(engageButton);

				if (!isModalVisible) {
					await page.click(`#toprightcorner > div:nth-child(4)`);
					// Wait for modal to slide in
					await page.waitForSelector(engageButton, { visible: true, timeout: 2000 }).catch(() => {});
				}

				// Clicky
				await page.click(engageButton).catch(() => {});

				// Wait 5 seconds for the code to initialize before checking again
				await new Promise((resolve) => setTimeout(resolve, 5000));
				attempts++;
			} else {
				console.log(`[${charName}] Code is running (Iframe detected).`);
				codeStarted = true;
			}
		}
		await page.keyboard.press("Escape").catch(() => {});
		console.log(`[${charName}] Bot active.`);

		// ---------- Optimization Logic ---------- //
		console.log(`[${charName}] Attempting to optimize CPU usage...`);

		let isOptimized = false;
		// Try 15 times, waiting 2 seconds between attempts (Total 30s)
		for (let i = 0; i < 15; i++) {
			try {
				const frameElement = await page.$("iframe");
				const frame = await frameElement?.contentFrame();

				if (frame) {
					// We ask the browser: Did the optimization work?
					const success = await frame.evaluate(() => {
						// Check if the game engine is actually loaded yet
						// @ts-ignore
						if (!window.PIXI || !window.PIXI.ticker) return false;

						// Stop Tickers
						// @ts-ignore
						if (window.PIXI.ticker.shared) window.PIXI.ticker.shared.stop();
						// @ts-ignore
						if (window.PIXI.ticker.system) window.PIXI.ticker.system.stop();

						// Hide Canvas
						const canvas = document.querySelector("canvas");
						if (canvas) canvas.style.display = "none";

						// Force Cleanup
						// @ts-ignore
						if (window.gc) window.gc();

						return true;
					});

					if (success) {
						console.log(`[${charName}] Optimization applied successfully.`);
						isOptimized = true;
						break;
					}
				}
			} catch (e) {
				// Ignore errors we don't care for them
			}

			// Wait 2 sec before trying again
			await new Promise((r) => setTimeout(r, 2000));
		}

		if (!isOptimized) {
			console.warn(`[${charName}] Warning: Could not optimize PIXI (Game might be lagging or stuck).`);
		}

		// ---------- Watchdog Loop ---------- //
		while (true) {
			await new Promise((r) => setTimeout(r, 12 * 1000));

			// Check if browser crashed
			if (page.isClosed()) throw new Error("Page closed");

			// Check for Disconnects
			const isDisconnected = await page.evaluate(() => {
				return (
					document.body.innerText.includes("Disconnected") || document.querySelector(".gameerror") !== null
				);
			});
			if (isDisconnected) throw new Error("Game Server Disconnected");

			// CHECK IF CODE STOPPED
			const isCodePaused = await page.evaluate(() => {
				// If the "Engage" button is visible, it means the code is NOT running.
				// We check for the class '.iengagebutton' and if it is visible to the user.
				const engageBtn = document.querySelector(".iengagebutton");
				if (engageBtn && (engageBtn as HTMLElement).offsetParent !== null) {
					return true;
				}

				return false;
			});

			if (isCodePaused) throw new Error("Code execution stopped unexpectedly (Engage button visible)");
		}
	} finally {
		console.log(`[${charName}] Shutting down browser instance...`);
		await browser.close().catch(() => {});
	}
}

async function startCharacterWithRecovery(charName: string, config: any) {
	try {
		await startCharacter(charName, config);
	} catch (error: any) {
		console.error(`[${charName}] ⚠️ ERROR: ${error.message}`);

		// ----------  Cleanup singleton lock ---------- //
		const lockPath = path.join(process.env.HOME || "", ".adventure_land_profiles", charName, "SingletonLock");
		await fs.rm(lockPath, { force: true }).catch(() => {});

		console.log(`[${charName}] Restarting in 12 seconds...`);
		setTimeout(() => startCharacterWithRecovery(charName, config), 12 * 1000);
	}
}

async function run() {
	const config = JSON.parse(await fs.readFile("./config.json", "utf-8"));

	for (const char of characters) {
		startCharacterWithRecovery(char, config);
		console.log(`[SYSTEM] Waiting 1.5s before starting next character...`);

		await new Promise((r) => setTimeout(r, 1500));
	}

	console.log("All bots initiated. Monitoring character health...");
}

run().catch((err) => console.error("❌ Global Error:", err.message));
