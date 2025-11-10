load_code("baseClass");
load_code("helpers");

class MyChar extends BaseClass {
    taunt(target) {
        if (!is_on_cooldown("taunt") && distance(character, target) < G.skills.taunt.range && target.target != character.name) {
            use_skill("taunt", target);
        }
        else {
            this.attack(target);
        }
    }
}

const myChar = new MyChar(character.name);

myChar.returningToGroup = false;
myChar.waitForCoords = false;
myChar.attackMode = true;

setInterval(() => {
    const player = get_player("Jhlwarrior");

    if (get_player("Jhlranger") == null) {
        send_cm("Jhlranger", `come_to_me ${player.x},${player.y}`);
    }

    if (get_player("Jhlpriest") == null) {
        send_cm("Jhlpriest", `come_to_me ${player.x},${player.y}`);
    }
}, 5000);

setInterval(() => {
    const player = get_player("Jhlwarrior");

    if (get_player("Jhlmerch") == null) {
        send_cm("Jhlmerch", `come_to_me ${player.x},${player.y}`);
    }
}, 45 * 1000);

setInterval(myChar.sendWhitelistedItemsToMerchant(), 3 * 60 * 1000);

setInterval(function () {
    loot();

    useHealthPotion();
    useManaPotion();

    recoverOutOfCombat();

    if (!myChar.attackMode || character.rip) return;

    if (!myChar.waitForCoords) {

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

        myChar.taunt(target);
        myChar.attack(target);
    }

}, 1000 / 4);
