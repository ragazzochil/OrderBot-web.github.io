/**
 * STELLAR COLLECTOR - Versione Pulita e Definitiva
 * Minigioco Galaxy World con Webhook Discord
 */

const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1511405598489575657/kfAincCiahPdZJjkF48XjUFPoeMlc9IhR6V575DS6eWllmXgXH7iWfZ1PnYxja1kgl5T';

class StellarCollector {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.resize();

        this.running = false;
        this.score = 0;
        this.credits = 0;

        this.player = { x: this.width / 2, y: this.height - 90, size: 20 };
        this.items = [];
        this.asteroids = [];
        this.particles = [];

        this.keys = {};
        this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

        this.spawnTimer = 0;
        this.difficulty = 1;
        this.message = '';
        this.messageTimer = 0;

        this._initControls();
        this.start();
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    _initControls() {
        window.addEventListener('keydown', e => this.keys[e.code] = true);
        window.addEventListener('keyup', e => this.keys[e.code] = false);

        this.canvas.addEventListener('touchstart', e => this._handleTouch(e), { passive: false });
        this.canvas.addEventListener('touchmove', e => this._handleTouch(e), { passive: false });
        this.canvas.addEventListener('mousedown', e => this._handleMouse(e));
        this.canvas.addEventListener('mousemove', e => this._handleMouse(e));
        window.addEventListener('resize', () => this.resize());
    }

    _handleTouch(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.player.x = e.touches[0].clientX - rect.left;
    }

    _handleMouse(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.player.x = e.clientX - rect.left;
    }

    spawnItem() {
        const isRare = Math.random() < 0.09;
        this.items.push({
            x: Math.random() * (this.width - 60) + 30,
            y: -30,
            type: isRare ? 'star' : 'coin',
            size: isRare ? 15 : 12,
            value: isRare ? 130 : 25,
            vy: isRare ? 2.6 : 3.8
        });
    }

    spawnAsteroid() {
        this.asteroids.push({
            x: Math.random() * (this.width - 50) + 25,
            y: -40,
            size: 16 + Math.random() * 14,
            vy: 2.4 + this.difficulty * 0.4,
            vx: (Math.random() - 0.5) * 1.8
        });
    }

    update() {
        if (!this.running) return;

        if (this.keys['ArrowLeft'] || this.keys['KeyA']) this.player.x -= 7;
        if (this.keys['ArrowRight'] || this.keys['KeyD']) this.player.x += 7;
        this.player.x = Math.max(30, Math.min(this.width - 30, this.player.x));

        this.spawnTimer++;
        if (this.spawnTimer > 18) {
            this.spawnItem();
            if (Math.random() < 0.65) this.spawnAsteroid();
            this.spawnTimer = 0;
        }

        // Items
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            item.y += item.vy;

            if (Math.hypot(item.x - this.player.x, item.y - this.player.y) < this.player.size + item.size) {
                this.score += item.value;
                this.credits += Math.floor(item.value / 2);

                if (item.type === 'star') {
                    this.message = `⭐ STELLA RARA! +${item.value} punti`;
                    this.messageTimer = 85;
                    this._sendDiscordWebhook(item.value);
                    this._createParticles(item.x, item.y, '#f9ca24', 40);
                } else {
                    this._createParticles(item.x, item.y, '#f9ca24', 10);
                }
                this.items.splice(i, 1);
                continue;
            }
            if (item.y > this.height + 20) this.items.splice(i, 1);
        }

        // Asteroidi
        for (let i = this.asteroids.length - 1; i >= 0; i--) {
            const ast = this.asteroids[i];
            ast.y += ast.vy;
            ast.x += ast.vx;

            if (Math.hypot(ast.x - this.player.x, ast.y - this.player.y) < this.player.size + ast.size - 6) {
                this.running = false;
                this.message = `Game Over! Punteggio: ${this.score}`;
                this.messageTimer = 180;
                return;
            }
            if (ast.y > this.height + 40) this.asteroids.splice(i, 1);
        }

        this._updateParticles();
        if (this.messageTimer > 0) this.messageTimer--;
        if (this.score > this.difficulty * 200) this.difficulty = Math.min(7, this.difficulty + 1);
    }

    _createParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.8 + Math.random() * 3.5;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1,
                life: 35,
                color
            });
        }
    }

    _updateParticles() {
        this.particles = this.particles.filter(p => {
            p.x += p.vx; p.y += p.vy; p.vy += 0.09; p.life--;
            return p.life > 0;
        });
    }

    async _sendDiscordWebhook(points) {
        if (!DISCORD_WEBHOOK_URL) return;
        try {
            const name = (document.getElementById('player-name')?.value || 'GIOCATORE').toUpperCase().slice(0,12);
            await fetch(DISCORD_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: `🌟 **${name}** ha trovato una **STELLA RARA** in Stellar Collector! (+${points} punti)`
                })
            });
        } catch (_) {}
    }

    draw() {
        const c = this.ctx;
        c.fillStyle = '#0a0c14';
        c.fillRect(0, 0, this.width, this.height);

        c.fillStyle = '#ffffff';
        for (let i = 0; i < 70; i++) {
            const x = (i * 67) % this.width;
            const y = (i * 53) % (this.height * 0.65);
            c.fillRect(x, y, 1.8, 1.8);
        }

        // Player
        c.fillStyle = '#74b9ff';
        c.beginPath();
        c.moveTo(this.player.x, this.player.y - 20);
        c.lineTo(this.player.x - 18, this.player.y + 14);
        c.lineTo(this.player.x + 18, this.player.y + 14);
        c.closePath();
        c.fill();

        // Items
        this.items.forEach(item => {
            c.fillStyle = item.type === 'star' ? '#f9ca24' : '#f1c40f';
            c.beginPath();
            c.arc(item.x, item.y, item.size, 0, Math.PI * 2);
            c.fill();
        });

        // Asteroidi
        this.asteroids.forEach(ast => {
            c.fillStyle = '#7f8c8d';
            c.beginPath();
            c.arc(ast.x, ast.y, ast.size, 0, Math.PI * 2);
            c.fill();
        });

        // Particelle
        this.particles.forEach(p => {
            c.globalAlpha = p.life / 35;
            c.fillStyle = p.color;
            c.beginPath();
            c.arc(p.x, p.y, 3, 0, Math.PI * 2);
            c.fill();
        });
        c.globalAlpha = 1;

        // HUD
        c.fillStyle = 'rgba(15,18,28,0.9)';
        c.fillRect(0, 0, this.width, 48);
        c.fillStyle = '#f9ca24';
        c.font = 'bold 18px Inter, system-ui';
        c.fillText(`Punti: ${this.score}`, 20, 30);
        c.fillStyle = '#55efc4';
        c.fillText(`Crediti: ${this.credits}`, this.width - 160, 30);

        if (this.message && this.messageTimer > 0) {
            c.fillStyle = this.message.includes('RARA') ? '#f9ca24' : '#fff';
            c.font = 'bold 17px Inter, system-ui';
            c.textAlign = 'center';
            c.fillText(this.message, this.width / 2, 85);
        }
    }

    loop() {
        if (!this.running) return;
        this.update();
        this.draw();
        requestAnimationFrame(() => this.loop());
    }

    start() {
        this.running = true;
        this.player.x = this.width / 2;
        this.loop();
    }
}

// Boot
let gameInstance = null;

function startGame() {
    const container = document.getElementById('game-container');
    if (container) container.classList.add('active');
    if (!gameInstance) gameInstance = new StellarCollector('game-canvas');
}

window.addEventListener('load', () => {
    if (document.getElementById('game-canvas')) startGame();
});
