
const TILE = 25;
const FF_RANGE = 34;       // tiles around player
const FF_REPLAN_CD = 800; // ms
const FF_GOAL_EPS = 2;

let ffPath = null;
let ffIndex = 0;
let ffGoal = null;
let ffLastPlan = 0;
let lastWiggle = 0;

// ---------- Tile helpers ----------

function tileFromWorld(x, y) {
    return {
        tx: Math.floor(x / TILE),
        ty: Math.floor(y / TILE)
    };
}

function worldFromTile(tx, ty) {
    return {
        x: tx * TILE + TILE / 2,
        y: ty * TILE + TILE / 2
    };
}

function tileKey(tx, ty) {
    return `${tx},${ty}`;
}

// ---------- Collision ----------

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

// ---------- Start-tile fix ----------

function findReachablePathIndex(path, maxCheck = 6) {
    const origin = { x: character.real_x, y: character.real_y };

    for (let i = 0; i < Math.min(maxCheck, path.length); i++) {
        const { x, y } = worldFromTile(path[i].tx, path[i].ty);
        if (canMoveBetween(origin.x, origin.y, x, y)) {
            return i;
        }
    }

    return -1;
}

function nudgeDownIfBlocked(targetWorld) {
    // Only if target is below us
    if (targetWorld.y <= character.real_y) return false;

    const step = 8; // small nudge
    const nx = character.real_x;
    const ny = character.real_y + step;

    if (can_move_to(nx, ny)) {
        move(nx, ny);
        return true;
    }

    return false;
}

function getFloodfillStartSeeds(radius = 2) {
    const origin = tileFromWorld(character.real_x, character.real_y);
    const seeds = [];

    const originWorld = {
        x: character.real_x,
        y: character.real_y
    };

    for (let r = 0; r <= radius; r++) {
        for (let dx = -r; dx <= r; dx++) {

            for (let dy = -r; dy <= r; dy++) {
                const tx = origin.tx + dx;
                const ty = origin.ty + dy;
                const world = worldFromTile(tx, ty);

                if (canMoveBetween(originWorld.x, originWorld.y, world.x, world.y)) {
                    seeds.push({ tx, ty });
                }
            }
        }
    }

    return seeds;
}

// ---------- Path reconstruction ----------

function reconstructPath(parent, goalKey) {
    const path = [];
    let current = goalKey;

    while (parent[current]) {
        const [tx, ty] = current.split(",").map(Number);
        path.unshift({ tx, ty });
        current = parent[current];
    }

    return path;
}

// ---------- Floodfill BFS ----------

function floodfillPathMultiStart(starts, goal) {
    const queue = [];
    const visited = new Set();
    const parent = {};

    for (const s of starts) {
        const k = tileKey(s.tx, s.ty);
        visited.add(k);
        queue.push(s);
    }

    let iterations = 0;
    const MAX_ITER = 3000;

    while (queue.length) {
        if (++iterations > MAX_ITER) return null;

        const cur = queue.shift();
        const curKey = tileKey(cur.tx, cur.ty);

        if (
            Math.abs(cur.tx - goal.tx) <= FF_GOAL_EPS &&
            Math.abs(cur.ty - goal.ty) <= FF_GOAL_EPS
        ) {
            return reconstructPath(parent, curKey);
        }

        const curWorld = worldFromTile(cur.tx, cur.ty);

        for (const [dx, dy] of [
            [1, 0], [-1, 0], [0, 1], [0, -1],
            [1, 1], [1, -1], [-1, 1], [-1, -1]
        ]) {
            const nx = cur.tx + dx;
            const ny = cur.ty + dy;

            if (
                Math.abs(nx - starts[0].tx) > FF_RANGE ||
                Math.abs(ny - starts[0].ty) > FF_RANGE
            ) continue;

            const key = tileKey(nx, ny);
            if (visited.has(key)) continue;

            const nextWorld = worldFromTile(nx, ny);
            if (!canMoveBetween(curWorld.x, curWorld.y, nextWorld.x, nextWorld.y)) continue;

            visited.add(key);
            parent[key] = curKey;
            queue.push({ tx: nx, ty: ny });
        }
    }

    return null;
}


