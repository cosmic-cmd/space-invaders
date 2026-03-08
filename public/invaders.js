// Configuration
const canvas = document.getElementById('invadersCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score-val');
const weaponEl = document.getElementById('weapon-status');
const THEME_CYAN = '#00eeff';
const PLAYER_SPEED = 6;
const BULLET_SPEED = 8;
let currentLevel = 1;
const levelEl = document.getElementById('level-val');
const overlay = document.getElementById('system-overlay');
const agentIdEl = document.getElementById('agent-id');

// 1. BOOT ENGINE: Handles the Name Entry
function bootSystem() {
    const input = document.getElementById('agent-input').value.trim();
    if (input) {
        agentIdEl.innerText = input.toUpperCase();
        overlay.style.display = 'none';
        gameLoop(); // Start the loop only after name entry
    }
}

// 2. FETCH HIGH SCORES: Pulls from your PVC-backed SQLite
async function showScoreboard() {
    try {
        const response = await fetch('/api/scores');
        const scores = await response.json();
        const list = document.getElementById('high-scores-list');
        list.innerHTML = scores.map(s => `<div>${s.name} - ${s.score} [${s.weapon}]</div>`).join('');

        document.getElementById('setup-screen').style.display = 'none';
        document.getElementById('scoreboard-screen').style.display = 'block';
        overlay.style.display = 'flex';
    } catch (e) {
        console.error("Scoreboard Offline");
    }
}

// The Particle Forge
let particles = [];

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = Math.random() * 3 + 1;
        this.speedY = Math.random() * 2 + 1;
        this.alpha = 1;
    }
    update() {
        this.y += this.speedY;
        this.alpha -= 0.02;
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.restore();
    }
}

class Invader {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 20;
        this.alive = true;
    }

    draw() {
        if (!this.alive) return;
        ctx.strokeStyle = '#ff0055'; // Contrasting neon-red for enemies
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);

        // Add a "terminal" eye to the invader
        ctx.beginPath();
        ctx.moveTo(this.x + 10, this.y + 10);
        ctx.lineTo(this.x + 20, this.y + 10);
        ctx.stroke();
    }
}

// Grid Settings
const invaderRows = 4;
const invaderCols = 8;
let invaders = [];
let invaderDirection = 1; // 1 for right, -1 for left
let invaderSpeed = 1;

function createInvaders() {
    for (let row = 0; row < invaderRows; row++) {
        for (let col = 0; col < invaderCols; col++) {
            invaders.push(new Invader(col * 60 + 50, row * 40 + 50));
        }
    }
}

