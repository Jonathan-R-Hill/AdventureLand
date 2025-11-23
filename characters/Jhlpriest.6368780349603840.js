load_code("baseClass");
load_code("helpers");

class MyChar extends BaseClass {

    lastFarmCheck = 0;

    healParty() {
        let partyHealth = getPartyHealth();

        // Filter members below 75% HP
        let lowMembers = partyHealth.filter(m => m.hp < m.max_hp * 0.80);
        if (lowMembers.length >= 2 && !is_on_cooldown("partyheal")) {
            use_skill("partyheal");
        }
        else if (lowMembers.length > 0 && !is_on_cooldown("heal")) {
            use_skill("heal", lowMembers[0].name);
        }
    }
}

const myChar = new MyChar(character.name);

setInterval(() => {
    send_cm("Jhlmerch", `come_to_me ${character.real_x},${character.real_y},${character.map}`);
}, 8 * 60 * 1000);

// Combat
setInterval(async function () {
    const now = Date.now();
    if (now - myChar.lastFarmCheck > 5000) {
        myChar.checkNearbyFarmMob();
        myChar.lastFarmCheck = now;
    }

    useHealthPotion();
    useManaPotion();
    recoverOutOfCombat();
    loot();

    const target = await myChar.targetLogicNonTank();
    if (target == null) { return; }

    myChar.healParty();

    myChar.movingToNewMob = false;
    if (myChar.kite) { myChar.kiteTarget(); }
    myChar.moveAwayFromWarrior();

    myChar.attack(target);

}, 1000 / 4);
