// ==========================================================
//              A* PATHFINDING MODULE (Standalone)
// ==========================================================

const TILE = 23;
const ASTAR_RANGE = 42;
const ASTAR_REPLAN_CD = 800;
const ASTAR_GOAL_EPS = 2;
const MAX_ITER = 5000;

let aPath = null;
let aIndex = 0;
let aGoal = null;
let aLastPlan = 0;
let lastAWiggle = 0;

// ----------------------------------------------------------
// Tile Helpers
// ----------------------------------------------------------

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

// ----------------------------------------------------------
// Collision Helpers
// ----------------------------------------------------------

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

// ----------------------------------------------------------
// Heuristic + Costs
// ----------------------------------------------------------

function heuristic(a, b) {
    // Chebyshev distance for 8-direction movement
    return Math.max(
        Math.abs(a.tx - b.tx),
        Math.abs(a.ty - b.ty)
    );
}

function movementCost(dx, dy) {
    // diagonals cost slightly more
    return (dx !== 0 && dy !== 0) ? 1.414 : 1;
}

// ----------------------------------------------------------
// Start Tile Fix + Lookahead Snap
// ----------------------------------------------------------

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

// ----------------------------------------------------------
// Flood-style Seeds for Better Start Recovery
// ----------------------------------------------------------

