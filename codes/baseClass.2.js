load_code("helpers");
load_code("commCommands")

class BaseClass {
    constructor(name) {
        this.name = name;
        this.char = get_player(name);

        this.sendItems = true;
        this.merchantName = "Jhlmerch";

        this.whitelist = [
            // Keep
            "spores", "seashell", "beewings", "gem0", "gem1", "whiteegg", "monstertoken", "spidersilk", "cscale", "spores",
            "rattail", "crabclaw", "bfur", "feather0", "gslime", "smush",
            // Upgrade
            "ringsj", "intbelt",
            // Sell
            "hpbelt", "hpamulet", "shoes", "coat", "pants", "strring", "intring", "vitring", "dexring",
            "wattire", "wshoes", "wcap", "cclaw", "mushroomstaff", "dexamulet", "stramulet", "intamulet",
            "wbreeches", "slimestaff", "stinger"
        ];

        this.currentMobFarm = "Spider";
        this.kite = false;

        this.attackMode = true;
        this.fightTogeather = true;
        this.returningToGroup = false;

        this.movingToNewMob = false;

        this.x = this.char.x;
        this.y = this.char.y;

        character.on("cm", async (sender, data) => {
            await this.handleCM(sender, data);
        });

        setInterval(() => this.sendWhitelistedItemsToMerchant(), 3 * 1000);
        setInterval(() => this.askForLuck(), 20 * 1000);
        setInterval(() => this.callMerchant(), 20 * 1000);

        startSharedTasks();
    }

    async handleCM(sender, payload) {
        if (!sender.name.startsWith("Jhl")) return;

        const [command, data] = sender.message.split(" ");

        switch (command.trim()) {
            case "come_to_me": {
                return;
                const [xStr, yStr, map] = data.split(",");
                const x = Number(xStr);
                const y = Number(yStr);

                console.log(x, y, map);
                if (get_player(sender.name)) { this.returningToGroup = false; }

                if (this.returningToGroup) { return; }
                this.returningToGroup = true;

                console.log(xStr, yStr, map)
                if (map && character.map !== map) {
                    await smart_move({ to: map });
                }

                await xmove(x, y);

                if (get_player(sender.name)) {
                    set_message(`Arrived at group location (${x}, ${y})`);
                    this.returningToGroup = false;
                }

                break;
            }

            case "set_new_target": {
                const dataSplit = data.split(',');
                this.currentMobFarm = dataSplit[1];

                this.movingToNewMob = true;
                await smart_move({ to: dataSplit[0] });
                this.movingToNewMob = false;

                break;
            }

            default:
                // Unknown command — ignore
                break;
        }
    }

    askForLuck() {
        const mluckBuff = character.s?.mluck;
        const remaining = mluckBuff?.ms || 0;

        if (!mluckBuff || remaining < 160000) {
            send_cm("Jhlmerch", `need_luck ${character.x},${character.y},${character.map}`);
            set_message("Requesting MLuck from merchant...");
        }
    }

    callMerchant() {
        let used = 0;
        for (let i = 0; i < character.items.length; i++) {
            if (character.items[i]) used++;
        }

        if (used >= 15) {
            send_cm("Jhlmerch", `need_luck ${character.x},${character.y},${character.map}`);
        }

    }

    setCurrentMobFarm(mobFarmName) {
        this.currentMobFarm = mobFarmName;
    }

    sendWhitelistedItemsToMerchant() {
        if (!this.sendItems) return;

        const merchant = get_player(this.merchantName);
        if (!merchant || parent.distance(character, merchant) > 400) {
            return;
        }

        for (let i = 0; i < character.items.length; i++) {
            const item = character.items[i];
            if (!item) continue;

            if (this.whitelist.includes(item.name)) {
                const quantity = item.q || 1; // stackable or single

                send_item(this.merchantName, i, quantity);
                console.log(`Sent ${quantity}x ${item.name} to ${this.merchantName}`);
            }
        }
    }

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
        const tank = get_player("Jhlpriest");
        if (tank) {
            if (get_nearest_monster({ target: "Jhlpriest" }) != null) { return get_nearest_monster({ target: "Jhlpriest" }); }
            else { return get_target_of(tank); }
        }

