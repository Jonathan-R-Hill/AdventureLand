load_code("helpers");
load_code("commCommands");
load_code("combineItems");
load_code("UI");

graphicsLimiter();

const HP_POTION = "hpot1";
const MP_POTION = "mpot1";
const POTSMINSTOCK = 9999;
const POT_BUFFER = 6000;

const sellWhiteList = [
	"hpbelt", "hpamulet", "vitring", "pants", "shoes", "coat", "helmet",
	"cclaw", "mushroomstaff", "slimestaff", "stinger", "vitearring", "glolipop", "quiver",
	"wattire", "wshoes", "wcap", "wbreeches", "wgloves", // Wanders set
	"helmet1", "pants1", "coat1", "gloves1", "shoes1", // Rugged set
	"xmace", "xbow", "merry", "snowball", "xmashat", "rednose", "candycanesword", "xmassweater", "xmaspants", "xmasshoes", "warmscarf",
	"iceskates", "gcape", "santasbelt", "angelwings", "swifty",
	"snowflakes", "ornamentstaff", "mshield", "ringsj", "lspores", "mittens",
	"shield", "hbow", "cupid",
];

const bankWhitelist = [
	// Exchangables
	"seashell", "gem0", "gem1", "monstertoken", "gemfragment", "armorbox", "weaponbox",
	"ornament", "mistletoe", "candycane", "leather", "goldenegg",
	// Easter
	"egg0", "egg1", "egg2", "egg3", "egg4", "egg5", "egg6", "egg7", "egg8", "egg9",
	// Keyes
	"spiderkey", "frozenkey",
	// Weapons & Armor
	"handofmidas", "mcape", "sweaterhs", "firestaff", "pmace", "lmace", "horsecapeg", //"firebow","mshield", "ornamentstaff",
	// Upgrades
	"lostearring", "intearring", "strearring", "dexearring",
	"wbook0", "dexamulet", "stramulet", "intamulet", "candy1",
	"strring", "intring", "dexring", "wbookhs",
	"intbelt", "strbelt", "dexbelt",
	// Pots
	"elixirint0", "elixirint1", "elixirint2",
	"elixirstr0", "elixirstr1", "elixirstr2",
	"elixirdex0", "elixirdex1", "elixirdex2",
	"elixirvit0", "elixirvit1", "elixirvit2",
	"eggnog", "hotchocolate", "candypop",
	// Mats
	"spores", "beewings", "whiteegg", "spidersilk", "cscale", "rattail", "crabclaw", "bfur", "feather0", "gslime", "smush",
	"snakeoil", "ascale", "snakefang", "vitscroll", "essenceoffire", "essenceoffrost", "carrot", "snowball", "frogt", "ink",
	"sstinger", "btusk", "bwing", "forscroll", "electronics", "dstones", "pleather", "cshell", "emptyheart",
	// Misc
	"offeringp", "offering", "funtoken", "cryptkey", "poison", "essenceofether", "greenenvelope",
	"x0", "x1", "x2", "x3", "x4", "x5", "x6", "x7", "x8", "x9",
];

const dismantleList = [
	"fireblade", "firebow", // "firestaff",
];

