load_code("baseClass");
load_code("helpers");

class MyChar extends BaseClass {

	lastFarmCheck = 0;

	buffNearbyPlayers() {
		// Collect all visible players around
		if (character.s.rspeed && character.s.rspeed.ms < 400000) {
			if (can_use("rspeed") && character.mp > 400) {
				use_skill("rspeed", character);
				game_log(`Buffed ${character.name} with rspeed`);
			}
		}

		const nearbyPlayers = Object.values(parent.entities)
			.filter(ent => ent.type === "character" && !ent.rip && ent.visible);

		for (const player of nearbyPlayers) {
			const hasBuff = player.s?.rspeed;
			if (hasBuff && hasBuff.ms > 400000) { continue; }

			// Cast rspeed on them
			if (can_use("rspeed") && character.mp > 400) {
				use_skill("rspeed", player);
				game_log(`Buffed ${player.name} with rspeed`);
			}
		}
	}

	rogueLogic(target) {
		if (!is_on_cooldown("invis")) {
			use_skill(("invis"));
		}

		this.attack(target);
	}

}

const myChar = new MyChar(character.name);

setInterval(() => myChar.buffNearbyPlayers(), 3 * 1000);

setInterval(async function () {
	if (myChar.gettingBuff) { return; }

	const now = Date.now();
	if (now - myChar.lastFarmCheck > 5000) {
		myChar.checkNearbyFarmMob();
		myChar.lastFarmCheck = now;
	}

	useHealthPotion();
	useManaPotion();
	recoverOutOfCombat();
	loot();

	const target = await myChar.targetLogicNonTank();
	if (target == null) { return; }

	if (myChar.kite) { myChar.kiteTarget(); }

	myChar.rogueLogic(target);

}, ((1 / character.frequency) * 1000) / 8);

