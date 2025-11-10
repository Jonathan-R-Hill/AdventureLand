load_code("baseClass");
load_code("helpers");

class MyChar extends BaseClass {

    markTarget(target) {
        if (!is_on_cooldown("huntersmark") && target.hp > 1500 && this.getMP() > 600) {
            use_skill("huntersmark", target);
            this.attack(target);
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

setInterval(myChar.sendWhitelistedItemsToMerchant(), 3 * 60 * 1000);

setInterval(function () {

    useHealthPotion();
    useManaPotion();

    recoverOutOfCombat();

    loot();

    if (!nearTank()) {
        myChar.waitForCoords = true;
    }

    if (!myChar.attackMode || character.rip || myChar.waitForCoords) return;

    let target;
    if (myChar.fightTogeather) {
        target = myChar.getTankTarget();

        if (target == null || !target || target == undefined) {
            returnToLeader();
            return;
        }
    }
    else {
        target = get_targeted_monster();

        target = myChar.findTarget(target);

        if (target == null || !target || target == undefined) {
            return;
        }
    }

    myChar.markTarget(target);
}, 1000 / 4);

// Out of range retrun to leader
character.on("cm", async (sender, data) => {
    if (myChar.returningToGroup) return;
    if (!sender.name.startsWith("Jhl")) return;

    const splitMsg = sender.message.split(" ");
    if (splitMsg[0].trim() !== "come_to_me") return;

    const [x, y] = splitMsg[1].split(",").map(Number);
    myChar.returningToGroup = true;

    await xmove(x, y);

    if (character.x === x && character.y === y) {
        set_message(`Arrived at group location (${x}, ${y})`);

        myChar.toggleReturningToGroup();
        myChar.toggleWaitForCoords();
    }
});

// update farm target
character.on("cm", async (sender, data) => {
    if (myChar.returningToGroup) return;
    if (!sender.name.startsWith("Jhl")) return;

    const splitMsg = sender.message.split(" ");
    if (splitMsg[0].trim() !== "farm_update") return;

    const newTarget = splitMsg[1].toString();
    myChar.currentMobFarm = newTarget;
    console.log(`Updated farm target to ${newTarget}`);
});