class Merchant extends combineItems {
	constructor() {
		super()
		this.deliveryList = [];

		this.fishingLocation = { map: "main", x: -1368, y: -82 };
		this.miningLocation = { map: "tunnel", x: -279, y: -148 };

		this.busyStartTime = 0;
		this.setBusy(false);
		this.fishing = false;
		this.mining = false;

		this.lastRun = {
			restock: 0,
			manageInventory: 0,
			healBuff: 0,
			returnHome: 0,
			sellCheck: 0,
			dismantle: 0,
			resetFlags: 0,
			processDeliveries: 0,
			fishing: 0,
			mining: 0,
			combine: 0,
			exchange: 0,
			buffs: 0,
			autoUpgrade: 0,
			holidayExchange: 0,
		};

		this.autoUpgradeList = [
			{ item: "firestaff", targetLevel: 7, itemLevel: 1 },
			{ item: "horsecapeg", targetLevel: 5, itemLevel: 2 },
			{ item: "mcape", targetLevel: 5, itemLevel: 1 },
		];

		setInterval(() => {
			console.log(`busy: ${this.busy}, fishing: ${this.fishing}, mining: ${this.mining}, smart moving: ${smart.moving}`);
		}, 5000);
		setInterval(exportCharacterData, 8 * 1000);
		setInterval(useSkillJacko, 1200);
		setInterval(crossMapHeal, 800);
		setInterval(manageParty, 2000);
		setInterval(() => this.escapeIceGolemIsle(), 6000);
		setInterval(() => {
			if (character.afk && !is_paused())
				pause();
			else if (!character.afk && is_paused())
				pause();
		}, 2000);

		scaleUI(1);

		// setInterval(snowball, 4200);
		// setTimeout(async () => {
		// 	await this.buyBasicUpgrade();
		// 	setTimeout(async () => { await this.buyBasicUpgrade(); }, 2000);
		// }, 2000);

		parent.socket.off("magiport");
		parent.socket.on("magiport", (d) => {
			const mage = "Jhlmage";

			if (!this.fishing && !this.mining && this.getInventoryUsage().used < 30 && d.name == mage) {
				accept_magiport(mage);
			}
		});

		character.on("cm", async (sender, data) => {
			if (this.fishing || this.mining) { return; }
			await this.handleCM(sender, data);
		});

	}

	setBusy(state) {
		this.busy = state;
		if (state) {
			this.busyStartTime = Date.now();
		} else {
			this.busyStartTime = 0;
		}
	}

	async buyBasicUpgrade() {
		await this.buyAndUpgrade("shoes", 7);
		await this.buyAndUpgrade("helmet", 7);
		await this.buyAndUpgrade("pants", 7);
		await this.buyAndUpgrade("coat", 7);
		await this.buyAndUpgrade("mace", 7);
	}

	checkIfDoingSOmething() {
		return this.busy || this.fishing || this.mining;
	}

	async run() {
		while (true) {
			try {
				await sleep(350);

				const now = Date.now();

				if (character.rip) {
					this.resetFlags();

					continue;
				}

				if (this.busy && this.busyStartTime > 0 && (now - this.busyStartTime > 75 * 1000)) {
					console.log("⚠️ Busy timeout triggered! Resetting flags.");
					set_message("Busy Timeout");
					this.setBusy(false);
				}

				if (now - this.lastRun.resetFlags > 10 * 60 * 1000) {
					this.lastRun.resetFlags = now;
					this.resetFlags();
				}

				if (now - this.lastRun.healBuff > 300) {
					this.lastRun.healBuff = now;
					this.healAndBuff();
				}

				if (this.checkIfDoingSOmething()) {
					await sleep(100);
					continue;
				}

				// --- MAIN LOGIC TASKS ---

				// Buffs
				if (now - this.lastRun.buffs > 30 * 1000) {
					this.lastRun.buffs = now;
					await this.handleHolidayBuffs();
				}

				// Deliveries
				if (now - this.lastRun.processDeliveries > 8 * 1000) {
					if (this.deliveryList.length > 0) {
						this.lastRun.processDeliveries = now;
						await this.processDeliveries();
					}
				}

				// Exchange
				if (now - this.lastRun.exchange > 5 * 60 * 1000) {
					this.lastRun.exchange = now;
					await this.exchangeItems();
				}

				// Combine / Bank
				if (now - this.lastRun.combine > 3 * 60 * 1000) {
					this.lastRun.combine = now;
					const upgrades = [
						"intearring", "strearring", "dexearring", "strring", "intring", "dexring",
						"wbook0", "dexamulet", "stramulet", "intamulet", "intbelt", "strbelt", "dexbelt",
					];

					const levels = [0, 1, 2, 3];
					for (const item of upgrades) {
						await this.autoCombineItems(item, levels);
					}

					await this.bankItems();
				}

				// Fishing
				if (now - this.lastRun.fishing > 11 * 1000) {
					if (!this.busy && !this.mining) {
						this.lastRun.fishing = now;
						await this.goFishing();
					}
				}

				// Mining
				if (now - this.lastRun.mining > 12 * 1000) {
					if (!this.busy && !this.fishing) {
						this.lastRun.mining = now;
						await this.goMining();
					}
				}

				// Restock
				if (now - this.lastRun.restock > 250 * 1000) {
					this.lastRun.restock = now;
					await this.restockPotions();
				}

				// Holiday Exchange
				if (now - this.lastRun.holidayExchange > (15 * 60 * 1000) && parent.S.holidayseason) {
					this.lastRun.holidayExchange = now;
					await this.exchangeHolidayItems();
				}

				// Dismantle
				if (now - this.lastRun.dismantle > 200 * 1000) {
					this.lastRun.dismantle = now;
					await this.dismantleFireWeapons();
				}

				// Auto Upgrade wep/armor
				if (now - this.lastRun.autoUpgrade > 15 * 60 * 1000) {
					this.lastRun.autoUpgrade = now;
					if (this.autoUpgradeList && this.autoUpgradeList.length > 0 && !this.busy) {
						this.setBusy(true);
						try {
							await this.upgradeAllByList(this.autoUpgradeList);
						} catch (e) {
							console.log('Auto-upgrade failed:', e);
						}
					}
				}

				// Inventory Manage
				if (now - this.lastRun.manageInventory > 300 * 1000) {
					this.lastRun.manageInventory = now;
					await this.manageInventory();
				}

				// Heal/Buff (Standard)
				if (now - this.lastRun.healBuff > 300) {
					this.lastRun.healBuff = now;
					this.healAndBuff();
				}

				// Return Home
				if (now - this.lastRun.returnHome > 30 * 1000) {
					this.lastRun.returnHome = now;
					await this.returnHome();
				}

				// Sell Check
				if (now - this.lastRun.sellCheck > 10 * 1000) {
					this.lastRun.sellCheck = now;
					const { used } = this.getInventoryUsage();
					if (used >= 21) {
						await this.sellItems();
						await this.bankItems();
					}
				}

			} catch (e) {
				console.error("Main Loop Crash:", e);
				this.setBusy(false);
			}
		}
	}

