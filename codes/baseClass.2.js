load_code("helpers");
load_code("commCommands");
load_code("floodFill");
load_code('AStar');
load_code("UI");

class TargetLogic {
    validTargets = [`scorpion`, `hawk`, `spider`];
    tank;
    bosses;
    attackMode;
    fightTogeather;
    followLeader;
    pvpEnabled = false;

    allies = ["trololol", "YTFAN", "derped", "Knight", "Bonjour"];

    getClosestMonsterByType(mtype) {
        let closest = null;
        let minDist = Infinity;

        for (const id in parent.entities) {
            const ent = parent.entities[id];

            if (ent.type !== "monster" || ent.dead || !ent.visible) continue;
            if (ent.mtype !== mtype) continue;

            const dist = parent.distance(character, ent);
            if (dist < minDist) {
                minDist = dist;
                closest = ent;
            }
        }

        return closest;
    }

    getClosestMonsterByName(name) {
        let closest = null;
        let minDist = Infinity;

        name = name.toLowerCase();

        for (const id in parent.entities) {
            const ent = parent.entities[id];

            if (ent.type !== "monster" || ent.dead || !ent.visible) continue;
            if (!ent.name || ent.name.toLowerCase() !== name) continue;

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
            target = get_nearest_monster({ target: "Jhlwarrior" });
        }

        return target;
    }

