/**
 * STELLAR COLLECTOR v1
 * Minigioco Galaxy World - Bello, Funzionante e con Webhook Discord
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
        this.highScore = 0;

        this.player = {
            x: this.width / 2,
            y: this.height - 80,
            size: 18,
            speed: 7
        };

        this.items = [];      // monete e stelle
        this.asteroids = [];
        this.particles = [];

        this.keys = {};
        this.mobileKeys = {};
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
        window.addEventListener('keydown', e => {
            this.keys[e.code] = true;
            if (e.code === 'Escape') this.running = false;
        });
        window.addEventListener('keyup', e => this.keys[e.code] = false);

        this.canvas.addEventListener('touchstart', e => this._handleTouch(e), { passive: false });
        this.canvas.addEventListener('touchmove', e => this._handleTouch(e), { passive: false });
        this.canvas.addEventListener('mousedown', e => this._handleMouse(e));
        this.canvas.addEventListener('mousemove', e => this._handleMouse(e));

        window.addEventListener('resize', () => this.resize());
    }

    _handleTouch(e) {
        if (!this.running) return;
        const rect = this.canvas.getBoundingClientRect();
        const touchX = e.touches[0].clientX - rect.left;
        this.player.x = Math.max(30, Math.min(this.width - 30, touchX));
    }

    _handleMouse(e) {
        if (!this.running) return;
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        this.player.x = Math.max(30, Math.min(this.width - 30, mouseX));
    }

    spawnItem() {
        const isRare = Math.random() < 0.08; // 8% chance di stella rara

        if (isRare) {
            this.items.push({
                x: Math.random() * (this.width - 60) + 30,
                y: -30,
                type: 'star',
                size: 14,
                value: 120,
                vy: 2.8 + this.difficulty * 0.3
            });
        } else {
            this.items.push({
                x: Math.random() * (this.width - 60) + 30,
                y: -30,
                type: 'coin',
                size: 12,
                value: 25,
                vy: 3.5 + this.difficulty * 0.4
            });
        }
    }

    spawnAsteroid() {
        this.asteroids.push({
            x: Math.random() * (this.width - 50) + 25,
            y: -40,
            size: 18 + Math.random() * 12,
            vy: 2.2 + this.difficulty * 0.5,
            vx: (Math.random() - 0.5) * 1.5
        });
    }

    update() {
        if (!this.running) return;

        // Movimento navicella
        if (this.keys['ArrowLeft'] || this.keys['KeyA']) this.player.x -= this.player.speed;
        if (this.keys['ArrowRight'] || this.keys['KeyD']) this.player.x += this.player.speed;

        this.player.x = Math.max(30, Math.min(this.width - 30, this.player.x));

        // Spawn oggetti
        this.spawnTimer++;
        if (this.spawnTimer > 22 - this.difficulty) {
            this.spawnItem();
            if (Math.random() < 0.6) this.spawnAsteroid();
            this.spawnTimer = 0;
        }

        // Aggiorna items (monete e stelle)
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            item.y += item.vy;

            // Collisione con player
            const dx = item.x - this.player.x;
            const dy = item.y - this.player.y;
            if (Math.sqrt(dx * dx + dy * dy) < this.player.size + item.size) {
                this.score += item.value;
                this.credits += Math.floor(item.value / 2);

                if (item.type === 'star') {
                    this.message = `⭐ STELLA RARA! +${item.value} punti`;
                    this.messageTimer = 90;
                    this._sendDiscordWebhook(item.value);
                    this._createParticles(item.x, item.y, '#f9ca24', 35);
                } else {
                    this._createParticles(item.x, item.y, '#f9ca24', 12);
                }

                this.items.splice(i, 1);
                continue;
            }

            if (item.y > this.height + 20) {
                this.items.splice(i, 1);
            }
        }

        // Aggiorna asteroidi
        for (let i = this.asteroids.length - 1; i >= 0; i--) {
            const ast = this.asteroids[i];
            ast.y += ast.vy;
            ast.x += ast.vx;

            // Collisione con player
            const dx = ast.x - this.player.x;
            const dy = ast.y - this.player.y;
            if (Math.sqrt(dx * dx + dy * dy) < this.player.size + ast.size - 5) {
                this.running = false;
                this.message = `Game Over! Punteggio: ${this.score}`;
                this.messageTimer = 200;
                return;
            }

            if (ast.y > this.height + 30) {
                this.asteroids.splice(i, 1);
            }
        }

        this._updateParticles();

        // Difficoltà progressiva
        if (this.score > this.difficulty * 180) {
            this.difficulty = Math.min(8, this.difficulty + 1);
        }

        if (this.messageTimer > 0) this.messageTimer--;
    }

    _createParticles(x, y, color, amount) {
        for (let i = 0; i < amount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.5 + Math.random() * 3;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1,
                life: 30 + Math.random() * 20,
                color
            });
        }
    }

    _updateParticles() {
        this.particles = this.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.08;
            p.life--;
            return p.life > 0;
        });
    }

    async _sendDiscordWebhook(points) {
        if (!DISCORD_WEBHOOK_URL) return;

        try {
            const playerName = (document.getElementById('player-name')?.value || 'GIOCATORE').toUpperCase().slice(0,12);

            await fetch(DISCORD_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: `🌟 **${playerName}** ha trovato una **STELLA RARA** in Stellar Collector! (+${points} punti)`
                })
            });
        } catch (_) {}
    }

    draw() {
        const c = this.ctx;
        c.fillStyle = '#0a0c14';
        c.fillRect(0, 0, this.width, this.height);

        // Sfondo stellato semplice
        c.fillStyle = '#ffffff';
        for (let i = 0; i < 60; i++) {
            const x = (i * 73) % this.width;
            const y = (i * 47) % (this.height * 0.7);
            c.fillRect(x, y, 1.5, 1.5);
        }

        // Player (navicella)
        c.fillStyle = '#74b9ff';
        c.beginPath();
        c.moveTo(this.player.x, this.player.y - 18);
        c.lineTo(this.player.x - 16, this.player.y + 12);
        c.lineTo(this.player.x + 16, this.player.y + 12);
        c.closePath();
        c.fill();

        c.fillStyle = '#0984e3';
        c.fillRect(this.player.x - 6, this.player.y - 5, 12, 8);

        // Items (monete e stelle)
        this.items.forEach(item => {
            if (item.type === 'star') {
                c.fillStyle = '#f9ca24';
                c.beginPath();
                c.arc(item.x, item.y, item.size, 0, Math.PI * 2);
                c.fill();
                c.fillStyle = '#fff';
                c.beginPath();
                c.arc(item.x - 4, item.y - 4, 4, 0, Math.PI * 2);
                c.fill();
            } else {
                c.fillStyle = '#f9ca24';
                c.beginPath();
                c.arc(item.x, item.y, item.size, 0, Math.PI * 2);
                c.fill();
            }
        });

        // Asteroidi
        this.asteroids.forEach(ast => {
            c.fillStyle = '#636e72';
            c.beginPath();
            c.arc(ast.x, ast.y, ast.size, 0, Math.PI * 2);
            c.fill();
            c.fillStyle = '#2d3436';
            c.beginPath();
            c.arc(ast.x - 5, ast.y - 5, ast.size * 0.5, 0, Math.PI * 2);
            c.fill();
        });

        // Particles
        this.particles.forEach(p => {
            c.globalAlpha = p.life / 40;
            c.fillStyle = p.color;
            c.beginPath();
            c.arc(p.x, p.y, 3, 0, Math.PI * 2);
            c.fill();
        });
        c.globalAlpha = 1;

        // HUD
        c.fillStyle = 'rgba(15,18,28,0.9)';
        c.fillRect(0, 0, this.width, 50);

        c.fillStyle = '#f9ca24';
        c.font = 'bold 20px Inter, system-ui';
        c.fillText(`Punti: ${this.score}`, 20, 32);

        c.fillStyle = '#55efc4';
        c.fillText(`Crediti: ${this.credits}`, this.width - 180, 32);

        // Messaggio
        if (this.message && this.messageTimer > 0) {
            c.fillStyle = this.message.includes('RARA') ? '#f9ca24' : '#fff';
            c.font = 'bold 18px Inter, system-ui';
            c.textAlign = 'center';
            c.fillText(this.message, this.width / 2, 90);
        }

        c.textAlign = 'left';
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
