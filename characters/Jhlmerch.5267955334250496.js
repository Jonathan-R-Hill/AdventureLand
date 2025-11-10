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
		this.movingToFishingPoint = false;
		this.atFishingSpot = false;

		// Kick off periodic tasks
		this.goFishing();
		this.restockPotions();
		this.manageInventory();
		this.fishingInterval = setInterval(() => this.goFishing(), 45 * 1000);
		setInterval(() => this.restockPotions(), 5 * 60 * 1000);
		setInterval(() => this.manageInventory(), 2 * 60 * 1000);
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

	manageInventory() {
		const { used, total } = this.getInventoryUsage();
		console.log(`Inventory: ${used}/${total}`);

		// If inventory is getting full, go sell
		if (used >= 30) {
			this.restocking = true;

			smart_move({ to: "potions" }).then(() => {
				sellItem();
			});
		}
	}

	sellItem() {
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
		console.log(`X: ${character.x}, Y: ${character.y} - Map: ${character.map} - Checking fishing status...`);
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

	async handleCM(sender, data) {
		const splitMsg = sender.message.split(' ');
		const command = splitMsg[0].trim();

		if (command === "need_pots") {
			if (this.restocking || this.transferingPotions || this.fishing) {
				return;
			}

			const [x, y] = splitMsg[1].split(',').map(Number);
			if (this.restocking || this.returningToGroup) return;

			this.transferingPotions = true;
			set_message(`Moving to ${x}, ${y} to deliver potions...`);
			await xmove(x, y);

			const player = get_player(sender.name);
			if (!player) return;

			if (player.name.startsWith("Jhl")) {
				sendPotionsTo(player.name, HP_POTION, MP_POTION, 100, 100);
				set_message(`Delivered 100 HP & MP potions to ${player.name}`);

				this.transferingPotions = false;
				returnToLeader();
			}
		}

		if (command === "come_to_me") {
			if (this.returningToGroup || this.restocking || this.transferingPotions || this.fishing || this.movingToFishingPoint) {
				return;
			}
			if (!sender.name.startsWith("Jhl")) return;

			const [x, y] = splitMsg[1].split(',').map(Number);
			if (isNaN(x) || isNaN(y)) return;
			this.returningToGroup = true;

			await xmove(x, y);

			const dx = character.x - x;
			const dy = character.y - y;
			const dist = Math.sqrt(dx * dx + dy * dy);

			if (dist <= 10) {
				set_message(`Arrived at group location (${x}, ${y})`);
				this.resetFlags();
				returnToLeader();
			}
		}
	}
}

// Instantiate manager
const potionManager = new Merchant();