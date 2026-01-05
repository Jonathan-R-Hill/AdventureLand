import puppeteer from "puppeteer";
import fs from "fs/promises";
import path from "path";

const characters: string[] = [`Jhlmerch`, `Jhlwarrior`, `Jhlpriest`, `Jhlmage`];
const region: string = `EU/II/`;

async function startCharacter(charName: string, config: any) {
	const browser = await puppeteer.launch({
		headless: "shell",
		defaultViewport: { width: 1280, height: 720 },
		userDataDir: path.resolve(`./profiles/${charName}`),
		args: [
			// "--no-sandbox",
			// "--disable-setuid-sandbox",
			"--disable-gpu",
			"--disable-dev-shm-usage",
			// "--disable-accelerated-2d-canvas",
			"--no-first-run",
			// "--no-zygote",
			// "--js-flags=--max-old-space-size=512" // Limits JS memory per tab
		],
	});

	const page = await browser.newPage();

	console.log(`[${charName}] Navigating to Adventure Land...`);
	await page.goto(`https://adventure.land/`, { waitUntil: "networkidle2" });

	// Check if we need to login
	const loginVisible = await page.$("#loginbuttons");

	if (loginVisible) {
		console.log(`[${charName}] Starting login flow...`);

		const startLoginSelector = "#loginbuttons > div.whiteheader.mb4.clickable";

		await page.waitForSelector(startLoginSelector, { visible: true, timeout: 5000 });
		await page.evaluate((selector) => {
			const btn = document.querySelector(selector) as HTMLElement;
			if (btn) btn.click();
		}, startLoginSelector);

		await page.waitForSelector("#email2", { visible: true });
		await page.type("#email2", config.email, { delay: 50 });
		await page.type("#password2", config.password, { delay: 50 });

		await page.click("#loginlogin > div.textbutton.mt5.lbutton");

		console.log(`[${charName}] Waiting for session...`);
		await page.waitForFunction(() => !document.querySelector("#email2"), { timeout: 10000 });
	}

	console.log(`[${charName}] Successfully logged in.. Navigating to character...`);

	// Navigate to character specific URL
	await page.goto(`https://adventure.land/character/${charName}/in/${region}`, { waitUntil: "networkidle2" });

	let codeStarted = false;
	let attempts = 0;
	const maxAttempts = 10;

	while (!codeStarted && attempts < maxAttempts) {
		const iframeExists = await page.$("#iframelist > div");

		// Start code if needed
		if (!iframeExists) {
			console.log(`[${charName}] Iframe not found (Attempt ${attempts + 1}). Starting code...`);

			await page.keyboard.press("\\");

			// Option B: Backup - Click the UI if the keypress didn't trigger the modal
			const engageButton = `#codeui > div:nth-child(3) > div.clickable.iengagebutton`;
			const isModalVisible = await page.$(engageButton);

			if (!isModalVisible) {
				await page.click(`#toprightcorner > div:nth-child(4)`);
				// Wait for modal to slide in
				await page.waitForSelector(engageButton, { visible: true, timeout: 2000 }).catch(() => {});
			}

			// Click Engage
			await page.click(engageButton).catch(() => {});

			// Wait 5 seconds for the code to initialize before checking again
			await new Promise((resolve) => setTimeout(resolve, 5000));
			attempts++;
		} else {
			console.log(`[${charName}] Code is running (Iframe detected).`);
			codeStarted = true;
		}
	}

	if (!codeStarted) {
		console.error(`[${charName}] Failed to start code after ${maxAttempts} attempts.`);
	}

	// Close the code UI window if it's still open
	await page.keyboard.press("Escape").catch(() => {});

	console.log(`[${charName}] Bot active.`);
}

async function run() {
	// Load config
	const configPath = path.resolve("./config.json");
	const configFile = await fs.readFile(configPath, "utf-8");
	const config = JSON.parse(configFile);

	// This launches all 4 characters simultaneously
	await Promise.all(characters.map((char) => startCharacter(char, config)));

	console.log("All bots initiated. Keeping script alive...");
}

run().catch((err) => {
	console.error("❌ Global Error:", err.message);
});
