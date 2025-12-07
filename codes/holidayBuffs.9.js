
// Christmas buffs
function hasChristmasBuff() {
    return character.s?.holidayspirit != null && parent.S.holidayseason == true;
}

async function getChristmasBuff() {
    if (hasChristmasBuff) { return true; }
    await smart_move(`main`);

    parent.socket.emit("interaction", { type: "newyear_tree" });

    return false;
}