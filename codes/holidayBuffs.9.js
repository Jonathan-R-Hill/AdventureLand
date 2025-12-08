
// Christmas buffs
function needChristmasBuff() {
    console.log(character.s?.holidayspirit == undefined, parent.S.holidayseason == true)
    return character.s?.holidayspirit == undefined && parent.S.holidayseason == true;
}

async function getChristmasBuff() {
    await smart_move(`main`);

    parent.socket.emit("interaction", { type: "newyear_tree" });

    return false;
}