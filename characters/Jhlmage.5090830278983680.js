load_code("baseClass");
load_code("helpers");

class MyChar extends BaseClass {

	lastFarmCheck = 0;
	cburstpull = false;

	currentMobFarm = `Arctic Bee`;
	secondaryTarget = `Arctic Bee`;

	useSkillCBurst() {
		const USE_ABOVE_MANA = 3000;
		if (character.mp > USE_ABOVE_MANA && !is_on_cooldown("cburst") && this.cburstpull) {

			let targets = [];
			let totalCost = 0
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

		if (priest && priest.mp <= 1000 && !is_on_cooldown("energize")) {
			use_skill("energize", priest);

			return;
		}

		if (war && war.mp <= 450 && !is_on_cooldown("energize")) {
			use_skill("energize", priest);

			return;
		}
	}

	snowmanPort() {
		if (!parent.S.snowman.live) { return; }

		const snowman = get_nearest_monster({ type: "snowman" });


		if (!snowman || this.distance(mage, snowman) >= 900) {
			// Snowman not visible or too far away
			return;
		}

		if (!get_player("Jhlpriest")) {
			this.useSkillPort("Jhlpriest");
		}

		if (!get_player("Jhlranger")) {
			this.useSkillPort("Jhlranger");
		}
	}

	weaponLogic(target) {
		if (target.name == 'Snowman' && !target.s.fullguardx) {
			this.equipItem("wand", 7, "mainhand");
		}
		else {
			this.equipItem("harbringer", 6, "mainhand");
		}
	}
}

const myChar = new MyChar(character.name);

setInterval(myChar.snowmanPort, 2000);
setInterval(async () => {
	if (myChar.gettingBuff) { return; }

	const now = Date.now();
	if (now - myChar.lastFarmCheck > 5000 && !myChar.gettingBuff && myChar.currentMobFarm != "") {
		myChar.checkNearbyFarmMob();
		myChar.lastFarmCheck = now;
	}

	useHealthPotion();
	useManaPotion();
	recoverOutOfCombat();
	loot();

	const target = await myChar.targetLogicNonTank();
	if (target == null) { return; }

	myChar.movingToNewMob = false;
	if (myChar.kite) { myChar.kiteTarget(); }
	myChar.moveAwayFromWarrior();

	myChar.useSkillEnergize();

	myChar.weaponLogic(target);

	myChar.attack(target);

}, ((1 / character.frequency) * 1000) / 8);


