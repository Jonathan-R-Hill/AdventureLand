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

            console.log("Party Heal used on:", lowMembers.map(m => m.name).join(", "));

        }
        else if (lowMembers.length > 0 && !is_on_cooldown("heal")) {
            set_message(`Healing ${lowMembers[0].name}`);
            use_skill("heal", lowMembers[0].name);

            console.log(`Healed ${lowMembers[0].name}`);

            return;
        }
    }
}

const myChar = new MyChar(character.name);

myChar.returningToGroup = false;
myChar.waitForCoords = false;
myChar.attackMode = true;
myChar.currentMobFarm = "Tiny Crab";

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

character.on("cm", async (sender, data) => {
    console.log(`Received cm from ${sender.message}..`, sender);

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