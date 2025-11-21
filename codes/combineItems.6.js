class combineItems {
    busy = false;

    async gatherRings(itemName = "ringsj", levels = [0, 1, 2]) {
        const slots = [];

        // Scan inventory
        for (let i = 0; i < character.items.length; i++) {
            const item = character.items[i];
            if (item && item.name === itemName && levels.includes(item.level)) {
                slots.push({ location: "inventory", slot: i });
            }
        }

        // Make sure bank is loaded
        await smart_move({ to: "bank" });

        // Scan bank safely
        if (character.bank) {
            for (const packName in character.bank) {
                const pack = character.bank[packName];
                if (!pack) { continue; }

                for (let i = 0; i < pack.length; i++) {
                    const item = pack[i];
                    if (item && item.name === itemName && levels.includes(item.level)) {
                        slots.push({ location: "bank", pack: packName, slot: i });
                    }
                }
            }
        }

        return slots;
    }

    async collectRings(slots) {
        for (const s of slots) {
            if (s.location === "bank") {
                await smart_move({ to: "bank" });

                bank_retrieve(s.pack, s.slot);
                await sleep(500);
            }
        }
    }

    async autoCombineRings() {
        this.busy = true;

        const rings = await this.gatherRings("ringsj", [0, 1, 2]);

        if (rings.length < 3) {
            game_log("Not enough rings to combine");
            this.busy = false;
            return;
        }

        const grouped = { 0: [], 1: [], 2: [] };

        // Scan inventory
        for (let i = 0; i < character.items.length; i++) {
            const item = character.items[i];
            if (item && item.name === "ringsj" && [0, 1, 2].includes(item.level)) {
                grouped[item.level].push({ location: "inventory", slot: i });
            }
        }

        // Scan bank
        if (character.bank) {
            for (const packName in character.bank) {
                const pack = character.bank[packName];
                if (!pack) continue;

                for (let i = 0; i < pack.length; i++) {
                    const item = pack[i];
                    // console.log(item, packName, i);

                    if (item && item.name === "ringsj" && [0, 1, 2].includes(item.level)) {
                        grouped[item.level].push({ location: "bank", pack: packName, slot: i });
                    }
                }
            }
        }

        // Find a level with at least 3 rings
        let chosenLevel = null;
        for (const lvl of [0, 1, 2]) {
            if (grouped[lvl].length >= 3) {
                chosenLevel = lvl;
                break;
            }
        }

        if (chosenLevel === null) {
            game_log("No set of 3 rings at the same level");
            this.busy = false;

            return;
        }

        // Collect items from bank 
        await this.collectRings(grouped[chosenLevel].slice(0, 3));

        // Refresh inventory slots with item locations 
        const invSlots = [];
        for (let i = 0; i < character.items.length; i++) {
            const item = character.items[i];
            if (item && item.name === "ringsj" && item.level === chosenLevel) {
                invSlots.push(i);
                if (invSlots.length === 3) break;
            }
        }

        if (invSlots.length < 3) {
            this.busy = false;

            return;
        }

        await smart_move({ to: "scrolls" });

        // Find / get scroll
        let scrollSlot = locate_item("cscroll0");
        if (scrollSlot === -1) {
            buy("cscroll0", 1);
            await sleep(200)

            scrollSlot = locate_item("cscroll0");
            if (scrollSlot === -1) {
                game_log("Failed to acquire compound scroll");
                this.busy = false;
                return;
            }
        }

        // Compound
        compound(invSlots[0], invSlots[1], invSlots[2], scrollSlot);
        await sleep(2500);

        this.busy = false;
    }
}

