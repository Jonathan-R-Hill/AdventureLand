
function startSharedTasks() {
    setInterval(manageParty, 750);
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

function manageParty() {
    const party = get_party() || {};
    const partyMembers = ["Jhlpriest", "Jhlranger", "Jhlmerch", "Jhlwarrior"];

    // If I'm the warrior, invite everyone else
    if (character.name === "Jhlwarrior") {
        for (const name of partyMembers) {
            if (!party.hasOwnProperty(name)) {
                send_party_invite(name);
                set_message(`Inviting ${name}`);
            }
        }
    } else {
        // If warrior is not in the party, leave
        if (character.party && !party.hasOwnProperty("Jhlwarrior")) {
            leave_party();
            set_message("Warrior not in party, leaving...");
            return;
        }

        // If I'm not in a party but warrior exists, accept invite
        if (!character.party) {
            accept_party_invite("Jhlwarrior");
            set_message("Accepting invite from warrior");
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

    let leader;
    if (character.name === "Jhlmerch") {
        leader = get_player("Jhlpriest");
    }
    else if (character.name === "Jhlpriest") {
        leader = get_player("Jhlranger");
    } else {
        leader = get_player("Jhlwarrior");
    }

    if (!leader) {
        set_message("Leader not found");
        return;
    }

    const target = get_targeted_monster();
    let offsetX = 0;
    let offsetY = 0;

    // Avoid both the mob and the leader
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

    const safeX = leader.x + offsetX;
    const safeY = leader.y + offsetY;

    move(safeX, safeY);

    set_message("Returned to safe position near leader");
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
