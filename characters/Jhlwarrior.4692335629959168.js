load_code("baseClass");
load_code("helpers");

class MyChar extends BaseClass {

    taunt(target) {
        if (!is_on_cooldown("taunt") && distance(character, target) < G.skills.taunt.range
            && target.target != character.name && target.target != null) {

            use_skill("taunt", target);
            this.attack(target);
        }
        else {
            this.attack(target);
        }
    }
}

const myChar = new MyChar(character.name);

myChar.currentMobFarm = "Tiny Crab";
myChar.kite = false;

setInterval(async function () {
    useHealthPotion();
    useManaPotion();
    recoverOutOfCombat();
    loot();

    const target = await myChar.targetLogicTank();
    if (target == null) { return; }

    myChar.taunt(target);

}, 1000 / 4);
