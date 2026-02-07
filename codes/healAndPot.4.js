
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

function reviveSelf() {
    if (character.rip) {
        respawn();
        set_message("Auto-reviving...");
    }
}

function potionUse() {
    if (is_on_cooldown("regen_mp")) { return; }

    if (character.mp < 400) {
        return use_skill('use_mp');
    }
    else if (character.hp < character.max_hp * 0.35) {
        use_skill('use_hp');
    }
    else if (character.mp < character.max_mp * 0.65) {
        use_skill('use_mp');
    }
    else if (character.hp < character.max_hp * 0.65) {
        use_skill('use_hp');
    }
    else {
        recoverOutOfCombat();
    }
}

function checkPotions() {
    const HP_POTION = "hpot1";
    const MP_POTION = "mpot1";
    const MIN_POTIONS = 750;

    const hpCount = countItem(HP_POTION);
    const mpCount = countItem(MP_POTION);

    const x = character.real_x;
    const y = character.real_y;
    const map = character.map;

    console.log(x, y, map);

    if (hpCount < MIN_POTIONS) {
        send_cm("Jhlmerch", `need_Hpots ${x},${y},${map}`);
    }
    if (mpCount < MIN_POTIONS) {
        send_cm("Jhlmerch", `need_Mpots ${x},${y},${map}`);
    }
}

function countItem(itemName) {
    let total = 0;

    for (const slot of character.items) {
        if (!slot) continue;

        if (slot.name === itemName) {
            total += slot.q || 1;
        }
    }

    return total;
}

