/**
 * MACCHINA A GANCIO v3 - FULLY RESPONSIVE
 * Ottimizzata per Telefono, Tablet e PC
 */

const DISCORD_WEBHOOK_URL = 'https://discord.com/api/v10/webhooks/1511405598489575657/kfAincCiahPdZJjkF48XjUFPoeMlc9IhR6V575DS6eWllmXgXH7iWfZ1PnYxja1kgl5T';

class ClawMachineGame {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d', { alpha: true });
        
        this.resize();
        this._updateMachineSize();

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
            x: 0,
            targetX: 0,
            speed: 5.8,
            state: 'IDLE',
            armLength: 50,
            maxArmLength: 260,
            dropSpeed: 7,
            retractSpeed: 4.5,
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
        const scale = Math.max(0.6, Math.min(1.1, Math.min(this.width, this.height) / 720));
        
        this.scale = scale;
        this.machine = {
            width: Math.floor(600 * scale),
            height: Math.floor(500 * scale),
            left: Math.floor((this.width - 600 * scale) / 2),
            top: Math.floor(30 * scale),
            glassLeft: Math.floor((this.width - 560 * scale) / 2),
            glassTop: Math.floor(85 * scale),
            glassW: Math.floor(560 * scale),
            glassH: Math.floor(330 * scale)
        };
    }

    _genPrizes() {
        this.prizes = [];
        const types = [
            { name: 'Pelouche Blu', value: 25, color: '#74b9ff', r: 17, rare: false },
            { name: 'Pelouche Verde', value: 30, color: '#55efc4', r: 16, rare: false },
            { name: 'Pelouche Rosa', value: 35, color: '#fd79a8', r: 18, rare: false },
            { name: 'Moneta Oro', value: 50, color: '#f9ca24', r: 13, rare: false },
            { name: 'Pelouche Raro', value: 80, color: '#a29bfe', r: 19, rare: true },
            { name: 'Tesoro', value: 120, color: '#e17055', r: 15, rare: true },
        ];

        for (let i = 0; i < 18; i++) {
            const t = types[Math.floor(Math.random() * types.length)];
            this.prizes.push({
                ...t,
                x: this.machine.glassLeft + 45 + Math.random() * (this.machine.glassW - 90),
                y: this.machine.glassTop + 120 + Math.random() * (this.machine.glassH - 160),
                vx: (Math.random() - 0.5) * 0.8,
                vy: (Math.random() - 0.5) * 0.6,
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
            const pw = Math.min(560, this.width * 0.9);
            const px = (this.width - pw) / 2;
            const py = this.height * 0.2;
            if (mx > px + 50 && mx < px + pw - 50 && my > py + 150 && my < py + 210) {
                this.attemptsLeft = this.maxAttempts;
                this.showDiscordPrompt = false;
                this.message = 'Grazie! +5 tentativi sbloccati ❤️';
                this.messageTimer = 110;
            }
            return;
        }

        // Launch Button (responsive)
        const btnW = this.isTouchDevice ? 230 : 200;
        const btnH = this.isTouchDevice ? 90 : 80;
        const btnX = this.width - btnW - 25;
        const btnY = this.height - btnH - 35;

        if (mx > btnX && mx < btnX + btnW && my > btnY && my < btnY + btnH) {
            this._btnPressed = true;
            setTimeout(() => this._btnPressed = false, 120);
            if (this.claw.state === 'IDLE') this._startDrop();
            return;
        }

        // Ricarica
        const rX = btnX - 130;
        const rY = btnY + 15;
        if (mx > rX && mx < rX + 115 && my > rY && my < rY + 55) {
            this._resetMachine();
            return;
        }

        // Touch zones
        if (this.claw.state === 'IDLE') {
            if (mx < this.width * 0.18) {
                this.mobileKeys.left = true;
                setTimeout(() => this.mobileKeys.left = false, 160);
            } else if (mx > this.width * 0.82) {
                this.mobileKeys.right = true;
                setTimeout(() => this.mobileKeys.right = false, 160);
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
        this.messageTimer = 70;
    }

    update() {
        if (!this.running) return;
        const mk = this.mobileKeys;

        if (this.claw.state === 'IDLE' || this.claw.state === 'MOVING') {
            let move = 0;
            if (this.keys['ArrowLeft'] || this.keys['KeyA'] || mk.left) move -= 1;
            if (this.keys['ArrowRight'] || this.keys['KeyD'] || mk.right) move += 1;

            if (move !== 0) {
                this.claw.state = 'MOVING';
                this.claw.targetX = Math.max(this.machine.glassLeft + 35, 
                    Math.min(this.machine.glassLeft + this.machine.glassW - 35, this.claw.x + move * this.claw.speed));
            } else if (this.claw.state === 'MOVING') {
                this.claw.state = 'IDLE';
            }
        }

        if (this.claw.state === 'IDLE' || this.claw.state === 'MOVING') {
            this.claw.x += (this.claw.targetX - this.claw.x) * 0.22;
        }

        switch (this.claw.state) {
            case 'DROPPING':
                this.claw.armLength += this.claw.dropSpeed;
                if (this.claw.armLength >= this.claw.maxArmLength) {
                    this.claw.armLength = this.claw.maxArmLength;
                    this.claw.state = 'GRABBING';
                    this.claw.grabOffset = 13;
                    setTimeout(() => this._tryGrab(), 150);
                }
                break;
            case 'GRABBING':
                this.claw.grabOffset = Math.max(0, this.claw.grabOffset - 1.4);
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

        this.prizes.forEach(p => {
            if (p.grabbed) {
                p.x = this.claw.x;
                p.y = this.machine.top + 65 + this.claw.armLength - 6;
            } else {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.045;
                if (p.y > this.machine.glassTop + this.machine.glassH - 28) {
                    p.y = this.machine.glassTop + this.machine.glassH - 28;
                    p.vy *= -0.4;
                }
                p.vx *= 0.97;
                p.vy *= 0.97;
            }
        });

        this._updateParticles();
        if (this.messageTimer > 0) this.messageTimer--;
    }

    _tryGrab() {
        let closest = null;
        let minDist = 999;
        const cx = this.claw.x;
        const cy = this.machine.top + 65 + this.claw.armLength;

        this.prizes.forEach(p => {
            if (p.grabbed) return;
            const dist = Math.hypot(p.x - cx, p.y - cy);
            if (dist < minDist && dist < p.r + 30) {
                minDist = dist;
                closest = p;
            }
        });

        if (closest) {
            closest.grabbed = true;
            this._winPrize(closest);
        } else {
            this._particle(cx, cy, 0, 2.5, '#888', 18);
        }
    }

    _winPrize(prize) {
        const isSpecial = prize.rare && Math.random() < 0.38;
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
        this.messageTimer = 140;

        const col = isSpecial ? '#f9ca24' : prize.color;
        for (let i = 0; i < (isSpecial ? 48 : 24); i++) {
            const a = Math.random() * Math.PI * 2;
            const spd = 1.8 + Math.random() * 3.8;
            this._particle(this.claw.x, this.machine.top + 85 + this.claw.armLength,
                Math.cos(a) * spd, Math.sin(a) * spd - 1.8, col, 42);
        }

        setTimeout(() => {
            this.prizes = this.prizes.filter(p => p.id !== prize.id);
            if (this.prizes.length < 6) this._genPrizes();
        }, 650);
    }

    _releasePrize() {
        this.prizes.forEach(p => {
            if (p.grabbed) {
                p.grabbed = false;
                p.vx = (Math.random() - 0.5) * 3.5;
                p.vy = -1.8;
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
        c.fillRect(this.machine.left, this.machine.top - 15, this.machine.width, this.machine.height + 50);
        c.strokeStyle = '#f9ca24';
        c.lineWidth = 5;
        c.strokeRect(this.machine.left, this.machine.top - 15, this.machine.width, this.machine.height + 50);

        // Glass
        c.fillStyle = 'rgba(15,20,35,0.45)';
        c.fillRect(this.machine.glassLeft, this.machine.glassTop, this.machine.glassW, this.machine.glassH);
        c.strokeStyle = 'rgba(249,202,36,0.65)';
        c.lineWidth = 3;
        c.strokeRect(this.machine.glassLeft, this.machine.glassTop, this.machine.glassW, this.machine.glassH);

        // Floor
        c.fillStyle = '#2d3446';
        c.fillRect(this.machine.glassLeft + 8, this.machine.glassTop + this.machine.glassH - 26, this.machine.glassW - 16, 22);

        // Prizes
        this.prizes.forEach(p => {
            c.save();
            c.translate(p.x, p.y);
            if (p.grabbed) c.rotate(Math.sin(Date.now() / 180) * 0.09);

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
            c.arc(-p.r * 0.32, -p.r * 0.32, p.r * 0.38, 0, Math.PI * 2);
            c.fill();
            c.restore();
        });

        // Claw
        const baseY = this.machine.top + 45;
        c.strokeStyle = '#ddd';
        c.lineWidth = 6;
        c.beginPath();
        c.moveTo(this.claw.x, baseY);
        c.lineTo(this.claw.x, baseY + this.claw.armLength);
        c.stroke();

        const cy = baseY + this.claw.armLength;
        c.fillStyle = '#f9ca24';
        c.fillRect(this.claw.x - 15, cy - 6, 30, 12);

        const open = this.claw.state === 'GRABBING' ? this.claw.grabOffset : 0;
        c.strokeStyle = '#eee';
        c.lineWidth = 5;
        c.beginPath();
        c.moveTo(this.claw.x - 9, cy + 4);
        c.lineTo(this.claw.x - 16 - open, cy + 22);
        c.stroke();
        c.beginPath();
        c.moveTo(this.claw.x + 9, cy + 4);
        c.lineTo(this.claw.x + 16 + open, cy + 22);
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

        if (this.message && this.messageTimer > 0) {
            const alpha = Math.min(1, this.messageTimer / 40);
            c.fillStyle = `rgba(10,12,20,${0.9 * alpha})`;
            c.fillRect(this.width/2 - 260, 65, 520, 65);
            c.strokeStyle = this.message.includes('RUOLO') ? '#f9ca24' : '#55efc4';
            c.lineWidth = 3;
            c.strokeRect(this.width/2 - 260, 65, 520, 65);

            c.fillStyle = this.message.includes('RUOLO') ? '#f9ca24' : '#fff';
            c.font = 'bold 20px Inter, system-ui';
            c.textAlign = 'center';
            c.fillText(this.message, this.width/2, 98);
        }

        if (this.showGuide) this._drawGuide(c);

        if (this.showDiscordPrompt) {
            const pw = Math.min(540, this.width * 0.92);
            const px = (this.width - pw) / 2;
            const py = this.height * 0.18;

            c.fillStyle = 'rgba(10,12,20,0.97)';
            c.fillRect(px, py, pw, 250);
            c.strokeStyle = '#f9ca24';
            c.lineWidth = 4;
            c.strokeRect(px, py, pw, 250);

            c.fillStyle = '#f9ca24';
            c.font = 'bold 20px Inter, system-ui';
            c.textAlign = 'center';
            c.fillText('TENTATIVI ESAURITI', this.width/2, py + 38);

            c.fillStyle = '#ddd';
            c.font = '15px Inter, system-ui';
            c.fillText('Scrivi almeno 8 messaggi su Discord', this.width/2, py + 75);
            c.fillText('per sbloccare altri 5 tentativi', this.width/2, py + 96);

            c.fillStyle = '#55efc4';
            c.fillRect(px + 45, py + 130, pw - 90, 52);
            c.strokeStyle = '#fff';
            c.lineWidth = 3;
            c.strokeRect(px + 45, py + 130, pw - 90, 52);

            c.fillStyle = '#111';
            c.font = 'bold 15px Inter, system-ui';
            c.fillText('HO SCRITTO I MESSAGGI! +5 TENTATIVI', this.width/2, py + 162);
        }
    }

    _drawHUD(c) {
        c.fillStyle = 'rgba(15,18,28,0.95)';
        c.fillRect(0, 0, this.width, 55);
        c.strokeStyle = 'rgba(249,202,36,0.3)';
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(0, 55);
        c.lineTo(this.width, 55);
        c.stroke();

        c.fillStyle = '#f9ca24';
        c.font = 'bold 20px Inter, system-ui';
        c.textAlign = 'left';
        c.fillText('🎰 MACCHINA A GANCIO', 20, 35);

        c.fillStyle = '#55efc4';
        c.font = 'bold 17px Inter, system-ui';
        c.fillText(`$ ${this.credits}`, this.width - 160, 35);

        const attColor = this.attemptsLeft > 2 ? '#55efc4' : this.attemptsLeft > 0 ? '#f9ca24' : '#d63031';
        c.fillStyle = attColor;
        c.font = 'bold 14px Inter, system-ui';
        c.fillText(`Tentativi: ${this.attemptsLeft}/${this.maxAttempts}`, this.width - 160, 52);
    }

    _drawGuide(c) {
        const gw = Math.min(520, this.width * 0.9);
        const gx = (this.width - gw) / 2;
        const gy = this.height * 0.12;

        c.fillStyle = 'rgba(10,12,20,0.96)';
        c.fillRect(gx, gy, gw, 300);
        c.strokeStyle = '#a29bfe';
        c.lineWidth = 3;
        c.strokeRect(gx, gy, gw, 300);

        c.fillStyle = '#a29bfe';
        c.font = 'bold 20px Inter, system-ui';
        c.textAlign = 'center';
        c.fillText('COME SI GIOCA', this.width/2, gy + 32);

        c.fillStyle = '#ddd';
        c.font = '15px Inter, system-ui';
        c.textAlign = 'left';
        const lines = [
            '• Muovi il gancio con ← → o toccando i lati dello schermo',
            '• Tocca il pulsante giallo grande per lanciare',
            '• Il gancio si chiude da solo',
            '• Vinci coins e ruoli custom su Discord!',
            '• Ogni lancio costa 200 crediti',
            '• R = Ricarica la macchina'
        ];
        lines.forEach((line, i) => c.fillText(line, gx + 25, gy + 70 + i * 26));

        c.fillStyle = '#888';
        c.font = '14px Inter, system-ui';
        c.textAlign = 'center';
        c.fillText('Premi ? o ESC per chiudere', this.width/2, gy + 280);
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
