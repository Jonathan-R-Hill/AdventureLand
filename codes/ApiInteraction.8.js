function exportCharacterData() {
    let used = 0;
    for (let i = 0; i < character.items.length; i++) {
        if (character.items[i]) { used++; }
    }

    const data = {
        Name: character.name,
        Class: character.name.replace("Jhl", ""),
        Str: character.str,
        Intel: character.int,
        Dex: character.dex,
        Vit: character.vit,
        Speed: character.speed,
        Armor: character.armor,
        Resistance: character.resistance,
        CurrentHealth: character.hp,
        MaxHealth: character.max_hp,
        CurrentMana: character.mp,
        MaxMana: character.max_mp,
        InventoryUsage: used,
        InventorySpace: 42
    };

    fetch("https://localhost:7015/extract/charInfo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    })
        .then(res => res.json())
        .then(result => console.log("Server response:", result))
        .catch(err => console.error("Error:", err));
}
