const canvas = document.getElementById('invadersCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score-val');
const weaponEl = document.getElementById('weapon-status');

// Configuration
const THEME_CYAN = '#00eeff';
const PLAYER_SPEED = 6;
const BULLET_SPEED = 8;

class Player {
    constructor() {
        this.width = 40;
        this.height = 25;
        this.x = canvas.width / 2 - this.width / 2;
        this.y = canvas.height - 50;
        this.bullets = [];
        this.weaponLevel = 1;
        weaponEl.innerText = "AEGIS MK-I";
    }

    draw() {
        ctx.strokeStyle = THEME_CYAN;
        ctx.shadowBlur = 10;
        ctx.shadowColor = THEME_CYAN;
        ctx.lineWidth = 2;

        // AEGIS Ship Shape
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y); // Nose
        ctx.lineTo(this.x, this.y + this.height); // Bottom Left
        ctx.lineTo(this.x + this.width, this.y + this.height); // Bottom Right
        ctx.closePath();
        ctx.stroke();

        ctx.shadowBlur = 0; // Reset blur for other elements
    }

    update(keys) {
        if ((keys['ArrowLeft'] || keys['KeyA']) && this.x > 0) this.x -= PLAYER_SPEED;
        if ((keys['ArrowRight'] || keys['KeyD']) && this.x < canvas.width - this.width) this.x += PLAYER_SPEED;
    }

    fire() {
        // Future upgrades: Check this.weaponLevel here
        this.bullets.push(new Bullet(this.x + this.width / 2, this.y));
    }
}

class Bullet {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 2;
        this.speed = BULLET_SPEED;
    }

    update() {
        this.y -= this.speed;
    }

    draw() {
        ctx.fillStyle = THEME_CYAN;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

const aegis = new Player();
const keys = {};

window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);
window.addEventListener('keypress', e => {
    if (e.code === 'Space') aegis.fire();
});

function gameLoop() {
    // Clear Canvas
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    aegis.update(keys);
    aegis.draw();

    // Bullet Logic
    aegis.bullets.forEach((bullet, index) => {
        bullet.update();
        bullet.draw();

        // Remove off-screen bullets
        if (bullet.y < 0) aegis.bullets.splice(index, 1);
    });

    requestAnimationFrame(gameLoop);
}

function saveGame(finalScore, currentWeapon) {
    fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'CMD', // You can pull this from your #agent-id span later
            score: finalScore,
            weapon: currentWeapon
        })
    });
}

gameLoop();