function getAStarStartSeeds(radius = 2) {
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

// ----------------------------------------------------------
// Path Reconstruction
// ----------------------------------------------------------

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

// ----------------------------------------------------------
// A* Core Algorithm (Multi Start)
// ----------------------------------------------------------

function aStarPathMultiStart(starts, goal) {

    const open = [];
    const openSet = new Set();

    const parent = {};
    const gScore = {};
    const fScore = {};

    // init starts
    for (const s of starts) {
        const k = tileKey(s.tx, s.ty);

        gScore[k] = 0;
        fScore[k] = heuristic(s, goal);

        open.push(s);
        openSet.add(k);
    }

    let iterations = 0;

    while (open.length) {

        if (++iterations > MAX_ITER) return null;

        // ---- pick lowest fScore ----
        let bestIndex = 0;
        let bestF = Infinity;

        for (let i = 0; i < open.length; i++) {
            const k = tileKey(open[i].tx, open[i].ty);
            const f = fScore[k] ?? Infinity;

            if (f < bestF) {
                bestF = f;
                bestIndex = i;
            }
        }

        const cur = open.splice(bestIndex, 1)[0];
        const curKey = tileKey(cur.tx, cur.ty);
        openSet.delete(curKey);

        // ---- goal reached ----
        if (
            Math.abs(cur.tx - goal.tx) <= ASTAR_GOAL_EPS &&
            Math.abs(cur.ty - goal.ty) <= ASTAR_GOAL_EPS
        ) {
            return reconstructPath(parent, curKey);
        }

        const curWorld = worldFromTile(cur.tx, cur.ty);

        // ---- neighbors ----
        for (const [dx, dy] of [
            [1, 0], [-1, 0], [0, 1], [0, -1],
            [1, 1], [1, -1], [-1, 1], [-1, -1]
        ]) {

            const nx = cur.tx + dx;
            const ny = cur.ty + dy;

            // range clamp
            if (
                Math.abs(nx - starts[0].tx) > ASTAR_RANGE ||
                Math.abs(ny - starts[0].ty) > ASTAR_RANGE
            ) continue;

            const nKey = tileKey(nx, ny);

            const nextWorld = worldFromTile(nx, ny);

            // collision check
            if (!canMoveBetween(curWorld.x, curWorld.y, nextWorld.x, nextWorld.y))
                continue;

            // diagonal corner safety
            if (dx !== 0 && dy !== 0) {
                const side1 = worldFromTile(cur.tx + dx, cur.ty);
                const side2 = worldFromTile(cur.tx, cur.ty + dy);

                if (!canMoveBetween(curWorld.x, curWorld.y, side1.x, side1.y)) continue;
                if (!canMoveBetween(curWorld.x, curWorld.y, side2.x, side2.y)) continue;
            }

            const stepCost = movementCost(dx, dy);
            const tentativeG = (gScore[curKey] ?? Infinity) + stepCost;

            if (tentativeG < (gScore[nKey] ?? Infinity)) {

                parent[nKey] = curKey;
                gScore[nKey] = tentativeG;
                fScore[nKey] = tentativeG + heuristic({ tx: nx, ty: ny }, goal);

                if (!openSet.has(nKey)) {
                    open.push({ tx: nx, ty: ny });
                    openSet.add(nKey);
                }
            }
        }
    }

    return null;
}

function aStarPathSingleStart(start, goal) {
    return aStarPathMultiStart([start], goal);
}

// ----------------------------------------------------------
// Replan Logic
// ----------------------------------------------------------

function shouldReplanAStar(goalTile) {

    if (!aPath || !aGoal) return true;
    if (aIndex >= aPath.length) return true;

    if (
        Math.abs(goalTile.tx - aGoal.tx) +
        Math.abs(goalTile.ty - aGoal.ty)
        > ASTAR_GOAL_EPS
    ) {
        return true;
    }

    return (Date.now() - aLastPlan) > ASTAR_REPLAN_CD;
}

// ----------------------------------------------------------
// Planning
// ----------------------------------------------------------

function planAStarPath(goalX, goalY) {

    const goal = tileFromWorld(goalX, goalY);
    if (!shouldReplanAStar(goal)) return;

    const originTile = tileFromWorld(character.real_x, character.real_y);

    let path = aStarPathSingleStart(originTile, goal);

    // fallback seeds
    if (!path || !path.length) {
        const seeds = getAStarStartSeeds(3);
        if (seeds.length) {
            path = aStarPathMultiStart(seeds, goal);
        }
    }

    // wiggle if stuck
    if (!path || !path.length) {

        const now = Date.now();

        if (now - lastAWiggle > 1000) {

            const angle = Math.random() * Math.PI * 2;

            move(
                character.real_x + Math.cos(angle) * 35,
                character.real_y + Math.sin(angle) * 35
            );

            lastAWiggle = now;
            aLastPlan = now;
        }

        return;
    }

    // store
    aPath = path;
    aIndex = 0;
    aGoal = goal;
    aLastPlan = Date.now();

    // debug draw
    clear_drawings();

    for (let i = 0; i < path.length - 1; i++) {
        const a = worldFromTile(path[i].tx, path[i].ty);
        const b = worldFromTile(path[i + 1].tx, path[i + 1].ty);

        draw_line(a.x, a.y, b.x, b.y, 1, 0x00FF00);
    }
}

// ----------------------------------------------------------
// Fast Following (Same as Floodfill)
// ----------------------------------------------------------

function followAStarPath() {

    if (!aPath || aIndex >= aPath.length) return;

    const LOOKAHEAD = 6;

    const reachableIndex = findReachablePathIndex(aPath, LOOKAHEAD);

    if (reachableIndex === -1) {

        const forcedTarget = worldFromTile(
            aPath[aIndex].tx,
            aPath[aIndex].ty
        );

        if (simple_distance(character, forcedTarget) < 10) {
            aIndex++;
            return;
        }

        move(forcedTarget.x, forcedTarget.y);
        return;
    }

    if (reachableIndex > aIndex) {
        aIndex = reachableIndex;
    }

    let bestIndex = aIndex;
    let lastGood = null;

    for (let i = aIndex; i < Math.min(aIndex + LOOKAHEAD, aPath.length); i++) {

        const { x, y } = worldFromTile(aPath[i].tx, aPath[i].ty);

        if (!can_move_to(x, y)) break;

        lastGood = { x, y };
        bestIndex = i;
    }

    if (!lastGood) return;

    move(lastGood.x, lastGood.y);

    if (simple_distance(character, lastGood) < 18) {
        aIndex = bestIndex + 1;
    }
}

// ----------------------------------------------------------
// Public Entry
// ----------------------------------------------------------

function moveTowardTargetAStar(x, y) {
    planAStarPath(x, y);
    followAStarPath();
}

function clearAStarPath() {
    aPath = null;
    aIndex = 0;
    aGoal = null;
    aLastPlan = 0;
}
