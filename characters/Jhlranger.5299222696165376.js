load_code("baseClass");
load_code("helpers");

class MyChar extends BaseClass {
    lastFarmCheck = 0;
    aoeFarming = false;

    skillThreeShot() {
        if (is_on_cooldown("3shot") || character.mp <= character.max_mp * 0.50) { return; }

        let targets = [];
        for (let id in parent.entities) {
            let entity = parent.entities[id];
            if ((entity.target === "Jhlwarrior" || entity.target === "trololol")
                && entity.type === "monster" && this.is_in_range(entity)) {
                targets.push(entity);
            }
        }

        if (targets.length >= 3) {
            let chosen = targets.slice(0, 3);
            use_skill("3shot", chosen);
        }
    }

    aoeFarm() {
        if (is_on_cooldown("3shot") || character.mp <= character.max_mp * 0.50) { return; }

        let targets = [];
        for (let id in parent.entities) {
            let entity = parent.entities[id];
            if ((entity.name === this.currentMobFarm || entity.name == this.secondaryTarget)
                && entity.type === "monster" && this.is_in_range(entity)) {
                targets.push(entity);
            }
        }

        if (targets.length >= 3) {
            let chosen = targets.slice(0, 3);
            use_skill("3shot", chosen);
        }
    }

    markTarget(target) {
        if (!is_on_cooldown("huntersmark") && target.hp > 18_000 && character.mp > 675 && !target.name.startsWith("Jhl")) {
            use_skill("huntersmark", target);
        }

        this.skillThreeShot();
        if (this.aoeFarming) { this.aoeFarm(); }

        this.attack(target);

    }

}

const myChar = new MyChar(character.name);

setInterval(async () => {
    if (myChar.gettingBuff || myChar.movingToEvent) { return; }

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

    if (myChar.kite) { myChar.kiteTarget(); }
    myChar.moveAwayFromWarrior();

    myChar.markTarget(target);

}, 1000 / 4);