	escapeIceGolemIsle() {
		if (character.map == "winterland" && this.distance(character, { map: "winterland", x: 820, y: 425 }) < 400) {

			use_skill(`town`)
			this.setBusy(false);
		}
	}

	async handleCM(sender, payload) {
		if (!sender.name.startsWith("Jhl")) return;

		if (!this.fishing && !this.mining) { this.equipBroom(); }

		const [command, data] = sender.message.split(" ");

		console.log(command, '    ', data);

		switch (command.trim()) {
			case "need_Hpots": {
				const [xStr, yStr, map] = data.split(",");
				const x = Number(xStr);
				const y = Number(yStr);

				await this.handlePotionRequest(sender.name, "need_Hpots", x, y, map);

				break;
			}

			case "need_Mpots": {
				const [xStr, yStr, map] = data.split(",");
				const x = Number(xStr);
				const y = Number(yStr);

				this.handlePotionRequest(sender.name, "need_Mpots", x, y, map);

				break;
			}

			case "come_to_me": {
				if (this.checkIfDoingSOmething()) return;

				const [xStr, yStr, map] = data.split(",");
				let numX = Number(xStr);
				let numY = Number(yStr);

				this.setBusy(true);

				send_cm("Jhlmage", "portMe Jhlmerch");
				await sleep(4000);

				stop();
				await sleep(400);

				const targetPlayer = get_player(sender.name);
				if (targetPlayer) {
					numX = targetPlayer.x;
					numY = targetPlayer.y;
				}

				try {
					await Promise.race([
						smart_move({ x: numX, y: numY, map: map }),
						new Promise((_, reject) => setTimeout(() => reject(new Error("Move Timeout")), 40_000))
					]);
				} catch (e) {
					stop();
					console.log("Move failed or timed out:", e);
				}

				this.setBusy(false);
				set_message(`Come to me complete`);

				break;
			}

			case "need_luck": {
				if (this.checkIfDoingSOmething()) return;

				const [xStr, yStr, map] = data.split(",");
				let numX = Number(xStr);
				let numY = Number(yStr);

				this.setBusy(true);

				send_cm("Jhlmage", "portMe Jhlmerch");
				await sleep(4000);

				stop();
				await sleep(400);

				try {
					await Promise.race([
						smart_move({ x: numX, y: numY, map: map }),
						new Promise((_, reject) => setTimeout(() => reject(new Error("Move Timeout")), 40_000))
					]);
				} catch (e) {
					stop();
					console.log("Move failed or timed out:", e);
				}

				const target = get_player(sender.name);

				if (target && distance(character, target) < G.skills.mluck.range) {
					if (!is_on_cooldown("mluck")) {
						use_skill("mluck", target);
						set_message(`Buffed ${sender.name}`);
					}
				}

				this.setBusy(false);

				set_message(`buffed luck`);
				break;
			}

			default:
				// Unknown command — ignore
				break;
		}
	}

