load_code("baseClass");
load_code("helpers");
load_code("monsterHunter");

class MyChar extends BaseClass {
    monsterHunter = true;
    gettingNewTask = false;

    lastFarmCheck = 0;

    equipMainWeapons() {
        this.equipItem(`hammer`, 6);
        this.equipItem(`fireblade`, 4);
        // this.equipItem(`fireblade`, 3);
    }

    async taunt(target) {
        if (
            !is_on_cooldown("taunt") && distance(character, target) < G.skills.taunt.range &&
            target.target != character.name && target.target != null
        ) {
            use_skill("taunt", target);
        }

        if (character.hp < character.max_hp * 0.65) { await this.useStun(); }
        this.equipMainWeapons();
        this.attack(target);
    }

    async useStun() {
        if (is_on_cooldown(`stomp`)) { return; }

        this.removeWeapons();
        equip(locate_item(`basher`));

        await sleep(25);

        use_skill((`stomp`));

        return true;
    }

}

const myChar = new MyChar(character.name);
myChar.kite = false;

let combatLoop = null;
let target;

const combat = async () => {
    if (myChar.currentMobFarm == undefined || myChar.currentMobFarm == `Porcupine`) { myChar.currentMobFarm = 'Spider'; }
    useHealthPotion();
    useManaPotion();
    recoverOutOfCombat();
    loot();

    if (myChar.gettingNewTask) return;

    if (myChar.monsterHunter && checkMonsterHunt()) {
        await newMonsterHunter();
        return;
    }

    const now = Date.now();
    if (now - myChar.lastFarmCheck > 5000) {
        myChar.checkNearbyFarmMob();
        myChar.lastFarmCheck = now;
    }

    if (get_nearest_monster({ target: "Jhlpriest" }) != null) { target = get_nearest_monster({ target: "Jhlpriest" }); }
    else if (get_nearest_monster({ target: "Jhlranger" }) != null) { target = get_nearest_monster({ target: "Jhlranger" }); }
    else if (get_nearest_monster({ target: "Jhlwarrior" }) != null) { target = get_nearest_monster({ target: "Jhlwarrior" }); }
    else { target = await myChar.targetLogicTank(); }

    if (!target) return;

    await myChar.taunt(target);
};

const newMonsterHunter = async () => {
    if (combatLoop) {
        clearInterval(combatLoop);
        combatLoop = null;
    }

    myChar.gettingNewTask = true;

    await getNewTask();
    await sleep(100);

    const targetInfo = await setNewTask();
    if (!targetInfo || targetInfo == null) {
        handleNewTarget("spider")
    }
    else {
        handleNewTarget(targetInfo.travel);
    }

    myChar.gettingNewTask = false;

    combatLoop = setInterval(() => combat(), 250);
};

combatLoop = setInterval(() => combat(), 250);