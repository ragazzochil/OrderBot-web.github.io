/**
 * MACCHINA A GANCIO ARCADE v2 - MOBILE OPTIMIZED
 * Claw Machine Game - Vinci coins e RUOLI CUSTOM!
 */

const DISCORD_WEBHOOK_URL = 'https://discord.com/api/v10/webhooks/1511405598489575657/kfAincCiahPdZJjkF48XjUFPoeMlc9IhR6V575DS6eWllmXgXH7iWfZ1PnYxja1kgl5T';

class ClawMachineGame {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d', { alpha: true });
        
        this.resize();
        
        // Game State
        this.running = false;
        this.credits = 1200;
        this.score = 0;
        this.totalWon = 0;
        this.plays = 0;
        this.attemptsLeft = 5;
        this.maxAttempts = 5;
        this.message = '';
        this.messageTimer = 0;
        this.showGuide = false;
        this.showDiscordPrompt = false;
        this._btnPressed = false;

        // Claw
        this.claw = {
            x: 300,
            targetX: 300,
            speed: 5.5,
            state: 'IDLE',
            armLength: 40,
            maxArmLength: 280,
            dropSpeed: 6.5,
            retractSpeed: 4.2,
            grabOffset: 0
        };

        this.prizes = [];
        this.particles = [];
        this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        this.mobileKeys = {};
        this.keys = {};

        // Dynamic machine size (responsive)
        this._updateMachineSize();

