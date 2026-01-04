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

        // Function to find the lowest level version of the item
        const findLowestSlot = (name) => {
            let lowestLevel = Infinity;
            let lowestSlot = -1;
            for (let i = 0; i < character.items.length; i++) {
                let item = character.items[i];
                if (item && item.name === name) {
                    if (item.level < lowestLevel) {
                        lowestLevel = item.level;
                        lowestSlot = i;
                    }
                }
            }
            return { slot: lowestSlot, level: lowestLevel };
        };

        // Check if we already have a high-level version anywhere in inventory
        const alreadyFinished = character.items.some(item => item && item.name === itemName && item.level >= targetLevel);

        if (alreadyFinished) {
            game_log(`Already have ${itemName} at level ${targetLevel} or higher! Skipping.`);
            this.busy = false;
            return;
        }

        if (!smart.moving) { await smart_move({ to: "potions" }); }

        let itemInfo = findLowestSlot(itemName);

        // If we have none at all, buy a new one
        if (itemInfo.slot === -1) {
            game_log("Buying new " + itemName + " to upgrade.");
            await buy(itemName, 1);
            itemInfo = findLowestSlot(itemName);
        }

        if (itemInfo.slot === -1) {
            game_log("Failed to acquire " + itemName);
            this.busy = false;
            return;
        }

        while (itemInfo.level < targetLevel) {
            let scrollName = itemInfo.level >= 4 ? "scroll1" : "scroll0";
            let scrollSlot = locate_item(scrollName);

            if (scrollSlot === -1) {
                game_log("No " + scrollName + " left!");
                await buy(scrollName, 10);
                scrollSlot = locate_item(scrollName);
                if (scrollSlot === -1) break;
            }

            if (character.ctype === "merchant") {
                use_skill("massproduction");
            }

            await upgrade(itemInfo.slot, scrollSlot);
            await sleep(1000);

            itemInfo = findLowestSlot(itemName);
            if (itemInfo.slot === -1 || itemInfo.level >= targetLevel) break;
        }

        this.busy = false;
        game_log("Upgrade task for " + itemName + " finished.");
    }

    getScrollTypeForLevel(level, grade) {
        if (grade == 0) {
            if (level < 4) return "scroll0";
            if (level <= 7) return "scroll1";
            if (level <= 9) return "scroll2";
        }
        else if (grade == 1) {
            if (level < 5) return "scroll1";
            if (level <= 9) return "scroll2";
        }
        else if (grade == 2) { return "scroll2"; }
    }

    findAllItemSlotsByName(name) {
        name = name.toLowerCase();
        const slots = [];

        for (let i = 0; i < character.items.length; i++) {
            const item = character.items[i];
            if (item && item.name.toLowerCase() === name) {
                slots.push(i);
            }
        }

        return slots;
    }

    findScrollSlot(scrollName) {
        scrollName = scrollName.toLowerCase();

        for (let i = 0; i < character.items.length; i++) {
            const item = character.items[i];
            if (!item) continue;

            if (item.name.toLowerCase() === scrollName) {
                return i;
            }
        }

        return null;
    }

    async upgradeItemToLevel(itemSlot, targetLevel, grade) {
        if (character.q.upgrade) { return; }

        const item = character.items[itemSlot];
        if (!item) return;

        const currentLevel = item.level || 0;

        if (currentLevel >= targetLevel) return;

        const scrollName = this.getScrollTypeForLevel(currentLevel, grade);
        const scrollSlot = this.findScrollSlot(scrollName);

        if (scrollSlot === null) {
            game_log(`Missing scroll: ${scrollName}`, "#FF0000");
            return;
        }

        game_log(`Upgrading ${item.name}+${currentLevel} using ${scrollName}`);

        use_skill("massproduction");

        await upgrade(itemSlot, scrollSlot);

        await sleep(500);
    }

    async upgradeAllByName(itemName, targetLevel, grade) {
        const slots = this.findAllItemSlotsByName(itemName);

        if (slots.length === 0) {
            game_log(`No items named '${itemName}' found`, "#FF0000");
            return;
        }

        // Sort by current level so we upgrade the lowest first
        slots.sort((a, b) => {
            const A = character.items[a]?.level || 0;
            const B = character.items[b]?.level || 0;
            return A - B;
        });

        // Pick the lowest-level item that still needs upgrading
        let chosenSlot = null;

        for (const slot of slots) {
            const item = character.items[slot];
            const lvl = item.level || 0;

            if (lvl < targetLevel) {
                chosenSlot = slot;
                break;
            }
        }

        if (chosenSlot === null) {
            game_log(`All '${itemName}' items are already at target level ${targetLevel}`);
            return;
        }

        // Upgrade that one item
        await this.upgradeItemToLevel(chosenSlot, targetLevel, grade);
    }

}



