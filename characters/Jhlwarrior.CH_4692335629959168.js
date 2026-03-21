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

    farmMobs = [`crab`, `squigtoad`, `squig`];
    validTargets = this.farmMobs;


    circleX = 476;
    circleY = -717;
    radius = 35;

    async equipMainHandWeap() {
        if (character.q.equip || smart.moving) { return; }

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
            // this.equipItem(`sshield`, 8, "offhand");
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

        if (!get_player(`Jhlpriest`) && this.distance(character, get_player(`Jhlpriest`)) < 150) { return; }
        if (now - this.lastTaunt < 8000 || !this.getClosestMonsterByType(this.validTargets[0])) { return; }
        const farmMob = this.getClosestMonsterByType(this.validTargets[0]);

        // Only proceed if mob exists AND is within 100 units
        if (farmMob && this.distance(character, farmMob) <= 75) {
            use_skill("agitate");
            this.lastTaunt = now;
            set_message("AOE Taunting!");
        }
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
        if (is_on_cooldown("attack")) { return; }

        if (!this.is_in_range(target, "attack")) {
            target = get_nearest_monster();
            change_target(target);
        }
        else {
            set_message("Attacking");

            target = get_nearest_monster();
            change_target(target);
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

        if (this.bosses.includes(target.mtype)) {
            await this.attack(target);
            return;
        }

        const attackers = this.getMobsAttackingMe();

        attackers.sort((a, b) => {
            const aMatch = a && a.mtype === this.validTargets[0] ? 0 : 1;
            const bMatch = b && b.mtype === this.validTargets[0] ? 0 : 1;

            return aMatch - bMatch;
        });

        let activeEvent = parent.S.snowman?.live || parent.S.icegolem?.live || parent.S.dragold?.live;

        if (this.aoeTaunt && !activeEvent) {
            this.skillAoeTaunt();
        }

        if (this.aoeTaunt && !this.pullThree) {
            circleTargets(attackers, this.circleX, this.circleY, this.radius);
            this.circleModeAttack(target);
        }
        else if ((this.pullThree && attackers.length >= 3 && attackers[0].mtype == this.validTargets[0] && get_player('Jhlpriest')) || attackers.length >= 3) {
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
            if (character.cc >= 170) {
                await sleep(200);

                continue;
            }

            myChar.merchantInteractions();

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
            if (now - myChar.lastFarmCheck > 5000 && myChar.validTargets[0] != "") {
                myChar.checkNearbyFarmMob();
                myChar.lastFarmCheck = now;
            }

            // Target & attack
            if (["dragold", "wolfie", "booboo", "ghost", "wolf", "boar", "iceroamer", "bigbird", "ent", "scorpion", "gscorpion", "spider", "mole"].includes(myChar.validTargets[0])) {
                target = get_nearest_monster({ target: "Jhlpriest" }) || get_nearest_monster({ target: "Jhlmerch" }) ||
                    get_nearest_monster({ target: "Jhlranger" }) || get_nearest_monster({ target: "Jhlrogue" }) ||
                    get_nearest_monster({ target: "Jhlmage" }) || get_nearest_monster({ target: "Jhlpally" });
            }

            let activeEvent = parent.S.snowman?.live || parent.S.icegolem?.live || parent.S.dragold?.live || parent.S.pinkgoo?.live;

            if (!target || target.dead) {
                target = myChar.pullThree && get_player(healer) && myChar.distance(character, get_player(healer)) < 100 && !activeEvent ? myChar.targetLogicTank3() : myChar.targetLogicTank();
            }

            if (target) {
                await myChar.attackLogic(target);
            }

        } catch (e) {
            console.error("Main Loop Error:", e);
        }

        let delay = ((1 / character.frequency) * 1000) / 6;
        await sleep(delay);
    }
}

mainLoop();
