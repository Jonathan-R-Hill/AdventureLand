load_code("helpers");
load_code("commCommands");
load_code("combineItems");

const HP_POTION = "hpot1";
const MP_POTION = "mpot1";
const POTSMINSTOCK = 2000;
const POT_BUFFER = 600;

const sellWhiteList = [
	"hpbelt", "hpamulet", "shoes", "coat", "vitring", //"pants",
	"cclaw", "mushroomstaff", "slimestaff", "stinger", "vitearring", "glolipop", "quiver",
	"wattire", "wshoes", "wcap", "wbreeches", "wgloves", // Wanders set
	"helmet1", "pants1", "coat1", "gloves1", "shoes1", // Rugged set
	"xmace", "xbow", "merry", "snowball", "mittens", "xmashat", "rednose", "candycanesword", "xmassweater", "xmaspants", "xmasshoes", "warmscarf",
	"iceskates",
	// "santasbelt", "ornamentstaff",
];

const bankWhitelist = [
	// Exchangables
	"seashell", "gem0", "gem1", "monstertoken", "gemfragment", "armorbox", "weaponbox",
	"ornament", "mistletoe", "candycane", "leather",
	// Keyes
	"spiderkey", "frozenkey",
	// Upgrades
	"ringsj", "lostearring", "intearring", "strearring", "dexearring",
	"wbook0", "dexamulet", "stramulet", "intamulet", "candy1",
	"strring", "intring", "dexring",
	// Pots
	"elixirint0", "elixirint1", "elixirint2",
	"elixirstr0", "elixirstr1", "elixirstr2",
	"elixirdex0", "elixirdex1", "elixirdex2",
	"elixirvit0", "elixirvit1", "elixirvit2",
	// Mats
	"spores", "beewings", "whiteegg", "spidersilk", "cscale", "rattail", "crabclaw", "bfur", "feather0", "gslime", "smush",
	"snakeoil", "ascale", "snakefang", "vitscroll", "essenceoffire", "essenceoffrost", "carrot", "snowball", "frogt", "ink",
	"sstinger",
	// Misc
	"offeringp", "offering", "funtoken",
	"x0", "x1", "x2", "x3", "x4", "x5", "x6", "x7", "x8", "x9",
];

const dismantleList = [
	"firebow", "fireblade", "firestaff",
];

class Merchant extends combineItems {
	constructor() {
		super()
		this.deliveryList = [];

		this.fishingLocation = { map: "main", x: -1368, y: -82 };
		this.miningLocation = { map: "tunnel", x: -279, y: -148 };

		this.busy = false;
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
		};

		scaleUI(0.80);

		setInterval(async () => await this.mainLoop(), 1000);
		setInterval(exportCharacterData, 8 * 1000);

