load_code("baseClass");
load_code("helpers");

graphicsLimiter();

class MyChar extends BaseClass {
	lastFarmCheck = 0;
	lastSnowmanCheck = 0;
	cburstpull = false;

	// currentMobFarm = "Arctic Bee";
	// secondaryTarget = "Arctic Bee";

	useSkillCBurst() {
		const USE_ABOVE_MANA = 3000;
		if (character.mp > USE_ABOVE_MANA && !is_on_cooldown("cburst") && this.cburstpull) {
			let targets = [];
			let totalCost = 0;
			for (let id in parent.entities) {
				let entity = parent.entities[id];
				if (entity.type === "monster" && entity.target !== this.tank && is_in_range(entity, "cburst")) {
					targets.push(entity);
					totalCost += 80;
				}
				if (totalCost >= USE_ABOVE_MANA - 80) { break; }
			}
			if (targets.length > 0) {
				use_skill("cburst", targets);
			}
		}
	}

	useSkillPort(char) {
		const USE_ABOVE_MANA = 920;
		if (is_on_cooldown("magiport") || character.mp <= USE_ABOVE_MANA) { return; }
		use_skill("magiport", char);
	}

	useSkillEnergize() {
		const priest = get_player("Jhlpriest");
		const war = get_player("Jhlwarrior");

		if (character.mp < 1000) { return; }

		if (priest && priest.mp <= 600 && !is_on_cooldown("energize")) {
			use_skill("energize", priest);
			return;
		}
		if (war && war.mp <= 200 && !is_on_cooldown("energize")) {
			use_skill("energize", war); // Corrected to target war
			return;
		}
	}

	snowmanPort() {
		if (!parent.S || !parent.S.snowman || !parent.S.snowman.live) { return; }
		const snowman = get_nearest_monster({ type: "snowman" });

		if (!snowman || distance(character, snowman) >= 900) {
			return;
		}

		if (!get_player("Jhlpriest")) {
			this.useSkillPort("Jhlpriest");
		}
		if (!get_player("Jhlranger")) {
			this.useSkillPort("Jhlranger");
		}
	}

	async weaponLogic(target) {
		let targets = [];
		for (let id in parent.entities) {
			let entity = parent.entities[id];
			if ((this.myCharacters.includes(entity.target) || entity.target === "trololol")
				&& entity.type === "monster" && this.is_in_range(entity)) {
				targets.push(entity);
			}
		}

		if (target.name == 'Snowman' && !target.s.fullguardx) {
			this.equipItem("wand", 7, "mainhand");
			this.equipItem("wbook0", 4, "offhand");
		}
		else if (targets.length >= 3) {
			if (this.isEquipped("sparkstaff", 5)) { return; }

			this.removeWeapons();
			this.equipItem("sparkstaff", 5, "mainhand");
		}
		else {
			this.equipItem("harbringer", 6, "mainhand");
			this.equipItem("wbook0", 4, "offhand");
		}

		await sleep(20);
	}
}

const myChar = new MyChar(character.name);

async function mainLoop() {
	while (true) {
		try {
			if (myChar.gettingBuff || character.cc >= 190) {
				await sleep(100);
				continue;
			}

			const now = Date.now();

			if (now - myChar.lastSnowmanCheck > 2000) {
				myChar.snowmanPort();
				myChar.lastSnowmanCheck = now;
			}

			// Periodic Farm Check
			if (now - myChar.lastFarmCheck > 5000 && !myChar.gettingBuff && myChar.currentMobFarm != "") {
				myChar.checkNearbyFarmMob();
				myChar.lastFarmCheck = now;
			}

			potionUse()
			loot();

			// Combat Logic
			const target = myChar.targetLogicNonTank();
			if (target) {
				if (myChar.kite) { myChar.kiteTarget(); }
				myChar.moveAwayFromWarrior();

				myChar.useSkillEnergize();
				await myChar.useTemporalSurge(2000);

				await myChar.weaponLogic(target);

				myChar.attack(target);
			} else {
				set_message("No Target");
			}

		} catch (e) {
			console.error("Mage Loop Error:", e);
		}

		let delay = ((1 / character.frequency) * 1000) / 6;
		await sleep(delay);
	}
}

mainLoop();