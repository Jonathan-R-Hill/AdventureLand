
// MONSTER HUNTER
async function checkMonsterHunt() {
    const huntBuff = character.s?.monsterhunt;

    if (!huntBuff || (huntBuff && (huntBuff.c <= 0 || huntBuff.c == undefined || huntBuff.c == null))) {
        // No active hunt
        if (character.map !== "main") {
            await smart_move({ map: "main" });
            await smart_move({ to: "monsterhunter" });
            parent.socket.emit("monsterhunt");

        } else if (character.c.monsterhunt === 0) {
            // Ready to turn in
            await smart_move({ to: "monsterhunter" });
            parent.socket.emit("monsterhunt");
            set_message("Turning in Monster Hunt");

        } else {
            await smart_move({ to: "monsterhunter" });
            parent.socket.emit("monsterhunt");
            set_message("Waiting for new hunt...");
        }

        return;
    }
}

// TODO: monster hunter
async function setNewTask() {

}

async function returnToMob(mob) {

}
