/**
 * MACCHINA A GANCIO v5 - MECCANISMO STABILE
 * Claw Machine con logica corretta e fluida
 */

const DISCORD_WEBHOOK_URL = 'https://discord.com/api/v10/webhooks/1511405598489575657/kfAincCiahPdZJjkF48XjUFPoeMlc9IhR6V575DS6eWllmXgXH7iWfZ1PnYxja1kgl5T';

class ClawMachineGame {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        this.resize();
        this._updateMachineSize();

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

        // Claw - Meccanismo migliorato
        this.claw = {
            x: 0,
            targetX: 0,
            speed: 6.5,
            state: 'IDLE',
            armLength: 50,
            maxArmLength: 255,
            dropSpeed: 7.5,
            retractSpeed: 4.8,
            grabOffset: 0
        };

        this.prizes = [];
        this.particles = [];
        this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        this.mobileKeys = {};
        this.keys = {};

        this._genPrizes();
        this._initControls();
        this.start();
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this._updateMachineSize();
    }

    _updateMachineSize() {
        const scale = Math.max(0.55, Math.min(1.05, Math.min(this.width, this.height) / 700));
        this.scale = scale;

        this.machine = {
            width: Math.floor(580 * scale),
            height: Math.floor(480 * scale),
            left: Math.floor((this.width - 580 * scale) / 2),
            top: Math.floor(35 * scale),
            glassLeft: Math.floor((this.width - 540 * scale) / 2),
            glassTop: Math.floor(80 * scale),
            glassW: Math.floor(540 * scale),
            glassH: Math.floor(320 * scale)
        };
    }

    _genPrizes() {
        this.prizes = [];
        const types = [
            { name: 'Pelouche Blu', value: 25, color: '#74b9ff', r: 16, rare: false },
            { name: 'Pelouche Verde', value: 30, color: '#55efc4', r: 15, rare: false },
            { name: 'Pelouche Rosa', value: 35, color: '#fd79a8', r: 17, rare: false },
            { name: 'Moneta Oro', value: 50, color: '#f9ca24', r: 12, rare: false },
            { name: 'Pelouche Raro', value: 80, color: '#a29bfe', r: 18, rare: true },
            { name: 'Tesoro', value: 120, color: '#e17055', r: 14, rare: true },
        ];

        for (let i = 0; i < 16; i++) {
            const t = types[Math.floor(Math.random() * types.length)];
            this.prizes.push({
                ...t,
                x: this.machine.glassLeft + 40 + Math.random() * (this.machine.glassW - 80),
                y: this.machine.glassTop + 110 + Math.random() * (this.machine.glassH - 150),
                vx: (Math.random() - 0.5) * 0.6,
                vy: (Math.random() - 0.5) * 0.5,
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

        if (this.showDiscordPrompt) {
            const pw = Math.min(500, this.width * 0.9);
            const px = (this.width - pw) / 2;
            const py = this.height * 0.18;
            if (mx > px + 40 && mx < px + pw - 40 && my > py + 140 && my < py + 195) {
                this.attemptsLeft = this.maxAttempts;
                this.showDiscordPrompt = false;
                this.message = 'Grazie! +5 tentativi sbloccati ❤️';
                this.messageTimer = 100;
            }
            return;
        }

        const btnW = this.isTouchDevice ? 220 : 190;
        const btnH = this.isTouchDevice ? 85 : 75;
        const btnX = this.width - btnW - 20;
        const btnY = this.height - btnH - 30;

        if (mx > btnX && mx < btnX + btnW && my > btnY && my < btnY + btnH) {
            this._btnPressed = true;
            setTimeout(() => this._btnPressed = false, 110);
            if (this.claw.state === 'IDLE') this._startDrop();
            return;
        }

        const rX = btnX - 125;
        const rY = btnY + 12;
        if (mx > rX && mx < rX + 110 && my > rY && my < rY + 52) {
            this._resetMachine();
            return;
        }

        if (this.claw.state === 'IDLE') {
            if (mx < this.width * 0.2) {
                this.mobileKeys.left = true;
                setTimeout(() => this.mobileKeys.left = false, 140);
            } else if (mx > this.width * 0.8) {
                this.mobileKeys.right = true;
                setTimeout(() => this.mobileKeys.right = false, 140);
            } else if (my > this.height * 0.55) {
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
        this.messageTimer = 60;
    }

    update() {
        if (!this.running) return;

        const mk = this.mobileKeys;

        // === MOVIMENTO GANCIO (solo quando IDLE o MOVING) ===
        if (this.claw.state === 'IDLE' || this.claw.state === 'MOVING') {
            let move = 0;
            if (this.keys['ArrowLeft'] || this.keys['KeyA'] || mk.left) move -= 1;
            if (this.keys['ArrowRight'] || this.keys['KeyD'] || mk.right) move += 1;

            if (move !== 0) {
                this.claw.state = 'MOVING';
                this.claw.targetX = Math.max(
                    this.machine.glassLeft + 35,
                    Math.min(this.machine.glassLeft + this.machine.glassW - 35, this.claw.x + move * this.claw.speed)
                );
            } else if (this.claw.state === 'MOVING') {
                this.claw.state = 'IDLE';
            }
        }

        if (this.claw.state === 'IDLE' || this.claw.state === 'MOVING') {
            this.claw.x += (this.claw.targetX - this.claw.x) * 0.22;
        }

        // === STATI DEL GANCIO ===
        switch (this.claw.state) {
            case 'DROPPING':
                this.claw.armLength += this.claw.dropSpeed;
                if (this.claw.armLength >= this.claw.maxArmLength) {
                    this.claw.armLength = this.claw.maxArmLength;
                    this.claw.state = 'GRABBING';
                    this.claw.grabOffset = 11;
                    setTimeout(() => this._tryGrab(), 130);
                }
                break;

            case 'GRABBING':
                this.claw.grabOffset = Math.max(0, this.claw.grabOffset - 1.2);
                if (this.claw.grabOffset <= 0) {
                    this.claw.state = 'RETRACTING';
                }
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

        // Fisica premi
        this.prizes.forEach(p => {
            if (p.grabbed) {
                p.x = this.claw.x;
                p.y = this.machine.top + 58 + this.claw.armLength - 4;
            } else {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.035;
                if (p.y > this.machine.glassTop + this.machine.glassH - 24) {
                    p.y = this.machine.glassTop + this.machine.glassH - 24;
                    p.vy *= -0.3;
                }
                p.vx *= 0.96;
                p.vy *= 0.96;
            }
        });

        this._updateParticles();
        if (this.messageTimer > 0) this.messageTimer--;
    }

    _tryGrab() {
        let closest = null;
        let minDist = 999;
        const cx = this.claw.x;
        const cy = this.machine.top + 58 + this.claw.armLength;

        this.prizes.forEach(p => {
            if (p.grabbed) return;
            const dist = Math.hypot(p.x - cx, p.y - cy);
            if (dist < minDist && dist < p.r + 26) {
                minDist = dist;
                closest = p;
            }
        });

        if (closest) {
            closest.grabbed = true;
            this._winPrize(closest);
        } else {
            this._particle(cx, cy, 0, 2, '#888', 14);
        }
    }

    _winPrize(prize) {
        const isSpecial = prize.rare && Math.random() < 0.32;
        let amount = prize.value;
        let msg = `Hai vinto: ${prize.name} (+${amount} coins)`;

        if (isSpecial || Math.random() < 0.05) {
            amount = 260;
            msg = '🎉 HAI VINTO IL RUOLO CUSTOM!';
            this._sendWebhookLog(prize.name);
        }

        this.credits += amount;
        this.score += Math.floor(amount * 0.7);
        this.totalWon += amount;
        this.message = msg;
        this.messageTimer = 120;

        const col = isSpecial ? '#f9ca24' : prize.color;
        for (let i = 0; i < (isSpecial ? 42 : 20); i++) {
            const a = Math.random() * Math.PI * 2;
            const spd = 1.5 + Math.random() * 3.2;
            this._particle(this.claw.x, this.machine.top + 75 + this.claw.armLength,
                Math.cos(a) * spd, Math.sin(a) * spd - 1.5, col, 38);
        }

        setTimeout(() => {
            this.prizes = this.prizes.filter(p => p.id !== prize.id);
            if (this.prizes.length < 5) this._genPrizes();
        }, 550);
    }

    _releasePrize() {
        this.prizes.forEach(p => {
            if (p.grabbed) {
                p.grabbed = false;
                p.vx = (Math.random() - 0.5) * 3.2;
                p.vy = -1.5;
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
            p.vy += 0.08;
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
        c.fillRect(this.machine.left, this.machine.top - 8, this.machine.width, this.machine.height + 40);
        c.strokeStyle = '#f9ca24';
        c.lineWidth = 5;
        c.strokeRect(this.machine.left, this.machine.top - 8, this.machine.width, this.machine.height + 40);

        // Glass
        c.fillStyle = 'rgba(15,20,35,0.4)';
        c.fillRect(this.machine.glassLeft, this.machine.glassTop, this.machine.glassW, this.machine.glassH);
        c.strokeStyle = 'rgba(249,202,36,0.6)';
        c.lineWidth = 3;
        c.strokeRect(this.machine.glassLeft, this.machine.glassTop, this.machine.glassW, this.machine.glassH);

        // Floor
        c.fillStyle = '#2d3446';
        c.fillRect(this.machine.glassLeft + 5, this.machine.glassTop + this.machine.glassH - 22, this.machine.glassW - 10, 18);

        // Prizes
        this.prizes.forEach(p => {
            c.save();
            c.translate(p.x, p.y);
            if (p.grabbed) c.rotate(Math.sin(Date.now() / 150) * 0.07);

            c.fillStyle = 'rgba(0,0,0,0.3)';
            c.beginPath();
            c.ellipse(3, p.r + 4, p.r * 0.8, 4, 0, 0, Math.PI * 2);
            c.fill();

            c.fillStyle = p.color;
            c.beginPath();
            c.arc(0, 0, p.r, 0, Math.PI * 2);
            c.fill();

            c.fillStyle = 'rgba(255,255,255,0.35)';
            c.beginPath();
            c.arc(-p.r * 0.3, -p.r * 0.3, p.r * 0.35, 0, Math.PI * 2);
            c.fill();
            c.restore();
        });

        // Claw
        const baseY = this.machine.top + 38;
        c.strokeStyle = '#ddd';
        c.lineWidth = 5;
        c.beginPath();
        c.moveTo(this.claw.x, baseY);
        c.lineTo(this.claw.x, baseY + this.claw.armLength);
        c.stroke();

        const cy = baseY + this.claw.armLength;
        c.fillStyle = '#f9ca24';
        c.fillRect(this.claw.x - 13, cy - 5, 26, 10);

        const open = this.claw.state === 'GRABBING' ? this.claw.grabOffset : 0;
        c.strokeStyle = '#eee';
        c.lineWidth = 4;
        c.beginPath();
        c.moveTo(this.claw.x - 7, cy + 3);
        c.lineTo(this.claw.x - 13 - open, cy + 17);
        c.stroke();
        c.beginPath();
        c.moveTo(this.claw.x + 7, cy + 3);
        c.lineTo(this.claw.x + 13 + open, cy + 17);
        c.stroke();

        // Particles
        this.particles.forEach(p => {
            c.globalAlpha = p.life / p.maxLife;
            c.fillStyle = p.color;
            c.beginPath();
            c.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
            c.fill();
        });
        c.globalAlpha = 1;

        this._drawHUD(c);

        if (this.message && this.messageTimer > 0) {
            const alpha = Math.min(1, this.messageTimer / 32);
            c.fillStyle = `rgba(10,12,20,${0.9 * alpha})`;
            c.fillRect(this.width/2 - 230, 58, 460, 55);
            c.strokeStyle = this.message.includes('RUOLO') ? '#f9ca24' : '#55efc4';
            c.lineWidth = 3;
            c.strokeRect(this.width/2 - 230, 58, 460, 55);

            c.fillStyle = this.message.includes('RUOLO') ? '#f9ca24' : '#fff';
            c.font = 'bold 17px Inter, system-ui';
            c.textAlign = 'center';
            c.fillText(this.message, this.width/2, 88);
        }

        if (this.showGuide) this._drawGuide(c);

        if (this.showDiscordPrompt) {
            const pw = Math.min(480, this.width * 0.9);
            const px = (this.width - pw) / 2;
            const py = this.height * 0.18;

            c.fillStyle = 'rgba(10,12,20,0.97)';
            c.fillRect(px, py, pw, 220);
            c.strokeStyle = '#f9ca24';
            c.lineWidth = 4;
            c.strokeRect(px, py, pw, 220);

            c.fillStyle = '#f9ca24';
            c.font = 'bold 17px Inter, system-ui';
            c.textAlign = 'center';
            c.fillText('TENTATIVI ESAURITI', this.width/2, py + 32);

            c.fillStyle = '#ddd';
            c.font = '14px Inter, system-ui';
            c.fillText('Scrivi almeno 8 messaggi su Discord', this.width/2, py + 62);
            c.fillText('per sbloccare altri 5 tentativi', this.width/2, py + 82);

            c.fillStyle = '#55efc4';
            c.fillRect(px + 35, py + 108, pw - 70, 46);
            c.strokeStyle = '#fff';
            c.lineWidth = 3;
            c.strokeRect(px + 35, py + 108, pw - 70, 46);

            c.fillStyle = '#111';
            c.font = 'bold 14px Inter, system-ui';
            c.fillText('HO SCRITTO I MESSAGGI! +5 TENTATIVI', this.width/2, py + 137);
        }
    }

    _drawHUD(c) {
        c.fillStyle = 'rgba(15,18,28,0.95)';
        c.fillRect(0, 0, this.width, 50);
        c.strokeStyle = 'rgba(249,202,36,0.3)';
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(0, 50);
        c.lineTo(this.width, 50);
        c.stroke();

        c.fillStyle = '#f9ca24';
        c.font = 'bold 17px Inter, system-ui';
        c.textAlign = 'left';
        c.fillText('🎰 MACCHINA A GANCIO', 16, 30);

        c.fillStyle = '#55efc4';
        c.font = 'bold 15px Inter, system-ui';
        c.fillText(`$ ${this.credits}`, this.width - 130, 30);

        const attColor = this.attemptsLeft > 2 ? '#55efc4' : this.attemptsLeft > 0 ? '#f9ca24' : '#d63031';
        c.fillStyle = attColor;
        c.font = 'bold 12px Inter, system-ui';
        c.fillText(`Tentativi: ${this.attemptsLeft}/${this.maxAttempts}`, this.width - 130, 45);
    }

    _drawGuide(c) {
        const gw = Math.min(460, this.width * 0.9);
        const gx = (this.width - gw) / 2;
        const gy = this.height * 0.1;

        c.fillStyle = 'rgba(10,12,20,0.96)';
        c.fillRect(gx, gy, gw, 260);
        c.strokeStyle = '#a29bfe';
        c.lineWidth = 3;
        c.strokeRect(gx, gy, gw, 260);

        c.fillStyle = '#a29bfe';
        c.font = 'bold 17px Inter, system-ui';
        c.textAlign = 'center';
        c.fillText('COME SI GIOCA', this.width/2, gy + 26);

        c.fillStyle = '#ddd';
        c.font = '14px Inter, system-ui';
        c.textAlign = 'left';
        const lines = [
            '• Muovi il gancio con ← → o toccando i lati',
            '• Tocca il pulsante giallo per lanciare',
            '• Il gancio si chiude da solo',
            '• Vinci coins e ruoli custom!',
            '• Ogni lancio costa 200 crediti',
            '• R = Ricarica la macchina'
        ];
        lines.forEach((line, i) => c.fillText(line, gx + 20, gy + 55 + i * 22));

        c.fillStyle = '#888';
        c.font = '13px Inter, system-ui';
        c.textAlign = 'center';
        c.fillText('Premi ? o ESC per chiudere', this.width/2, gy + 240);
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
