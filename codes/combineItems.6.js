class combineItems {
    busy = false;

    async gatherItems(itemName = "ringsj", levels = [0, 1, 2]) {
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

        // Scan bank
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

    async collectItems(slots) {
        for (const s of slots) {
            if (s.location === "bank") {
                await smart_move({ to: "bank" });

                bank_retrieve(s.pack, s.slot);
                await sleep(500);
            }
        }
    }

    async autoCombineItems(itemName = "ringsj", levels = [0, 1, 2]) {
        this.busy = true;

        const items = await this.gatherItems(itemName, levels);

        if (items.length < 3) {
            game_log(`Not enough ${itemName} to combine`);
            this.busy = false;
            return;
        }

        const grouped = {};
        for (const lvl of levels) grouped[lvl] = [];

        // Scan inventory
        for (let i = 0; i < character.items.length; i++) {
            const invItem = character.items[i];
            if (invItem && invItem.name === itemName && levels.includes(invItem.level)) {
                grouped[invItem.level].push({ location: "inventory", slot: i });
            }
        }

        // Scan bank
        if (character.bank) {
            for (const packName in character.bank) {
                const pack = character.bank[packName];
                if (!pack) continue;

                for (let i = 0; i < pack.length; i++) {
                    const bankItem = pack[i];
                    if (bankItem && bankItem.name === itemName && levels.includes(bankItem.level)) {
                        grouped[bankItem.level].push({ location: "bank", pack: packName, slot: i });
                    }
                }
            }
        }


        console.log(grouped)

        // Find a level with at least 3 of the item
        let chosenLevel = null;
        for (const lvl of levels) {
            if (grouped[lvl].length >= 3) {
                chosenLevel = lvl;
                break;
            }
        }

        if (chosenLevel === null) {
            game_log(`No set of 3 ${itemName} at the same level`);
            this.busy = false;

            return;
        }

        // Collect items from bank 
        await this.collectItems(grouped[chosenLevel].slice(0, 3));
        await sleep(500);

        // Refresh inventory slots with item locations 
        const invSlots = [];
        for (let i = 0; i < character.items.length; i++) {
            const invItem = character.items[i];
            if (invItem && invItem.name === itemName && invItem.level === chosenLevel) {
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

        // Compound5
        use_skill("massproduction")
        compound(invSlots[0], invSlots[1], invSlots[2], scrollSlot);
        await sleep(4000);

        this.busy = false;
    }
}

