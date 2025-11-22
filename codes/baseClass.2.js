load_code("helpers");
load_code("commCommands")

class BaseClass {
    constructor(name) {
        this.name = name;
        this.char = get_player(name);

        this.sendItems = true;
        this.merchantName = "Jhlmerch";

        this.kite = false;
        this.attackMode = true;
        this.fightTogeather = false;

        this.currentMobFarm = "Croc";
        this.tank = "Jhlwarrior";

        this.whitelist = [
            // Keep
            "spores", "seashell", "beewings", "gem0", "gem1", "whiteegg", "monstertoken", "spidersilk", "cscale", "spores",
            "rattail", "crabclaw", "bfur", "feather0", "gslime", "smush", "lostearring", "spiderkey", "snakeoil", "ascale",
            // Upgrade
            "ringsj", "intbelt", "intearring", "strearring", "dexearring",
            // Sell
            "hpbelt", "hpamulet", "shoes", "coat", "pants", "strring", "intring", "vitring", "dexring",
            "wattire", "wshoes", "wcap", "cclaw", "mushroomstaff", "dexamulet", "stramulet", "intamulet",
            "wbreeches", "slimestaff", "stinger", "vitearring",
        ];

        this.returningToGroup = false;
        this.movingToNewMob = false;

        this.x = this.char.real_x;
        this.y = this.char.real_y;

        character.on("cm", async (sender, data) => {
            await this.handleCM(sender, data);
        });

        setInterval(() => this.sendWhitelistedItemsToMerchant(), 3 * 1000);
        setInterval(() => this.askForLuck(), 20 * 1000);
        setInterval(() => this.callMerchant(), 20 * 1000);

        startSharedTasks();

        scaleUI(0.80);
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

            case "set_new_hunter_target": {
                const dataSplit = data.split(',');
                const travel = dataSplit[0];
                const target = dataSplit[1];
                const map = dataSplit[2];

                this.currentMobFarm = target;
                this.movingToNewMob = true;

                if (character.map != map) { await smart_move({ map: map }); }
                await smart_move(travel);

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

        if (used >= 25) {
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

    removeWeapons() {
        unequip("mainhand");
        unequip("offhand");
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
        const tank = get_player(this.tank);
        if (tank) {
            console.log(tank);
            if (get_nearest_monster({ target: "Jhlpriest" }) != null) { return get_nearest_monster({ target: "Jhlpriest" }); }
            else if (get_nearest_monster({ target: "Jhlranger" }) != null) { return get_nearest_monster({ target: "Jhlranger" }); }
            else if (get_nearest_monster({ target: "Jhlwarrior" }) != null) { return get_nearest_monster({ target: "Jhlwarrior" }); }
            else { return get_target_of(tank); }
        }

        return null;
    }

    findTarget(target) {
        if (target && target.name != this.currentMobFarm) {
            target = null;
        }

        if (target != null) { return target; }

        if (target == null || !target || target == undefined) {
            if (this.getClosestMonsterByName("Phoenix")) {
                target = this.getClosestMonsterByName("Phoenix");
            }
            else {
                target = this.getClosestMonsterByName(this.currentMobFarm);
            }

            if (target) {

                if (target.name == this.currentMobFarm || this.currentMobFarm == "") {
                    change_target(target);

                    return target;
                } else {
                    return null
                }

            } else {
                set_message(`Not my target ${this.currentMobFarm}`);

                return null;
            }
        }
    }

    is_in_range(target) {
        if (!target || !target.visible) return false;

        // 1. Calculate the MAX distance the character can be from the target's center
        //    Max Range = (My Range) + (Target Radius) + (Your Character Radius)

        const character_radius = get_width(character) / 2;
        const target_radius = target.width / 2;
        const desired_buffer = 1;

        // The maximum dist that still allows an attack
        const maxCenter2CenterRange = character.range + target_radius + character_radius;

        // The actual distance we check (max range - buffer)
        const check_distance = maxCenter2CenterRange - desired_buffer;

        return this.distance(character, target) < check_distance;
    }

    // Center-to-Center Distance Calculation
    distance(a, b) {
        if (!a || !b) return 99999999;
        // map/instance checks for safety
        if ("in" in a && "in" in b && a.in != b.in) return 99999999;
        if ("map" in a && "map" in b && a.map != b.map) return 99999999;

        // Get the center coordinates for both entities
        const a_x = get_x(a);
        const a_y = get_y(a);
        const b_x = get_x(b);
        const b_y = get_y(b);

        // Calculate the difference in coordinates
        const dx = a_x - b_x;
        const dy = a_y - b_y;

        // Return the distance (Pythagorean theorem)
        return Math.sqrt(dx * dx + dy * dy);
    }

    // ATTTACKING
    attack(target) {
        if (this.movingToNewMob) { return; }
        if (!this.is_in_range(target, "attack")) {
            move(
                character.real_x + (target.real_x - character.real_x) / 2,
                character.real_y + (target.real_y - character.real_y) / 2
            );

            set_message("Moving to target");
        } else if (!is_on_cooldown("attack")) {
            set_message("Attacking");
            // stop();
            attack(target);
        }
    }

    farmTogeather(target = null) {
        const currentTarget = get_target_of(character.name);
        target = this.getTankTarget();

        if (character.name != "Jhlwarrior") { returnToLeader(); }

        // Fallback to current target if tank target is invalid or a player
        if (!target || target.name?.startsWith("Jhl")) {
            target = currentTarget;
        }

        if (!target || target.name?.startsWith("Jhl")) {
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

    async targetLogicNonTank() {
        if (!this.attackMode || character.rip) { return null; }

        let target = null;

        if (this.fightTogeather) {
            target = this.farmTogeather();
        } else {
            target = await this.targetLogicTank();
        }

        return target;
    }

    async targetLogicTank() {
        if (!this.attackMode || character.rip || this.movingToNewMob) return null;

        let target = get_targeted_monster();

        // if Phoenix is in range, target it
        const phoenix = get_nearest_monster({ type: "phoenix" });
        if (phoenix) {
            return phoenix;
        }

        // Otherwise stick to current farm mob
        if (target && target.name !== this.currentMobFarm) {
            target = null;
        }

        if (!target) {
            target = this.findTarget();
            if (!target) {
                set_message(`No target, moving to farm ${myMobs[this.currentMobFarm]}`);
                return null;
            }
        }

        return target;
    }

    checkNearbyFarmMob() {
        let found = false;

        if (this.fightTogeather && get_player(this.tank) && character.name != this.tank) {
            this.movingToNewMob = false;
            return;
        }

        for (const id in parent.entities) {
            const ent = parent.entities[id];
            if (!ent || ent.type !== "monster" || ent.dead || !ent.visible) continue;

            // Distance check
            const dist = parent.distance(character, ent);
            if (dist > 170) continue;

            if (ent.name === this.currentMobFarm) {
                this.movingToNewMob = false;
                stop();
                return;
            }
        }

        // If no farm mob was found nearby, move to its spawn
        if (!found) {
            for (const [key, val] of Object.entries(myMobs)) {
                if (val === this.currentMobFarm) {
                    if (!this.movingToNewMob) {
                        smart_move(key);
                    }
                    this.movingToNewMob = true;
                    set_message(`No ${this.currentMobFarm} nearby, moving to farm`);
                    break;
                }
            }
        }
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

