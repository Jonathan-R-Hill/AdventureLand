
function startSharedTasks() {
    setInterval(manageParty, 1000);
    setInterval(sendGoldToMerchant, 10000);
    setInterval(checkPotions, 10 * 1000);
}

function useHealthPotion() {
    if (character.hp < character.max_hp * 0.50) {
        return use_skill('use_hp');
    }
}

function useManaPotion() {
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
    if (character.mp < character.max_mp * 0.80 && can_use("regen_mp")) {
        use_skill("regen_mp");
    }

    if (character.hp < character.max_hp && can_use("regen_hp")) {
        use_skill("regen_hp");
    }
}

function manageParty() {
    let party = get_party() || {}; // Ensure it's an object even if null
    let partyMembers = ["Jhlpriest", "Jhlranger", "Jhlmerch", "Jhlwarrior"];

    if (character.name == "Jhlwarrior") {
        for (let name of partyMembers) {
            if (!party.hasOwnProperty(name)) {
                send_party_invite(name);
                set_message(`Inviting ${name}`);
            }
        }
    }
    else {
        if (!character.party) {
            accept_party_invite("Jhlwarrior"); // ✅ Corrected name
            set_message("Accepting invite");
        }

    }
}

function sendGoldToMerchant() {
    const merchantName = "Jhlmerch";
    const merchant = get_player(merchantName);

    // Only send if merchant is close enough and exists
    if (merchant && parent.distance(character, merchant) < 400) {
        if (character.gold > 2000) { // keep a little for yourself
            send_gold(merchantName, character.gold - 1000);
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
        console.log(`Sent potion request to merchant..  need_pots ${player.x}, ${player.y}`);
    }
}

async function returnToLeader() {
    console.log("Potion levels sufficient, returning to leader...");

    const leader = get_player("Jhlwarrior");
    console.log("Leader info:", leader);

    if (leader) {
        console.log(`Moving back to leader at (${leader.x}, ${leader.y})`);

        await xmove(leader.x, leader.y);
        set_message("Returned to leader");
    } else {
        set_message("Leader not found");
    }
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

// Send items to a player
function sendPotionsTo(name, hpPotion, mpPotion, hpAmount = 200, mpAmount = 200) {
    const player = get_player(name);
    if (!player || parent.distance(character, player) > 400) {
        console.log(`Player ${name} not found or too far away.`);
        return;
    }

    const hpSlot = getItemSlot(hpPotion);
    const mpSlot = getItemSlot(mpPotion);

    if (hpSlot > -1) send_item(name, hpSlot, hpAmount);
    if (mpSlot > -1) send_item(name, mpSlot, mpAmount);

    game_log(`🧴 Sent ${hpAmount} HP and ${mpAmount} MP potions to ${name}`);
}
