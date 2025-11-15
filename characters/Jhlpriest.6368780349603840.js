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
    loot();

    useHealthPotion();
    useManaPotion();

    recoverOutOfCombat();

    if (!myChar.attackMode || character.rip) return;

    myChar.healParty();

    let target = get_targeted_monster();
    if (target && target.name != myChar.currentMobFarm) {
        target = null;
    }

    if (target == null || !target || target == undefined) {
        target = get_targeted_monster();

        target = myChar.findTarget(target);

        if (target == null || !target || target == undefined) {
            set_message(`No target, moving to farm ${myMobs[myChar.currentMobFarm]}`);

            for (const [key, val] of Object.entries(myMobs)) {
                if (val === myChar.currentMobFarm) {

                    if (!myChar.movingToNewMob) { smart_move(key); }
                    myChar.movingToNewMob = true;
                    return;
                }
            }
            return;
        }
    }

    myChar.movingToNewMob = false;
    if (myChar.kite) { myChar.kiteTarget(); }
    myChar.attack(target);


}, 1000 / 4);
