load_code("helpers");

const HP_POTION = "hpot0";
const MP_POTION = "mpot0";
const POTSMINSTOCK = 600;
const POT_BUFFER = 300;
const sellWhiteList = [
	"hpbelt", "hpamulet", "shoes", "coat", "pants", "strring", "intring", "vitring", "dexring", "wattire", "wshoes", "wcap", "cclaw",
];
const bankWhitelist = [
	"spores", "seashell", "beewings", "gem0", "gem1", "whiteegg", "monstertoken", "spidersilk", "cscale", "spores",
	"rattail", "crabclaw", "bfur", "feather0",
];

class Merchant {
	constructor() {
		this.fishingEnabled = false;

		this.restocking = false;
		this.transferingPotions = false;
		this.returningToGroup = false;

		this.fishing = false;
		this.movingToFishingPoint = false;
		this.atFishingSpot = false;

		// Kick off periodic tasks
		this.goFishing();
		this.restockPotions();
		this.fishingInterval = setInterval(() => this.goFishing(), 45 * 1000);
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

		if (this.restocking) { return; }

		// If inventory is getting full, go sell
		if (used >= 30) {
			this.restocking = true;

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

		this.restocking = false;
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
			this.restocking = true;
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

	async goFishing() {
		if (!this.fishingEnabled) { return; }

		if (is_on_cooldown("fishing")) {
			this.atFishingSpot = false;
			this.fishing = false;
			this.movingToFishingPoint = false;

			return;
		}

		if (this.restocking || this.transferingPotions) {
			this.fishing = false;
			this.atFishingSpot = false;
			this.movingToFishingPoint = false;

			return;
		}

		// Only attempt if not on cooldown
		if (!is_on_cooldown("fishing")) {
			this.fishing = true;
			set_message("Moving to Tristan for fishing...");

			if (!this.atFishingSpot) {
				if (this.movingToFishingPoint) { return; }

				if (!is_on_cooldown("use_town")) {
					use_skill("use_town");
					// Give time for teleport animation
					await sleep(4200);
				}

				this.sellItem();

				await smart_move({ to: "potions" });

				// Step 3: Custom offsets
				set_message("Walking custom path...");

				// Down
				move(character.x, character.y + 50);

				// Left
				await move(character.x - 60, character.y);

				// Down a bit
				await move(character.x, character.y + 70);

				// Left a lot more
				await move(character.x - 1700, character.y);

				this.atFishingSpot = true;
			}

			this.atSpotFish();
			this.goFishingInterval = setInterval(() => this.atSpotFish(), 18 * 1000);
		}
	}

	async atSpotFish() {
		if (this.atFishingSpot) {
			clearInterval(this.fishingInterval);

			move(character.x - 50, character.y);
			use_skill("fishing");
			set_message("Fishing...");
		}

		if (is_on_cooldown("fishing")) {
			clearInterval(this.goFishingInterval);
			this.fishingInterval = setInterval(() => this.goFishing(), 45 * 1000);
			this.resetFlags();

			if (!is_on_cooldown("use_town")) {
				use_skill("use_town");
				// Give time for teleport animation
				await sleep(4200);
			}
		}
	}

	async mainLoop() {
		reviveSelf();
		manageParty();
		recoverOutOfCombat();
		this.buffPartyWithMLuck();

		if (this.restocking || this.returningToGroup || this.transferingPotions || this.fishing) return;

		loot();
		useHealthPotion();
		await returnToLeader();
	}

	resetFlags() {
		this.restocking = false;
		this.transferingPotions = false;
		this.returningToGroup = false;

		this.fishing = false;
		this.movingToFishingPoint = false;
		this.atFishingSpot = false;
	}

	async handleCM(sender, payload) {
		if (this.restocking || this.transferingPotions || this.fishing || this.returningToGroup) return;
		if (!sender.name.startsWith("Jhl")) return;

		const [command, data] = sender.message.split(" ");

		switch (command.trim()) {
			case "need_pots": {
				const [x, y] = data.split(",").map(Number);
				this.transferingPotions = true;

				set_message(`Moving to ${x}, ${y} to deliver potions...`);
				await xmove(x, y);

				const player = get_player(sender.name);
				if (player?.name.startsWith("Jhl")) {
					sendPotionsTo(player.name, HP_POTION, MP_POTION, 100, 100);
					set_message(`Delivered 100 HP & MP potions to ${player.name}`);
					this.transferingPotions = false;

					returnToLeader();
				}
				break;
			}

			case "come_to_me": {
				const [xStr, yStr, map] = data.split(",");
				const x = Number(xStr);
				const y = Number(yStr);

				this.returningToGroup = true;

				console.log(xStr, yStr, map)
				if (map && character.map !== map) {
					await smart_move({ to: map });
				}
				await xmove(x, y);

				if (character.x === x && character.y === y) {
					set_message(`Arrived at group location (${x}, ${y})`);
					this.returningToGroup = false;
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