        this._genPrizes();
        this._initControls();
        this.start();
    }

    _updateMachineSize() {
        const minSide = Math.min(this.width, this.height);
        this.scale = Math.max(0.65, Math.min(1, minSide / 720));

        this.machine = {
            width: Math.floor(620 * this.scale),
            height: Math.floor(520 * this.scale),
            left: Math.floor((this.width - 620 * this.scale) / 2),
            top: Math.floor(40 * this.scale),
            glassLeft: Math.floor((this.width - 580 * this.scale) / 2),
            glassTop: Math.floor(95 * this.scale),
            glassW: Math.floor(580 * this.scale),
            glassH: Math.floor(340 * this.scale)
        };
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this._updateMachineSize();
    }

    _genPrizes() {
        this.prizes = [];
        const types = [
            { name: 'Pelouche Blu', value: 25, color: '#74b9ff', r: 18, rare: false },
            { name: 'Pelouche Verde', value: 30, color: '#55efc4', r: 17, rare: false },
            { name: 'Pelouche Rosa', value: 35, color: '#fd79a8', r: 19, rare: false },
            { name: 'Moneta Oro', value: 50, color: '#f9ca24', r: 14, rare: false },
            { name: 'Pelouche Raro', value: 80, color: '#a29bfe', r: 20, rare: true },
            { name: 'Tesoro', value: 120, color: '#e17055', r: 16, rare: true },
        ];

        for (let i = 0; i < 20; i++) {
            const t = types[Math.floor(Math.random() * types.length)];
            this.prizes.push({
                ...t,
                x: this.machine.glassLeft + 50 + Math.random() * (this.machine.glassW - 100),
                y: this.machine.glassTop + 130 + Math.random() * (this.machine.glassH - 180),
                vx: (Math.random() - 0.5) * 0.9,
                vy: (Math.random() - 0.5) * 0.7,
                grabbed: false,
                id: i
            });
        }
    }

    _initControls() {
        window.addEventListener('keydown', e => {
            this.keys[e.code] = true;
            if (e.code === 'Slash' || e.key === '?') this.showGuide = !this.showGuide;
            if (e.code === 'Escape') this.showGuide = false;
            if ((e.code === 'Space' || e.code === 'Enter') && this.claw.state === 'IDLE') this._startDrop();
            if (e.code === 'KeyR' && this.claw.state === 'IDLE') this._resetMachine();
        });
        window.addEventListener('keyup', e => this.keys[e.code] = false);

        this.canvas.addEventListener('mousedown', e => this._handlePointer(e));
        this.canvas.addEventListener('touchstart', e => this._handlePointer(e), { passive: false });
        window.addEventListener('resize', () => this.resize());
    }

    _handlePointer(e) {
        if (!this.running) return;

        const rect = this.canvas.getBoundingClientRect();
        const mx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
        const my = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;

        // Discord prompt
        if (this.showDiscordPrompt) {
            const pw = Math.min(620, this.width * 0.9);
            const px = (this.width - pw) / 2;
            const py = this.height * 0.25;
            const claimY = py + 160;

            if (mx > px + 40 && mx < px + pw - 40 && my > claimY && my < claimY + 60) {
                this.attemptsLeft = this.maxAttempts;
                this.showDiscordPrompt = false;
                this.message = 'Grazie! +5 tentativi sbloccati ❤️';
                this.messageTimer = 120;
            }
            return;
        }

        // Main Launch Button (bigger on mobile)
        const btnW = this.isTouchDevice ? 240 : 210;
        const btnH = this.isTouchDevice ? 95 : 85;
        const btnX = this.width - btnW - 30;
        const btnY = this.height - btnH - 40;

        if (mx > btnX && mx < btnX + btnW && my > btnY && my < btnY + btnH) {
            this._btnPressed = true;
            setTimeout(() => this._btnPressed = false, 130);
            if (this.claw.state === 'IDLE') this._startDrop();
            return;
        }

        // Ricarica button
        const rX = btnX - 140;
        const rY = btnY + 20;
        if (mx > rX && mx < rX + 120 && my > rY && my < rY + 60) {
            this._resetMachine();
            return;
        }

        // Touch zones for movement
        if (this.claw.state === 'IDLE') {
            if (mx < this.width * 0.2) {
                this.mobileKeys.left = true;
                setTimeout(() => this.mobileKeys.left = false, 180);
            } else if (mx > this.width * 0.8) {
                this.mobileKeys.right = true;
                setTimeout(() => this.mobileKeys.right = false, 180);
            } else if (my > this.height * 0.6) {
                this._startDrop();
            }
        }
    }

    _startDrop() {
        if (this.credits < 200 || this.claw.state !== 'IDLE' || this.attemptsLeft <= 0) {
            if (this.attemptsLeft <= 0) this.showDiscordPrompt = true;
            return;
        }
        this.credits -= 200;
        this.plays++;
        this.attemptsLeft--;
        this.claw.state = 'DROPPING';
        this.claw.armLength = 50;
        this.claw.grabOffset = 0;
    }

    _resetMachine() {
        if (this.claw.state !== 'IDLE') return;
        this._genPrizes();
        this.message = 'Macchina ricaricata!';
        this.messageTimer = 80;
    }

    update() {
        if (!this.running) return;

        const mk = this.mobileKeys;

        // Movement
        if (this.claw.state === 'IDLE' || this.claw.state === 'MOVING') {
            let move = 0;
            if (this.keys['ArrowLeft'] || this.keys['KeyA'] || mk.left) move -= 1;
            if (this.keys['ArrowRight'] || this.keys['KeyD'] || mk.right) move += 1;

            if (move !== 0) {
                this.claw.state = 'MOVING';
                this.claw.targetX = Math.max(
                    this.machine.glassLeft + 40,
                    Math.min(this.machine.glassLeft + this.machine.glassW - 40, this.claw.x + move * this.claw.speed)
                );
            } else if (this.claw.state === 'MOVING') {
                this.claw.state = 'IDLE';
            }
        }

        if (this.claw.state === 'IDLE' || this.claw.state === 'MOVING') {
            this.claw.x += (this.claw.targetX - this.claw.x) * 0.2;
        }

        // Claw states
        switch (this.claw.state) {
            case 'DROPPING':
                this.claw.armLength += this.claw.dropSpeed;
                if (this.claw.armLength >= this.claw.maxArmLength) {
                    this.claw.armLength = this.claw.maxArmLength;
                    this.claw.state = 'GRABBING';
                    this.claw.grabOffset = 14;
                    setTimeout(() => this._tryGrab(), 160);
                }
                break;

            case 'GRABBING':
                this.claw.grabOffset = Math.max(0, this.claw.grabOffset - 1.5);
                if (this.claw.grabOffset <= 0) this.claw.state = 'RETRACTING';
                break;

            case 'RETRACTING':
                this.claw.armLength -= this.claw.retractSpeed;
                if (this.claw.armLength <= 50) {
                    this.claw.armLength = 50;
                    this._releasePrize();
                    this.claw.state = 'IDLE';
                }
                break;
        }

        // Prizes physics
        this.prizes.forEach(p => {
            if (p.grabbed) {
                p.x = this.claw.x;
                p.y = this.machine.top + 70 + this.claw.armLength - 8;
            } else {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.04;
                if (p.y > this.machine.glassTop + this.machine.glassH - 30) {
                    p.y = this.machine.glassTop + this.machine.glassH - 30;
                    p.vy *= -0.4;
                }
                p.vx *= 0.98;
                p.vy *= 0.98;
            }
        });

        this._updateParticles();
        if (this.messageTimer > 0) this.messageTimer--;
    }

    _tryGrab() {
        let closest = null;
        let minDist = 999;
        const cx = this.claw.x;
        const cy = this.machine.top + 70 + this.claw.armLength;

        this.prizes.forEach(p => {
            if (p.grabbed) return;
            const dist = Math.hypot(p.x - cx, p.y - cy);
            if (dist < minDist && dist < p.r + 32) {
                minDist = dist;
                closest = p;
            }
        });

        if (closest) {
            closest.grabbed = true;
            this._winPrize(closest);
        } else {
            this._particle(cx, cy, 0, 3, '#888', 20);
        }
    }

    _winPrize(prize) {
        const isSpecial = prize.rare && Math.random() < 0.4;
        let amount = prize.value;
        let msg = `Hai vinto: ${prize.name} (+${amount} coins)`;

        if (isSpecial || Math.random() < 0.07) {
            amount = 250;
            msg = '🎉 HAI VINTO IL RUOLO CUSTOM!';
            this._sendWebhookLog(prize.name);
        }

        this.credits += amount;
        this.score += Math.floor(amount * 0.7);
        this.totalWon += amount;
        this.message = msg;
        this.messageTimer = 150;

        const col = isSpecial ? '#f9ca24' : prize.color;
        for (let i = 0; i < (isSpecial ? 50 : 25); i++) {
            const a = Math.random() * Math.PI * 2;
            const spd = 2 + Math.random() * 4;
            this._particle(this.claw.x, this.machine.top + 90 + this.claw.armLength,
                Math.cos(a) * spd, Math.sin(a) * spd - 2, col, 45);
        }

        setTimeout(() => {
            this.prizes = this.prizes.filter(p => p.id !== prize.id);
            if (this.prizes.length < 7) this._genPrizes();
        }, 700);
    }

    _releasePrize() {
        this.prizes.forEach(p => {
            if (p.grabbed) {
                p.grabbed = false;
                p.vx = (Math.random() - 0.5) * 4;
                p.vy = -2;
            }
        });
    }

    _particle(x, y, vx, vy, color, life) {
        this.particles.push({ x, y, vx, vy, color, life, maxLife: life });
    }

    _updateParticles() {
        this.particles = this.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.1;
            p.life--;
            return p.life > 0;
        });
    }

    async _sendWebhookLog(prizeName) {
        if (!DISCORD_WEBHOOK_URL) return;
        try {
            const name = (document.getElementById('player-name')?.value || 'GIOCATORE').slice(0,12).toUpperCase();
            await fetch(DISCORD_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: `🎰 **${name}** ha vinto il **RUOLO CUSTOM** nella Macchina a Gancio!`
                })
            });
        } catch (_) {}
    }

    draw() {
        const c = this.ctx;
        c.fillStyle = '#0a0c14';
        c.fillRect(0, 0, this.width, this.height);

        // Cabinet
        c.fillStyle = '#1f2533';
        c.fillRect(this.machine.left, this.machine.top - 20, this.machine.width, this.machine.height + 60);
        c.strokeStyle = '#f9ca24';
        c.lineWidth = 5;
        c.strokeRect(this.machine.left, this.machine.top - 20, this.machine.width, this.machine.height + 60);

        // Glass
        c.fillStyle = 'rgba(15,20,35,0.4)';
        c.fillRect(this.machine.glassLeft, this.machine.glassTop, this.machine.glassW, this.machine.glassH);
        c.strokeStyle = 'rgba(249,202,36,0.7)';
        c.lineWidth = 3;
        c.strokeRect(this.machine.glassLeft, this.machine.glassTop, this.machine.glassW, this.machine.glassH);

        // Floor
        c.fillStyle = '#2d3446';
        c.fillRect(this.machine.glassLeft + 10, this.machine.glassTop + this.machine.glassH - 28, this.machine.glassW - 20, 25);

        // Prizes
        this.prizes.forEach(p => {
            c.save();
            c.translate(p.x, p.y);
            if (p.grabbed) c.rotate(Math.sin(Date.now() / 200) * 0.1);

            c.fillStyle = 'rgba(0,0,0,0.3)';
            c.beginPath();
            c.ellipse(3, p.r + 5, p.r * 0.85, 5, 0, 0, Math.PI * 2);
            c.fill();

            c.fillStyle = p.color;
            c.beginPath();
            c.arc(0, 0, p.r, 0, Math.PI * 2);
            c.fill();

            c.fillStyle = 'rgba(255,255,255,0.4)';
            c.beginPath();
            c.arc(-p.r * 0.3, -p.r * 0.3, p.r * 0.4, 0, Math.PI * 2);
            c.fill();

            c.restore();
        });

        // Claw
        const baseY = this.machine.top + 50;
        c.strokeStyle = '#ddd';
        c.lineWidth = 6;
        c.beginPath();
        c.moveTo(this.claw.x, baseY);
        c.lineTo(this.claw.x, baseY + this.claw.armLength);
        c.stroke();

        const cy = baseY + this.claw.armLength;
        c.fillStyle = '#f9ca24';
        c.fillRect(this.claw.x - 16, cy - 7, 32, 14);

        const open = this.claw.state === 'GRABBING' ? this.claw.grabOffset : 0;
        c.strokeStyle = '#eee';
        c.lineWidth = 5;
        c.beginPath();
        c.moveTo(this.claw.x - 10, cy + 5);
        c.lineTo(this.claw.x - 18 - open, cy + 24);
        c.stroke();
        c.beginPath();
        c.moveTo(this.claw.x + 10, cy + 5);
        c.lineTo(this.claw.x + 18 + open, cy + 24);
        c.stroke();

        // Particles
        this.particles.forEach(p => {
            c.globalAlpha = p.life / p.maxLife;
            c.fillStyle = p.color;
            c.beginPath();
            c.arc(p.x, p.y, 3, 0, Math.PI * 2);
            c.fill();
        });
        c.globalAlpha = 1;

        this._drawHUD(c);

        // Messages
        if (this.message && this.messageTimer > 0) {
            const alpha = Math.min(1, this.messageTimer / 40);
            c.fillStyle = `rgba(10,12,20,${0.9 * alpha})`;
            c.fillRect(this.width/2 - 280, 70, 560, 70);
            c.strokeStyle = this.message.includes('RUOLO') ? '#f9ca24' : '#55efc4';
            c.lineWidth = 3;
            c.strokeRect(this.width/2 - 280, 70, 560, 70);

            c.fillStyle = this.message.includes('RUOLO') ? '#f9ca24' : '#fff';
            c.font = 'bold 22px Inter, system-ui';
            c.textAlign = 'center';
            c.fillText(this.message, this.width/2, 105);
        }

        if (this.showGuide) this._drawGuide(c);

        // Discord Prompt
        if (this.showDiscordPrompt) {
            const pw = Math.min(580, this.width * 0.92);
            const px = (this.width - pw) / 2;
            const py = this.height * 0.22;

            c.fillStyle = 'rgba(10,12,20,0.97)';
            c.fillRect(px, py, pw, 260);
            c.strokeStyle = '#f9ca24';
            c.lineWidth = 4;
            c.strokeRect(px, py, pw, 260);

            c.fillStyle = '#f9ca24';
            c.font = 'bold 22px Inter, system-ui';
            c.textAlign = 'center';
            c.fillText('TENTATIVI ESAURITI', this.width/2, py + 40);

            c.fillStyle = '#ddd';
            c.font = '15px Inter, system-ui';
            c.fillText('Scrivi almeno 8 messaggi su Discord', this.width/2, py + 80);
            c.fillText('per sbloccare altri 5 tentativi', this.width/2, py + 102);

            c.fillStyle = '#55efc4';
            c.fillRect(px + 50, py + 140, pw - 100, 55);
            c.strokeStyle = '#fff';
            c.lineWidth = 3;
            c.strokeRect(px + 50, py + 140, pw - 100, 55);

            c.fillStyle = '#111';
            c.font = 'bold 16px Inter, system-ui';
            c.fillText('HO SCRITTO I MESSAGGI!', this.width/2, py + 175);
        }
    }

    _drawHUD(c) {
        c.fillStyle = 'rgba(15,18,28,0.95)';
        c.fillRect(0, 0, this.width, 60);
        c.strokeStyle = 'rgba(249,202,36,0.3)';
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(0, 60);
        c.lineTo(this.width, 60);
        c.stroke();

        c.fillStyle = '#f9ca24';
        c.font = 'bold 22px Inter, system-ui';
        c.textAlign = 'left';
        c.fillText('🎰 MACCHINA A GANCIO', 25, 38);

        c.fillStyle = '#55efc4';
        c.font = 'bold 18px Inter, system-ui';
        c.fillText(`$ ${this.credits}`, this.width - 180, 38);

        const attColor = this.attemptsLeft > 2 ? '#55efc4' : this.attemptsLeft > 0 ? '#f9ca24' : '#d63031';
        c.fillStyle = attColor;
        c.font = 'bold 15px Inter, system-ui';
        c.fillText(`Tentativi: ${this.attemptsLeft}/${this.maxAttempts}`, this.width - 180, 55);
    }

    _drawGuide(c) {
        // Simple guide overlay
        const gw = Math.min(580, this.width * 0.9);
        const gx = (this.width - gw) / 2;
        const gy = this.height * 0.15;

        c.fillStyle = 'rgba(10,12,20,0.96)';
        c.fillRect(gx, gy, gw, 320);
        c.strokeStyle = '#a29bfe';
        c.lineWidth = 3;
        c.strokeRect(gx, gy, gw, 320);

        c.fillStyle = '#a29bfe';
        c.font = 'bold 22px Inter, system-ui';
        c.textAlign = 'center';
        c.fillText('COME SI GIOCA', this.width/2, gy + 35);

        c.fillStyle = '#ddd';
        c.font = '15px Inter, system-ui';
        c.textAlign = 'left';
        const lines = [
            '• Muovi il gancio con ← → o toccando i lati',
            '• Tocca il pulsante giallo per lanciare',
            '• Il gancio si chiude da solo',
            '• Vinci coins e ruoli custom!',
            '• Ogni lancio costa 200 crediti',
            '• R = Ricarica la macchina'
        ];
        lines.forEach((line, i) => c.fillText(line, gx + 30, gy + 75 + i * 28));

        c.fillStyle = '#888';
        c.font = '14px Inter, system-ui';
        c.textAlign = 'center';
        c.fillText('Premi ? o ESC per chiudere', this.width/2, gy + 295);
    }

    loop() {
        if (!this.running) return;
        this.update();
        this.draw();
        requestAnimationFrame(() => this.loop());
    }

    start() {
        this.running = true;
        this.claw.x = this.machine.glassLeft + this.machine.glassW / 2;
        this.claw.targetX = this.claw.x;
        this.loop();
    }
}

// Boot
let gameInstance = null;

function startGame() {
    const container = document.getElementById('game-container');
    if (container) container.classList.add('active');
    if (!gameInstance) gameInstance = new ClawMachineGame('game-canvas');
}

window.addEventListener('load', () => {
    if (document.getElementById('game-canvas')) startGame();
});
