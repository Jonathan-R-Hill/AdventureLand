
const mobData = [
    { travel: "goo", target: "Goo", map: "main" },
    { travel: "bee", target: "Bee", map: "main" },
    { travel: "crab", target: "Tiny Crab", map: "main" },
    { travel: "minimush", target: "Pom Pom", map: "halloween" },
    { travel: "osnake", target: "Snake", map: "halloween" },
    { travel: "snake", target: "Snake", map: "main" },
    { travel: "rat", target: "Rat", map: "main" },
    { travel: "spider", target: "Spider", map: "main" },
    { travel: "squig", target: "Squig", map: "main" },
    { travel: "squigtoad", target: "Squigtoad", map: "main" },
    { travel: "poisio", target: "Poisio", map: "main" },
    { travel: "arcticbee", target: "Arctic Bee", map: "winterland" },
    { travel: "iceroamer", target: "Water Spirit", map: "winterland" },
    { travel: "armadillo", target: "Armadillo", map: "main" },
    { travel: "croc", target: "Croc", map: "main" },
    { travel: "porcupine", target: "Porcupine", map: "desertland" },
    { travel: "scorpion", target: "Scorpion", map: "main" },
    { travel: "bigbird", target: "Hawk", map: "main" },
    { travel: "stoneworm", target: "Stone Worm", map: "spookytown" },
    { travel: "boar", target: "Wild Boar", map: "winterland" },
    { travel: "wolf", target: "White Wolf", map: "winterland" },
    { travel: "stompy", target: "Stompy", map: "winterland" },
    { travel: "crabx", target: "Huge Crab", map: "main" },
    { travel: "tortoise", target: "Tortoise", map: "main" },
    { travel: "rharpy", target: "Rebel Harpy", map: "winterland" },
    { travel: "bat", target: "Bat", map: "cave" },
    { travel: "nerfedBat", target: "Bat", map: "cave" },
    { travel: "sparkbot", target: "Spark Bot", map: "Underground" },
    { travel: "targetron", target: "Targetron", map: "Underground" },
    { travel: "mechagnome", target: "Mech-a Gnome", map: "cyberland" }
    // { travel: "cgoo", target: "Irradiated Goo", map: "arena" }
];

// MONSTER HUNTER
function checkMonsterHunt() {
    const huntBuff = character.s?.monsterhunt;

    if (!huntBuff || (huntBuff && (huntBuff.c <= 0 || huntBuff.c == undefined || huntBuff.c == null))) {
        // No active hunt
        return true;
    }

    return false;
}

async function getNewTask() {
    if (character.map !== "main") {
        await smart_move({ map: "main" });
    }
    await smart_move({ to: "monsterhunter" });

    parent.socket.emit("monsterhunt");
    set_message("Requested new Monster Hunt");

    // Wait up to 5s for buff to appear
    const start = Date.now();
    while (!character.s?.monsterhunt && Date.now() - start < 5000) {
        await sleep(250);
    }
}


async function setNewTask() {
    const huntBuff = character.s?.monsterhunt;
    if (!huntBuff) { return null; }

    const mobEntry = mobData.find(m => m.travel === huntBuff.id);
    if (!mobEntry) { return null; }

    return mobEntry; // { travel, target, map }
}


function handleNewTarget(travelTag) {
    const partyMembers = ["Jhlranger", "Jhlmage", "Jhlpriest", "Jhlwarrior"];
    let mobEntry = mobData.find(m => m.travel === travelTag);

    if (!mobEntry) {
        mobEntry = mobData.find(m => m.travel === "armadillo");
        set_message(`Unknown travel tag: ${travelTag} - Going back to armadillos.`);

        const { travel, target, map } = mobEntry;
        for (const name of partyMembers) {
            send_cm(name, `set_new_hunter_target ${travel},${target},${map}`);
        }

        return mobEntry;
    }

    const { travel, target, map } = mobEntry;
    for (const name of partyMembers) {
        if (["Poisio", "Wild Boar", "Water Spirit", "Hawk", "Scorpion"].includes(target)) {
            send_cm("fightTogeather true")
        }
        else {
            send_cm("fightTogeather false")
        }

        send_cm(name, `set_new_hunter_target ${travel},${target},${map}`);
    }
}

