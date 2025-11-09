load_code("baseClass");
load_code("helpers");

class MyChar extends BaseClass { }

const myChar = new MyChar(character.name);

myChar.returningToGroup = false;
myChar.waitForCoords = false;
myChar.attackMode = true;
myChar.currentMobFarm = "Tiny Crab";

setInterval(() => {
    const player = get_player("Jhlwarrior");

    if (get_player("Jhlmerch") == null) {
        send_cm("Jhlmerch", `come_to_me ${player.x},${player.y}`);
    }

    if (get_player("Jhlranger") == null) {
        send_cm("Jhlranger", `come_to_me ${player.x},${player.y}`);
    }

    if (get_player("Jhlpriest") == null) {
        send_cm("Jhlpriest", `come_to_me ${player.x},${player.y}`);
    }
}, 5000);

setInterval(function () {
    loot();

    useHealthPotion();
    useManaPotion();

    recoverOutOfCombat();

    if (!myChar.attackMode || character.rip) return;

    if (!myChar.waitForCoords) {

        let target = get_targeted_monster();
        if (target && target.name != myChar.currentMobFarm) {
            console.log(`Dropping target ${target.name}, not my farm`);
            target = null;
        }

        if (target == null || !target || target == undefined) {
            target = myChar.getClosestMonsterByName(myChar.currentMobFarm);
            if (target) {

                if (target.name == myChar.currentMobFarm || myChar.currentMobFarm == "") {
                    change_target(target);

                    return;
                } else {
                    target = null;

                    return;
                }

            } else {
                set_message(`Not my target ${myChar.currentMobFarm}`);

                return;
            }
        }

        if (!is_in_range(target)) {
            move(
                character.x + (target.x - character.x) / 2,
                character.y + (target.y - character.y) / 2
            );

            set_message("Moving to target");
        } else if (can_attack(target)) {
            set_message("Attacking");
            attack(target);
        }
    }

}, 1000 / 4);
