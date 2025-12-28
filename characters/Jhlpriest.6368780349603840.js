load_code("baseClass");
load_code("helpers");
load_code("charLauncher");
load_code("dpsMeter");
load_code("UI");

class MyChar extends BaseClass {

    lastFarmCheck = 0;

    healParty() {
        let partyHealth = getPartyHealth();

        // Filter members below 75% HP
        let lowMembers = partyHealth.filter(m => m.hp < m.max_hp * 0.55);
        if (lowMembers.length >= 2 && !is_on_cooldown("partyheal")) {
            use_skill("partyheal");
        }

        lowMembers = partyHealth.filter(m => m.hp < m.max_hp * 0.85);
        if (lowMembers.length > 0 && !is_on_cooldown("heal")) {
            use_skill("heal", lowMembers[0].name);
        }
    }

    revivePartyMembers() {
        for (const id in parent.party) {
            const member = get_player(id);
            if (!member) continue;

            // Check if dead
            if (member.rip) {
                if (member.c.revival) { continue; }
                // Only cast if revive is ready
                if (!is_on_cooldown("revive") && member.hp >= member.max_hp) {
                    use_skill("revive", member);
                    game_log("Revived " + member.name);
                }
                else {
                    this.healParty();
                }
            }
        }
    }

    useSkillDarkBlessing() {
        if (is_on_cooldown("darkblessing")) { return; }
        if (character.s.darkblessing) { return; }

        use_skill("darkblessing");
    }

    useSkillCurse(target) {
        if (is_on_cooldown("curse") || target.s.curse) { return; }
        if (target.hp < target.max_hp * 0.2 || target.hp < 12000 || target.s.cursed) { return; }

        use_skill("curse", target);
    }

    useSkillAbsorb() {
        const partyMembers = ["Jhlrogue", "Jhlmage", "Jhlranger", "Jhlpally"];
        for (const id of partyMembers) {
            const member = get_player(id);
            if (!member || !member.map || member.rip) { continue; }

            for (const id in parent.entities) {
                const ent = parent.entities[id];

                if (!ent.target || ent.type !== "monster") { continue; }
                if (ent.target === member.name && !is_on_cooldown("absorb")) {
                    use_skill("absorb", member);

                    return;
                }
            }
        }
    }
}

const myChar = new MyChar(character.name);

setInterval(() => {
    send_cm("Jhlmerch", `come_to_me ${character.real_x},${character.real_y},${character.map}`);
}, 8 * 60 * 1000);

// Combat
setInterval(async () => {
    if (myChar.gettingBuff) { return; }

    myChar.healParty();
    myChar.revivePartyMembers();

    if (myChar.movingToEvent) { return; }

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

    myChar.movingToNewMob = false;
    if (myChar.kite) { myChar.kiteTarget(); }
    myChar.moveAwayFromWarrior();

    // myChar.useSkillAbsorb();
    myChar.useSkillDarkBlessing();
    myChar.useSkillCurse(target);
    myChar.attack(target);

}, ((1 / character.frequency) * 1000) / 8);