	// Holiday stuff
	async exchangeHolidayItems() {
		this.setBusy(true);

		if (character.map !== "bank") {
			await smart_move({ to: "bank" }).catch((e) => stop());
		}

		const holidayItems = [
			{ item: "candycane", min: 1, x: 1310.5, y: -1584, map: "winterland" },
			{ item: "mistletoe", min: 1, x: -183, y: -105, map: "winter_inn" },
			{ item: "ornament", min: 20, x: -125.4, y: -144.5, map: "winterland" },
		];

		// Collect from bank
		const slots = [];
		if (character.bank) {
			for (const packName in character.bank) {
				const pack = character.bank[packName];
				if (!pack) continue;
				for (let i = 0; i < pack.length; i++) {
					const item = pack[i];
					if (!item) continue;

					for (const exch of holidayItems) {
						if (item.name === exch.item) {
							slots.push({ location: "bank", pack: packName, slot: i });
						}
					}
				}
			}
			await this.collectItems(slots);
			await sleep(500);
		}

		// Find item with MOST trades
		let bestExch = null;
		let maxPotentialTrades = 0;

		for (const exch of holidayItems) {
			// Sum up total quantity of this specific item in inventory
			let totalQty = 0;
			character.items.forEach(slotItem => {
				if (slotItem && slotItem.name === exch.item) {
					totalQty += (slotItem.q || 1);
				}
			});

			let potential = Math.floor(totalQty / exch.min);

			if (potential > maxPotentialTrades) {
				maxPotentialTrades = potential;
				bestExch = exch;
			}
		}

		// If no items found or not enough for a single trade
		if (!bestExch || maxPotentialTrades <= 0) {
			game_log("Nothing to exchange (or not enough for min req)");
			this.setBusy(false);

			return;
		}

		const exchInfo = bestExch;
		game_log(`Decided to trade ${exchInfo.item} (Potential trades: ${maxPotentialTrades})`);

		// 3. Move to the correct location
		if (character.map !== exchInfo.map || distance(character, { x: exchInfo.x, y: exchInfo.y }) > 100) {
			await smart_move({ x: exchInfo.x, y: exchInfo.y, map: exchInfo.map }).catch((e) => stop());
		}

		const freeSpaces = this.getInventoryUsage();
		let tradesToDo = Math.max(0, 42 - freeSpaces.used - 1);
		let trades = Math.min(tradesToDo, maxPotentialTrades);

		for (let i = 0; i < trades; i++) {
			let itemSlot = this.getItemSlot(exchInfo.item);
			if (itemSlot === -1) break;

			let item = character.items[itemSlot];
			if (item.q < exchInfo.min) break;

			if (!character.q.exchange) {
				exchange(itemSlot);
			}

			await sleep(6000);
		}

		this.sellItems();

		if (character.map !== "main") {
			await smart_move({ to: "potions" }).catch((e) => stop());
		}
		this.sellItems();

		this.setBusy(false);
	}

	async holidayExchangeAndSell() {
		this.setBusy(true);

		if (character.map !== "winter_inn") {
			await smart_move({ to: "winter_inn" }).catch((e) => stop());
		}

		await exchange(0);
		this.sellItems();

		this.setBusy(false);
	}

	async handleHolidayBuffs() {
		if (needChristmasBuff()) {
			this.setBusy(true);
			await getChristmasBuff();
		}
		else {
			this.setBusy(false);
		}
	}

	// Util
	distance(a, b) {
		if (!a || !b) return 99999999;
		// map/instance checks for safety
		if ("in" in a && "in" in b && a.in != b.in) return 99999999;
		if ("map" in a && "map" in b && a.map != b.map) return 99999999;

		// Get the center coordinates for both entities
		const a_x = get_x(a);
		const a_y = get_y(a);
		const b_x = get_x(b);
		const b_y = get_y(b);

		// Calculate the difference in coordinates
		const dx = a_x - b_x;
		const dy = a_y - b_y;

		// Return the distance (Pythagorean theorem)
		return Math.sqrt(dx * dx + dy * dy);
	}

