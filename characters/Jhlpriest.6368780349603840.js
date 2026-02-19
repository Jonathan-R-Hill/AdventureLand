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
        lowMembers = partyHealth.filter(m => m.hp < m.max_hp * 0.90);
        if (lowMembers.length > 0 && !is_on_cooldown("heal")) {
            use_skill("heal", lowMembers[0].name);
            return;
        }

        let targets = Object.values(parent.entities).filter(p =>
            p.type === "character" &&
            this.myCharacters.includes(p.name) &&
            !p.rip
        );

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
        if (this.distance(character, target) >= character.range) { return; }
        use_skill("curse", target);
    }

    useSkillAbsorb() {
        const absorbAll = false;

        if (is_on_cooldown("absorb") || character.mp < G.skills.absorb.mp) return;

        let targetsToCheck = [];

        if (absorbAll) {
            // Protect ANY player nearby
            for (const id in parent.entities) {
                const ent = parent.entities[id];
                if (ent.name == "Jhlwarrior") { continue; }
                if (ent.type === "character" && !ent.rip && ent.name !== character.name && !ent.npc) {
                    targetsToCheck.push(ent);
                }
            }
        } else {
            const partyMembers = ["Jhlrogue", "Jhlmage", "Jhlranger", "Jhlpally"];
            for (const id of partyMembers) {
                const member = get_player(id);
                if (member && !member.rip && member.map === character.map) {
                    targetsToCheck.push(member);
                }
            }
        }

        for (const member of targetsToCheck) {
            if (parent.distance(character, member) > G.skills.absorb.range) continue;

            for (const entId in parent.entities) {
                const ent = parent.entities[entId];
                if (!ent.target || ent.type !== "monster") continue;

                if (ent.target === member.name) {
                    use_skill("absorb", member);
                    game_log(`Absorbing agro from ${member.name}`);
                    return;
                }
            }
        }
    }

    weaponLogic(target) {
        let bossEntity = null;

        if (target && target.type === "monster" && this.bosses.includes(target.mtype)) {
            bossEntity = target;
        } else if (this.bosses.includes(this.validTargets[0])) {
            bossEntity = this.getClosestMonsterByType(this.validTargets[0]);
        }

        if (bossEntity && bossEntity.hp > (bossEntity.max_hp * 0.10)) {
            this.equipItem("firestaff", 8, "mainhand");
        }
        else {
            this.equipItem("lmace", 7, "mainhand");
        }
    }

    async mainLoop() {
        while (true) {
            try {
                if (character.cc >= 170 || this.gettingBuff) {
                    await sleep(200);
                    continue;
                }

                this.merchantInteractions();

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

                // Farm Check
                if (now - this.lastFarmCheck > 5000 && this.validTargets[0] != "") {
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

                    this.useSkillAbsorb();
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
