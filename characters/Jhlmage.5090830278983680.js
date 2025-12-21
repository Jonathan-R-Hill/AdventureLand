load_code("baseClass");
load_code("helpers");

class MyChar extends BaseClass {
	useSkillCBurst() {
		const USE_ABOVE_MANA = 3000;
		if (character.mp > USE_ABOVE_MANA && !is_on_cooldown("cburst") && cburstpull === 1) {

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
}

const myChar = new MyChar(character.name);

setInterval(function () {
	if (myChar.gettingBuff) { return; }

	const target = myChar.targetLogicNonTank();
	if (target == null) { return; }

	if (myChar.kite) { myChar.kiteTarget(); }
	myChar.attack(target);

}, 1000 / 4);


