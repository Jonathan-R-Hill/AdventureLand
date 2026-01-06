let orbitAngle = 0;

function circleTargets(mobs, fixedX = null, fixedY = null, radius = 35) {
    let centerX, centerY;

    // Determine Center Point
    if (fixedX !== null && fixedY !== null) {
        centerX = fixedX;
        centerY = fixedY;
    } else {
        let sumX = 0, sumY = 0;
        mobs.forEach(m => { sumX += m.x; sumY += m.y; });
        centerX = mobs[0].real_x //sumX / mobs.length;
        centerY = mobs[0].real_y //sumY / mobs.length;
    }

    // Update Angle
    // Lower = Slower, Higher = Faster. 
    const rotationSpeed = 0.30;
    orbitAngle += rotationSpeed;

    // Reset angle to keep numbers small (Math.PI * 2 is a full circle)
    if (orbitAngle > Math.PI * 2) orbitAngle -= Math.PI * 2;

    // Trig! x = r * cos(theta), y = r * sin(theta)
    const nextX = centerX + radius * Math.cos(orbitAngle);
    const nextY = centerY + radius * Math.sin(orbitAngle);

    // Visualization
    clear_drawings();
    draw_circle(centerX, centerY, radius, 1, 0x00FF00);
    draw_line(character.real_x, character.real_y, nextX, nextY, 1, 0xFFFF00);

    move(nextX, nextY);
}

function strafeTargets(mobs, fixedX = null, fixedY = null, radius = 35) {
    let centerX, centerY;

    // 1. Determine Center Point
    if (fixedX !== null && fixedY !== null) {
        centerX = fixedX;
        centerY = fixedY;
    } else {
        if (!mobs || mobs.length === 0) return;
        centerX = mobs[0].real_x;
        centerY = mobs[0].real_y;
    }

    const strafeSpeed = 0.15;
    this.orbitAngle += strafeSpeed;

    // Reset angle at 2*PI to stay clean
    if (this.orbitAngle > Math.PI * 2) this.orbitAngle -= Math.PI * 2;

    // nextX will swing between (centerX - radius) and (centerX + radius)
    const nextX = centerX + radius * Math.sin(this.orbitAngle);
    const nextY = centerY; // Y stays constant

    clear_drawings();
    draw_line(centerX - radius, centerY, centerX + radius, centerY, 1, 0x00FF00);
    draw_line(character.real_x, character.real_y, nextX, nextY, 1, 0xFFFF00);

    move(nextX, nextY);

}