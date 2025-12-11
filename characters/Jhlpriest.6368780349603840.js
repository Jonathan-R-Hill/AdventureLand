load_code("baseClass");
load_code("helpers");

class MyChar extends BaseClass {

    lastFarmCheck = 0;

    healParty() {
        let partyHealth = getPartyHealth();

        // Filter members below 75% HP
        let lowMembers = partyHealth.filter(m => m.hp < m.max_hp * 0.85);
        if (lowMembers.length >= 2 && !is_on_cooldown("partyheal")) {
            use_skill("partyheal");
        }
        else if (lowMembers.length > 0 && !is_on_cooldown("heal")) {
            use_skill("heal", lowMembers[0].name);
        }
    }

    revivePartyMembers() {
        for (const id in parent.party) {
            const member = get_player(id);
            if (!member) continue;

            // Check if dead
            if (member.rip) {
                // Only cast if revive is ready
                if (!is_on_cooldown("revive")) {
                    use_skill("revive", member);
                    game_log("Revived " + member.name);
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
        if (target.hp < target.max_hp * 0.2 || target.s.cursed) { return; }

        use_skill("curse", target);
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
    if (now - myChar.lastFarmCheck > 5000 && !myChar.gettingBuff) {
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

    myChar.useSkillDarkBlessing();
    myChar.useSkillCurse(target);
    myChar.attack(target);

}, 1000 / 4);
