load_code("healAndPot")

function startSharedTasks() {
    setInterval(manageParty, 2100);
    setInterval(reviveSelf, 7000);

    if (character.name != "Jhlmerch") {
        setInterval(sendGoldToMerchant, 3 * 1000);
        setInterval(checkPotions, 9 * 1000);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getPartyHealth() {
    return parent.party_list
        .map(name => get_player(name))
        .filter(p => p && p.hp > 0)
        .map(p => ({ name: p.name, hp: p.hp, max_hp: p.max_hp }));
}

async function manageParty() {
    const partyMembers = ["Jhlpriest", "Jhlranger", "Jhlmerch", "Jhlmage", "Jhlwarrior"];
    const leaderName = "Jhlpriest"

    const party = get_party() || {};
    const currentSize = Object.keys(party).length;

    if (currentSize >= 4) {
        return;
    }

    if (character.name === leaderName) {
        // Leader invites everyone
        for (const name of partyMembers) {
            if (!get_party()?.[name]) {
                send_party_invite(name);
                set_message(`Inviting ${name}`);
            }
            await sleep(100);
        }
    } else {
        if (!character.party) {
            leave_party();
        }
        // If I'm in a party
        if (character.party) {
            if (character.party !== leaderName) {
                // Wrong leader, leave
                leave_party();
            }

            return;
        } else {
            // Not in a party at all, accept warrior’s invite
            accept_party_invite(leaderName);
            await sleep(50);
        }
    }
}

function sendGoldToMerchant() {
    const merchantName = "Jhlmerch";
    const merchant = get_player(merchantName);

    // Only send if merchant is close enough and exists
    if (merchant && parent.distance(character, merchant) < 400) {
        if (character.gold > 10000) {
            send_gold(merchantName, character.gold - 10000);
            game_log(`💸 Sent gold to ${merchantName}`);
        }
    }
}

function returnToLeader() {
    let leader = get_player("Jhlwarrior");

    if (!leader) {
        set_message("Leader not found");
        return null;
    }

    const target = get_targeted_monster();
    let offsetX = 0;
    let offsetY = 0;

    // Collect points to avoid: mob + leader
    const avoidPoints = [];
    if (target && !target.dead) {
        avoidPoints.push({ x: target.x, y: target.y });
    }

    avoidPoints.push({ x: leader.x, y: leader.y });

    for (const point of avoidPoints) {
        const dx = character.x - point.x;
        const dy = character.y - point.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);

        const awayFactor = 50;
        offsetX += (dx / dist) * awayFactor;
        offsetY += (dy / dist) * awayFactor;
    }

    let safeX = leader.x + offsetX;
    let safeY = leader.y + offsetY;

    const dxLeader = safeX - leader.x;
    const dyLeader = safeY - leader.y;

    const dist = 40;
    if (Math.abs(dxLeader) < dist && Math.abs(dyLeader) < dist) {
        // Push further along whichever axis has more room
        if (Math.abs(dxLeader) >= Math.abs(dyLeader)) {
            safeX = leader.x + (dxLeader >= 0 ? dist : -dist);
        } else {
            safeY = leader.y + (dyLeader >= 0 ? dist : -dist);
        }
    }

    move(safeX, safeY);
}

function scaleUI(factor = 0.75) {
    const body = parent.document.body;
    const canvas = parent.document.querySelector("canvas");

    // Shrink everything
    body.style.transform = `scale(${factor})`;
    body.style.transformOrigin = "top left";

    // Expand the container so the content fills the window
    body.style.width = `${100 / factor}%`;
    body.style.height = `${100 / factor}%`;

    // Make canvas fill the window
    if (canvas) {
        canvas.style.width = "100%";
        canvas.style.height = "100%";
    }

    const hpDiv = parent.document.getElementById("bottommid");
    if (hpDiv) {
        hpDiv.style.position = "fixed";
        hpDiv.style.left = "50%";
        hpDiv.style.bottom = "1px";
        hpDiv.style.transform = "translateX(-50%)";
        hpDiv.style.zIndex = "9999";

        // Give it more width so stuff doesnt stack
        hpDiv.style.width = "700px";
        hpDiv.style.maxWidth = "100%";
    }

}

