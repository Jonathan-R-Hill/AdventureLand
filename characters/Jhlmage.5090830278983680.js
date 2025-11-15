load_code("baseClass");
load_code("helpers");

class MyChar extends BaseClass {

}

const myChar = new MyChar(character.name);

setInterval(function () {
	const target = myChar.targetLogicNonTank();
	if (target == null) { return; }

	if (myChar.kite) { myChar.kiteTarget(); }
	myChar.attack(target);

}, 1000 / 4);


