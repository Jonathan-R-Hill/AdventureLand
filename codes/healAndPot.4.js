
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

function useHealthPotion() {
    if (is_on_cooldown("regen_mp")) { return; }

    if (character.hp < character.max_hp * 0.65) {
        return use_skill('use_hp');
    }
}

function useManaPotion() {
    if (is_on_cooldown("regen_mp")) { return; }

    if (character.mp < character.max_mp * 0.65) {
        use_skill('use_mp');
    }
}

function checkPotions() {
    const HP_POTION = "hpot1";
    const MP_POTION = "mpot1";
    const MIN_POTIONS = 750;

    const hpCount = countItem(HP_POTION);
    const mpCount = countItem(MP_POTION);

    const player = get_player(character.name);

    console.log(
        `${character.name} - Potion Check - HP: ${hpCount}, MP: ${mpCount}
        ${player.x},${player.y},${player.map}`
    );

    if (hpCount < MIN_POTIONS) {
        send_cm("Jhlmerch", `need_Hpots ${player.x},${player.y},${player.map}`);
    }
    if (mpCount < MIN_POTIONS) {
        send_cm("Jhlmerch", `need_Mpots ${player.x},${player.y},${player.map}`);
    }
}

function countItem(name) {
    for (let i = 0; i < character.items.length; i++) {
        const item = character.items[i];
        if (item && item.name === name) return item.q;
    }

    return 0;
}
