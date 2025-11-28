const allowedEvents = ["icegolem", "snowman"];

function checkActiveBosses() {
    for (const eventKey of allowedEvents) {
        if (parent.S[eventKey]) { return eventKey; }
    }

    return null;
}

async function eventHandler() {
    const boss = checkActiveBosses();

    if (boss == null) { return; }

    switch (boss) {
        case "icegolem":
            if (!get_nearest_monster({ type: 'icegolem' })) { join('icegolem'); }

            return "Ice Golem"
        case "snowman":
            if (!get_nearest_monster({ type: 'snowman' })) {
                return { travel: "snowman", target: "Snowman", map: "winterland" };
            }

        default: return null
    }
}
