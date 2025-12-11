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

    const stepSize = 60;
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
                if (recentBlocked.length > 20) { recentBlocked.shift(); } // keep history small
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

// take 2
let lastAvoidBias = 1;
const MAX_BLOCKED_HISTORY = 20;
async function moveTowardTargetAvoiding3(targetX = null, targetY = null) {
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
        const angleStep = Math.PI / 12;
        let angle = Math.atan2(dirY, dirX);
        let found = false;

        // Use the last successful avoidance direction
        const bias = lastAvoidBias;

        for (let i = 1; i <= 12; i++) {
            const newAngle = angle + bias * i * angleStep;
            const nx = Math.cos(newAngle);
            const ny = Math.sin(newAngle);

            const tx = character.real_x + nx * stepSize;
            const ty = character.real_y + ny * stepSize;

            const key = `${Math.round(tx)},${Math.round(ty)}`;
            if (recentBlocked.includes(key)) continue;

            if (can_move_to(tx, ty)) {
                // Update bias to reinforce this turn direction
                lastAvoidBias = bias;

                targetX = tx;
                targetY = ty;
                found = true;
                break;
            } else {
                // Remember this failed tile
                recentBlocked.push(key);
                if (recentBlocked.length > MAX_BLOCKED_HISTORY) { recentBlocked.shift(); }
            }
        }

        // If the preferred bias failed, flip it for the next time
        if (!found) {
            lastAvoidBias *= -1;

            // If still blocked after 360 rotation, shrink step size
            targetX = character.real_x + dirX * (stepSize / 2);
            targetY = character.real_y + dirY * (stepSize / 2);
        }
    }

    move(targetX, targetY);
}


// -- A* Attempt 2
class Node {
    constructor(x, y, parent = null) {
        this.x = x;
        this.y = y;
        this.parent = parent;
        this.g = 0; // Cost from start
        this.h = 0; // Heuristic est cost till end
        this.f = 0; // Total cost
    }
}

function getNextStepAStar(startX, startY, targetX, targetY, stepSize, range = 0) {
    // Snap coordinates to grid
    const startNode = new Node(Math.round(startX / stepSize) * stepSize, Math.round(startY / stepSize) * stepSize);
    const endNode = new Node(Math.round(targetX / stepSize) * stepSize, Math.round(targetY / stepSize) * stepSize);

    let openList = [startNode];
    let closedSet = new Set();

    let loops = 0;
    const MAX_LOOPS = 500;

    while (openList.length > 0 && loops < MAX_LOOPS) {
        loops++;

        openList.sort((a, b) => a.f - b.f);
        let current = openList.shift();

        // DISTANCE CHECK
        const dist = Math.sqrt(Math.pow(current.x - targetX, 2) + Math.pow(current.y - targetY, 2));
        if (dist <= range - 20) {
            let path = [];
            let temp = current;
            while (temp.parent) {
                path.push(temp);
                temp = temp.parent;
            }
            return path.pop();
        }

        closedSet.add(`${current.x},${current.y}`);

        const neighbors = [
            // Straight (Cost: 1.0)
            { x: current.x + stepSize, y: current.y, cost: stepSize },
            { x: current.x - stepSize, y: current.y, cost: stepSize },
            { x: current.x, y: current.y + stepSize, cost: stepSize },
            { x: current.x, y: current.y - stepSize, cost: stepSize },
            // Diagonal (Cost: ~1.414 ish)
            { x: current.x + stepSize, y: current.y + stepSize, cost: stepSize * 1.414 },
            { x: current.x - stepSize, y: current.y - stepSize, cost: stepSize * 1.414 },
            { x: current.x - stepSize, y: current.y + stepSize, cost: stepSize * 1.414 },
            { x: current.x + stepSize, y: current.y - stepSize, cost: stepSize * 1.414 }
        ];

        for (let neighborPos of neighbors) {
            if (closedSet.has(`${neighborPos.x},${neighborPos.y}`)) continue;

            if (!can_move_to(neighborPos.x, neighborPos.y)) continue;

            let neighbor = new Node(neighborPos.x, neighborPos.y, current);

            // Use the specific cost defined in the neighbors array
            neighbor.g = current.g + neighborPos.cost;

            neighbor.h = Math.sqrt(Math.pow(neighbor.x - endNode.x, 2) + Math.pow(neighbor.y - endNode.y, 2));
            neighbor.f = neighbor.g + neighbor.h;

            let existing = openList.find(n => n.x === neighbor.x && n.y === neighbor.y);
            if (existing && existing.g < neighbor.g) continue;

            openList.push(neighbor);
        }
    }

    return null;
}

async function moveTowardTargetAvoiding2(targetX = null, targetY = null) {
    let tx, ty;

    if (targetX === null || targetY === null) {
        const war = get_player("Jhlwarrior");
        if (!war) return;
        tx = war.real_x;
        ty = war.real_y;
    } else {
        tx = targetX;
        ty = targetY;
    }

    const stepSize = 60;

    // Run A* to get just the NEXT immediate tile we should go to
    let nextStep = getNextStepAStar(character.real_x, character.real_y, tx, ty, stepSize);

    if (nextStep) {
        // Move to the next node.
        move(nextStep.x, nextStep.y);
    } else {
        // Fallback
        move(tx, ty);
    }
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

async function pathFloodfill(opX = null, opY = null) {
    const war = get_player("Jhlwarrior");
    let goal;
    if (!war && opX != null && opY != null) { goal = tileFromWorld(opX, opY); }
    else { goal = tileFromWorld(war.real_x, war.real_y); }
    const start = tileFromWorld(character.real_x, character.real_y);

    // Don't pathfind if we are already in the same tile
    if (start.tx === goal.tx && start.ty === goal.ty) { return; }

    const path = floodfillPath(start, goal);

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