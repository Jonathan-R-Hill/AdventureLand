load_code("helpers");

const attackMode = true;

startSharedTasks();

setInterval(() => {
    const player = get_player("Jhlwarrior");

    if (get_player("Jhlmerch") == null) {
        send_cm("Jhlmerch", `come_to_me ${player.x},${player.y}`);
    }
}, 5000);

setInterval(function () {


    useHealthPotion();
    useManaPotion();

    loot();

    if (!attackMode || character.rip || is_moving(character)) return;

    let target = get_targeted_monster();
    if (!target) {
        target = get_nearest_monster({ min_xp: 100, max_att: 120 });
        if (target) {
            change_target(target);
        } else {
            set_message("No Monsters");
            return;
        }
    }

    if (!is_in_range(target)) {
        move(
            character.x + (target.x - character.x) / 2,
            character.y + (target.y - character.y) / 2
        );

        set_message("Moving & Regenerating");
        recoverOutOfCombat(); // ✅ works now from helper.js
    } else if (can_attack(target)) {
        set_message("Attacking");
        attack(target);
    }

}, 1000 / 4);
