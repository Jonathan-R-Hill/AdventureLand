load_code("helpers");
load_code("commCommands");
load_code("floodFill");

class TargetLogic {
    currentMobFarm;
    secondaryTarget;
    tank;
    bosses;
    attackMode;
    fightTogeather;
    movingToNewMob;

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
            if (get_nearest_monster({ target: "Jhlpriest" }) != null) {
                return get_nearest_monster({ target: "Jhlpriest" });
            }
            else if (get_nearest_monster({ target: "Jhlranger" }) != null) {
                return get_nearest_monster({ target: "Jhlranger" });
            }
            else if (get_nearest_monster({ target: "Jhlmerch" }) != null) {
                return get_nearest_monster({ target: "Jhlmerch" });
            }
            else if (get_nearest_monster({ target: "Jhlmage" }) != null) {
                return get_nearest_monster({ target: "Jhlmage" });
            }
            else if (get_nearest_monster({ target: "Jhlrogue" }) != null) {
                return get_nearest_monster({ target: "Jhlrogue" });
            }
            else if (get_nearest_monster({ target: "trololol" }) != null) {
                return get_nearest_monster({ target: "trololol" });
            }
            else if (get_nearest_monster({ target: "YTFAN" }) != null) {
                return get_nearest_monster({ target: "YTFAN" });
            }
            else if (get_nearest_monster({ target: "derped" }) != null) {
                return get_nearest_monster({ target: "derped" });
            }
            else if (get_nearest_monster({ target: "Knight" }) != null) {
                return get_nearest_monster({ target: "Knight" });
            }
            else if (get_nearest_monster({ target: "Bonjour" }) != null) {
                return get_nearest_monster({ target: "Bonjour" });
            }
            else if (get_nearest_monster({ target: "Jhlwarrior" }) != null) {
                return get_nearest_monster({ target: "Jhlwarrior" });
            }
            else {
                return get_target_of(tank);
            }
        }

        return null;
    }

    findTarget(target) {
        target = this.bosses
            .map(name => this.getClosestMonsterByName(name))
            .find(mon => mon) // first non-null result
            || this.getClosestMonsterByName(this.currentMobFarm) || this.getClosestMonsterByName(this.secondaryTarget);

        if (target) {
            change_target(target);

            return target;
        }

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

        // Fallback to current target if tank target is invalid or a player
        if (!target || target.name?.startsWith("Jhl")) {
            target = currentTarget;
        }

        if (!target ||
            target.name?.startsWith("Jhl") || ["trololol", "YTFAN", "derped", "Knight", "Bonjour"].includes(target.name)) {

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

        // Current farm mob
        if (target && target.name !== this.currentMobFarm && target.name !== this.secondaryTarget) {
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

}

class BaseClass extends TargetLogic {
    constructor(name) {
        super();
        this.name = name;
        this.char = get_player(name);

        this.sendItems = true;
        this.merchantName = "Jhlmerch";

        this.kite = false;
        this.attackMode = true;
        this.fightTogeather = false;
        this.gettingBuff = false;
        this.movingToEvent = false;

        this.currentMobFarm = "Bat";
        this.secondaryTarget = "Bat";

        this.lastTarget = "";

        this.lastEvent = null;

        this.bosses = ["Phoenix", "Grinch", "Green Jr.", "Snowman", "Ice Golem", "Dracul"];
        this.tank = "Jhlwarrior";

        this.whitelist = [
            // Keep
            "spores", "seashell", "beewings", "gem0", "gem1", "whiteegg", "monstertoken", "spidersilk", "cscale", "spores",
            "rattail", "crabclaw", "bfur", "feather0", "gslime", "smush", "lostearring", "spiderkey", "snakeoil", "ascale",
            "snakefang", "vitscroll", "offeringp", "offering", "essenceoffrost", "carrot", "snowball", "candy1", "frogt", "ink",
            "sstinger", "candycane", "ornament", "mistletoe", "frozenkey", "funtoken", "leather", "btusk", "bwing",
            "x0", "x1", "x2", "x3", "x4", "x5", "x6", "x7", "x8", "x9",
            // Upgrade
            "ringsj", "intbelt", "intearring", "strearring", "dexearring", "dexamulet", "stramulet", "intamulet", "wbookhs", "wbook0",
            // Sell
            "hpbelt", "hpamulet", "shoes", "coat", "pants", "strring", "intring", "vitring", "dexring",
            "wattire", "wshoes", "wcap", "cclaw", "mushroomstaff", "wbreeches", "slimestaff", "stinger",
            "vitearring", "wgloves", "quiver", "xmace", "xbow", "iceskates", "gcape",
        ];

        this.returningToGroup = false;
        this.movingToNewMob = false;

        this.x = this.char.real_x;
        this.y = this.char.real_y;

        character.on("cm", async (sender, data) => {
            await this.handleCM(sender, data);
        });

        setInterval(() => this.handleHolidayBuffs(), 11 * 1000);
        // setInterval(() => this.handleEvents(), 15 * 1000);
        setInterval(() => this.sendWhitelistedItemsToMerchant(), 3 * 1000);
        setInterval(() => this.askForLuck(), 20 * 1000);
        setInterval(() => this.callMerchant(), 20 * 1000);
        setInterval(() => parent.socket.emit("send_updates", {}), 30000); // Clear ghost entities

        startSharedTasks();

        scaleUI(0.80);
    }

    async handleEvents() {
        if (parent.S.snowman.live && distance(character, { x: 1267, y: -860, map: 'winterland' }) > 300) {
            this.lastEvent = 'snowman';
            if (!get_nearest_monster({ type: 'snowman' })) {
                if (this.lastTarget == "") {
                    this.lastTarget = this.currentMobFarm;
                    this.currentMobFarm = 'Arctic Bee';
                    this.secondaryTarget = 'Arctic Bee';
                }

                this.movingToEvent = true;
                await smart_move({ x: 1119, y: -886, map: 'winterland' });
            }
            else if (this.getClosestMonsterByName('Snowman') && parent.S.snowman.live) {
                if (this.lastTarget == "") { this.lastTarget = this.currentMobFarm; }
                this.movingToEvent = false;
                this.currentMobFarm = "Arctic Bee";
                this.secondaryTarget = "Arctic Bee";

            }
        } else if (parent.S.icegolem) {
            this.lastEvent = 'icegolem';
            if (!get_nearest_monster({ type: 'icegolem' })) { join('icegolem'); }
        }
        else {
            if (this.lastTarget != "") {
                this.currentMobFarm = this.lastTarget;
                this.secondaryTarget = this.lastTarget;
                this.lastTarget = "";
            }

            this.movingToEvent = false;
        }
    }

    async handleHolidayBuffs() {
        if (needChristmasBuff()) {
            this.gettingBuff = true;
            await getChristmasBuff();
        }
        else {
            this.gettingBuff = false;
        }
    }

    async handleCM(sender, payload) {
        if (!sender.name.startsWith("Jhl")) return;

        const msg = sender.message;
        const firstSpace = msg.indexOf(" ");
        const command = firstSpace === -1 ? msg : msg.slice(0, firstSpace);
        const data = firstSpace === -1 ? "" : msg.slice(firstSpace + 1);

        switch (command.trim()) {
            case "come_to_me": {
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
                this.secondaryTarget = dataSplit[1];

                this.movingToNewMob = true;
                await smart_move({ to: dataSplit[0] });
                this.movingToNewMob = false;

                break;
            }

            case "set_new_hunter_target": {
                const [travel, target, map] = data.split(',');

                this.currentMobFarm = target;
                this.movingToNewMob = true;

                if (character.map !== map) {
                    await smart_move({ map: map });
                }
                await smart_move(travel);

                this.movingToNewMob = false;
                break;
            }

            case "fightTogeather": {
                if (data == "true") { this.fightTogeather = true; }
                else if (data == "false") { this.fightTogeather = false; }
                else { console.log(`Learn to type..`); }

                break;
            }

            case "foundPheonix": {
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

                if (get_player(sender.name) || this.distance(character, { x, y } < 20)) {
                    set_message(`Arrived at group location (${x}, ${y})`);
                    this.returningToGroup = false;
                }

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

    sendWhitelistedItemsToMerchant() {
        if (!this.sendItems) { return; }

        const merchant = get_player(this.merchantName);
        if (!merchant || parent.distance(character, merchant) > 400) { return; }

        const onlyTier1 = [
            "firebow", "fireblade", "firestaff", "glolipop",
        ];

        for (let i = 0; i < character.items.length; i++) {
            const item = character.items[i];

            if (!item) { continue; }

            if (this.whitelist.includes(item.name) || onlyTier1.includes(item.name)) {
                const quantity = item.q || 1; // stackable or single
                if (onlyTier1.includes(item.name) && item.level != 0) { continue; }

                send_item(this.merchantName, i, quantity);
                console.log(`Sent ${quantity}x ${item.name} to ${this.merchantName}`);
            }
        }
    }

    // Equip / un-equip weapons
    equipItem(itemName, targetLevel, equipSlot = null) {
        if (this.isEquipped(itemName, targetLevel, equipSlot)) { return; }
        let slot = -1;

        for (let i = 0; i < character.items.length; i++) {
            const invItem = character.items[i];
            if (invItem && invItem.name === itemName && invItem.level === targetLevel) {
                slot = i;
                break;
            }
        }

        if (slot !== -1 && !this.isEquipped(itemName, targetLevel, equipSlot)) {
            if (equipSlot != null) { equip(slot, equipSlot); }
            else { equip(slot); }

            game_log(`Equipped ${itemName} (level ${targetLevel}) from slot ${slot}`);
        }
    }

    isEquipped(itemName, level, slotName = null) {
        if (slotName) {
            const equipped = character.slots[slotName];
            return (
                equipped &&
                equipped.name === itemName &&
                equipped.level === level
            );
        } else {
            for (const slot in character.slots) {
                const equipped = character.slots[slot];
                if (equipped && equipped.name === itemName && equipped.level === level) {
                    return true;
                }
            }

            return false;
        }
    }

    removeWeapons() {
        unequip("mainhand");
        unequip("offhand");
    }

    async checkNearbyFarmMob() {
        // If fighting together and not the tank, stop here for follow logic
        if (this.fightTogeather && get_player(this.tank) && character.name !== this.tank) {
            this.movingToNewMob = false;
            return;
        }

        // Priority check Bosses
        for (const id in parent.entities) {
            const ent = parent.entities[id];
            if (!ent || ent.type !== "monster" || ent.dead || !ent.visible) continue;

            const dist = parent.distance(character, ent);
            if (dist > 300) { continue; }

            if (this.bosses.includes(ent.name)) {
                this.movingToNewMob = false;
                stop();
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
                    this.movingToNewMob = false;
                    stop();
                    set_message(`Engaging ${mobEntry.target}`);
                    return;
                }
            }
        }

        // If none found nearby, move toward this mob’s spawn
        if (!this.movingToNewMob) {
            let farm = mobData.find(m => m.target === this.currentMobFarm);
            this.movingToNewMob = true;

            if (this.lastEvent == "icegolem") {
                use_skill("use_town");
                await sleep(6000);
                this.lastEvent = null;
            }

            await smart_move(farm.travel);
        }

        set_message(`No ${mobEntry.target} nearby, moving to farm`);
        return;

    }

    is_in_range(target) {
        if (!target || !target.visible) return false;

        // Calculate the MAX distance the character can be from the target's center
        // Max Range = (My Range) + (Target Radius) + (Your Character Radius)

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
    async attack(target) {
        if (this.movingToNewMob) { return; }
        if (!this.is_in_range(target, "attack")) {
            moveTowardTargetFloodfill(target.real_x, target.real_y);


            set_message("Moving to target");
        } else if (!is_on_cooldown("attack")) {
            set_message("Attacking");
            clearFloodfillPath();

            if (!this.kite) { stop(); }
            attack(target);
        }
    }

    // Movement
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

    moveAwayFromWarrior() {
        const war = get_player("Jhlwarrior");

        if (!war) { return; }

        if (this.distance(character, war) < 20) {
            // Calculate direction vector away from warrior
            const dx = character.x - war.x;
            const dy = character.y - war.y;

            // Normalize vector
            const length = Math.sqrt(dx * dx + dy * dy);
            if (length === 0) { return; }

            const nx = dx / length;
            const ny = dy / length;

            const reqDist = 33;
            const targetX = war.x + nx * reqDist;
            const targetY = war.y + ny * reqDist;

            move(targetX, targetY);
            game_log("Moving away from warrior");
        }
    }
}