		character.on("cm", async (sender, data) => {
			await this.handleCM(sender, data);
		});

	}

	checkIfDoingSOmething() {
		return this.busy || this.fishing || this.mining;
	}

	async mainLoop() {
		const now = Date.now();

		if (character.rip) { this.resetFlags; }

		if (now - this.lastRun.resetFlags > 10 * 60 * 1000) {
			this.lastRun.resetFlags = now;
			this.resetFlags();
		}

		// if (now - this.lastRun.autoUpgrade > 15 * 60 * 1000) {
		// 	if (!this.checkIfDoingSOmething()) {
		// 		this.lastRun.autoUpgrade = now;
		// 		await this.buyAndUpgrade("pants", 7);
		// 	}
		// }

		if (now - this.lastRun.buffs > 10_000) {
			if (!this.checkIfDoingSOmething()) {
				this.lastRun.buffs = now;
				await this.handleHolidayBuffs();
			}
		}

		if (now - this.lastRun.exchange > 5 * 60 * 1000) {
			if (!this.checkIfDoingSOmething()) {
				this.lastRun.exchange = now;
				await this.exchangeItems();
			}
		}

		if (now - this.lastRun.combine > 3 * 60 * 1000) {
			if (!this.checkIfDoingSOmething()) {
				this.lastRun.combine = now;

				const upgrades = [
					"intearring", "strearring", "dexearring", "ringsj", "strring", "intring", "dexring", // Rings & Earrings
					"wbook0", // Books
					"dexamulet", "stramulet", "intamulet", // Necks

				];
				const levels = [0, 1, 2];

				for (const item of upgrades) {
					await this.autoCombineItems(item, levels);
				}

				await this.bankItems()
			}
		}

		if (now - this.lastRun.processDeliveries > 10_000) {
			if (!this.checkIfDoingSOmething() && this.deliveryList.length > 0) {
				this.lastRun.processDeliveries = now;
				await this.processDeliveries();
			}
		}

		if (now - this.lastRun.fishing > 11_000) {
			if (!this.busy && !this.mining) {
				this.lastRun.fishing = now;
				await this.goFishing();
			}
		}

		if (now - this.lastRun.mining > 12_000) {
			if (!this.busy && !this.fishing) {
				this.lastRun.mining = now;
				await this.goMining();
			}
		}

		if (now - this.lastRun.restock > 300_000) {
			if (!this.checkIfDoingSOmething()) {
				this.lastRun.restock = now;
				await this.restockPotions();
			}
		}

		if (now - this.lastRun.dismantle > 200_000) {
			if (!this.checkIfDoingSOmething()) {
				this.lastRun.dismantle = now;
				await this.dismantleFireWeapons();
			}
		}

		if (now - this.lastRun.manageInventory > 300_000) {
			if (!this.checkIfDoingSOmething()) {
				this.lastRun.manageInventory = now;
				await this.manageInventory();
			}
		}

		if (now - this.lastRun.healBuff > 1_000) {
			this.lastRun.healBuff = now;
			await this.healAndBuff();
		}

		if (now - this.lastRun.returnHome > 20_000) {
			this.lastRun.returnHome = now;
			if (!this.checkIfDoingSOmething()) {
				await this.returnHome();
			}
		}

		if (now - this.lastRun.sellCheck > 10_000) {
			this.lastRun.sellCheck = now;
			if (!this.checkIfDoingSOmething()) {
				const { used } = this.getInventoryUsage();
				if (used >= 15) {
					this.sellItems();

					await this.bankItems();
				}
			}
		}
	}

	async handleCM(sender, payload) {
		if (this.busy || this.fishing || this.mining) return;
		if (!sender.name.startsWith("Jhl")) return;

		this.equipBroom();

		const [command, data] = sender.message.split(" ");

		switch (command.trim()) {
			case "need_Hpots": {
				const [xStr, yStr, map] = data.split(",");
				const x = Number(xStr);
				const y = Number(yStr);

				await this.handlePotionRequest(sender.name, "need_Hpots", x, y, map);

				const player = get_player(sender.name);
				if (!player) {
					this.busy = false;
				}

				break;
			}

			case "need_Mpots": {
				const [xStr, yStr, map] = data.split(",");
				const x = Number(xStr);
				const y = Number(yStr);

				this.handlePotionRequest(sender.name, "need_Mpots", x, y, map);

				const player = get_player(sender.name);
				if (!player) {
					this.busy = false;
				}

				break;
			}

			case "come_to_me": {
				const [xStr, yStr, map] = data.split(",");
				const x = Number(xStr);
				const y = Number(yStr);

				this.busy = true;

				console.log(xStr, yStr, map)
				if (map && character.map !== map) {
					await smart_move({ to: map });
				}

				await xmove(x, y);

				if (this.distance(character, { x, y }) <= 2) {
					set_message(`Arrived at group location (${x}, ${y})`);
					this.busy = false;
				}

				break;
			}

			case "need_luck": {
				const [xStr, yStr, map] = data.split(",");
				const x = Number(xStr);
				const y = Number(yStr);

				this.busy = true;

				if (map && character.map !== map) {
					await smart_move({ to: map });
				}
				await xmove(x, y);

				if (character.x === x && character.y === y) {
					const target = get_player(sender.name);
					if (target && !is_on_cooldown("mluck")) {
						use_skill("mluck", target);
						set_message(`Buffed ${sender.name} with MLuck`);
					}

					this.busy = false;
				}

				break;
			}

			default:
				// Unknown command — ignore
				break;
		}
	}

	async handleHolidayBuffs() {
		if (needChristmasBuff()) {
			this.busy = true;
			await getChristmasBuff();
		}
		else {
			this.busy = false;
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
		const alreadyQueued = this.deliveryList.some(
			req => req.name === name && req.type === type
		);
		if (!alreadyQueued) {
			game_log(`Added request for ${type} from ${name}`);
			this.deliveryList.push({ name, type, x, y, map });
		}
	}

	async processDeliveries() {
		if ((this.busy || this.mining || this.fishing) || this.deliveryList.length === 0) return;

		const request = this.deliveryList[0];
		this.busy = true;

		if (character.map !== request.map) {
			await smart_move({ map: request.map });
		}
		await smart_move({ x: request.x, y: request.y });

		if (request.type === "need_Hpots") {
			await this.sendPotionsTo(request.name, HP_POTION, MP_POTION, 350, 0);
		} else if (request.type === "need_Mpots") {
			await this.sendPotionsTo(request.name, HP_POTION, MP_POTION, 0, 350);
		}

		this.deliveryList.shift();
		this.busy = false;

		if (this.deliveryList.length > 0) {
			await this.processDeliveries();
		}
	}

	async sendPotionsTo(name, hpPotion, mpPotion, hpAmount = 200, mpAmount = 200) {
		let player = get_player(name);
		const start = Date.now();
		while ((!player || parent.distance(character, player) > 400) && Date.now() - start < 5000) {
			await sleep(250);
			player = get_player(name);
		}

		if (!player || parent.distance(character, player) > 400) {
			game_log(`❌ Could not deliver potions to ${name}`);
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
		if (used >= 20) {
			this.busy = true;

			await smart_move({ to: "potions" });
			await sleep(500);

			this.sellItems();
		}
	}

	sellItems() {
		if (character.map !== "main") { return; }
		if (this.distance(character, { x: 0, y: 0 }) > 220) { return; }

		for (let i = 0; i < character.items.length; i++) {
			const item = character.items[i];

			if (item && sellWhiteList.includes(item.name)) {
				sell(i, item.q || 1);
				console.log(`Sold ${item.q || 1}x ${item.name} from slot ${i}`);
			}
		}

		this.busy = false;
	}

	async bankItems() {
		if (character.map !== "bank") {
			await smart_move({ to: "bank" });
		}

		for (let i = 0; i < character.items.length; i++) {
			const item = character.items[i];
			if (!item) { continue; }

			if (bankWhitelist.includes(item.name)) {
				bank_store(i);
				await sleep(10);
			}
		}

		this.busy = false;
	}

	// Dismantle
	async dismantleFireWeapons() {
		this.busy = true;

		const dismantleSlots = [];
		for (let i = 0; i < character.items.length; i++) {
			const item = character.items[i];
			if (!item) { continue; }

			if (item.name && dismantleList.includes(item.name) && item.level == 0) {
				dismantleSlots.push(i);
			}
		}

		if (dismantleSlots.length === 0) {
			this.busy = false;

			return;
		}

		await smart_move({ x: 29.10676790733877, y: 651.4848803418221, map: `main` });

		for (const slot of dismantleSlots) {
			try {
				dismantle(slot);
				game_log(`Dismantled ${character.items[slot].name} in slot ${slot}`);
			} catch (e) {
				game_log(`Failed to dismantle slot ${slot}: ${e}`);
			}
		}

		this.busy = false;
	}

	// Auto Exchange
	async exchangeItems() {
		this.busy = true;

		await smart_move({ to: "bank" });

		const exchangeableItems = [
			{ item: "gem0", min: 1, x: 30.92, y: -381.1, map: "main" },
			{ item: "gem1", min: 1, x: 30.92, y: -381.1, map: "main" },
			{ item: "seashell", min: 20, x: -1496, y: 580, map: "main" }
		];

		let itemSlot = -1;
		let currentKey = null;
		let exchInfo = null;
		const slots = [];

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
				await smart_move({ x: exch.x, y: exch.y, map: exch.map });

				game_log(`Exchanging item in slot ${itemSlot}: ${character.items[itemSlot].name}`);
				break;
			}
		}



		if (itemSlot === -1) { this.busy = false; return; } // nothing to exchange

		const item = character.items[itemSlot];

		for (let i = 0; i < item.q / exchInfo.min; i++) {

			if (item.q < exchInfo.min) { break; } // not enough to exchange

			exchange(itemSlot);
			await sleep(6000);

			// Re‑find slot
			itemSlot = this.getItemSlot(currentKey);
			if (itemSlot === -1) { break; } // no more to exchange
		}

		this.busy = false;
	}

	// restock & buff
	async restockPotions() {
		const currentHp = countItem(HP_POTION);
		const currentMp = countItem(MP_POTION);

		if (currentHp < POT_BUFFER || currentMp < POT_BUFFER) {
			this.busy = true;
			set_message("Restocking potions...");
			await smart_move({ to: "potions" });

			if (currentHp < POTSMINSTOCK) buy(HP_POTION, POTSMINSTOCK - currentHp);
			if (currentMp < POTSMINSTOCK) buy(MP_POTION, POTSMINSTOCK - currentMp);

			set_message("Potions restocked!");
		}

		if (currentHp >= POT_BUFFER && currentMp >= POT_BUFFER) {
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
				(!hasBuff || remaining < 2600000)
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

			if (character.map !== "main") {
				await smart_move({ map: "main" });
			} else {
				if (Math.abs(character.real_x) <= 100 && Math.abs(character.real_y) <= 100) {
					console.log("No need to move");

					await this.sellItems();
					return;
				} else {
					use_skill("use_town");
				}
			}

		}
	}

	// Fishing & Mining
	async goFishing() {
		console.log(`busy: ${this.busy}, fishing: ${this.fishing}, mining: ${this.mining}`);

		const fishingRodName = "rod";

		if ((this.fishing && is_on_cooldown("fishing"))
			|| (character.slots.mainhand?.name !== fishingRodName && locate_item(fishingRodName) === -1)
		) {
			this.fishing = false;
			this.equipBroom();
			set_message("Finished Fishing");

			return;
		}

		if (is_on_cooldown("fishing") || this.busy || this.mining) { return; }

		if (parent.distance(character, this.fishingLocation) > 2) {
			if (!this.fishing) {
				this.equipBroom();
				this.fishing = true;

				await smart_move(this.fishingLocation);
			}
		}

		if (this.fishing && parent.distance(character, this.fishingLocation) < 2) {
			if (!character.c.fishing) {
				useManaPotion();

				equip(locate_item(fishingRodName));
				await sleep(80);

				use_skill("fishing");
			}
		}
	}

	async goMining() {
		const pickaxeItemId = "pickaxe";

		if ((this.mining && is_on_cooldown("mining")) || character.slots.mainhand?.name !== pickaxeItemId && locate_item(pickaxeItemId) === -1) {
			this.mining = false;
			this.equipBroom();

			set_message("Finished Mining");
			return;
		}

		if (is_on_cooldown("mining") || this.busy || this.fishing) { return; }

		if (character.real_x != this.miningLocation.x && character.real_y != this.miningLocation.y && !this.mining) {
			this.equipBroom();
			this.mining = true;

			await smart_move(this.miningLocation);
		}

		if (character.real_x == this.miningLocation.x && character.real_y == this.miningLocation.y && this.mining) {
			useManaPotion();
			await sleep(50);

			equip(locate_item(pickaxeItemId));

			if (!character.c.mining) {
				use_skill("mining");
			}
		}
	}

	async healAndBuff() {
		reviveSelf();
		manageParty();


		if (this.fishing || this.mining) { return; }
		useHealthPotion();
		recoverOutOfCombat();

		this.buffPartyWithMLuck();
		loot();
	}

	resetFlags() {
		this.busy = false;
		this.mining = false;
		this.fishing = false;
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