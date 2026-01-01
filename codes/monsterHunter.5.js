load_code("mobList");

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

