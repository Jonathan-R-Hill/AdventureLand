load_code("baseClass");
load_code("helpers");
load_code("charLauncher");
load_code("dpsMeter");

class MyChar extends BaseClass {
    lastFarmCheck = 0;
    lastMerchCall = 0; // Track merchant pings

    healParty() {
        let partyHealth = getPartyHealth();

        // Filter members below 55% HP for Party Heal
        let lowMembers = partyHealth.filter(m => m.hp < m.max_hp * 0.55);
        if (lowMembers.length >= 2 && !is_on_cooldown("partyheal")) {
            use_skill("partyheal");
        }

        // Filter members below 85% HP for single Heal
        lowMembers = partyHealth.filter(m => m.hp < m.max_hp * 0.85);
        if (lowMembers.length > 0 && !is_on_cooldown("heal")) {
            use_skill("heal", lowMembers[0].name);
        }
    }

    revivePartyMembers() {
        for (const id in parent.party) {
            const member = get_player(id);
            if (!member) continue;

            if (member.rip) {
                if (member.c.revival) { continue; }
                // Cast if revive is ready and target is at full HP
                if (!is_on_cooldown("revive") && member.hp >= member.max_hp) {
                    use_skill("revive", member);
                    game_log("Revived " + member.name);
                }
                else {
                    this.healParty();
                }
            }
        }
    }

    useSkillDarkBlessing() {
        if (is_on_cooldown("darkblessing") || character.s.darkblessing) { return; }
        use_skill("darkblessing");
    }

    useSkillCurse(target) {
        if (is_on_cooldown("curse") || target.s.curse) { return; }
        if (target.hp < target.max_hp * 0.2 || target.hp < 12000 || target.s.cursed) { return; }
        use_skill("curse", target);
    }

    useSkillAbsorb() {
        const partyMembers = ["Jhlrogue", "Jhlmage", "Jhlranger", "Jhlpally"];
        for (const id of partyMembers) {
            const member = get_player(id);
            if (!member || !member.map || member.rip) { continue; }

            for (const entId in parent.entities) {
                const ent = parent.entities[entId];
                if (!ent.target || ent.type !== "monster") { continue; }
                if (ent.target === member.name && !is_on_cooldown("absorb")) {
                    use_skill("absorb", member);
                    return;
                }
            }
        }
    }
}

const myChar = new MyChar(character.name);

async function mainLoop() {
    while (true) {
        try {
            if (character.cc >= 170 || myChar.gettingBuff) {
                await sleep(200);
                continue;
            }

            useHealthPotion();
            useManaPotion();
            recoverOutOfCombat();
            loot();

            const now = Date.now();
            // Call Merchant
            if (now - myChar.lastMerchCall > 8 * 60 * 1000) {
                send_cm("Jhlmerch", `come_to_me ${character.real_x},${character.real_y},${character.map}`);
                myChar.lastMerchCall = now;
            }

            // High Priority: Healing and Reviving
            myChar.healParty();
            myChar.revivePartyMembers();

            if (myChar.movingToEvent) {
                await sleep(250);
                continue;
            }

            // Farm Check
            if (now - myChar.lastFarmCheck > 5000 && myChar.currentMobFarm != "") {
                myChar.checkNearbyFarmMob();
                myChar.lastFarmCheck = now;
            }

            // Combat Logic
            const target = myChar.targetLogicNonTank();
            if (target) {
                await myChar.useTemporalSurge(2800);

                myChar.movingToNewMob = false;
                if (myChar.kite) { myChar.kiteTarget(); }
                myChar.moveAwayFromWarrior();

                // myChar.useSkillAbsorb();
                myChar.useSkillDarkBlessing();
                myChar.useSkillCurse(target);

                await myChar.attack(target);
            } else {
                set_message("No Target");
            }

        } catch (e) {
            console.error("Main Loop Error:", e);
        }

        let delay = ((1 / character.frequency) * 1000) / 8;
        await sleep(delay);
    }
}


mainLoop();