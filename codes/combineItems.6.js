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
        let useBetterScroll = false;

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

        if (["intearring", "strearring", "dexearring"].includes(itemName) && chosenLevel >= 2) { useBetterScroll = true; }
        await sleep(30);

        await smart_move({ to: "scrolls" });

        // Find / get scroll
        let scroll = useBetterScroll ? "cscroll1" : "cscroll0";
        let scrollSlot = locate_item(scroll);

        if (scrollSlot === -1) {
            buy(scroll, 1);
            await sleep(200)

            scrollSlot = locate_item(scroll);
            if (scrollSlot === -1) {
                game_log("Failed to acquire compound scroll");
                this.busy = false;

                return;
            }
        }

        // Compound
        use_skill("massproduction")
        compound(invSlots[0], invSlots[1], invSlots[2], scrollSlot);

        await sleep(100);
        use_skill("use_town")
        await sleep(3500);

        this.busy = false;
    }

    async buyAndUpgrade(itemName, targetLevel) {
        this.busy = true;
        await smart_move({ to: "potions" });

        // Buy the item
        await buy(itemName, 1);
        let itemSlot = locate_item(itemName);

        if (itemSlot === -1) {
            game_log("Couldn't find " + itemName + " in inventory!");
            this.busy = false;
            return;
        }

        // Step 2: Upgrade loop
        while (character.items[itemSlot].level < targetLevel) {
            // Decide which scroll to use based on current level
            let scrollName = character.items[itemSlot].level >= 4 ? "scroll1" : "scroll0";
            let scrollSlot = locate_item(scrollName);

            if (scrollSlot === -1) {
                game_log("No " + scrollName + " left!");
                this.busy = false;
                break;
            }

            use_skill("massproduction");
            await upgrade(itemSlot, scrollSlot);
            await sleep(1000);

            // Refresh slot reference
            itemSlot = locate_item(itemName);
            if (itemSlot === -1) {
                this.busy = false;
                game_log(itemName + " broke or disappeared!");
                break;
            }
        }

        if (itemSlot !== -1 && character.items[itemSlot].level >= targetLevel) {
            this.busy = false;
            game_log(itemName + " reached level " + targetLevel + "!");
        }
    }

}



