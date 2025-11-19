load_code("helpers");
load_code("commCommands");

const HP_POTION = "hpot1";
const MP_POTION = "mpot1";
const POTSMINSTOCK = 1200;
const POT_BUFFER = 600;

const sellWhiteList = [
	"hpbelt", "hpamulet", "shoes", "coat", "pants", "strring", "intring", "vitring", "dexring",
	"cclaw", "mushroomstaff", "dexamulet", "stramulet", "intamulet", "slimestaff", "stinger",
	"wattire", "wshoes", "wcap", "wbreeches", // Wanders set
	"helmet1", "pants1", "coat1", "gloves1", "shoes1", // Rugged set
];

const bankWhitelist = [
	"spores", "seashell", "beewings", "gem0", "gem1", "whiteegg", "monstertoken", "spidersilk", "cscale", "spores",
	"rattail", "crabclaw", "bfur", "feather0", "gslime", "ringsj", "smush", "lostearring", "spiderkey", "snakeoil",
	"ascale", "gemfragment",
];

class Merchant {
	constructor() {
		this.deliveryList = [];

		this.fishingLocation = { map: "main", x: -1368, y: -82 };
		this.miningLocation = { map: "tunnel", x: -279, y: -148 };

		this.busy = false;

		this.fishing = false;
		this.mining = false;

		this.restockPotions();

		this.miningInterval = setInterval(async () => await this.goMining(), 30 * 1000);
		this.fishingInterval = setInterval(async () => await this.goFishing(), 11 * 1000);

		setInterval(() => this.restockPotions(), 5 * 60 * 1000);
		setInterval(async () => await this.manageInventory(), 5 * 60 * 1000);
		setInterval(() => this.healAndBuff(), 1000);
		setInterval(() => this.returnHome(), 20 * 1000);
		setInterval(() => {
			if (this.busy || this.fishing || this.mining) { return; }
			const { used, total } = this.getInventoryUsage();
			if (used < 15) { return; }
			this.sellItem();
		}, 10 * 1000);
		setInterval(() => this.resetFlags(), 300 * 1000);
		setInterval(async () => await this.processDeliveries(), 10 * 1000);

		character.on("cm", async (sender, data) => {
			await this.handleCM(sender, data);
		});
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

				if (character.x === x && character.y === y) {
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

	getItemSlot(name) {
		for (let i = 0; i < character.items.length; i++) {
			const item = character.items[i];
			if (item && item.name === name) return i;
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
			await this.sendPotionsTo(request.name, HP_POTION, MP_POTION, 200, 0);
		} else if (request.type === "need_Mpots") {
			await this.sendPotionsTo(request.name, HP_POTION, MP_POTION, 0, 200);
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
			if (character.items[i]) used++;
		}

		return { used, total: character.items.length };
	}

	async manageInventory() {
		const { used, total } = this.getInventoryUsage();
		console.log(`Inventory: ${used}/${total}`);

		if (this.busy) { return; }

		// If inventory is getting full, go sell
		if (used >= 30) {
			this.busy = true;

			await smart_move({ to: "potions" });
			await this.sellItem();
		}

	}

	async sellItem() {
		for (let i = 0; i < character.items.length; i++) {
			const item = character.items[i];

			if (item && sellWhiteList.includes(item.name)) {
				sell(i, item.q || 1);
				console.log(`Sold ${item.q || 1}x ${item.name} from slot ${i}`);
			}
		}

		await this.autoCombine();
	}

	async autoCombine(itemName = "ringsj", itemLevel = 0) {
		const slots = [];
		for (let i = 0; i < character.items.length; i++) {
			const item = character.items[i];

			if (item && item.name === itemName && item.level === itemLevel) {
				slots.push(i);

				if (slots.length === 3) { break; }
			}
		}

		if (slots.length === 3) {

			let scrollSlot = locate_item("cscroll0");
			if (scrollSlot === -1) {
				await smart_move({ to: "scrolls" });
				buy("cscroll0", 1);
				scrollSlot = locate_item("cscroll0");

				if (scrollSlot === -1) {
					game_log("Failed to acquire compound scroll");
					return;
				}
			}

			compound(slots[0], slots[1], slots[2], scrollSlot);

			await sleep(2000);
		}

		await this.bankItems();
	}

	async bankItems() {
		if (character.map !== "bank") {
			await smart_move({ to: "bank" });
		}

		for (let i = 0; i < character.items.length; i++) {
			const item = character.items[i];
			if (!item) continue;

			if (bankWhitelist.includes(item.name)) {
				bank_store(i);
			}
		}

		await smart_move({ to: "potions" });

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
			const hasBuff = member.s && member.s.mluck;
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
	returnHome() {
		if (!this.busy && !this.fishing && !this.mining) {
			this.equipBroom();

			set_message("On call..");

			if (character.map !== "main") {
				smart_move({ map: "main" });
			} else {
				if (Math.abs(character.real_x) <= 100 && Math.abs(character.real_y) <= 100) {
					console.log("No need to move");
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
		if (this.fishing && is_on_cooldown("fishing")) {
			this.fishing = false;
			set_message("Finished Fishing");
			return;
		}

		if (is_on_cooldown("fishing") || this.busy || this.mining) return;

		const fishingRodName = "rod";

		if (character.slots.mainhand?.name !== fishingRodName && locate_item(fishingRodName) === -1) {
			return;
		}

		if (parent.distance(character, this.fishingLocation) > 2) {
			if (!this.fishing) {
				this.equipBroom();
				this.fishing = true;

				await smart_move(this.fishingLocation);
			}
		}

		if (this.fishing && parent.distance(character, this.fishingLocation) < 2) {
			equip(locate_item(fishingRodName));
			await sleep(20);
			if (!character.c.fishing) {
				use_skill("fishing");
			}
		}
	}

	async goMining() {
		if (this.mining && is_on_cooldown("mining")) {
			this.mining = false;

			set_message("Finished Mining");
			return;
		}

		if (is_on_cooldown("mining") || this.busy || this.fishing) { return; }

		const pickaxeItemId = "pickaxe";

		if (character.slots.mainhand?.name !== pickaxeItemId && locate_item(pickaxeItemId) === -1) {
			return;
		}

		if (character.real_x != this.miningLocation.x && character.real_y != this.miningLocation.y && !this.mining) {
			this.equipBroom();
			this.mining = true;

			await smart_move(this.miningLocation);

			clearInterval(this.miningInterval);
			this.miningInterval = setInterval(async () => await this.goMining(), 30 * 1000);
		}

		if (character.real_x == this.miningLocation.x && character.real_y == this.miningLocation.y && this.mining) {
			equip(locate_item(pickaxeItemId));

			use_skill("mining");
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
const potionManager = new Merchant();