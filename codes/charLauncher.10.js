// ----- Config ----- //
const PARTY_CONFIG = {
    "Jhlwarrior": { slot: "Jhlwarrior", active: true },
    "Jhlmage": { slot: "Jhlmage", active: false },
    // "Jhlmerchant": { slot: "Jhlmerch", active: true },
    "Jhlranger": { slot: "Jhlranger", active: true },
    "Jhlrogue": { slot: "Jhlrogue", active: false },
};

let isManaging = false;

async function manageActiveChars() {
    if (isManaging) return;
    isManaging = true;

    try {
        const activeStates = get_active_characters();

        for (const name in PARTY_CONFIG) {
            const config = PARTY_CONFIG[name];
            const currentState = activeStates[name]; // "self", "starting", "loading", "active", "code"

            if (!config.active) {
                // STOP LOGIC: If they are running but shouldn't be
                if (currentState && currentState !== "self") {
                    game_log(`Stopping ${name} (Config set to inactive)`);
                    stop_character(name);
                    await sleep(1000);
                }
                continue;
            }

            // START LOGIC: If they are not logged in at all
            if (!currentState) {
                game_log(`Launching ${name}...`);
                start_character(name, config.slot);
                await sleep(5000);
            }
            // If theyre logged in but NOT running code
            else if (currentState === "active") {
                game_log(`${name} is idle. Starting code slot: ${config.slot}`);

                start_character(name, config.slot);
                await sleep(2000);
            }
        }
    } catch (e) {
        console.error("Party Manager Error:", e);
    } finally {
        isManaging = false;
    }
}

setInterval(async () => await manageActiveChars(), 5000);