	getItemSlot(name) {
		for (let i = 0; i < character.items.length; i++) {
			const item = character.items[i];
			if (item && item.name === name) { return i; }
		}

		return -1;
	}

	// Send pots
	async handlePotionRequest(name, type, x, y, map) {
		console.log(name, type, x, y, map);

		const alreadyQueued = this.deliveryList.some(
			req => req.name === name && req.type === type
		);

		if (!alreadyQueued) {
			game_log(`Added request for ${type} from ${name}`);
			this.deliveryList.push({ name, type, x, y, map });
		}
	}

	async processDeliveries() {
		if (this.checkIfDoingSOmething() || this.deliveryList.length === 0) { return; }

		const HP_PER_DELIVERY = 3000;
		const MP_PER_DELIVERY = 3000;

		let hpNeeded = 0;
		let mpNeeded = 0;

		// Loop through the list to see what we need for this run
		for (const req of this.deliveryList) {
			if (req.type === "need_Hpots") {
				hpNeeded += HP_PER_DELIVERY;
			} else if (req.type === "need_Mpots") {
				mpNeeded += MP_PER_DELIVERY;
			}
		}

		const SAFE_BUFFER = 200;
		const currentHp = countItem(HP_POTION);
		const currentMp = countItem(MP_POTION);

		// If we don't have enough for ALL deliveries + buffer, restock first.
		if (currentHp < (hpNeeded + SAFE_BUFFER) || currentMp < (mpNeeded + SAFE_BUFFER)) {
			game_log(`Need ${hpNeeded} HP / ${mpNeeded} MP. Restocking first.`);
			this.setBusy(true);
			await this.restockPotions();

			return; // Main loop will trigger processDeliveries again after restock finishes
		}

		this.setBusy(true);

		// Move to the group
		const firstReq = this.deliveryList[0];

		game_log(`Commuting to ${firstReq.name}...`);

		// Port Logic
		if (!get_player('Jhlmage')) {
			if (character.map !== "bank") {
				send_cm("Jhlmage", "portMe Jhlmerch");
				for (let i = 0; i < 24; i++) {
					if (get_player('Jhlmage')) break;
					await sleep(250);
				}

				await sleep(500);
			}

			try {
				await smart_move({ to: firstReq.map, x: firstReq.x, y: firstReq.y });
			} catch (e) {
				stop();
				console.log("Move error: " + e);
			}
		}

		// Batch Delivery Loop
		while (this.deliveryList.length > 0) {
			this.setBusy(true);

			// Double check we haven't run out mid-run (unlikely, but safe)
			if (countItem(HP_POTION) < 100 || countItem(MP_POTION) < 100) {
				game_log("Ran out of potions mid-delivery!");
				break;
			}

			const request = this.deliveryList[0];
			const targetPlayer = get_player(request.name);

			try {
				await Promise.race([
					smart_move({ x: targetPlayer.x, y: targetPlayer.y }),
					new Promise((_, reject) => setTimeout(() => reject(new Error("Delivery Move Timeout")), 20_000))
				]);
			} catch (e) {
				stop();
				console.log("Delivery move timed out/failed, trying to deliver anyway...");
			}

			try {
				if (request.type == 'need_Mpots') { this.sendPotionsTo(request.name, HP_POTION, MP_POTION, 0, 3000); }
				else if (request.type == 'need_Hpots') { this.sendPotionsTo(request.name, HP_POTION, MP_POTION, 3000, 0); }
			}
			catch (e) {
				stop();
				console.log(`Error delivering ${request.type}`);
			}
			finally {
				this.deliveryList.shift();
			}

			if (this.deliveryList.length > 0) { await sleep(800); }
		}

		this.setBusy(false);
	}

