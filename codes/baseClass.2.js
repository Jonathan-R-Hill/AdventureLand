load_code("helpers");

// mobs mainland:
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
 */

class BaseClass {
    constructor(name) {
        this.name = name;
        this.char = get_player(name);

        this.sendItems = true;
        this.merchantName = "Jhlmerch";

        this.whitelist = [
            // Keep
            "spores", "seashell", "beewings", "gem0", "whiteegg", "monstertoken", "spidersilk",
            // Upgrade
            "ringsj",
            // Sell
            "hpbelt", "hpamulet", "wshoes", "wcap",
        ];

        this.attackMode = false;
        this.followLeaderMode = false;
        this.returningToGroup = false;
        this.waitForCoords = false;
        this.fightTogeather = true;

        this.x = this.char.x;
        this.y = this.char.y;

        this.currentMobFarm = "Spider";
        startSharedTasks();
    }

    getHP() {
        return this.char.hp || 0;
    }

    getMP() {
        return this.char.mp || 0;
    }

    getMaxHP() {
        return this.char.max_hp || 0;
    }

    getMaxMP() {
        return this.char.max_mp || 0;
    }

    isAlive() {
        return this.char.rip;
    }

    toggleAttackMode() {
        this.attackMode = !this.attackMode;
    }

    toggleFollowLeaderMode() {
        this.followLeaderMode = !this.followLeaderMode;
    }

    toggleWaitForCoords() {
        this.waitForCoords = !this.waitForCoords;
    }

    toggleReturningToGroup() {
        this.returningToGroup = !this.returningToGroup;
    }

    setCurrentMobFarm(mobFarmName) {
        this.currentMobFarm = mobFarmName;
    }

    sendWhitelistedItemsToMerchant() {
        if (!this.sendItems) return;

        const merchant = get_player(this.merchantName);
        if (!merchant || parent.distance(character, merchant) > 200) {
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
        const tank = get_player("Jhlwarrior");
        if (tank) {
            return get_target_of(tank);
        }

        returnToLeader();
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


}
