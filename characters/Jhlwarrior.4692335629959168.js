load_code("baseClass");
load_code("helpers");
load_code("aoeFarmArea");

graphicsLimiter();

class MyChar extends BaseClass {
    monsterHunter = false;
    gettingNewTask = false;
    pullThree = true;

    lastFarmCheck = 0;
    lastTaunt = 0;
    aoeTaunt = true;

    circleX = 1240;
    circleY = -100;
    radius = 35;

    async equipMainHandWeap() {
        if (character.q.equip) { return; }

        const attackers = this.getMobsAttackingMe();

        if (attackers.length >= 3) {
            this.equipItem("glolipop", 6, "mainhand");
        } else {
            this.equipItem(`fireblade`, 8, "mainhand");
        }
    }

    async equipOffHandWeap() {
        if (character.q.equip) { return; }

        const attackers = this.getMobsAttackingMe();

        if (attackers.length >= 3) {
            this.equipItem("ololipop", 5, "offhand");
        } else {
            this.equipItem(`fireblade`, 7, "offhand");
        }
    }

    skillCharge() {
        if (is_on_cooldown(`charge`)) { return; }

        if (is_moving(character)) { use_skill(`charge`); }
    }

    skillHardShell() {
        if (is_on_cooldown("hardshell")) { return; }
        if (target.s.stunned) { return; }

        // Count how many monsters are targeting me
        let targetingCount = 0;
        for (let id in parent.entities) {
            let entity = parent.entities[id];
            if (entity.target === character.id) {
                targetingCount++;
            }
        }

        if (character.hp <= character.max_hp * 0.50) {
            use_skill("hardshell");
        }
    }

    skillAoeTaunt() {
        const now = Date.now();

        if (!get_player(`Jhlpriest`)) { return; }
        if (now - this.lastTaunt < 8000 || !this.getClosestMonsterByName(this.currentMobFarm)) { return; }

        use_skill("agitate");
        this.lastTaunt = now;
    }

    async skillStun() {
        if (is_on_cooldown(`stomp`) || character.hp > character.max_hp * 0.65) { return; }
        if (character.s.hardshell) { return; }

        this.removeWeapons();
        equip(locate_item(`basher`));

        await sleep(50);

        use_skill((`stomp`));
        await sleep(10);

        return true;
    }

    skillTaunt() {
        if (
            !is_on_cooldown("taunt") && distance(character, target) < G.skills.taunt.range &&
            target.target != character.name && target.target != null && target.target.startsWith("Jhl")
        ) {
            use_skill("taunt", target);
        }
    }

    async skillCleave() {
        if (is_on_cooldown("cleave") || character.mp < 800) return;

        this.removeWeapons();
        await sleep(50);

        equip(locate_item(`bataxe`));

        use_skill("cleave");

        await sleep(10);
    }

    useSkillWarCry() {
        if (is_on_cooldown("warcry") || character.s.warcry) { return; }

        use_skill("warcry");
    }

    async circleModeAttack(target) {
        if (smart.moving) { return; }

        if (!this.is_in_range(target, "attack")) {
            set_message("waiting for target to come to me");
        }
        else if (!is_on_cooldown("attack")) {
            set_message("Attacking");

            this.attack(target);
        }
    }

    async attackLogic(target) {

        if (character.mp > 450) {
            await this.skillStun();

            this.skillCharge();
            this.skillTaunt();

            this.skillHardShell();
            this.useSkillWarCry();
        }

        await this.equipMainHandWeap();
        await this.equipOffHandWeap();

        const attackers = this.getMobsAttackingMe();
        if (this.aoeTaunt) { this.skillAoeTaunt(); }
        if (this.aoeTaunt && !this.pullThree) {
            circleTargets(attackers); // , this.circleX, this.circleY, this.radius
            this.circleModeAttack(target);
        }
        else if ((this.pullThree && attackers.length >= 3)) {
            circleTargets(attackers);
            this.circleModeAttack(target);
        }
        else {
            await this.attack(target);
        }
    }
}

const myChar = new MyChar(character.name);
let target = null;
const healer = `Jhlpriest`

async function mainLoop() {
    while (true) {
        try {
            if (myChar.movingToEvent || character.cc >= 170) {
                await sleep(200);
                continue;
            }

            potionUse();
            loot();

            // Monster Hunter Check
            if (myChar.monsterHunter && checkMonsterHunt()) {
                await getNewTask();
                const targetInfo = await setNewTask();
                handleNewTarget(targetInfo ? targetInfo.travel : "spider");
                continue;
            }

            // Periodic Farm Check
            const now = Date.now();
            if (now - myChar.lastFarmCheck > 5000 && myChar.currentMobFarm != "") {
                myChar.checkNearbyFarmMob();
                myChar.lastFarmCheck = now;
            }

            // Target & attack
            if (["Dark Hound", "Poisio", "Wild Boar", "Water Spirit", "Hawk", "Scorpion", "Spider", "Mole"].includes(myChar.currentMobFarm)) {
                target = get_nearest_monster({ target: "Jhlpriest" }) ||
                    get_nearest_monster({ target: "Jhlranger" }) || get_nearest_monster({ target: "Jhlrogue" }) ||
                    get_nearest_monster({ target: "Jhlmage" }) || get_nearest_monster({ target: "Jhlpally" }) ||
                    get_nearest_monster({ target: "Jhlmerch" });
            }

            if (!target) {
                target = myChar.pullThree && get_player(healer) ? myChar.targetLogicTank3() : myChar.targetLogicTank();
            }

            if (target) {
                await myChar.attackLogic(target);
            } else {
                set_message("Searching...");
            }

        } catch (e) {
            console.error("Main Loop Error:", e);
        }

        let delay = ((1 / character.frequency) * 1000) / 6;
        await sleep(delay);
    }
}

mainLoop();
