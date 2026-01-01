// ----- PARTY OVERLAY SETTINGS ----- //
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
    const classColors = {
        mage: '#3FC7EB',
        paladin: '#F48CBA',
        priest: '#FFFFFF', // White
        ranger: '#AAD372',
        rogue: '#FFF468',
        warrior: '#C69B6D'
    };

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

// Start the Party frames
if (character.name == "Jhlpriest") {
    setTimeout(() => {
        initPartyOverlay();
        setInterval(updatePartyOverlay, UPDATE_MS);
    }, 2000);
}

// ----- Ping & CC ----- //
function createPingCCWidget() {
    const $ = parent.$ || window.$;
    // Remove existing widget to prevent duplicates
    $(parent.document).find('#character_stats_widget').remove();

    const $widget = $('<div id="character_stats_widget"></div>').css({
        position: 'fixed',
        top: '10px',
        left: '25%',
        transform: 'translateX(-50%)',
        padding: '8px 15px',
        background: 'rgba(0, 0, 0, 0.7)',
        color: '#00FF00',
        border: '1px solid #444',
        fontFamily: 'monospace',
        fontSize: '14px',
        zIndex: 9999,
        borderRadius: '4px',
        pointerEvents: 'none',
        textAlign: 'center',
        minWidth: '120px'
    });

    $(parent.document.body).append($widget);

    setInterval(() => {
        const ping = Math.round(character.ping);
        const cc = Math.round(character.cc);

        // Color coding for CC (Red if high)
        const ccColor = cc > 150 ? '#FF4444' : '#00FF00';

        $widget.html(
            `PING: ${ping}ms | <span style="color: ${ccColor}">CC: ${cc}</span>`
        );
    }, 300);
}

// Initialize the widget
createPingCCWidget();


// ----- Buttons ----- //
function test(val) {
    game_log(`Executing test with: ${val}`);
}

function showCustomPopup() {
    const $ = parent.$ || window.$;
    const pDoc = $(parent.document);

    // clean up any existing popup
    pDoc.find('#custom_popup_overlay').remove();

    const $overlay = $("<div id='custom_popup_overlay'></div>").css({
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10000,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
    });

    // popup Box
    const $box = $("<div></div>").css({
        background: '#222', border: '4px solid grey', padding: '20px',
        color: 'white', borderRadius: '5px', textAlign: 'center', minWidth: '250px'
    });

    const $title = $("<div>Enter Command:</div>").css({ marginBottom: '10px', fontWeight: 'bold' });

    const $input = $("<input type='text' id='popup_input'>").css({
        width: '100%', padding: '5px', marginBottom: '15px',
        background: '#000', color: '#0f0', border: '1px solid #555'
    });

    const $submit = $("<button>SUBMIT</button>").css({
        padding: '5px 15px', cursor: 'pointer', background: '#444', color: 'white'
    });

    const $cancel = $("<button>CANCEL</button>").css({
        padding: '5px 15px', cursor: 'pointer', background: '#444', color: 'white', marginLeft: '10px'
    });

    // Logic
    const doSubmit = () => {
        const val = $input.val();
        if (val) test(val);
        $overlay.remove();
    };

    $submit.on('click', doSubmit);
    $input.on('keypress', (e) => { if (e.which === 13) doSubmit(); });
    $cancel.on('click', () => $overlay.remove());

    // Assemble and Inject
    $box.append($title).append($input).append("<br>").append($submit).append($cancel);
    $overlay.append($box);
    $(parent.document.body).append($overlay);

    // Auto-focus the input
    setTimeout(() => $input.focus(), 100);
}

function createCustomButtonPrompt() {
    const $ = parent.$ || window.$;
    $(parent.document).find('#my_custom_button').remove();

    const $btn = $('<div id="my_custom_button">Call Merchant</div>').css({
        position: 'fixed', top: '10px', left: '500px', padding: '10px',
        background: 'gold', color: 'black', border: '2px solid black',
        cursor: 'pointer', zIndex: 9999, fontWeight: 'bold', borderRadius: '5px'
    });

    $btn.on('click', showCustomPopup);

    $(parent.document.body).append($btn);
}

// setTimeout(createCustomButtonPrompt, 2000);

function createCustomButtonNoPrompt() {
    let $ = parent.$ || window.$;

    // Remove old button on reload
    $('#my_custom_button').remove();

    const $btn = $('<div id="my_custom_button">DO SOMETHING</div>').css({
        position: 'fixed',
        top: '100px',
        left: '10px',
        padding: '10px',
        background: 'gold',
        color: 'black',
        border: '2px solid black',
        cursor: 'pointer',
        zIndex: 9999,
        fontWeight: 'bold',
        borderRadius: '5px',
        textAlign: 'center'
    });

    $btn.on('click', () => {
        game_log("Button Clicked!");
        test(); // Call your method here
    });

    $btn.on('mouseenter', function () { $(this).css('background', 'white'); });
    $btn.on('mouseleave', function () { $(this).css('background', 'gold'); });

    $(parent.document.body).append($btn);
}

// setTimeout(createCustomButtonNoPrompt(), 2000);