createInvaders();

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
        ctx.lineWidth = 2;
        ctx.shadowBlur = 15;
        ctx.shadowColor = THEME_CYAN;

        ctx.beginPath();
        // Central Hull
        ctx.moveTo(this.x + this.width / 2, this.y);
        ctx.lineTo(this.x + 10, this.y + this.height);
        ctx.lineTo(this.x + this.width - 10, this.y + this.height);
        ctx.closePath();

        // Side Wings/Thrusters
        ctx.moveTo(this.x + 10, this.y + 15);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.moveTo(this.x + this.width - 10, this.y + 15);
        ctx.lineTo(this.x + this.width, this.y + this.height);

        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    update(keys) {
        if ((keys['ArrowLeft'] || keys['KeyA']) && this.x > 0) this.x -= PLAYER_SPEED;
        if ((keys['ArrowRight'] || keys['KeyD']) && this.x < canvas.width - this.width) this.x += PLAYER_SPEED;
    }

    // 4. BUFFED MK-III: Modified Player.fire()
    fire() {
        const centerX = this.x + this.width / 2;
        if (this.weaponLevel === 1) {
            this.bullets.push(new Bullet(centerX, this.y));
        } else if (this.weaponLevel === 2) {
            this.bullets.push(new Bullet(centerX - 10, this.y));
            this.bullets.push(new Bullet(centerX + 10, this.y));
        } else if (this.weaponLevel === 3) {
            // AEGIS MK-III "ION BEAM"
            const beam = new Bullet(centerX, this.y);
            beam.isLaser = true; // Flag for different drawing
            beam.speed = 15;      // Nearly double the speed
            this.bullets.push(beam);
        }
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

    // 5. LASER DRAWING: Modified Bullet.draw()
    draw() {
        if (this.isLaser) {
            ctx.fillStyle = '#ffffff'; // White core for the laser
            ctx.shadowBlur = 15;
            ctx.shadowColor = THEME_CYAN;
            ctx.fillRect(this.x - 2, this.y, 4, 15); // Long beam shape
            ctx.shadowBlur = 0;
        } else {
            ctx.fillStyle = THEME_CYAN;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

const aegis = new Player();
const keys = {};

window.addEventListener('keydown', e => {
    keys[e.code] = true;
    // Single shot logic to prevent "laser beam" spam
    if (e.code === 'Space' && !e.repeat) aegis.fire();
});
window.addEventListener('keyup', e => keys[e.code] = false);

window.addEventListener('keydown', e => {
    if (gameOver && e.code === 'KeyR') {
        location.reload(); // Simple refresh to clear the engine state
    }
});

let gameOver = false;

function gameLoop() {
    if (gameOver) return; // Stop the loop if game is over

    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
   
    particles.forEach((p, index) => {
        p.update();
        p.draw();
        if (p.alpha <= 0) particles.splice(index, 1);
    });

    // Generate Thruster Trail
    if (!gameOver) {
        particles.push(new Particle(aegis.x + aegis.width / 2, aegis.y + aegis.height, THEME_CYAN));
    }

    aegis.update(keys);
    aegis.draw();

    // 3. LEVEL TRACKING: Inside the check for cleared wave
    const activeInvaders = invaders.filter(i => i.alive);
    if (activeInvaders.length === 0) {
        currentLevel++;
        levelEl.innerText = currentLevel.toString().padStart(2, '0');
        invaderSpeed += 0.5;
        createInvaders();
    }

    let edgeHit = false;
    invaders.forEach(invader => {
        if (!invader.alive) return;
        invader.x += invaderSpeed * invaderDirection;

        // Check if enemies reached the bottom (Defender's line)
        if (invader.y + invader.height >= aegis.y) {
            triggerGameOver();
        }

        if (invader.x + invader.width > canvas.width || invader.x < 0) edgeHit = true;
        invader.draw();
    });

    if (edgeHit) {
        invaderDirection *= -1;
        invaders.forEach(invader => invader.y += 20); // Drop down
    }

    handleCollisions();
    
    // Bullet Logic
    aegis.bullets.forEach((bullet, index) => {
        bullet.update();
        bullet.draw();
        if (bullet.y < 0) aegis.bullets.splice(index, 1);
    });

    function handleCollisions() {
        aegis.bullets.forEach((bullet, bIndex) => {
            invaders.forEach((invader) => {
                if (invader.alive &&
                    bullet.x > invader.x &&
                    bullet.x < invader.x + invader.width &&
                    bullet.y > invader.y &&
                    bullet.y < invader.y + invader.height) {

                    invader.alive = false;
                    aegis.bullets.splice(bIndex, 1);

                    // Update HUD Score
                    const currentScore = parseInt(document.getElementById('score-val').innerText);
                    document.getElementById('score-val').innerText = (currentScore + 100).toString().padStart(4, '0');
                    if (currentScore >= 1000 && aegis.weaponLevel === 1) {
                        aegis.weaponLevel = 2;
                        weaponEl.innerText = "AEGIS MK-II (SPREAD)";
                    } else if (currentScore >= 2500 && aegis.weaponLevel === 2) {
                        aegis.weaponLevel = 3;
                        weaponEl.innerText = "AEGIS MK-III (LASER)";
                    }
                }
            });
        });  
    }

    requestAnimationFrame(gameLoop);
}

function triggerGameOver() {
    gameOver = true;
    const finalScore = parseInt(scoreEl.innerText);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ff0055';
    ctx.font = '40px Courier New';
    ctx.fillText("MISSION FAILED", canvas.width / 2 - 160, canvas.height / 2);

    ctx.fillStyle = THEME_CYAN;
    ctx.font = '20px Courier New';
    ctx.fillText("PRESS [R] TO REBOOT SYSTEM", canvas.width / 2 - 140, canvas.height / 2 + 50);

    saveGame(finalScore, weaponEl.innerText);
    setTimeout(showScoreboard, 2000); // Show scores after a short delay
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