// ---------- Replan logic ----------

function shouldReplanFloodfill(goalTile) {
    if (!ffPath || !ffGoal) return true;
    if (ffIndex >= ffPath.length) return true;

    if (Math.abs(goalTile.tx - ffGoal.tx) + Math.abs(goalTile.ty - ffGoal.ty) > FF_GOAL_EPS) {
        return true;
    }

    return (Date.now() - ffLastPlan) > FF_REPLAN_CD;
}

// ---------- Planning ----------

function planFloodfillPath(goalX, goalY) {
    const goal = tileFromWorld(goalX, goalY);
    if (!shouldReplanFloodfill(goal)) return;

    const originTile = tileFromWorld(character.real_x, character.real_y);
    let path = floodfillPathSingleStart(originTile, goal);

    if (!path || !path.length) {
        const startSeeds = getFloodfillStartSeeds(3);
        if (startSeeds.length) {
            path = floodfillPathMultiStart(startSeeds, goal);
        }
    }

    // No path so we move to try and try a new calculation
    if (!path || !path.length) {
        const now = Date.now();
        if (now - lastWiggle > 1000) {
            const angle = Math.random() * Math.PI * 2;

            move(character.real_x + Math.cos(angle) * 35, character.real_y + Math.sin(angle) * 35);

            lastWiggle = now;
            ffLastPlan = now;
        }

        return;
    }

    ffPath = path;
    ffIndex = 0;
    ffGoal = goal;
    ffLastPlan = Date.now();

    clear_drawings();
    for (let i = 0; i < path.length - 1; i++) {
        const a = worldFromTile(path[i].tx, path[i].ty);
        const b = worldFromTile(path[i + 1].tx, path[i + 1].ty);
        draw_line(a.x, a.y, b.x, b.y, 1, 0xFF0000);
    }
}

// ---------- Fast path following ----------

function followFloodfillPath() {
    if (!ffPath || ffIndex >= ffPath.length) return;

    const LOOKAHEAD = 6;

    const reachableIndex = findReachablePathIndex(ffPath, LOOKAHEAD);

    // If reachableIndex is -1 we are likely slightly off or clipping a wall. 
    if (reachableIndex === -1) {
        const forcedTarget = worldFromTile(ffPath[ffIndex].tx, ffPath[ffIndex].ty);

        // Check dist. If we are really close to it but still "stuck", increment index
        if (simple_distance(character, forcedTarget) < 10) {
            ffIndex++;
            return;
        }

        // try to force the move and not care if its possible..
        move(forcedTarget.x, forcedTarget.y);
        return;
    }

    // Snap path index forward
    if (reachableIndex > ffIndex) {
        ffIndex = reachableIndex;
    }

    let bestIndex = ffIndex;
    let lastGood = null;

    for (let i = ffIndex; i < Math.min(ffIndex + LOOKAHEAD, ffPath.length); i++) {
        const { x, y } = worldFromTile(ffPath[i].tx, ffPath[i].ty);
        if (!can_move_to(x, y)) break;

        lastGood = { x, y };
        bestIndex = i;
    }

    if (!lastGood) return;

    move(lastGood.x, lastGood.y);

    if (simple_distance(character, lastGood) < 18) {
        ffIndex = bestIndex + 1;
    }
}


function floodfillPathSingleStart(start, goal) {
    return floodfillPathMultiStart([start], goal);
}

// ---------- Public entry ----------

function moveTowardTargetFloodfill(x, y) {
    planFloodfillPath(x, y);
    followFloodfillPath();
}

function clearFloodfillPath() {
    ffPath = null;
    ffIndex = 0;
    ffGoal = null;
    ffLastPlan = 0;
}
