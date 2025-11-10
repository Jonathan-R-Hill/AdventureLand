
function startSharedTasks() {
    setInterval(manageParty, 1100);
    setInterval(reviveSelf, 5000);

    if (character.name != "Jhlmerch") {
        setInterval(sendGoldToMerchant, 5 * 60 * 1000);
        setInterval(checkPotions, 10 * 1000);
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

    if (character.hp < character.max_hp * 0.50) {
        return use_skill('use_hp');
    }
}

function useManaPotion() {
    if (is_on_cooldown("regen_mp")) { return; }

    if (character.mp < character.max_mp * 0.35) {
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
    const partyMembers = ["Jhlpriest", "Jhlranger", "Jhlmerch", "Jhlwarrior"];

    if (character.name === "Jhlwarrior") {
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
            if (character.party !== "Jhlwarrior") {
                // Wrong leader, leave
                leave_party();
            }

            return;
        } else {
            // Not in a party at all, accept warrior’s invite
            accept_party_invite("Jhlwarrior");
            await sleep(50);
        }
    }
}


function nearTank() {
    const player = get_player("Jhlwarrior");

    return player != null;
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
    const HP_POTION = "hpot0";
    const MP_POTION = "mpot0";
    const MIN_POTIONS = 100;

    const hpCount = countItem(HP_POTION);
    const mpCount = countItem(MP_POTION);

    const player = get_player(character.name);

    console.log(
        `${character.name} - Potion Check - HP: ${hpCount}, MP: ${mpCount}
        ${player.x},${player.y}`
    );

    if (hpCount < MIN_POTIONS || mpCount < MIN_POTIONS) {
        send_cm("Jhlmerch", `need_pots ${player.x},${player.y}`);
    }
}

async function returnToLeader() {
    console.log("Potion levels sufficient, returning to leader...");

    const leader = get_player("Jhlwarrior");
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

    // ✅ Enforce minimum 60 units separation from leader in at least one axis
    const dxLeader = safeX - leader.x;
    const dyLeader = safeY - leader.y;

    if (Math.abs(dxLeader) < 60 && Math.abs(dyLeader) < 60) {
        // Push further along whichever axis has more room
        if (Math.abs(dxLeader) >= Math.abs(dyLeader)) {
            safeX = leader.x + (dxLeader >= 0 ? 60 : -60);
        } else {
            safeY = leader.y + (dyLeader >= 0 ? 60 : -60);
        }
    }

    move(safeX, safeY);
    set_message(`Returned to safe position near leader (${safeX.toFixed(0)}, ${safeY.toFixed(0)})`);
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
