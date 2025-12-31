let orbitAngle = 0;

function circleCoords(centerX, centerY, radius) {
    // Lower number = Slower, Higher = Faster
    const rotationSpeed = 0.2;

    orbitAngle += rotationSpeed;

    // Reset angle to keep numbers small (Math.PI * 2 is a full circle)
    if (orbitAngle > Math.PI * 2) orbitAngle -= Math.PI * 2;

    // Trig! x = r * cos(theta), y = r * sin(theta)
    const nextX = centerX + radius * Math.cos(orbitAngle);
    const nextY = centerY + radius * Math.sin(orbitAngle);

    move(nextX, nextY);

    clear_drawings();
    draw_circle(centerX, centerY, radius, 1, 0x00FF00);
    draw_line(character.real_x, character.real_y, nextX, nextY, 1, 0xFFFF00);
}

