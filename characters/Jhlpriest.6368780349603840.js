load_code("baseClass");
load_code("helpers");

class MyChar extends BaseClass {

    healParty() {
        let partyHealth = getPartyHealth();
        let myMana = character.mp;

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

myChar.returningToGroup = false;
myChar.waitForCoords = false;
myChar.attackMode = true;

setInterval(myChar.sendWhitelistedItemsToMerchant(), 3 * 60 * 1000);

setInterval(function () {
    loot();

    useHealthPotion();
    useManaPotion();

    recoverOutOfCombat();

    if (!nearTank()) {
        waitForCoords = true;
    }

    if (!myChar.attackMode || character.rip) return;

    if (!myChar.waitForCoords) {

        myChar.healParty();

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

        // attack
        myChar.attack(target);
    }

}, 1000 / 4);

character.on("cm", async (sender, data) => {
    if (returningToGroup) return;
    if (!sender.name.startsWith("Jhl")) return;

    const splitMsg = sender.message.split(" ");
    if (splitMsg[0].trim() !== "come_to_me") return;

    const [x, y] = splitMsg[1].split(",").map(Number);
    returningToGroup = true;

    await xmove(x, y);

    if (character.x === x && character.y === y) {
        set_message(`Arrived at group location (${x}, ${y})`);

        returningToGroup = false;
        waitForCoords = false;
    }
});