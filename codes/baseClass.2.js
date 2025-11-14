load_code("helpers");

// mobs
/**
 * 
 * Goo
 * Squig
 * Tiny Crab
 * Bee
 * Froggie
 * Snake
 * Armadillo
 * Croc
 * 
 * Huge Crab
 * Tortoise
 * Squigtoad
 * Spider
 * Scorpion
 * 
 * osnake - Snake
 * Rat
 * Porcupine
 * Pom Pom
 */

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

        this.monsterHunter = true;
        this.getNewTask = false;
        this.currentMobFarm = "Rat";
        this.kite = true;

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
        if (myChar.returningToGroup) return;
        if (!sender.name.startsWith("Jhl")) return;

        const [command, data] = sender.message.split(" ");

        switch (command.trim()) {
            case "come_to_me": {
                const [xStr, yStr, map] = data.split(",");
                const x = Number(xStr);
                const y = Number(yStr);

                console.log(x, y, map);

                this.returningToGroup = true;

                console.log(xStr, yStr, map)
                if (map && character.map !== map) {
                    await smart_move({ to: map });
                }

                await xmove(x, y);

                if (character.x === x && character.y === y) {
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

    callPlayers() {
        const leader = get_player("Jhlpriest");
        if (!leader || this.getNewTask) return;

        const partyMembers = ["Jhlranger", "Jhlmage"];

        for (const name of partyMembers) {
            const member = get_player(name);
            if (!member) {
                send_cm(name, `come_to_me ${leader.x},${leader.y},${leader.map}`);
            }
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

    targetLogicNonTank() {
        useHealthPotion();
        useManaPotion();
        recoverOutOfCombat();
        loot();

        if (!this.attackMode || character.rip || this.movingToNewMob) return null;

        const currentTarget = get_target_of(character.name);
        let target = null;

        if (myChar.fightTogeather) {
            target = myChar.getTankTarget();

            // Fallback to current target if tank target is invalid or a player
            if (!target || target.name?.startsWith("Jhl")) {
                target = currentTarget;
            }

            returnToLeader();

            if (!target || target.name?.startsWith("Jhl")) {
                return null;
            }

            return target;
        } else {
            target = get_targeted_monster();
            target = myChar.findTarget(target);

            if (!target) {
                returnToLeader();
                return null;
            }

            return target;
        }
    }

    // MONSTER HUNTER
    async checkMonsterHunt() {
        if (!this.monsterHunter) { return; }
        const huntBuff = character.s?.monsterhunt;

        if (!huntBuff) {
            this.getNewTask = true;
            // No active hunt
            if (character.map !== "main") {
                await smart_move({ map: "main" });
                await smart_move({ to: "monsterhunter" });
                parent.socket.emit("monsterhunt");
            } else if (character.c.monsterhunt === 0) {
                // Ready to turn in
                await smart_move({ to: "monsterhunter" });
                parent.socket.emit("monsterhunt");
                set_message("Turning in Monster Hunt");
            } else {
                await smart_move({ to: "monsterhunter" });
                parent.socket.emit("monsterhunt");
                set_message("Waiting for new hunt...");
            }

            return;
        }

        // Active hunt — validate target
        const huntTargetId = huntBuff.id;
        const mobKey = getMobKeyFromValue(huntTargetId);

        if (mobKey == null) {
            set_message(`Unknown hunt target: ${huntTargetId}`);
            this.getNewTask = false;

            return;
        }

        // Update farm target and notify party
        if (myChar.currentMobFarm !== mobs[mobKey]) {
            myChar.currentMobFarm = mobs[mobKey];
            updateTarget(huntTargetId);
            set_message(`New hunt target: ${huntTargetId}`);
        }
    }

}
