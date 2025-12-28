load_code("healAndPot")
load_code("ApiInteraction");

function startSharedTasks() {
    setInterval(playKeepAliveSound, 10 * 1005);
    setInterval(manageParty, 2100);
    setInterval(reviveSelf, 7000);
    setInterval(playKeepAliveSound, 45 * 60 * 1000);
    setInterval(exportCharacterData, 6 * 1000);
    setInterval(crossMapHeal, 800);

    parent.socket.off("magiport");
    parent.socket.on("magiport", (d) => {
        const mage = "Jhlmage";

        if (d.name == mage) {
            accept_magiport(mage);
        }
    });

    if (character.name != "Jhlmerch") {
        setInterval(sendGoldToMerchant, 3 * 1000);
        setInterval(checkPotions, 9 * 1000);
    }
}


async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getPartyHealth() {
    return parent.party_list
        .map(name => get_player(name))
        .filter(p => p && p.hp > 0)
        .map(p => ({ name: p.name, hp: p.hp, max_hp: p.max_hp }));
}

async function manageParty() {
    const partyMembers = [
        "Jhlpriest", "Jhlranger", "Jhlmerch", "Jhlmage", "Jhlwarrior", "Jhlrogue",
        // "trololol", "YTFAN", "derped", "Knight", "Bonjour",
        // "Bravo", "Tostitos", "iniwa",
    ];
    const leaderName = "Jhlpriest"
    // const leaderName = "trololol";

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
    const leader = get_player("Jhlwarrior");
    if (!leader) {
        set_message("Leader not found");
        return null;
    }

    // Only act if leader is far enough
    if (distance(character, leader) < 85) { return; }

    const target = get_targeted_monster();

    // Compute offset to avoid collisions
    let offsetX = 0;
    let offsetY = 0;

    const avoidPoints = [];
    if (target && !target.dead) avoidPoints.push({ x: target.x, y: target.y });
    avoidPoints.push({ x: leader.x, y: leader.y });

    for (const point of avoidPoints) {
        const dx = character.x - point.x;
        const dy = character.y - point.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);

        const awayFactor = 30; // adjust for spacing
        offsetX += (dx / dist) * awayFactor;
        offsetY += (dy / dist) * awayFactor;
    }

    let safeX = leader.x + offsetX;
    let safeY = leader.y + offsetY;

    // Ensure minimum separation along main axis
    const dxLeader = safeX - leader.x;
    const dyLeader = safeY - leader.y;
    const minDist = 30;

    if (Math.abs(dxLeader) < minDist && Math.abs(dyLeader) < minDist) {
        if (Math.abs(dxLeader) >= Math.abs(dyLeader)) {
            safeX = leader.x + (dxLeader >= 0 ? minDist : -minDist);
        } else {
            safeY = leader.y + (dyLeader >= 0 ? minDist : -minDist);
        }
    }

    // ---------- Path to safe spot using floodfill ----------
    moveTowardTargetFloodfill(safeX, safeY);
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
        hpDiv.style.zIndex = "1000";

        // Give it more width so stuff doesnt stack
        hpDiv.style.width = "700px";
        hpDiv.style.maxWidth = "100%";
    }

    const invDiv = parent.document.getElementById("bottomleftcorner");
    if (invDiv) {
        invDiv.style.zIndex = "2000";
    }

}

function playKeepAliveSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();

        oscillator.type = "sine";
        oscillator.frequency.value = 440;
        gain.gain.value = 0.001;

        oscillator.connect(gain);
        gain.connect(ctx.destination);

        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.1); // play for 0.1s
    } catch (e) {
        console.log("Audio keep-alive failed:", e);
    }
}

async function snowballBosses() {
    const bosses = ["spiderr", "spiderbr", "spiderbl"];

    for (const boss of bosses) {
        const target = get_nearest_monster({ type: boss });

        if (target) {
            change_target(target);
            use_skill("snowball");

            await sleep(190);
        }
    }
}

function useSkillJacko() {
    const mobs = Object.values(parent.entities).filter(e =>
        e.type === "monster" &&
        e.target === character.name &&
        !e.dead &&
        can_use("scare")
    );

    for (const mob of mobs) {
        if (is_on_cooldown("scare")) { return; }
        change_target(mob);
        use_skill("scare");
    }
}

function crossMapHeal() {
    if (character.name == "Jhlpriest") { return; }

    if (character.hp <= character.max_hp * 0.4) {
        send_cm("Jhlpriest", `aoeHeal 123`);
    }
}

// ----- Holiday Buffs ----- //
// Christmas buffs
function needChristmasBuff() {
    return character.s?.holidayspirit == undefined && parent.S.holidayseason == true;
}

async function getChristmasBuff() {
    await smart_move(`main`);

    parent.socket.emit("interaction", { type: "newyear_tree" });

    return false;
}