load_code("baseClass");
load_code("helpers");

class MyChar extends BaseClass {
    monsterHunter = false;
    gettingNewTask = false;

    lastFarmCheck = 0;
    lastTaunt = 0;
    aoeTaunt = false;

    equipMainWeapons() {
        if (this.aoeTaunt) {
            this.equipItem("glolipop", 6, "mainhand");
            this.equipItem("glolipop", 6, "offhand");
        }
        else {
            // this.equipItem(`hammer`, 6, "offhand");
            this.equipItem(`fireblade`, 7, "mainhand");
            this.equipItem(`fireblade`, 6, "offhand");
            // this.equipItem(`sshield`, 4, "offhand");
        }
    }

    skillCharge() {
        if (is_on_cooldown(`charge`)) { return; }

        if (is_moving(character)) { use_skill(`charge`); }

    }

    skillHardShell() {
        // Don't use if on cooldown
        if (is_on_cooldown("hardshell")) { return; }

        // Count how many monsters are targeting you
        let targetingCount = 0;
        for (let id in parent.entities) {
            let entity = parent.entities[id];
            if (entity.target === character.id) {
                targetingCount++;
            }
        }

        if (character.hp <= character.max_hp * 0.50) { //|| targetingCount > 2
            use_skill("hardshell");
        }
    }

    skillAoeTaunt() {
        const now = Date.now();

        // Only run if 6 seconds have passed since last cast
        if (now - this.lastTaunt < 6000) { return; }

        use_skill("agitate");
        this.lastTaunt = now;
    }

    async skillStun() {
        if (is_on_cooldown(`stomp`)) { return; }
        if (character.s.hardshell) { return; }

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

    useSkillWarCry() {
        if (is_on_cooldown("warcry") || character.s.warcry) { return; }

        use_skill("warcry");
    }

    async attackLogic(target) {
        if (character.mp > 450) {
            if (character.hp < character.max_hp * 0.65) { await this.skillStun(); }

            this.skillCharge();

            this.skillTaunt();
            if (this.aoeTaunt && get_player("Jhlpriest")) { this.skillAoeTaunt(); }

            this.skillHardShell();

            this.useSkillWarCry();
        }

        this.equipMainWeapons();

        await this.attack(target);
    }
}

const myChar = new MyChar(character.name);
myChar.kite = false;

let combatLoop = null;
let target;

const combat = async () => {
    if (myChar.movingToEvent) { return; }
    if (myChar.currentMobFarm == undefined || myChar.currentMobFarm == `Porcupine` || myChar.secondaryTarget == `porcupine`) {

        myChar.currentMobFarm = 'Squigtoad';
        myChar.secondaryTarget = 'Squig'

        target = null;
    }

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
    if (now - myChar.lastFarmCheck > 5000 && !myChar.gettingBuff && myChar.currentMobFarm != "") {
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

    myChar.attackLogic(target);
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

    combatLoop = setInterval(() => combat(), ((1 / character.frequency) * 1000) / 8);
};

combatLoop = setInterval(() => combat(), ((1 / character.frequency) * 1000) / 8);