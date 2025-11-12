load_code("helpers");
load_code("commCommands");

const HP_POTION = "hpot0";
const MP_POTION = "mpot0";
const POTSMINSTOCK = 600;
const POT_BUFFER = 300;
const sellWhiteList = [
	"hpbelt", "hpamulet", "shoes", "coat", "pants", "strring", "intring", "vitring", "dexring", "wattire", "wshoes", "wcap", "cclaw",
	"mushroomstaff", "dexamulet", "stramulet", "intamulet", "wbreeches"
];

const bankWhitelist = [
	"spores", "seashell", "beewings", "gem0", "gem1", "whiteegg", "monstertoken", "spidersilk", "cscale", "spores",
	"rattail", "crabclaw", "bfur", "feather0", "gslime"
];

class Merchant {
	constructor() {
		this.fishingLocation = { map: "main", x: -1368, y: -82 };
		this.miningLocation = { map: "tunnel", x: -279, y: -148 };

		this.fishingEnabled = false;

		this.busy = false;

		this.fishing = false;
		this.mining = false;

		// Kick off periodic tasks
		this.restockPotions();

		this.fishingInterval = setInterval(() => this.goFishing(), 30 * 1000);
		this.miningInterval = setInterval(async () => await this.goMining(), 30 * 1000);

		setInterval(() => this.restockPotions(), 5 * 60 * 1000);
		setInterval(async () => await this.manageInventory(), 5 * 60 * 1000);
		setInterval(() => this.mainLoop(), 1000);

		// Listen for cm events
		character.on("cm", async (sender, data) => {
			await this.handleCM(sender, data);
		});
	}

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

			await this.autoCombine();

			await smart_move({ to: "potions" })
			await this.sellItem()
		}

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

	// Fishing & Mining

	async goFishing() {
		if (this.fishing && is_on_cooldown("fishing")) {
			unequip("mainhand");
			unequip("offhand");

			this.fishing = false;
			return;
		}

		if (is_on_cooldown("fishing") || this.busy || this.mining) { return; }

		const fishingRodName = "rod";
		const rodSlot = locate_item(fishingRodName);

		if (character.slots.mainhand?.name !== fishingRodName && rodSlot === -1) { return; }

		if ((character.real_x !== this.fishingLocation.x || character.real_y !== this.fishingLocation.y) && !this.fishing) {
			this.fishing = true;

			await smart_move(this.fishingLocation);
			clearInterval(this.fishingInterval);
			this.fishingInterval = setInterval(() => this.goFishing(), 20 * 1000);
		}

		unequip("mainhand");
		unequip("offhand");
		await sleep(100);

		equip(rodSlot);
		use_skill("fishing");
		set_message("Fishing...");
	}

	async goMining() {
		if (this.mining && is_on_cooldown("mining")) {
			unequip("mainhand");
			unequip("offhand");

			this.mining = false;
			return;
		}

		if (is_on_cooldown("mining") || this.busy || this.fishing) { return; }

		const pickaxeItemId = "pickaxe";

		if (character.slots.mainhand?.name !== pickaxeItemId && locate_item(pickaxeItemId) === -1) {
			return;
		}

		if (character.real_x != this.miningLocation.x && character.real_y != this.miningLocation.y && !this.mining) {
			this.mining = true;

			await smart_move(this.miningLocation);

			clearInterval(this.miningInterval);
			this.miningInterval = setInterval(async () => await this.goMining(), 30 * 1000);
		}

		if (character.real_x == this.miningLocation.x && character.real_y == this.miningLocation.y && this.mining) {
			unequip("mainhand");
			unequip("offhand");
			await sleep(100);

			equip(locate_item(pickaxeItemId));

			use_skill("mining");
		}
	}

	async mainLoop() {
		reviveSelf();
		manageParty();
		recoverOutOfCombat();

		if (this.busy || this.fishing || this.mining) return;

		this.buffPartyWithMLuck();
		loot();
		useHealthPotion();
		await returnToLeader();
	}

	resetFlags() {
		this.busy = false;
		this.mining = false;
		this.fishing = false;
	}

	async handleCM(sender, payload) {

		if (this.busy || this.fishing || this.mining) return;
		if (!sender.name.startsWith("Jhl")) return;

		const [command, data] = sender.message.split(" ");

		switch (command.trim()) {
			case "need_pots": {
				const [x, y] = data.split(",").map(Number);
				this.busy = true;

				set_message(`Moving to ${x}, ${y} to deliver potions...`);
				await xmove(x, y);

				const player = get_player(sender.name);
				if (player?.name.startsWith("Jhl")) {
					sendPotionsTo(player.name, HP_POTION, MP_POTION, 100, 100);
					set_message(`Delivered 100 HP & MP potions to ${player.name}`);
					this.busy = false;

					returnToLeader();
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
					this.waitForCoords = false;
				}
				break;
			}

			default:
				// Unknown command — ignore
				break;
		}
	}
}

// Instantiate manager
const potionManager = new Merchant();