        return null;
    }

    findTarget(target) {
        if (target && target.name != myChar.currentMobFarm) {
            target = null;
        }

        if (target != null) { return target; }

        if (target == null || !target || target == undefined) {
            target = myChar.getClosestMonsterByName(myChar.currentMobFarm);
            if (target) {

                if (target.name == myChar.currentMobFarm || myChar.currentMobFarm == "") {
                    change_target(target);

                    return target;
                } else {
                    return null
                }

            } else {
                set_message(`Not my target ${myChar.currentMobFarm}`);

                return null;
            }
        }
    }

    // ATTTACKING
    attack(target) {
        if (!is_in_range(target)) {
            move(
                character.x + (target.x - character.x) / 2,
                character.y + (target.y - character.y) / 2
            );

            set_message("Moving to target");
        } else if (can_attack(target)) {
            set_message("Attacking");
            attack(target);
        }
    }

    farmTogeather(target) {
        const currentTarget = get_target_of(character.name);
        target = myChar.getTankTarget();

        returnToLeader();

        // Fallback to current target if tank target is invalid or a player
        if (!target || target.name?.startsWith("Jhl")) {
            target = currentTarget;
        }

        if (!target || target.name?.startsWith("Jhl")) {
            if (target == null && get_player("Jhlpriest") == null) {
                target = get_targeted_monster();
                target = myChar.findTarget(target);

                if (!target) {
                    target = null;
                }
            }
        }

        return target;
    }

    targetLogicNonTank() {
        useHealthPotion();
        useManaPotion();
        recoverOutOfCombat();
        loot();

        if (!this.attackMode || character.rip || this.movingToNewMob || this.returnToLeader) return null;
        let target;

        if (this.fightTogeather) {
            target = this.farmTogeather();

            return target;
        } else {
            target = get_targeted_monster();
            target = myChar.findTarget(target);

            if (!target) {
                set_message(`No target, moving to farm ${myMobs[myChar.currentMobFarm]}`);

                for (const [key, val] of Object.entries(myMobs)) {
                    if (val === this.currentMobFarm) {

                        if (!this.movingToNewMob) { smart_move(key); }
                        this.movingToNewMob = true;
                        return;
                    }
                }
                return;
            }
        }

        return target;
    }

    kiteTarget() {
        const target = get_targeted_monster();
        if (!target || target.dead) {
            set_message("No valid target to kite");
            return;
        }

        const dx = character.x - target.x;
        const dy = character.y - target.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);

        const awayFactor = 30;
        const safeRange = (target.range * 2) + (target.speed * 2) + 1;

        if (dist > safeRange) return;

        // Normalized escape vector
        const nx = dx / dist;
        const ny = dy / dist;

        // Primary escape
        let safeX = character.x + nx * awayFactor;
        let safeY = character.y + ny * awayFactor;

        // Ensure minimum separation
        const distToTarget = Math.sqrt((safeX - target.x) ** 2 + (safeY - target.y) ** 2);
        if (distToTarget < safeRange) {
            safeX = target.x + nx * safeRange;
            safeY = target.y + ny * safeRange;
        }

        // Try primary direction
        if (can_move_to(safeX, safeY)) {
            move(safeX, safeY);
            set_message(`Kiting to (${safeX.toFixed(0)}, ${safeY.toFixed(0)})`);
            return;
        }

        // Try rotated escape vectors (±45°, ±90°)
        const angles = [Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2];
        for (const angle of angles) {
            const rx = nx * Math.cos(angle) - ny * Math.sin(angle);
            const ry = nx * Math.sin(angle) + ny * Math.cos(angle);

            const altX = target.x + rx * safeRange;
            const altY = target.y + ry * safeRange;

            if (can_move_to(altX, altY)) {
                move(altX, altY);
                set_message(`Kiting (angled) to (${altX.toFixed(0)}, ${altY.toFixed(0)})`);
                return;
            }
        }

        set_message("Kite blocked in all directions");
    }
}

