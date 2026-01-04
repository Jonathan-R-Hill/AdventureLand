load_code("baseClass");
load_code("helpers");
load_code("aoeFarmArea");

graphicsLimiter();

class MyChar extends BaseClass {
	lastFarmCheck = 0;
	followLeader = false;

	useSkillPurify(target) {
		if (is_on_cooldown("purify") || character.level < 60) { return; }
		if (character.mp < 450) { return; }
		// Purify is often used on the target or self depending on the need
		use_skill("purify", target);
	}

	useSkillSelfHeal() {
		if (is_on_cooldown("selfheal") || character.mp < 120) { return; }

		if (character.hp < character.max_hp - 800) {
			use_skill("selfheal");
		}
	}

	useSkillSmash(target) {
		if (is_on_cooldown("smash") || character.mp < 450) { return; }
		if (!is_in_range(target, "smash")) { return; }

		use_skill("smash", target);
	}

	async attackLogic(target) {
		this.useSkillSmash(target);
		this.useSkillPurify(target);

		await this.attack(target);

	}
}

const myChar = new MyChar();

async function mainLoop() {
	while (true) {
		try {
			if (myChar.movingToEvent || character.cc >= 170) {
				await sleep(200);
				continue;
			}

			potionUse();
			loot();

			const now = Date.now();
			if (now - myChar.lastFarmCheck > 5000 && myChar.currentMobFarm != "") {
				myChar.checkNearbyFarmMob();
				myChar.lastFarmCheck = now;
			}

			// myChar.useSkillSelfHeal();

			const target = myChar.targetLogicNonTank();
			if (target) {
				await myChar.useTemporalSurge(1200);

				myChar.moveAwayFromWarrior();

				await myChar.attackLogic(target);
			} else {
				set_message("No Target");
			}

		} catch (e) {
			console.error("Main Loop Error:", e);
		}

		let delay = ((1 / character.frequency) * 1000) / 6;
		await sleep(delay);
	}
}

mainLoop();