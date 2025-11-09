load_code("helpers");

class BaseClass {
    constructor(name) {
        this.name = name;
        this.char = get_player(name);

        this.attackMode = false;
        this.followLeaderMode = false;
        this.returningToGroup = false;
        this.waitForCoords = false;

        this.x = this.char.x;
        this.y = this.char.y;

        this.currentMobFarm = "";
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

    logStatus() {
        console.log(`${this.name}: HP ${this.getHP()}/${this.getMaxHP()} | MP ${this.getMP()}/${this.getMaxMP()}`);
    }

    toggleAttackMode() {
        this.attackMode = !this.attackMode;
        console.log(`${this.name} Attack Mode: ${this.attackMode}`);
    }

    toggleFollowLeaderMode() {
        this.followLeaderMode = !this.followLeaderMode;
        console.log(`${this.name} Follow Leader Mode: ${this.followLeaderMode}`);
    }

    toggleWaitForCoords() {
        this.waitForCoords = !this.waitForCoords;
        console.log(`${this.name} Wait For Coords: ${this.waitForCoords}`);
    }

    toggleReturningToGroup() {
        this.returningToGroup = !this.returningToGroup;
        console.log(`${this.name} Returning To Group: ${this.returningToGroup}`);
    }

    setCurrentMobFarm(mobFarmName) {
        this.currentMobFarm = mobFarmName;
        console.log(`${this.name} Current Mob Farm: ${this.currentMobFarm}`);
    }

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


}