	async sendPotionsTo(name, hpPotion, mpPotion, hpAmount = 2000, mpAmount = 2000) {
		let player = get_player(name);

		for (let i = 0; i < 20; i++) {
			if (player) break;
			await sleep(250);
			player = get_player(name);
		}

		if (!player || parent.distance(character, player) > 400) {
			game_log(`❌ Could not deliver potions to ${name}`);
			stop();

			return;
		}

		const hpSlot = this.getItemSlot(hpPotion);
		const mpSlot = this.getItemSlot(mpPotion);

		if (hpSlot > -1 && hpAmount > 0) send_item(name, hpSlot, hpAmount);
		if (mpSlot > -1 && mpAmount > 0) send_item(name, mpSlot, mpAmount);

		game_log(`🧴 Sent ${hpAmount} HP and ${mpAmount} MP potions to ${name}`);
	}

	// Sell
	getInventoryUsage() {
		let used = 0;
		for (let i = 0; i < character.items.length; i++) {
			if (character.items[i]) { used++; }
		}

		return { used, total: character.items.length };
	}

	async manageInventory() {
		const { used, total } = this.getInventoryUsage();
		console.log(`Inventory: ${used}/${total}`);

		if (this.checkIfDoingSOmething()) { return; }

		// If inventory is getting full, go sell
		if (used > 20) {
			this.setBusy(true);

			await smart_move({ to: "potions" }).catch((e) => stop());
			await sleep(500);

			await this.sellItems();
		}
	}

	async sellItems() {
		// if (character.map !== "main") { return; }
		// if (this.distance(character, { x: 0, y: 0 }) > 220) { return; }

		if (character.map == 'bank') {
			await smart_move('potions').catch((e) => stop());
		}

		for (let i = 0; i < character.items.length; i++) {
			const item = character.items[i];

			if (item && sellWhiteList.includes(item.name)) {
				sell(i, item.q || 1);
				console.log(`Sold ${item.q || 1}x ${item.name} from slot ${i}`);
			}
		}

		this.setBusy(false);
	}

	async bankItems() {
		if (character.map !== "bank") {
			await smart_move({ to: "bank" }).catch((e) => stop());
		}

		for (let i = 0; i < character.items.length; i++) {
			const item = character.items[i];
			if (!item) { continue; }

			if (bankWhitelist.includes(item.name)) {
				bank_store(i);
				await sleep(10);
			}
		}

		if (character.gold > 2_000_000) {
			bank_deposit(character.gold - 2_000_000)
		}

		this.setBusy(false);
	}

	// Dismantle
	async dismantleFireWeapons() {
		this.setBusy(true);

		const dismantleSlots = [];
		for (let i = 0; i < character.items.length; i++) {
			const item = character.items[i];
			if (!item) { continue; }

			if (item.name && dismantleList.includes(item.name) && item.level == 0) {
				dismantleSlots.push(i);
			}
		}

		if (dismantleSlots.length === 0) {
			this.setBusy(false);

			return;
		}

		await smart_move({ x: 29.10676790733877, y: 651.4848803418221, map: `main` }).catch((e) => stop());

		for (const slot of dismantleSlots) {
			try {
				dismantle(slot);
				game_log(`Dismantled ${character.items[slot].name} in slot ${slot}`);
				stop();
			} catch (e) {
				game_log(`Failed to dismantle slot ${slot}: ${e}`);
			}
		}

		this.setBusy(false);
	}

