load_code("baseClass");
load_code("helpers");

class MyChar extends BaseClass {

    healParty() {
        let partyHealth = getPartyHealth();

        // Filter members below 75% HP
        let lowMembers = partyHealth.filter(m => m.hp < m.max_hp * 0.75);
        if (lowMembers.length >= 2 && !is_on_cooldown("partyheal")) {
            use_skill("partyheal");
        }
        else if (lowMembers.length > 0 && !is_on_cooldown("heal")) {
            use_skill("heal", lowMembers[0].name);
        }
    }
}

const myChar = new MyChar(character.name);

// Combat
setInterval(async function () {
    useHealthPotion();
    useManaPotion();
    recoverOutOfCombat();
    loot();

    const target = await myChar.targetLogicNonTank();
    if (target == null) { return; }

    myChar.healParty();

    myChar.movingToNewMob = false;
    if (myChar.kite) { myChar.kiteTarget(); }

    myChar.attack(target);

}, 1000 / 4);
