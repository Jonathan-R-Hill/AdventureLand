load_code("helpers");

const attackMode = true;

startSharedTasks();

setInterval(function () {
    let myMana = character.mp;
    let myHealth = character.hp;

    useHealthPotion();
    useManaPotion();

    let partyHealth = getPartyHealth();

    // Filter members below 75% HP
    let lowMembers = partyHealth.filter(m => m.hp < m.max_hp * 0.75);
    if (lowMembers.length >= 2 && can_use("partyheal")) {
        set_message("Using Party Heal");
        use_skill("partyheal");

        console.log("Party Heal used on:", lowMembers.map(m => m.name).join(", "));

    }
    else if (lowMembers.length > 0 && can_use("heal")) {
        set_message(`Healing ${lowMembers[0].name}`);
        use_skill("heal", lowMembers[0].name);

        console.log(`Healed ${lowMembers[0].name}`);

        return;
    }


    loot();

    if (!attackMode || character.rip || is_moving(character)) return;

    let target = get_targeted_monster();
    if (!target && myMana > myMana * 0.25) {
        target = get_nearest_monster({ min_xp: 100, max_att: 120 });
        if (target) {
            change_target(target);
        } else {
            set_message("No Monsters");
            return;
        }
    }
    else {
        recoverOutOfCombat();
    }

    if (!is_in_range(target)) {
        move(
            character.x + (target.x - character.x) / 2,
            character.y + (target.y - character.y) / 2
        );

        set_message("Moving & Regenerating");
        recoverOutOfCombat();

    } else if (can_attack(target)) {
        set_message("Attacking");
        attack(target);
    }

}, 1000 / 4);
