// === PARTY OVERLAY SETTINGS ===
const UI_ID = "party_status_overlay";
const UPDATE_MS = 500; // How often to refresh (ms)

function initPartyOverlay() {
    let $ = parent.$ || window.$;
    let topCenter = $('#topmid'); // The game has a top-middle container

    // If it doesn't exist, use the body as a fallback
    let anchor = topCenter.length ? topCenter : $(parent.document.body);

    // Clean up old version if it exists
    $(parent.document).find(`#${UI_ID}`).remove();

    // Create the Main Container
    const container = $(`<div id='${UI_ID}'></div>`).css({
        position: 'fixed',
        top: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'rgba(0,0,0,0.7)',
        border: '2px solid #C69B6D',
        padding: '5px',
        color: 'white',
        fontSize: '14px',
        textAlign: 'center',
        zIndex: 9999,
        minWidth: '300px',
        pointerEvents: 'none', // Allows clicking through to the game world
        borderRadius: '5px'
    });

    anchor.append(container);
}

function updatePartyOverlay() {
    let $ = parent.$ || window.$;
    const container = $(parent.document).find(`#${UI_ID}`);
    if (!container.length) return initPartyOverlay();

    let html = "<table style='width:100%; border-collapse: collapse;'>";

    // Get all party members
    const partyNames = parent.party_list.length > 0 ? parent.party_list : [character.name];

    partyNames.forEach(name => {
        const char = get_player(name) || (name === character.name ? character : null);

        if (char) {
            const hpPct = Math.floor((char.hp / char.max_hp) * 100);
            const mpPct = Math.floor((char.mp / char.max_mp) * 100);
            const nameColor = classColors[char.ctype] || "#FFF";

            html += `
                <tr style='border-bottom: 1px solid #444;'>
                    <td style='color:${nameColor}; padding-right:10px; text-align:left;'><b>${char.name}</b></td>
                    <td style='width:100px;'>
                        <div style='background: #333; height: 10px; width: 100%; border: 1px solid #000;'>
                            <div style='background: #e74c3c; height: 100%; width: ${hpPct}%;'></div>
                        </div>
                        <div style='font-size: 10px;'>${char.hp}/${char.max_hp}</div>
                    </td>
                    <td style='width:100px; padding-left: 10px;'>
                        <div style='background: #333; height: 10px; width: 100%; border: 1px solid #000;'>
                            <div style='background: #3498db; height: 100%; width: ${mpPct}%;'></div>
                        </div>
                        <div style='font-size: 10px;'>${char.mp}/${char.max_mp}</div>
                    </td>
                </tr>`;
        }
    });

    html += "</table>";
    container.html(html);
}

// Start the UI
setTimeout(() => {
    initPartyOverlay();
    setInterval(updatePartyOverlay, UPDATE_MS);
}, 2000);