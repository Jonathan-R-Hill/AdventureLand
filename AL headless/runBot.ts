import puppeteer from "puppeteer";
import fs from "fs/promises";
import path from "path";

const characters: string[] = [`Jhlwarrior`, `Jhlpriest`, `Jhlmage`, `Jhlmerch`];
const region: string = `EU/II/`;

async function startCharacter(charName: string, config: any) {
	const userDataDir = path.join(process.env.HOME || "", ".adventure_land_profiles", charName);

	// Launch browser
	const browser = await puppeteer.launch({
		headless: "shell",
		defaultViewport: { width: 1280, height: 720 },
		userDataDir: userDataDir,
		args: [
			"--no-first-run",
			"--disable-dev-shm-usage",
			"--disable-extensions",
			"--disable-component-update",
			"--mute-audio",
			"--js-flags=--max-old-space-size=512",
			// CPU Optimizations
			"--disable-gpu", // Disables hardware acceleration
			"--disable-software-rasterizer",
			"--disable-gl-drawing-for-tests",
			"--disable-canvas-aa",
			"--disable-2d-canvas-clip-stacking",
			"--disable-breakpad",
			"--proxy-server='direct://'",
			"--proxy-bypass-list=*",
			// "--no-sandbox",
		],
	});

	try {
		const page = await browser.newPage();

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

		console.log(`[${charName}] Optimizing for headless mode...`);

		try {
			// Find the game iframe
			const frameElement = await page.$("iframe");
			const frame = await frameElement?.contentFrame();

			if (frame) {
				await frame.evaluate(() => {
					// Disable rendering if the function exists in the iframe context
					if (typeof (window as any).disable_rendering === "function") {
						(window as any).disable_rendering();
					}

					const canvas = document.querySelector("canvas");
					if (canvas) canvas.style.display = "none";

					// Stop the PIXI ticker
					// @ts-ignore
					if (window.PIXI && window.PIXI.ticker && window.PIXI.ticker.shared) {
						// @ts-ignore
						window.PIXI.ticker.shared.stop();
					}
				});
			}
		} catch (e) {
			console.log(`[${charName}] Note: Optimization commands skipped (Game still loading)`);
		}

		// ---------- Watchdog Loop ---------- //
		while (true) {
			await new Promise((r) => setTimeout(r, 40 * 1000));
			if (page.isClosed()) throw new Error("Page closed");
			const isDisconnected = await page.evaluate(() => {
				return (
					document.body.innerText.includes("Disconnected") || document.querySelector(".gameerror") !== null
				);
			});

			if (isDisconnected) throw new Error("Game Server Disconnected");
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

		console.log(`[${charName}] Restarting in 20 seconds...`);
		setTimeout(() => startCharacterWithRecovery(charName, config), 20000);
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
