
// smart_move : attack name
const mobs = {
    "goo": "Goo", "bee": "Bee", "crab": "Tiny Crab", "minimush": "Pom Pom", "snake": "Snake", "rat": "Rat",
    "squig": "Squig", "articbee": "Artic Bee", "armadillo": "Armadillo", "croc": "Croc", "porcupine": "Porcupine",
    "squigtoad": "Squigtoad", "spider": "Spider",
}

function updateTarget(mob) {
    if (!(mob in mobs)) return;

    const partyMembers = ["Jhlranger", "Jhlmerch", "Jhlmage", "Jhlwarrior", "Jhlpriest"];

    for (const name of partyMembers) {
        send_cm(name, `set_new_target ${mob},${mobs[mob]}`);
    }
}



