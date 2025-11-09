load_code("helpers");

const HP_POTION = "hpot0";
const MP_POTION = "mpot0";
const potsMinStock = 600;
const POT_BUFFER = 300;

let restocking = false;
let transferingPotions = false;
let returningToGroup = false;

async function restockPotions() {
	console.log("Checking potion levels...");

	const currentHp = countItem(HP_POTION);
	const currentMp = countItem(MP_POTION);

	// Only go buy if below buffer
	if (currentHp < POT_BUFFER || currentMp < POT_BUFFER) {
		restocking = true;

		set_message("Restocking potions...");
		await smart_move({ to: "potions" }); // Go to potion NPC

		if (currentHp < potsMinStock) buy(HP_POTION, potsMinStock - currentHp);
		if (currentMp < potsMinStock) buy(MP_POTION, potsMinStock - currentMp);

		set_message("Potions restocked!");
	}

	if (currentHp >= POT_BUFFER && currentMp >= POT_BUFFER) {
		// Move back to leader
		console.log("Potion levels sufficient, returning to leader...");

		// Reset flags and wait for leader or member to call
		restocking = false;
		transferingPotions = false;
		returningToGroup = false;
	}
}

restockPotions();
setInterval(restockPotions, 5 * 60 * 1000);

setInterval(function () {
	console.log(`States: restocking: ${restocking}, returningToGroup: ${returningToGroup}, transferingPotions: ${transferingPotions}`);

	if (restocking) { return; }

	if (!transferingPotions) {
		recoverOutOfCombat();
		loot();
		useHealthPotion();
		reviveSelf();

		returnToLeader();
	}

}, 1000 / 1.5);

// Need_pots x,y
character.on("cm", async (sender, data) => {
	console.log(`Received cm from ${sender.message}..`, sender);

	const splitMsg = sender.message.split(' ');

	console.log(restocking, '    ', splitMsg);

	if (splitMsg[0].trim() != "need_pots") return;

	const xy = splitMsg[1].split(',');
	const x = parseInt(xy[0]);
	const y = parseInt(xy[1]);

	if (restocking) { return; }

	transferingPotions = true;
	set_message(`Moving to ${x}, ${y} to deliver potions...`);

	await xmove(x, y);

	const player = get_player(sender.name);
	if (!player) return;

	if (player.name.startsWith("Jhl")) {
		await restockPotions();

		// Trade potions
		sendPotionsTo(player.name, HP_POTION, MP_POTION, 100, 100);
		set_message(`Delivered 100 HP & MP potions to ${player.name}`);

		transferingPotions = false;
		await returnToLeader();
	}
});

// Come_to_me x,y
character.on("cm", async (sender, data) => {
	console.log(`Received cm from ${sender.message}..`, sender);

	if (returningToGroup) { return; }

	if (!sender.name.startsWith(("Jhl"))) { return; }
	if (restocking) { return; }

	const splitMsg = sender.message.split(' ');

	if (splitMsg[0].trim() != "come_to_me") return;

	const xy = splitMsg[1].split(',');
	const x = parseInt(xy[0]);
	const y = parseInt(xy[1]);

	// Move to player location
	xmove(x, y);
	returningToGroup = true;

	if (character.x == x && character.y == y) {
		set_message(`Arrived at group location (${x}, ${y})`);
		returningToGroup = false;

		await returnToLeader();
	}
});

