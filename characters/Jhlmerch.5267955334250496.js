load_code("helpers");

const HP_POTION = "hpot0";
const MP_POTION = "mpot0";
const POTSMINSTOCK = 600;
const POT_BUFFER = 300;
const sellWhiteList = ["hpbelt", "hpamulet", "wshoes", "wcap"];

class Merchant {
	constructor() {
		this.restocking = false;
		this.transferingPotions = false;
		this.returningToGroup = false;
		this.fishing = false;
		this.atFishingSpot = false;

		// Kick off periodic tasks
		this.goFishing();
		this.restockPotions();
		this.manageInventory();
		setInterval(() => this.goFishing(), 1 * 60 * 1000);
		setInterval(() => this.restockPotions(), 5 * 60 * 1000);
		setInterval(() => this.manageInventory(), 2 * 60 * 1000);
		setInterval(() => this.mainLoop(), 1000 / 1.5);

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

	manageInventory() {
		const { used, total } = this.getInventoryUsage();
		console.log(`Inventory: ${used}/${total}`);

		// If inventory is getting full, go sell
		if (used >= 30) {
			this.restocking = true;

			console.log("Inventory threshold reached, moving to potion NPC to sell...");

			smart_move({ to: "potions" }).then(() => {
				sellItem();
			});
		}
	}

	sellItem() {
		console.log(`Checking for items to sell..`);

		for (let i = 0; i < character.items.length; i++) {
			const item = character.items[i];

			if (item && sellWhiteList.includes(item.name)) {
				sell(i, item.q || 1);
				console.log(`Sold ${item.q || 1}x ${item.name} from slot ${i}`);
			}
		}

		this.restocking = false;
	}

	async restockPotions() {
		console.log("Checking potion levels...");

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
			console.log("Potion levels sufficient, returning to leader...");

			resetFlags();
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
				(!hasBuff || remaining < 60000)
			) {
				use_skill("mluck", member);
				console.log(`Casting mluck on ${member.name}`);
				return; // cast once per loop
			}
		}
	}

	async goFishing() {
		if (is_on_cooldown("fishing")) {
			this.atFishingSpot = false;
			this.fishing = false;

			return;
		}

		const usedSlots = character.items.filter(i => i).length;
		const totalSlots = character.items.length;

		if (this.restocking || this.transferingPotions) {
			this.fishing = false;
			this.atFishingSpot = false;

			return;
		}

		if (usedSlots < totalSlots) {
			// Only attempt if not on cooldown
			if (!is_on_cooldown("fishing")) {
				this.fishing = true;
				set_message("Moving to Tristan for fishing...");

				if (!this.atFishingSpot) {
					await smart_move({ to: "fisherman" });

					await xmove(character.x - 50, character.y);
					this.atFishingSpot = true;
				}

				// Wait 5 seconds before casting
				await sleep(5000);

				if (this.atFishingSpot) {
					use_skill("fishing");
					set_message("Fishing...");
				}
			}
		} else {
			this.fishing = false;
			this.manageInventory();

			set_message("Inventory full, go sell!");
		}
	}

	mainLoop() {
		console.log(`States: restocking: ${this.restocking}, returningToGroup: ${this.returningToGroup}, transferingPotions: ${this.transferingPotions}`);
		manageParty();
		recoverOutOfCombat();
		this.buffPartyWithMLuck();

		if (this.restocking || this.returningToGroup || this.transferingPotions || this.fishing) return;

		loot();
		useHealthPotion();
		reviveSelf();
		returnToLeader();
	}

	resetFlags() {
		this.restocking = false;
		this.transferingPotions = false;
		this.returningToGroup = false;
		this.fishing = false;
		this.atFishingSpot = false;
	}

	async handleCM(sender, data) {
		const splitMsg = sender.message.split(' ');
		const command = splitMsg[0].trim();

		if (command === "need_pots") {
			const [x, y] = splitMsg[1].split(',').map(Number);
			if (this.restocking || this.returningToGroup) return;

			this.transferingPotions = true;
			set_message(`Moving to ${x}, ${y} to deliver potions...`);
			await xmove(x, y);

			const player = get_player(sender.name);
			if (!player) return;

			if (player.name.startsWith("Jhl")) {
				await this.restockPotions();

				sendPotionsTo(player.name, HP_POTION, MP_POTION, 100, 100);
				set_message(`Delivered 100 HP & MP potions to ${player.name}`);

				this.transferingPotions = false;
				await returnToLeader();
			}
		}

		if (command === "come_to_me") {
			if (this.returningToGroup || this.restocking || this.transferingPotions || this.fishing) return;
			if (!sender.name.startsWith("Jhl")) return;

			const [x, y] = splitMsg[1].split(',').map(Number);
			if (isNaN(x) || isNaN(y)) return;
			this.returningToGroup = true;

			await xmove(x, y);

			if (character.x === x && character.y === y) {
				set_message(`Arrived at group location (${x}, ${y})`);

				await this.returnToLeader();

				resetFlags();
			}
		}
	}
}

// Instantiate manager
const potionManager = new Merchant();