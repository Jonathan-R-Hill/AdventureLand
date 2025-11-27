
// smart_move : attack name
let myMobs = {
    "goo": "Goo", "bee": "Bee", "crab": "Tiny Crab", "minimush": "Pom Pom", "snake": "Snake", "rat": "Rat",
    "squig": "Squig", "articbee": "Artic Bee", "armadillo": "Armadillo", "croc": "Croc", "porcupine": "Porcupine",
    "squigtoad": "Squigtoad", "spider": "Spider", "poisio": "Poisio", "boar": "Wild Boar", "iceroamer": "Water Spirit",
}

function getMobKeyFromValue(target) {
    for (const [key, val] of Object.entries(myMobs)) {
        if (val === target) {

            return key;
        }
    }

    return null;
}

function updateTarget(mob) {
    if (!(mob in myMobs)) return;

    const partyMembers = ["Jhlranger", "Jhlmerch", "Jhlmage", "Jhlwarrior", "Jhlpriest"];

    for (const name of partyMembers) {
        send_cm(name, `set_new_target ${mob},${myMobs[mob]}`);
    }
}