	// Auto Exchange
	async exchangeItems() {
		this.setBusy(true);
		let exchangeableItems;

		try {
			await smart_move({ to: "bank" });
		} catch (e) {
			console.log("Move to bank failed: " + e);
			stop();
			this.setBusy(false);
			return;
		}

		if (!parent.S.holidayseason) {
			exchangeableItems = [
				{ item: "gem0", min: 1, x: 30.92, y: -381.1, map: "main" },
				{ item: "gem1", min: 1, x: 30.92, y: -381.1, map: "main" },
				{ item: "candycane", min: 1, x: 30.92, y: -381.1, map: "main" },
				{ item: "mistletoe", min: 1, x: 30.92, y: -381.1, map: "main" },
				{ item: "ornament", min: 20, x: 30.92, y: -381.1, map: "main" },
				{ item: "seashell", min: 20, x: -1496, y: 580, map: "main" },
				{ item: "candypop", min: 10, x: 30.92, y: -381.1, map: "main" },
				{ item: "goldenegg", min: 1, x: 30.92, y: -381.1, map: "main" }
			];
		}
		else {
			exchangeableItems = [
				{ item: "gem0", min: 1, x: 30.92, y: -381.1, map: "main" },
				{ item: "gem1", min: 1, x: 30.92, y: -381.1, map: "main" },
				{ item: "seashell", min: 20, x: -1496, y: 580, map: "main" },
				{ item: "candypop", min: 10, x: 30.92, y: -381.1, map: "main" },
				{ item: "goldenegg", min: 1, x: 30.92, y: -381.1, map: "main" }
			]
		}

		let itemSlot = -1;
		let currentKey = null;
		let exchInfo = null;
		const slots = [];

		// Collect items from bank
		if (character.bank) {
			for (const packName in character.bank) {
				const pack = character.bank[packName];
				if (!pack) { continue; }

				for (let i = 0; i < pack.length; i++) {
					const item = pack[i];
					for (const exch of exchangeableItems) {
						if (item && item.name === exch.item) {
							slots.push({ location: "bank", pack: packName, slot: i });
						}
					}
				}
			}

			await this.collectItems(slots);
			await sleep(500);
		}

		// Find first exchangeable item
		for (const exch of exchangeableItems) {
			itemSlot = this.getItemSlot(exch.item);
			if (itemSlot > -1) {
				if (character.items[itemSlot].q < exch.min) {
					itemSlot = -1;
					continue;
				}

				currentKey = exch.item;
				exchInfo = exch;

				try {
					await smart_move({ x: exch.x, y: exch.y, map: exch.map });
				} catch (e) {
					console.log("Move to exchange NPC failed: " + e);
					stop();
					this.setBusy(false);
					return;
				}

				game_log(`Exchanging item in slot ${itemSlot}: ${character.items[itemSlot].name}`);
				break;
			}
		}

		if (itemSlot === -1) { this.setBusy(false); return; } // nothing to exchange

		const item = character.items[itemSlot];
		const MAX_TRADES = 20;

		// Loop: Run until out of items OR we hit the 20 trade limit
		for (let i = 0; i < item.q / exchInfo.min; i++) {
			if (i >= MAX_TRADES) {
				game_log("Hit 20 trade limit. Stopping for now.");
				break;
			}

			if (item.q < exchInfo.min) { break; }

			this.busyStartTime = Date.now();

			try {
				use_skill('massexchange');
				await sleep(10);
				exchange(itemSlot);
			}
			catch (e) {
				stop();
				break;
			}

			await sleep(4000);

			// Re‑find slot
			itemSlot = this.getItemSlot(currentKey);
			if (itemSlot === -1) { break; }
		}

		this.setBusy(false);
		await this.sellItems();
	}

	// restock & buff
	async restockPotions() {

		const currentHp = countItem(HP_POTION);
		const currentMp = countItem(MP_POTION);

		if (currentHp < POT_BUFFER || currentMp < POT_BUFFER) {

			this.setBusy(true);

			// Make sure we have enough gold
			if (character.gold < 2_000_000) {

				set_message(`Getting gold to buy pots...`);

				await smart_move("bank").catch((e) => stop());
				await sleep(200);

				bank_withdraw(2_000_000);
			}

			set_message("Restocking potions...");

			await smart_move({ to: "potions" }).catch((e) => stop());

			if (currentHp < POTSMINSTOCK) {
				buy(HP_POTION, POTSMINSTOCK - currentHp);
			}

			if (currentMp < POTSMINSTOCK) {
				buy(MP_POTION, POTSMINSTOCK - currentMp);
			}

			set_message("Potions restocked!");
		}

		// Reset flags once safe
		if (currentHp >= POT_BUFFER && currentMp >= POT_BUFFER) {
			this.setBusy(false);
			this.resetFlags();
		}
	}

	buffPartyWithMLuck() {
		for (const id in parent.party) {
			const memberName = id;
			const member = get_player(memberName);
			if (!member) continue;

			// Check if they already have mluck
			const hasBuff = member.s && member.s.mluck && member.s.mluck.f == "Jhlmerch";
			const remaining = hasBuff ? member.s.mluck.ms : 0;

			if (
				!is_on_cooldown("mluck") &&
				distance(character, member) < G.skills.mluck.range &&
				(!hasBuff || remaining < 2000000)
			) {
				use_skill("mluck", member);
				console.log(`Casting mluck on ${member.name}`);
				return; // cast once per loop
			}
		}
	}

