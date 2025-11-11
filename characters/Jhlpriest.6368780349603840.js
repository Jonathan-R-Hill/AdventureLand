load_code("baseClass");
load_code("helpers");

class MyChar extends BaseClass {

    healParty() {
        let partyHealth = getPartyHealth();

        // Filter members below 75% HP
        let lowMembers = partyHealth.filter(m => m.hp < m.max_hp * 0.75);
        if (lowMembers.length >= 2 && !is_on_cooldown("partyheal")) {
            set_message("Using Party Heal");
            use_skill("partyheal");
        }
        else if (lowMembers.length > 0 && !is_on_cooldown("heal")) {
            set_message(`Healing ${lowMembers[0].name}`);
            use_skill("heal", lowMembers[0].name);

            return;
        }
    }
}

const myChar = new MyChar(character.name);

setInterval(() => myChar.callPlayers(), 10 * 1000);

// Combat
setInterval(function () {
    loot();

    useHealthPotion();
    useManaPotion();

    recoverOutOfCombat();

    if (!myChar.attackMode || character.rip) return;

    if (!myChar.waitForCoords) {

        myChar.healParty();

        let target = get_targeted_monster();
        if (target && target.name != myChar.currentMobFarm) {
            target = null;
        }

        if (target == null || !target || target == undefined) {
            target = get_targeted_monster();

            target = myChar.findTarget(target);

            if (target == null || !target || target == undefined) {
                return;
            }
        }

        // attack
        // kiteTarget();
        myChar.attack(target);
    }

}, 1000 / 4);
