load_code("baseClass");
load_code("helpers");
load_code("monsterHunter");

class MyChar extends BaseClass {
    monsterHunter = false;
    gettingNewTask = false;

    lastFarmCheck = 0;
    lastTaunt = 0;
    aoeTaunt = false;

    equipMainWeapons() {
        if (this.aoeTaunt) {
            this.equipItem("glolipop", 6);
            this.equipItem("glolipop", 6);
        }
        else if (["Poisio", "Wild Boar", "Water Spirit", "Hawk"].includes(this.currentMobFarm)
            || character.hp < character.max_hp * 0.45) {

            this.equipItem("sshield", 4);
            this.equipItem(`hammer`, 6, "mainhand");
        }
        else {
            // this.equipItem(`hammer`, 6, "offhand");
            this.equipItem(`fireblade`, 7, "mainhand");
            this.equipItem(`fireblade`, 6, "offhand");
        }
    }

    skillCharge() {
        if (is_on_cooldown(`charge`)) { return; }

        if (is_moving(character)) { use_skill(`charge`); }

    }

    skillHardShell() {
        if (is_on_cooldown("hardshell")) return;
        if (character.hp > character.max_hp * 0.5) return;

        use_skill("hardshell");
    }

    skillAoeTaunt() {
        const now = Date.now();

        // Only run if 6 seconds have passed since last cast
        if (now - this.lastTaunt < 6000) return;

        use_skill("agitate");
        this.lastTaunt = now;
    }

    async skillStun() {
        if (is_on_cooldown(`stomp`)) { return; }

        this.removeWeapons();
        equip(locate_item(`basher`));

        await sleep(25);

        use_skill((`stomp`));

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

    async attackLogic(target) {
        this.skillCharge();

        this.skillTaunt();
        if (this.aoeTaunt) { this.skillAoeTaunt(); }

        this.skillHardShell();

        if (character.hp < character.max_hp * 0.65) { await this.skillStun(); }
        this.equipMainWeapons();
        this.attack(target);
    }
}

const myChar = new MyChar(character.name);
myChar.kite = false;

let combatLoop = null;
let target;

const combat = async () => {
    if (myChar.currentMobFarm == undefined || myChar.currentMobFarm == `Porcupine`) { myChar.currentMobFarm = 'Squig'; }
    useHealthPotion();
    useManaPotion();
    recoverOutOfCombat();
    loot();

    if (myChar.gettingNewTask || myChar.gettingBuff) { return; }

    if (myChar.monsterHunter && checkMonsterHunt()) {
        await newMonsterHunter();
        return;
    }

    const now = Date.now();
    if (now - myChar.lastFarmCheck > 5000) {
        await myChar.checkNearbyFarmMob();
        myChar.lastFarmCheck = now;
    }

    if (["Poisio", "Wild Boar", "Water Spirit", "Hawk", "Scorpion", "Spider"].includes(myChar.currentMobFarm)) {
        if (get_nearest_monster({ target: "Jhlpriest" }) != null) { target = get_nearest_monster({ target: "Jhlpriest" }); }
        else if (get_nearest_monster({ target: "Jhlranger" }) != null) { target = get_nearest_monster({ target: "Jhlranger" }); }
        else if (get_nearest_monster({ target: "Jhlrogue" }) != null) { target = get_nearest_monster({ target: "Jhlrogue" }); }
        else if (get_nearest_monster({ target: "Jhlwarrior" }) != null) { target = get_nearest_monster({ target: "Jhlwarrior" }); }
        else { target = await myChar.targetLogicTank(); }
    }
    else {
        target = await myChar.targetLogicTank();
    }

    if (!target) return;

    await myChar.attackLogic(target);
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