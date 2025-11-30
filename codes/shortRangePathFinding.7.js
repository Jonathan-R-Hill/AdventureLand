// Keep a small history of last blocked positions
let recentBlocked = [];

async function moveTowardTargetAvoiding(targetX = null, targetY = null) {
    let tx, ty;

    if (targetX !== null && targetY !== null) {
        tx = targetX;
        ty = targetY;
    } else {
        const war = get_player("Jhlwarrior");
        if (!war) { return; }
        tx = war.real_x;
        ty = war.real_y;
    }

    const dx = tx - character.real_x;
    const dy = ty - character.real_y;

    const length = Math.sqrt(dx * dx + dy * dy);
    if (length === 0) { return; }

    let dirX = dx / length;
    let dirY = dy / length;

    const stepSize = 40;
    targetX = character.real_x + dirX * stepSize;
    targetY = character.real_y + dirY * stepSize;

    // If blocked, rotate dir until clear
    if (!can_move_to(targetX, targetY)) {
        const angleStep = Math.PI / 12; // 15° increments (I think?)
        let angle = Math.atan2(dirY, dirX);
        let found = false;

        // Decide a bias direction
        const bias = Math.random() < 0.5 ? 1 : -1;

        for (let i = 1; i <= 12; i++) {
            const newAngle = angle + bias * i * angleStep;
            const nx = Math.cos(newAngle);
            const ny = Math.sin(newAngle);

            const tx = character.real_x + nx * stepSize;
            const ty = character.real_y + ny * stepSize;

            // Skip if we recently tried this tile
            const key = `${Math.round(tx)},${Math.round(ty)}`;
            if (recentBlocked.includes(key)) continue;

            if (can_move_to(tx, ty)) {
                targetX = tx;
                targetY = ty;
                found = true;
                break;
            } else {
                // Remember this failed tile
                recentBlocked.push(key);
                if (recentBlocked.length > 10) { recentBlocked.shift(); } // keep history small
            }
        }

        // If still blocked, shrink step size
        if (!found) {
            targetX = character.real_x + dirX * (stepSize / 2);
            targetY = character.real_y + dirY * (stepSize / 2);
        }
    }

    move(targetX, targetY);
}


// ---
const TILE = 20;

function tileFromWorld(x, y) {
    return { tx: Math.floor(x / TILE), ty: Math.floor(y / TILE) };
}

function worldFromTile(tx, ty) {
    return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}

function canMoveBetween(x1, y1, x2, y2) {
    return can_move({
        map: character.map,
        x: x1,
        y: y1,
        going_x: x2,
        going_y: y2,
        base: character.base
    });
}

function reconstructPath(parent, goalKey) {
    const path = [];
    let currentKey = goalKey;
    while (parent[currentKey]) {
        const [tx, ty] = currentKey.split(",").map(Number);
        path.unshift({ tx, ty });
        currentKey = parent[currentKey];
    }
    return path;
}

function floodfillPath(start, goal) {
    const queue = [start];
    const visited = new Set([`${start.tx},${start.ty}`]);
    const parent = {};
    const goalKey = `${goal.tx},${goal.ty}`;

    // Safety break to prevent freezing browser (not done this 5 times already.. not at all)
    let iterations = 0;
    const MAX_ITERATIONS = 2000;

    while (queue.length > 0) {
        iterations++;

        if (iterations > MAX_ITERATIONS) {
            console.log("Path too long or complex");
            return null;
        }

        const current = queue.shift();
        const currentKey = `${current.tx},${current.ty}`;

        if (currentKey === goalKey) {
            return reconstructPath(parent, currentKey);
        }

        // Get World coordinates of the CURRENT tile
        const currentWorld = worldFromTile(current.tx, current.ty);

        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = current.tx + dx;
            const ny = current.ty + dy;
            const nKey = `${nx},${ny}`;

            if (visited.has(nKey)) continue;

            // Get World coordinates of the next tile
            const nextWorld = worldFromTile(nx, ny);

            if (!canMoveBetween(currentWorld.x, currentWorld.y, nextWorld.x, nextWorld.y)) continue;

            visited.add(nKey);
            parent[nKey] = currentKey;
            queue.push({ tx: nx, ty: ny });
        }
    }

    return null;
}

async function moveAndWalk(x, y) {
    move(x, y);
    // Wait until we are close to the target or moving stops
    while (simple_distance({ x: character.real_x, y: character.real_y }, { x: x, y: y }) > 5) {
        // If we stopped moving but aren't there, we got stuck/stunned
        if (!character.moving) {
            move(x, y); // Try re-issuing
        }

        await new Promise(resolve => setTimeout(resolve, 75));
    }
}

