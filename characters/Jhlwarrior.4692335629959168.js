load_code("baseClass");
load_code("helpers");

class MyChar extends BaseClass {

    taunt(target) {
        if (!is_on_cooldown("taunt") && distance(character, target) < G.skills.taunt.range && target.target != character.name) {
            use_skill("taunt", target);
            this.attack(target);
        }
        else {
            this.attack(target);
        }
    }
}

const myChar = new MyChar(character.name);
myChar.kite = false;

setInterval(function () {

    const target = myChar.targetLogicNonTank();
    if (target == null) {
        returnToLeader();

        return;
    }

    myChar.taunt(target);
}, 1000 / 4);