    findStunnedTarget() {
        let closest = null;
        let closestDist = Infinity;

        for (let id in parent.entities) {
            const e = parent.entities[id];

            if (e.type === "monster" && e.s && e.s.stunned && !e.dead) {
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
            .map(mtype => this.getClosestMonsterByType(mtype))
            .find(mon => mon);

        if (target && !target.s.fullguardx && !target.s.fullguard) {
            if (target.name == 'Dragold' && !get_player('Jhlpriest')) { return null; }
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

        // Check Bosses
        target = this.bosses
            .map(mtype => this.getClosestMonsterByType(mtype))
            .find(mon => mon);

        // Check Valid Targets
        if (!target) {
            for (const mtype of this.validTargets) {
                target = this.getClosestMonsterByType(mtype);

                if (target) break; // Stop at the first valid target found
            }
        }

        // If no primary farm target is set, just get whatever is nearest
        if (this.validTargets.length === 0) {
            target = get_nearest_monster();
            if (target) change_target(target);

            return target;
        }

        // Handle fullguardx logic
        if (target && !target.s.fullguardx) {
            change_target(target);

            return target;

        } else if (target && target.s.fullguardx) {
            // Try to find another valid target in the list
            for (const mtype of this.validTargets) {
                const alt = this.getClosestMonsterByType(mtype);
                if (alt && !alt.s.fullguardx) {
                    change_target(alt);

                    return alt;
                }
            }
        }

        if (target) {
            change_target(target);
            return target;
        }

        if (target && !this.validTargets.includes(target.mtype)) {
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

        // Check if current target is within validTargets or Bosses (by mtype)
        if (target && !this.validTargets.includes(target.mtype) && !this.bosses.includes(target.mtype)) {
            target = null;
        }

        if (!target) {
            target = this.findTarget();
        }

        if (!target) {
            const primary = this.validTargets[0] || "Unknown";
            const niceName = mobData.find(m => m.travel === primary) || primary;

            set_message(`No target, moving to ${niceName.targetName}`);

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
                (this.bosses.includes(e.mtype) || this.validTargets.includes(e.mtype)) &&
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
        const boss = this.findBosses(); // Checks for boss existence

        if (boss) {
            const amITankingBoss = attackers.some(e => e.id === boss.id);

            if (!amITankingBoss) {
                return boss;
            }
        }

        // If we are already tanking 3+ mobs including the bosses, stop pulling
        if (attackerCount >= 3) {
            // If we have a boss, focus damage on it while tanking the rest
            if (boss) return boss;

            // Otherwise focus the current target or the first attacker
            let target = get_targeted_monster();
            if (!target || target.dead) {
                target = attackers[0] || null;
            }
            return target;
        }

        let target = null;

        if (!target) {
            target = this.findTargetNotAttackingMe();
        }

        if (target) {
            return target;
        }

        if (boss) {
            return boss;
        }

        // If nothing at all, go to farm spawn
        const primary = this.validTargets[0];
        set_message(`No target, moving to ${primary}`);

        return null;
    }

    getMobsAttackingMe() {
        return Object.values(parent.entities).filter(e =>
            e.type == "monster" &&
            !e.dead &&
            e.target == character.name
        );
    }
}

class BaseClass extends TargetLogic {
    constructor(name) {
        super();
        this.name = name;
        this.char = get_player(name);
        this.myCharacters = ["Jhlpriest", "Jhlranger", "Jhlmerch", "Jhlmage", "Jhlwarrior", "Jhlrogue", "Jhlpally",]

        this.sendItems = true;
        this.merchantName = "Jhlmerch";

        this.eventsEnabled = true;

        this.kite = false;
        this.attackMode = true;
        this.followLeader = true;
        this.fightTogeather = false;

        this.surge = false;
        this.surgeLastUsed = 0;

        this.gettingBuff = false;
        this.lastMerchantInteractionCheck = 0;

        this.validTargets = [`bigbird`];
        this.bosses = ["dragold", "phoenix", "pinkgoo", "grinch", "fvampire", "mvampire", "greenjr", "jr", "snowman", "icegolem",];

        this.lastTarget = "";
        this.lastEvent = null;

        this.tank = "Jhlwarrior";
        this.lastWarriorEscape = 0;

        this.whitelist = [
            // Keep
            "spores", "seashell", "beewings", "gem0", "gem1", "whiteegg", "monstertoken", "spidersilk", "cscale", "spores",
            "rattail", "crabclaw", "bfur", "feather0", "gslime", "smush", "lostearring", "spiderkey", "snakeoil", "ascale",
            "snakefang", "vitscroll", "offeringp", "offering", "essenceoffrost", "carrot", "snowball", "candy1", "frogt", "ink",
            "sstinger", "candycane", "ornament", "mistletoe", "frozenkey", "funtoken", "leather", "btusk", "bwing",
            "x0", "x1", "x2", "x3", "x4", "x5", "x6", "x7", "x8", "x9", "electronics", "cocoon", "goldenegg",
            "intbelt", "strbelt", "dexbelt", "dstones", "poison", "pleather", "cshell", "pmace", "lmace", "armorbox",
            "handofmidas", "mcape", "sweaterhs", "cryptkey", "forscroll", "gemfragment", "candypop", "essenceofether", "essenceoffire",
            "greenenvelope",
            // Upgrade
            "ringsj", "intbelt", "intearring", "strearring", "dexearring", "dexamulet", "stramulet", "intamulet", "wbookhs",
            // Sell
            "hpbelt", "hpamulet", "shoes", "coat", "pants", "strring", "intring", "vitring", "dexring",
            "wattire", "wshoes", "wcap", "cclaw", "mushroomstaff", "wbreeches", "slimestaff", "stinger",
            "vitearring", "wgloves", "quiver", "xmace", "xbow", "iceskates", "gcape", "swifty", "lspores",
            "shield", "hbow", "cupid",
        ];

        this.returningToGroup = false;

        character.on("cm", async (sender, data) => {
            await this.handleCM(sender, data);
        });

        setInterval(() => this.handleHolidayBuffs(), 45 * 1000);
        if (this.eventsEnabled) { setInterval(() => this.handleEvents(), 15 * 1000); }
        setInterval(() => parent.socket.emit("send_updates", {}), 21 * 1000); // Clear ghost entities
        setInterval(() => this.stuckCheck(), 35 * 1000);

        startSharedTasks();

        // scaleUI(0.80);
    }

    merchantInteractions() {
        if (Date.now() - 3000 < this.lastMerchantInteractionCheck) { return; }
        sendGoldToMerchant();
        checkPotions();
        this.askForLuck();
        this.callMerchant();
        this.sendWhitelistedItemsToMerchant()

        this.lastMerchantInteractionCheck = Date.now();
    }

    // Events
    async handleEvents() {
        if (character.map == "winterland" && this.distance(character, { map: "winterland", x: 820, y: 425 }) < 400
            && !get_nearest_monster({ type: 'icegolem' })) {

            use_skill(`town`)
        }

        if (parent.S.snowman && parent.S.snowman.live) {
            this.lastEvent = 'snowman';
            if (this.lastTarget == "") {
                this.lastTarget = this.validTargets;
            }

            this.validTargets = ['arcticbee'];
        }
        else if (parent.S.dragold && parent.S.dragold.live) {
            this.lastEvent = 'dragold'
            if (this.lastTarget == "") {
                this.lastTarget = this.validTargets;
            }

            this.validTargets = ['dragold'];

            if (!this.getClosestMonsterByName('Dragold')) {
                if (!smart.moving) {
                    await smart_move({ map: "cave", x: 1115.5, y: -747.5 }).catch((e) => stop());
                }
            }
            else if (this.getClosestMonsterByName('Dragold') && this.distance(character, this.getClosestMonsterByName('Dragold')) > 400) {
                await smart_move({ map: "cave", x: 1115.5, y: -747.5 }).catch((e) => stop());
            }
        }
        else if (parent.S.icegolem && parent.S.icegolem.live) {
            this.lastEvent = 'icegolem';
            if (!get_nearest_monster({ type: 'icegolem' })) { join('icegolem'); }

            if (this.lastTarget == "") {
                this.lastTarget = this.validTargets;
            }
        }
        else if (parent.S.wabbit && parent.S.wabbit.live) {
            this.lastEvent = "wabbit";
            if (this.lastTarget == "") this.lastTarget = this.validTargets;

            this.validTargets = ['wabbit'];

            if (!this.getClosestMonsterByType('wabbit')) {
                await smart_move('wabbit').catch((e) => stop());
            }
        }
        else if (parent.S.pinkgoo && parent.S.pinkgoo.live) {
            this.lastEvent = "pinkgoo";
            if (this.lastTarget == "") this.lastTarget = this.validTargets;
            this.validTargets = ['pinkgoo'];

            if (!this.getClosestMonsterByType('pinkgoo')) {
                if (!smart.moving) {
                    // Force the move using live event data
                    await smart_move({
                        x: parent.S.pinkgoo.x,
                        y: parent.S.pinkgoo.y,
                        map: parent.S.pinkgoo.map
                    }).catch((e) => stop());
                }
            }
        }
        else {
            if (this.lastTarget != "") {
                this.validTargets = this.lastTarget;

                this.lastTarget = "";
            }

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

    // Surge
    async useTemporalSurge(keepMana) {
        if (Date.now() < this.surgeLastUsed + 62000 || !this.surge) {
            return;
        }

        const itemSlot = locate_item("orboftemporal");

        if (character.mp < keepMana || itemSlot === -1) {
            return;
        }

        equip(itemSlot);
        await sleep(25);

        use_skill("temporalsurge");
        this.surgeLastUsed = Date.now();
        await sleep(10);

        equip(itemSlot);
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
                    await smart_move({ to: map }).catch((e) => stop());
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
                this.validTargets = [dataSplit[1]];

                if (!smart.moving) await smart_move({ to: dataSplit[0] }).catch((e) => stop());

                break;
            }

            case "set_new_hunter_target": {
                const [travel, target, map] = data.split(',');

                this.validTargets = [travel];

                if (!smart.moving) {
                    if (character.map !== map) {
                        await smart_move({ map: map }).catch((e) => stop());
                    }

                    await smart_move(travel).catch((e) => stop());
                }

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
                    await smart_move({ to: map }).catch((e) => stop());
                }

                await xmove(x, y);

                if (get_player(sender.name) || this.distance(character, { x, y } < 20)) {
                    set_message(`Arrived at group location (${x}, ${y})`);
                    this.returningToGroup = false;
                }

                break;
            }

            case "portMe": {
                const target = data;

                if (character.name == "Jhlmage") {
                    this.skillPort(target);
                }

                break;
            }

            case "aoeHeal": {
                if (character.mp > 550) {
                    use_skill("partyheal");
                }

                break;
            }

            default:
                // Unknown command — ignore
                break;
        }
    }

    // Merchant stuff
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

        if (used >= 20) {
            send_cm("Jhlmerch", `need_luck ${character.x},${character.y},${character.map}`);
        }
    }

    sendWhitelistedItemsToMerchant() {
        if (!this.sendItems) { return; }

        const merchant = get_player(this.merchantName);
        if (!merchant || this.distance(character, merchant) > 400) { return; }

        const onlyTier1 = [
            "firebow", "fireblade", "firestaff", "glolipop", "wand", "sparkstaff", "wbook0"
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

    // Movement checks
    stuckCheck() {
        if (character.rip || this.gettingBuff || character.cc > 0) return;

        // Don't run stuck check if we are doing dynamic events
        const eventMobs = ["icegolem", "grinch"];
        const currentTarget = this.validTargets[0];
        if (eventMobs.includes(currentTarget)) return;

        // Check distance to intended farm spot
        const farm = mobData.find(m => m.travel === currentTarget);
        if (!farm) return;

        let isLost = false;

        if (!this.getClosestMonsterByType(farm.travel)) {
            isLost = true;
        }

        if (isLost) {
            game_log(`[Watchdog] Stuck/Lost detected! Resetting path to ${currentTarget}`);
            stop();
            smart.moving = false; // Force clear smart.moving 
            this.checkNearbyFarmMob();
        }
    }

    async checkNearbyFarmMob() {
        // If fighting together and not the tank, stop here
        if (this.fightTogeather && get_player(this.tank) && character.name !== this.tank) {
            if (smart.moving) { stop(); }
            return;
        }

        // Priority check Bosses
        for (const id in parent.entities) {
            const ent = parent.entities[id];
            if (!ent || ent.type !== "monster" || ent.dead || !ent.visible) continue;

            const dist = parent.distance(character, ent);
            if (dist > 400) { continue; }

            if (this.bosses.includes(ent.mtype)) {
                if (smart.moving) { stop(); }
                set_message("Boss spotted nearby, engaging");

                return;
            }
        }

        for (const mtype of this.validTargets) {
            const mobEntry = mobData.find(m => m.travel === mtype);

            if (!mobEntry) {
                game_log(`Mob ${mtype} not found in dictionary`);
                continue;
            }

            // Scan nearby entities for this mtype
            for (const id in parent.entities) {
                const ent = parent.entities[id];
                if (!ent || ent.type !== "monster" || ent.dead || !ent.visible) continue;

                const dist = parent.distance(character, ent);
                if (dist > 200) continue;

                if (ent.mtype === mtype) {
                    stop();
                    set_message(`Engaging ${mtype}`);

                    return;
                }
            }
        }

        // If none found nearby, move toward primary targets spawn
        if (!smart.moving) {
            const primaryTarget = this.validTargets[0];
            if (!primaryTarget) return;

            if (primaryTarget === "pinkgoo" && parent.S.pinkgoo?.live) {
                await smart_move({
                    x: parent.S.pinkgoo.x,
                    y: parent.S.pinkgoo.y,
                    map: parent.S.pinkgoo.map
                }).catch((e) => stop());

                return;
            }
            else if (primaryTarget === "dragold" && parent.S.dragold?.live) {
                await smart_move({
                    x: parent.S.dragold.x,
                    y: parent.S.dragold.y,
                    map: parent.S.dragold.map
                }).catch((e) => stop());

                return;
            }

            let farm = mobData.find(m => m.travel === primaryTarget);

            if (this.lastEvent == "icegolem") {
                use_skill("use_town");
                await sleep(6000);

                this.lastEvent = null;
            }
            else if (farm) {
                if (farm.map && farm.x !== undefined && farm.y !== undefined) {
                    await smart_move({ map: farm.map, x: farm.x, y: farm.y }).catch((e) => stop());
                }
                else {
                    await smart_move(farm.travel).catch((e) => stop());
                }
            }
        }

        // Safety check for display
        const dispName = this.validTargets[0];
        set_message(`No ${dispName} nearby, moving...`);

        return;
    }

    is_in_range(target) {
        if (!target || !target.visible) return false;

        // Calculate the MAX distance the character can be from the target's center
        // Max Range = (My Range) + (Target Radius) + (My Character Radius)

        const character_radius = get_width(character) / 2;
        const target_radius = target.width / 2;
        const desired_buffer = 5;

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
        let a_x = (a.real_x != null) ? a.real_x : (a.x != null) ? a.x : get_x(a);
        let a_y = (a.real_y != null) ? a.real_y : (a.y != null) ? a.y : get_y(a);
        let b_x = (b.real_x != null) ? b.real_x : (b.x != null) ? b.x : get_x(b);
        let b_y = (b.real_y != null) ? b.real_y : (b.y != null) ? b.y : get_y(b);

        // Calculate the difference in coordinates
        const dx = a_x - b_x;
        const dy = a_y - b_y;

        // Return the distance (Pythagorean theorem)
        return Math.sqrt(dx * dx + dy * dy);
    }

    // ATTTACKING
    async attack(target) {
        if (smart.moving) { return; }

        if (!this.is_in_range(target, "attack")) {
            moveTowardTargetFloodfill(target.real_x, target.real_y);
            // moveTowardTargetAStar(target.real_x, target.real_y);

            set_message("Moving to target");
        } else if (!is_on_cooldown("attack")) {
            set_message("Attacking");
            clearFloodfillPath();

            if (!this.kite && character.name != "Jhlwarrior") { stop(); }
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
        const now = Date.now();
        if (smart.moving) return;

        if (this.lastWarriorEscape && now - this.lastWarriorEscape < 500) {
            return;
        }

        const war = get_player("Jhlwarrior");
        if (!war) return;

        if (this.distance(character, war) < 20) {
            const dx = character.x - war.x;
            const dy = character.y - war.y;

            const length = Math.sqrt(dx * dx + dy * dy);
            if (length === 0) {
                // If perfectly overlapping, move in a random direction to break the stack
                const angle = Math.random() * Math.PI * 2;
                move(character.x + Math.cos(angle) * 33, character.y + Math.sin(angle) * 33);
                this.lastWarriorEscape = now;

                return;
            }

            const nx = dx / length;
            const ny = dy / length;

            const reqDist = 33;
            const targetX = war.x + nx * reqDist;
            const targetY = war.y + ny * reqDist;

            move(targetX, targetY);
            this.lastWarriorEscape = now;
        }
    }
}