	// wait for commands or something to do
	async returnHome() {
		if (!this.busy && !this.fishing && !this.mining) {
			this.equipBroom();

			set_message("On call..");

			if (character.map !== "main" && !smart.moving) {
				await smart_move({ map: "main" }).catch((e) => stop());
			} else {
				if (Math.abs(character.real_x) <= 100 && Math.abs(character.real_y) <= 100 && character.map == `main`) {
					console.log("No need to move");

					await this.manageInventory();
					return;
				} else {
					use_skill("use_town");
				}
			}

		}
	}

	// Fishing & Mining
	async goFishing() {
		const fishingRodName = "rod";
		const rodIdx = locate_item(fishingRodName);

		if ((rodIdx === -1 && character.slots.mainhand?.name !== fishingRodName) || is_on_cooldown("fishing")) {
			if (this.fishing) {
				this.fishing = false;
				this.equipBroom();
				set_message("Finished Fishing");
			}

			return;
		}

		if (this.busy || this.mining) return;

		this.equipBroom();
		this.fishing = true;
		await sleep(300);

		while (true) {
			if (is_on_cooldown("fishing") && !character.c.fishing) { break; }

			if (parent.distance(character, this.fishingLocation) > 5 && !character.c.fishing) {
				await smart_move(this.fishingLocation);
			} else {
				if (!isEquipped('rod', 4, 'mainhand') && !isEquipped('rod', 3, 'mainhand')) {
					equip(rodIdx);
				}

				if (!character.c.fishing) {
					potionUse();

					await sleep(400);
					use_skill("fishing");
				}
			}

			await sleep(500);
		}

		this.fishing = false;
		await sleep(50);
		this.equipBroom();
	}

	async goMining() {
		const pickaxeName = "pickaxe";
		const pickIdx = locate_item(pickaxeName);

		if ((pickIdx === -1 && character.slots.mainhand?.name !== pickaxeName) || is_on_cooldown("mining")) {
			if (this.mining) {
				this.mining = false;
				this.equipBroom();
				set_message("Finished Mining");
			}
			return;
		}

		if (this.busy || this.fishing) return;

		this.equipBroom();
		this.mining = true;

		await sleep(300);

		while (true) {
			if (is_on_cooldown("mining") && !character.c.mining) break;

			if (parent.distance(character, this.miningLocation) > 5 && !character.c.mining) {
				await smart_move(this.miningLocation);
			}
			else {
				if (!isEquipped("pickaxe", 4, "mainhand") && !isEquipped("pickaxe", 3, "mainhand")) {
					equip(pickIdx);
				}

				if (!character.c.mining) {
					potionUse();

					await sleep(400);
					use_skill("mining");
				}
			}

			await sleep(500);
		}

		this.mining = false;
		await sleep(50);
		this.equipBroom();
	}

	healAndBuff() {
		reviveSelf();
		manageParty();
		this.buffPartyWithMLuck();

		if (this.fishing || this.mining) {
			return;
		}

		potionUse();
		loot();
	}

	resetFlags() {
		console.log("🚩 Resetting Flags and Queue...");
		this.setBusy(false);
		this.mining = false;
		this.fishing = false;

		this.deliveryList = [];

		this.lastRun.returnHome = 0;

		stop();
	}

	removeWeapons() {
		unequip("mainhand");
		unequip("offhand");
	}

	equipBroom() {
		// Check if broom is already equipped in any slot
		const broomSlot = Object.values(character.slots).find(
			slot => slot && slot.name === "broom"
		);

		if (!broomSlot) {
			const broomIndex = locate_item("broom");
			if (broomIndex !== -1) {
				equip(broomIndex);
			}
		}
	}

}

// Instantiate manager
const myChar = new Merchant();

// Start the main bot loop
// (async () => {
// 	await myChar.run()//.catch(err => console.error("Bot crashed:", err));
// })();

myChar.run();

// myChar.busy = true;
// setInterval(recoverOutOfCombat, 1000);
// setInterval(async () => await myChar.upgradeAllByName("lmace", 5, 2), 1500);
// setInterval(async () => await myChar.upgradeAllByName("firestaff", 8, 1), 1500);
// setInterval(async () => await myChar.upgradeAllByName("horsecapeg", 6, 2), 1500);
// setInterval(async () => await myChar.upgradeAllByName("wingedboots", 8, 0), 1500);