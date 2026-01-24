
class TargetLogic {
    currentMobFarm;
    secondaryTarget;
    tank;
    bosses;
    attackMode;
    fightTogeather;
    followLeader;
    pvpEnabled = false;

    allies = ["trololol", "YTFAN", "derped", "Knight", "Bonjour"];

    // TARGETING
    getClosestMonsterByName(name) {
        let closest = null;
        let minDist = Infinity;

        for (const id in parent.entities) {
            const ent = parent.entities[id];
            if (ent.type !== "monster" || ent.dead || !ent.visible) continue;
            if (ent.name !== name) continue;

            const dist = parent.distance(character, ent);
            if (dist < minDist) {
                minDist = dist;
                closest = ent;
            }
        }

        return closest;
    }

    getTankTarget() {
        const tank = get_player(this.tank);

        let target = get_target_of(tank);

        if (!target) {
            target = get_nearest_monster({ target: "Jhlwarrior" })
        }

        return target;
    }

    findStunnedTarget() {
        let closest = null;
        let closestDist = Infinity;

        for (let id in parent.entities) {
            const e = parent.entities[id];

            if (
                e.type === "monster" &&
                e.s && e.s.stunned &&      // must be stunned
                !e.dead                    // ignore dead mobs
            ) {
                const d = distance(character, e);
                if (d < closestDist) {
                    closest = e;
                    closestDist = d;
                }
            }
        }

        return closest;
    }

    findBosses() {
        const target = this.bosses
            .map(name => this.getClosestMonsterByName(name))
            .find(mon => mon) // first non-null result

        if (target && !target.s.fullguardx) {
            change_target(target);

            return target;
        }

        return null;
    }

    findTarget(target) {
        const playerAtk = ["altfire", "ryaaahs", "pbuffme", "learningad", "merchire"];

        if (this.pvpEnabled) {
            for (const name of playerAtk) {
                const player = get_player(name);
                if (player && !player.rip && player.visible) {
                    return player;
                }
            }
        }

        target = this.bosses
            .map(name => this.getClosestMonsterByName(name))
            .find(mon => mon) // first non-null result
            || this.getClosestMonsterByName(this.currentMobFarm) || this.getClosestMonsterByName(this.secondaryTarget);

        if (this.currentMobFarm == "") {
            target = get_nearest_monster();
            if (target) {
                change_target(target);
            }

            return target;
        }

        if (target && !target.s.fullguardx) {
            change_target(target);

            return target;
        } else if (target && target.s.fullguardx) {
            target = this.getClosestMonsterByName(this.currentMobFarm) || this.getClosestMonsterByName(this.secondaryTarget);

            return target;
        }

        if (target) {
            change_target(target);

            return target;
        }

        if (target && target.name != this.currentMobFarm) {
            target = null;
        }

        if (target) { return target; }

        return null;
    }

    farmTogeather(target = null) {
        const currentTarget = get_target_of(character.name);
        target = this.getTankTarget();

        if (character.name != "Jhlwarrior") { returnToLeader(); }

        if (!target || target.name?.startsWith("Jhl")) {
            target = currentTarget;
        }

        if (!target ||
            target.name?.startsWith("Jhl") || this.allies.includes(target.name)) {

            if (target == null && get_player(this.tank) == null) {
                target = get_targeted_monster();
                target = this.findTarget(target);

                if (!target) {
                    target = null;
                }
            }
        }

        return target;
    }

    targetLogicNonTank() {
        if (!this.attackMode || character.rip) { return null; }

        let target = null;

        if (this.fightTogeather) {
            target = this.farmTogeather();
        } else {
            if (this.followLeader && character.name != this.tank) { returnToLeader(); }
            target = this.targetLogicTank();
        }

        return target;
    }

    targetLogicTank() {
        if (!this.attackMode || character.rip || smart.moving) return null;

        let target = get_targeted_monster();

        // Current farm mob
        if (target && target.name != this.currentMobFarm && target.name != this.secondaryTarget) {
            target = null;
        }

        if (!target) {
            target = this.findTarget();
        }

        if (!target) {
            set_message(`No target, moving to farm ${mobData[this.currentMobFarm]}`);

            return null;
        }

        return target;
    }

    findTargetNotAttackingMe() {
        let closest = null;
        let closestDist = Infinity;

        for (let id in parent.entities) {
            const e = parent.entities[id];

            if (e.s.fullguardx) { continue; }
            if (
                e.type == "monster" && !e.dead &&
                (this.bosses.includes(e.name) || e.name == this.currentMobFarm || e.name == this.secondaryTarget) &&
                get_target_of(e) !== character
            ) {
                const d = this.distance(character, e);
                if (d <= closestDist) {
                    closest = e;
                    closestDist = d;
                }
            }
        }

        return closest;
    }

    targetLogicTank3() {
        if (!this.attackMode || character.rip || smart.moving) return null;

        if (this.eventsEnabled && (parent.S.snowman || parent.S.icegolem)) {
            return this.targetLogicTank();
        }

        const attackers = this.getMobsAttackingMe();

        const attackerCount = attackers.length;

        // If already tanking 3+, STOP pulling new mobs
        if (attackerCount >= 3) {
            let target = get_targeted_monster();

            if (!target || target.dead) {
                target = attackers[0] || null;
            }

            return target;
        }

        // pulling logic
        let target = null;

        if (!target) {
            target = this.findTargetNotAttackingMe();
        }

        if (!target) {
            set_message(`No target, moving to farm ${this.currentMobFarm}`);
            return null;
        }

        return target;
    }

    getMobsAttackingMe() {
        return Object.values(parent.entities).filter(e =>
            e.type == "monster" &&
            !e.dead &&
            e.target == character.name
        );
    }

}

async function checkNearbyFarmMob() {
    // If fighting together and not the tank, stop here for follow logic
    if (this.fightTogeather && get_player(this.tank) && character.name !== this.tank) {
        if (smart.moving) { stop(); }
        return;
    }

    // Priority check Bosses
    for (const id in parent.entities) {
        const ent = parent.entities[id];
        if (!ent || ent.type !== "monster" || ent.dead || !ent.visible) continue;

        const dist = parent.distance(character, ent);
        if (dist > 300) { continue; }

        if (this.bosses.includes(ent.name)) {
            if (smart.moving) { stop(); }
            set_message("Boss spotted nearby, engaging");

            return;
        }
    }

    const targetsToCheck = [this.currentMobFarm, this.secondaryTarget];

    for (const targetName of targetsToCheck) {
        const mobEntry = mobData.find(m => m.target === targetName);
        if (!mobEntry) {
            game_log(`Mob ${targetName} not found in dictionary`);
            continue;
        }

        // Scan nearby entities for this mob
        for (const id in parent.entities) {
            const ent = parent.entities[id];
            if (!ent || ent.type !== "monster" || ent.dead || !ent.visible) continue;

            const dist = parent.distance(character, ent);
            if (dist > 300) continue;

            if (ent.name === mobEntry.target) {
                stop();
                set_message(`Engaging ${mobEntry.target}`);
                return;
            }
        }
    }

    // If none found nearby, move toward this mob’s spawn
    if (!smart.moving) {
        let farm = mobData.find(m => m.target === this.currentMobFarm);

        if (this.lastEvent == "icegolem") {
            use_skill("use_town");
            await sleep(6000);
            this.lastEvent = null;
        }

        if (this.currentMobFarm == `Irradiated Goo`) {
            await smart_move(`arena`);
        }
        else {
            await smart_move(farm.travel);
        }
    }

    set_message(`No ${this.currentMobFarm} nearby, moving to farm`);
    return;

}
