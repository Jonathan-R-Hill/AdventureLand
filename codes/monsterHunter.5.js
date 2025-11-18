
const mobData = [
    { travel: "goo", target: "Goo", map: "main" },
    { travel: "bee", target: "Bee", map: "main" },
    { travel: "crab", target: "Tiny Crab", map: "main" },
    { travel: "minimush", target: "Pom Pom", map: "halloween" },
    { travel: "osnake", target: "Snake", map: "halloween" },
    { travel: "snake", target: "Snake", map: "main" },
    { travel: "rat", target: "Rat", map: "main" },
    { travel: "squig", target: "Squig", map: "main" },
    { travel: "articbee", target: "Artic Bee", map: "winterland" },
    { travel: "armadillo", target: "Armadillo", map: "main" },
    { travel: "croc", target: "Croc", map: "main" },
    { travel: "porcupine", target: "Porcupine", map: "main" },
    { travel: "squigtoad", target: "Squigtoad", map: "main" },
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

    await new Promise(resolve => setTimeout(resolve, 500));
}

async function setNewTask() {
    const huntBuff = character.s?.monsterhunt;

    if (!huntBuff) { return; }

    const mobEntry = mobData.find(m => m.travel === character.s?.monsterhunt.id);

    if (!mobEntry) {
        return null;
    }

    const { travel, target, map } = mobEntry;
    handleNewTarget(travel);

    return `${travel},${target},${map}`
}

function handleNewTarget(travelTag) {
    const partyMembers = ["Jhlranger", "Jhlmage", "Jhlpriest"];

    const mobEntry = mobData.find(m => m.travel === travelTag);
    if (!mobEntry) {
        mobEntry = mobData.find(m => m.travel === `rat`);

        set_message(`Unknown travel tag: ${travelTag} - Going back to rats.`);
        for (const name of partyMembers) {
            send_cm(name, `set_new_hunter_target ${travel},${target},${map}`);
        }

        return;
    }

    const { travel, target, map } = mobEntry;

    for (const name of partyMembers) {
        send_cm(name, `set_new_hunter_target ${travel},${target},${map}`);
    }
}
