load_code("baseClass");
load_code("helpers");

class MyChar extends BaseClass {
    lastFarmCheck = 0;
    aoeFarming = false;

    skillMultiShot() {
        // Keeping your logic: Only if MP > 50%
        if (is_on_cooldown("3shot") || character.mp <= character.max_mp * 0.50) { return; }

        let targets = [];
        for (let id in parent.entities) {
            let entity = parent.entities[id];
            if ((entity.target === "Jhlwarrior" || entity.target === "trololol")
                && entity.type === "monster" && this.is_in_range(entity)) {
                targets.push(entity);
            }
        }

        if (targets.length >= 5) {
            let chosen = targets.slice(0, 5);
            use_skill("5shot", chosen);
        }
        else if (targets.length >= 3) {
            let chosen = targets.slice(0, 3);
            use_skill("3shot", chosen);
        }
    }

    executeAoeFarm() {
        if (is_on_cooldown("3shot") || character.mp <= character.max_mp * 0.50) { return; }

        let targets = [];
        for (let id in parent.entities) {
            let entity = parent.entities[id];
            if ((entity.name === this.currentMobFarm || entity.name == this.secondaryTarget)
                && entity.type === "monster" && this.is_in_range(entity)) {
                targets.push(entity);
            }
        }

        if (targets.length >= 5) {
            let chosen = targets.slice(0, 5);
            use_skill("5shot", chosen);
        }
        else if (targets.length >= 3) {
            let chosen = targets.slice(0, 3);
            use_skill("3shot", chosen);
        }
    }

    markTarget(target) {
        // Keeping Hunter's Mark logic
        if (!is_on_cooldown("huntersmark") && target.hp > 18000 && character.mp > 800 && !target.name.startsWith("Jhl")) {
            use_skill("huntersmark", target);
        }

        this.skillMultiShot();
        if (this.aoeFarming) { this.executeAoeFarm(); }

        // Execution of the attack
        this.attack(target);
    }
}

const myChar = new MyChar(character.name);

async function mainLoop() {
    while (true) {
        try {
            if (myChar.gettingBuff || myChar.movingToEvent || character.cc >= 170) {
                await sleep(100);
                continue;
            }

            // Farm Check
            const now = Date.now();
            if (now - myChar.lastFarmCheck > 5000 && !myChar.gettingBuff && myChar.currentMobFarm != "") {
                myChar.checkNearbyFarmMob();
                myChar.lastFarmCheck = now;
            }

            if (character.mp < 200) { useManaPotion(); }
            useHealthPotion();
            useManaPotion();
            recoverOutOfCombat();
            loot();

            // Target & Attack
            const target = myChar.targetLogicNonTank();

            if (target) {
                if (myChar.kite) { myChar.kiteTarget(); }
                myChar.moveAwayFromWarrior();

                myChar.markTarget(target);
            } else {
                set_message("No Target");
            }

        } catch (e) {
            console.error("Main Loop Error:", e);
        }

        let delay = ((1 / character.frequency) * 1000) / 8;
        await sleep(delay);
    }
}

mainLoop();