async function pathToWarriorFloodfill(opX = null, opY = null) {
    const war = get_player("Jhlwarrior");
    let goal;
    if (!war && opX != null && opY != null) { goal = tileFromWorld(opX, opY); }
    else { goal = tileFromWorld(war.real_x, war.real_y); }
    const start = tileFromWorld(character.real_x, character.real_y);

    // Don't pathfind if we are already in the same tile
    if (start.tx === goal.tx && start.ty === goal.ty) { return; }

    const path = floodfillPath(start, goal); //findPathAStar(start, goal);

    if (!path) {
        game_log("Floodfill: no path found");

        return;
    }

    // DRAWING THE PATH 
    clear_drawings();
    draw_line(character.real_x, character.real_y, worldFromTile(path[0].tx, path[0].ty).x, worldFromTile(path[0].tx, path[0].ty).y, 1, 0xFF0000);
    for (let i = 0; i < path.length - 1; i++) {
        const p1 = worldFromTile(path[i].tx, path[i].ty);
        const p2 = worldFromTile(path[i + 1].tx, path[i + 1].ty);
        draw_line(p1.x, p1.y, p2.x, p2.y, 1, 0xFF0000);
    }

    // MOVE
    for (const step of path) {
        const { x, y } = worldFromTile(step.tx, step.ty);
        // We use our wrapper that waits for arrival
        await moveAndWalk(x, y);
    }
}

// -- A* attempt
// Helper to calculate H
function getHeuristic(start, end) {
    // Manhattan distance
    return Math.abs(start.tx - end.tx) + Math.abs(start.ty - end.ty);
}

function findPathAStar(start, goal) {
    const openSet = [start];

    // Map to keep track of visited nodes and their best "g" score (cost from start)
    const gScore = {};
    const fScore = {}; // f = g + h (cost from start + est. dist to end)
    const parent = {};

    const startKey = `${start.tx},${start.ty}`;
    const goalKey = `${goal.tx},${goal.ty}`;

    gScore[startKey] = 0;
    fScore[startKey] = getHeuristic(start, goal);

    let iterations = 0;
    const MAX_ITERATIONS = 3000;

    while (openSet.length > 0) {
        iterations++;
        if (iterations > MAX_ITERATIONS) {
            console.log("A* Limit Reached - Path too complex or blocked");
            return null;
        }

        // Get the node in openSet with the LOWEST fScore
        let currentIndex = 0;
        for (let i = 1; i < openSet.length; i++) {
            const keyI = `${openSet[i].tx},${openSet[i].ty}`;
            const keyCurr = `${openSet[currentIndex].tx},${openSet[currentIndex].ty}`;

            // Default to Infinity if not yet scored
            const fI = fScore[keyI] || Infinity;
            const fCurr = fScore[keyCurr] || Infinity;

            if (fI < fCurr) {
                currentIndex = i;
            }
        }

        const current = openSet[currentIndex];
        const currentKey = `${current.tx},${current.ty}`;

        // Check if goal
        if (currentKey === goalKey) {
            return reconstructPath(parent, currentKey);
        }

        // Remove current from openSet
        openSet.splice(currentIndex, 1);

        // Check neighbors
        const currentWorld = worldFromTile(current.tx, current.ty);

        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const neighbor = { tx: current.tx + dx, ty: current.ty + dy };
            const nKey = `${neighbor.tx},${neighbor.ty}`;

            // Calculate tentative G score (Current G + distance to neighbor)
            const currentG = gScore[currentKey] || 0;
            const tentativeG = currentG + 1;

            // If we found a cheaper path to this neighbor
            if (tentativeG < (gScore[nKey] || Infinity)) {

                // Only run the expensive can_move check if the math looks good
                const nextWorld = worldFromTile(neighbor.tx, neighbor.ty);
                if (!canMoveBetween(currentWorld.x, currentWorld.y, nextWorld.x, nextWorld.y)) {
                    continue;
                }

                parent[nKey] = currentKey;
                gScore[nKey] = tentativeG;
                fScore[nKey] = tentativeG + getHeuristic(neighbor, goal);

                // Add to openSet if not already there
                if (!openSet.some(n => n.tx === neighbor.tx && n.ty === neighbor.ty)) {
                    openSet.push(neighbor);
                }
            }
        }
    }

    return null;
}