load_code("baseClass");
load_code("helpers");
load_code("monsterHunter");

class MyChar extends BaseClass {
    monsterHunter = false;
    gettingNewTask = false;

    taunt(target) {
        if (
            !is_on_cooldown("taunt") && distance(character, target) < G.skills.taunt.range &&
            target.target != character.name && target.target != null
        ) {
            use_skill("taunt", target);
        }
        this.attack(target);
    }
}

const myChar = new MyChar(character.name);
myChar.kite = false;

let combatLoop = null;

const combat = async () => {
    useHealthPotion();
    useManaPotion();
    recoverOutOfCombat();
    loot();

    if (myChar.gettingNewTask) return;

    if (myChar.monsterHunter && checkMonsterHunt()) {
        await newMonsterHunter();
        return;
    }
    myChar.checkNearbyFarmMob();

    const target = await myChar.targetLogicTank();
    if (!target) return;

    myChar.taunt(target);
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