load_code("monsterHunter");

function getMobKeyFromValue(travelKey) {
    return mobData.find(m => m.travel === travelKey);
}

function updateTarget(travelKey) {
    const mobEntry = getMobKeyFromValue(travelKey);
    if (!mobEntry) {
        game_log(`Mob ${travelKey} not found in dictionary`);
        console.log(`Mob ${travelKey} not found in dictionary`)

        return;
    }

    const partyMembers = ["Jhlranger", "Jhlmerch", "Jhlmage", "Jhlwarrior", "Jhlpriest"];

    for (const name of partyMembers) {
        send_cm(name, `set_new_target ${mobEntry.travel},${mobEntry.target}`);
    }
}
