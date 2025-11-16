load_code("baseClass");
load_code("helpers");

class MyChar extends BaseClass {

    markTarget(target) {
        if (!is_on_cooldown("huntersmark") && target.hp > 2000 && character.mp > 600 && !target.name.startsWith("Jhl")) {
            use_skill("huntersmark", target);
            this.attack(target);
        }
        else {
            this.attack(target);
        }
    }

}

const myChar = new MyChar(character.name);
myChar.currentMobFarm = "Snake"

setInterval(function () {

    const target = myChar.targetLogicNonTank();
    if (target == null) { return; }

    if (myChar.kite) { myChar.kiteTarget(); }
    myChar.markTarget(target);
}, 1000 / 4);

