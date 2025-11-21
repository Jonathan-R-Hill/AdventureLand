load_code("baseClass");
load_code("helpers");
load_code("monsterHunter");

class MyChar extends BaseClass {
    monsterHunter = true;
    gettingNewTask = false;

    lastFarmCheck = 0;

    equipMainWeapons() {
        if (locate_item(`hammer`) != -1) equip(locate_item(`hammer`));
        if (locate_item(`fireblade`) != - 1) equip(locate_item(`fireblade`));
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

const combat = async () => {
    if (myChar.currentMobFarm == `Porcupine`) { myChar.currentMobFarm = 'Croc'; }
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


    const target = await myChar.targetLogicTank();
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

    const targetInfo = await setNewTask();
    if (!targetInfo) {
        myChar.gettingNewTask = false;
        combatLoop = setInterval(() => combat(), 250);

        return;
    }

    handleNewTarget(targetInfo.travel);
    myChar.gettingNewTask = false;

    combatLoop = setInterval(() => combat(), 250);
};

combatLoop = setInterval(() => combat(), 250);