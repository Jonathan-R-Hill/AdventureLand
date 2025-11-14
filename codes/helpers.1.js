
function startSharedTasks() {
    setInterval(manageParty, 2100);
    setInterval(reviveSelf, 8000);

    if (character.name != "Jhlmerch") {
        setInterval(sendGoldToMerchant, 3 * 1000);
        setInterval(checkPotions, 5 * 1000);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function reviveSelf() {
    if (character.rip) {
        respawn();
        set_message("Auto-reviving...");

        returnToLeader()
    }
}

function useHealthPotion() {
    if (is_on_cooldown("regen_mp")) { return; }

    if (character.hp < character.max_hp * 0.60) {
        return use_skill('use_hp');
    }
}

function useManaPotion() {
    if (is_on_cooldown("regen_mp")) { return; }

    if (character.mp < character.max_mp * 0.50) {
        use_skill('use_mp');
    }
}

function getPartyHealth() {
    return parent.party_list
        .map(name => get_player(name))
        .filter(p => p && p.hp > 0)
        .map(p => ({ name: p.name, hp: p.hp, max_hp: p.max_hp }));
}

function recoverOutOfCombat() {
    if (is_on_cooldown("regen_mp")) { return; }

    if (character.mp < character.max_mp * 0.8) {
        use_skill("regen_mp");
    }
    else if (character.hp < character.max_hp) {
        use_skill("regen_hp");
    }
    else if (character.mp < character.max_mp) {
        use_skill("regen_mp");
    }
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
    } else {
        game_log("Merchant not nearby or not found!");
    }
}

function checkPotions() {
    const HP_POTION = "hpot1";
    const MP_POTION = "mpot1";
    const MIN_POTIONS = 100;

    const hpCount = countItem(HP_POTION);
    const mpCount = countItem(MP_POTION);

    const player = get_player(character.name);

    console.log(
        `${character.name} - Potion Check - HP: ${hpCount}, MP: ${mpCount}
        ${player.x},${player.y}`
    );

    if (hpCount < MIN_POTIONS || mpCount < MIN_POTIONS) {
        send_cm("Jhlmerch", `need_pots ${player.x},${player.y},${player.map}`);
    }
}

function returnToLeader() {
    let leader = get_player("Jhlpriest");

    if (!leader) {
        set_message("Leader not found");
        return;
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

function kiteTarget() {
    const target = get_targeted_monster();
    if (!target || target.dead) {
        set_message("No valid target to kite");
        return;
    }

    const dx = character.x - target.x;
    const dy = character.y - target.y;
    const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);

    const awayFactor = 30;
    const safeRange = (target.range * 2) + (target.speed * 2) + 1;

    if (dist > safeRange) return;

    // Normalized escape vector
    const nx = dx / dist;
    const ny = dy / dist;

    // Primary escape
    let safeX = character.x + nx * awayFactor;
    let safeY = character.y + ny * awayFactor;

    // Ensure minimum separation
    const distToTarget = Math.sqrt((safeX - target.x) ** 2 + (safeY - target.y) ** 2);
    if (distToTarget < safeRange) {
        safeX = target.x + nx * safeRange;
        safeY = target.y + ny * safeRange;
    }

    // Try primary direction
    if (can_move_to(safeX, safeY)) {
        move(safeX, safeY);
        set_message(`Kiting to (${safeX.toFixed(0)}, ${safeY.toFixed(0)})`);
        return;
    }

    // Try rotated escape vectors (±45°, ±90°)
    const angles = [Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2];
    for (const angle of angles) {
        const rx = nx * Math.cos(angle) - ny * Math.sin(angle);
        const ry = nx * Math.sin(angle) + ny * Math.cos(angle);

        const altX = target.x + rx * safeRange;
        const altY = target.y + ry * safeRange;

        if (can_move_to(altX, altY)) {
            move(altX, altY);
            set_message(`Kiting (angled) to (${altX.toFixed(0)}, ${altY.toFixed(0)})`);
            return;
        }
    }

    set_message("Kite blocked in all directions");
}

// ----- Merchant Section
function countItem(name) {
    for (let i = 0; i < character.items.length; i++) {
        const item = character.items[i];
        if (item && item.name === name) return item.q;
    }

    return 0;
}

// Find slot of a specific item
function getItemSlot(name) {
    for (let i = 0; i < character.items.length; i++) {
        const item = character.items[i];
        if (item && item.name === name) return i;
    }

    return -1;
}

function sendPotionsTo(name, hpPotion, mpPotion, hpAmount = 200, mpAmount = 200) {
    const player = get_player(name);
    if (!player || parent.distance(character, player) > 400) {
        return;
    }

    const hpSlot = getItemSlot(hpPotion);
    const mpSlot = getItemSlot(mpPotion);

    if (hpSlot > -1) send_item(name, hpSlot, hpAmount);
    if (mpSlot > -1) send_item(name, mpSlot, mpAmount);

    game_log(`🧴 Sent ${hpAmount} HP and ${mpAmount} MP potions to ${name}`);
}
