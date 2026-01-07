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
            return;
        }

        let targets = Object.values(parent.entities).filter(p =>
            p.type === "character" &&
            this.myCharacters.includes(p.name) &&
            !p.rip
        );

        // Don't forget to add yourself to the list!
        targets.push(character);

        for (let target of targets) {
            if (target.hp < target.max_hp * 0.70) {
                if (distance(character, target) <= character.range) {
                    if (!is_on_cooldown("heal")) {
                        use_skill("heal", target.id || target.name);
                        return;
                    }
                }
            }
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

    weaponLogic(target) {
        this.equipItem("harbringer", 7, "mainhand");
    }

    async mainLoop() {
        while (true) {
            try {
                if (character.cc >= 170 || this.gettingBuff) {
                    await sleep(200);
                    continue;
                }

                potionUse();
                loot();

                const now = Date.now();
                // Call Merchant
                if (now - this.lastMerchCall > 8 * 60 * 1000) {
                    send_cm("Jhlmerch", `come_to_me ${character.real_x},${character.real_y},${character.map}`);
                    this.lastMerchCall = now;
                }

                // High Priority: Healing and Reviving
                this.healParty();
                this.revivePartyMembers();

                if (this.movingToEvent) {
                    await sleep(250);
                    continue;
                }

                // Farm Check
                if (now - this.lastFarmCheck > 5000 && this.currentMobFarm != "") {
                    this.checkNearbyFarmMob();
                    this.lastFarmCheck = now;
                }

                // Combat Logic
                const target = this.targetLogicNonTank();
                if (target) {
                    await this.useTemporalSurge(2800);

                    this.weaponLogic(target);

                    if (this.kite) { this.kiteTarget(); }
                    this.moveAwayFromWarrior();

                    // this.useSkillAbsorb();
                    this.useSkillDarkBlessing();
                    this.useSkillCurse(target);

                    await this.attack(target);
                } else {
                    set_message("No Target");
                }

            } catch (e) {
                console.error("Main Loop Error:", e);
            }

            let delay = ((1 / character.frequency) * 1000) / 6;
            await sleep(delay);
        }
    }

}

const myChar = new MyChar(character.name);

// setInterval(() => manageActiveChars(myChar.eventsEnabled), 7000);
myChar.mainLoop();
