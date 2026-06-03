/**
 * MACCHINA A GANCIO - VERSIONE FINALE FIGA v7
 * Con Webhook Discord automatico sui premi rari
 */

const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1511405598489575657/kfAincCiahPdZJjkF48XjUFPoeMlc9IhR6V575DS6eWllmXgXH7iWfZ1PnYxja1kgl5T';

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
        const scale = Math.max(0.58, Math.min(1.0, Math.min(this.width, this.height) / 720));
        this.scale = scale;

        this.machine = {
            width: Math.floor(560 * scale),
            height: Math.floor(470 * scale),
            left: Math.floor((this.width - 560 * scale) / 2),
            top: Math.floor(30 * scale),
            glassLeft: Math.floor((this.width - 520 * scale) / 2),
            glassTop: Math.floor(75 * scale),
            glassW: Math.floor(520 * scale),
            glassH: Math.floor(310 * scale)
        };
    }

    _genPrizes() {
        this.prizes = [];
        const types = [
            { name: 'Pelouche Blu', value: 25, color: '#74b9ff', r: 15, rare: false },
            { name: 'Pelouche Verde', value: 30, color: '#55efc4', r: 14, rare: false },
            { name: 'Pelouche Rosa', value: 35, color: '#fd79a8', r: 16, rare: false },
            { name: 'Moneta Oro', value: 50, color: '#f9ca24', r: 11, rare: false },
            { name: 'Pelouche Raro', value: 90, color: '#a29bfe', r: 17, rare: true },
            { name: 'Tesoro Leggendario', value: 150, color: '#e17055', r: 13, rare: true },
        ];

        for (let i = 0; i < 15; i++) {
            const t = types[Math.floor(Math.random() * types.length)];
            this.prizes.push({
                ...t,
                x: this.machine.glassLeft + 35 + Math.random() * (this.machine.glassW - 70),
                y: this.machine.glassTop + 100 + Math.random() * (this.machine.glassH - 140),
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.4,
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
            const pw = Math.min(480, this.width * 0.9);
            const px = (this.width - pw) / 2;
            const py = this.height * 0.18;
            if (mx > px + 35 && mx < px + pw - 35 && my > py + 135 && my < py + 185) {
                this.attemptsLeft = this.maxAttempts;
                this.showDiscordPrompt = false;
                this.message = 'Grazie! +5 tentativi sbloccati ❤️';
                this.messageTimer = 90;
            }
            return;
        }

        const btnW = this.isTouchDevice ? 210 : 180;
        const btnH = this.isTouchDevice ? 80 : 70;
        const btnX = this.width - btnW - 18;
        const btnY = this.height - btnH - 25;

        if (mx > btnX && mx < btnX + btnW && my > btnY && my < btnY + btnH) {
            this._btnPressed = true;
            setTimeout(() => this._btnPressed = false, 100);
            if (this.claw.state === 'IDLE') this._startDrop();
            return;
        }

        const rX = btnX - 120;
        const rY = btnY + 10;
        if (mx > rX && mx < rX + 105 && my > rY && my < rY + 50) {
            this._resetMachine();
            return;
        }

        if (this.claw.state === 'IDLE') {
            if (mx < this.width * 0.18) {
                this.mobileKeys.left = true;
                setTimeout(() => this.mobileKeys.left = false, 130);
            } else if (mx > this.width * 0.82) {
                this.mobileKeys.right = true;
                setTimeout(() => this.mobileKeys.right = false, 130);
            } else if (my > this.height * 0.52) {
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
        this.messageTimer = 55;
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
                this.claw.targetX = Math.max(this.machine.glassLeft + 30, Math.min(this.machine.glassLeft + this.machine.glassW - 30, this.claw.x + move * this.claw.speed));
            } else if (this.claw.state === 'MOVING') {
                this.claw.state = 'IDLE';
            }
        }

        if (this.claw.state === 'IDLE' || this.claw.state === 'MOVING') {
            this.claw.x += (this.claw.targetX - this.claw.x) * 0.2;
        }

        switch (this.claw.state) {
            case 'DROPPING':
                this.claw.armLength += this.claw.dropSpeed;
                if (this.claw.armLength >= this.claw.maxArmLength) {
                    this.claw.armLength = this.claw.maxArmLength;
                    this.claw.state = 'GRABBING';
                    this.claw.grabOffset = 10;
                    setTimeout(() => this._tryGrab(), 110);
                }
                break;

            case 'GRABBING':
                this.claw.grabOffset = Math.max(0, this.claw.grabOffset - 1.1);
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
                p.y = this.machine.top + 55 + this.claw.armLength - 3;
            } else {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.03;
                if (p.y > this.machine.glassTop + this.machine.glassH - 22) {
                    p.y = this.machine.glassTop + this.machine.glassH - 22;
                    p.vy *= -0.3;
                }
                p.vx *= 0.95;
                p.vy *= 0.95;
            }
        });

        this._updateParticles();
        if (this.messageTimer > 0) this.messageTimer--;
    }

    _tryGrab() {
        let closest = null;
        let minDist = 999;
        const cx = this.claw.x;
        const cy = this.machine.top + 55 + this.claw.armLength;

        this.prizes.forEach(p => {
            if (p.grabbed) return;
            const dist = Math.hypot(p.x - cx, p.y - cy);
            if (dist < minDist && dist < p.r + 24) {
                minDist = dist;
                closest = p;
            }
        });

        if (closest) {
            closest.grabbed = true;
            this._winPrize(closest);
        } else {
            this._particle(cx, cy, 0, 1.5, '#888', 12);
        }
    }

    _winPrize(prize) {
        const isRare = prize.rare;
        let amount = prize.value;
        let msg = `Hai vinto: ${prize.name} (+${amount} coins)`;

        if (isRare) {
            amount = Math.floor(prize.value * 2.2);
            msg = `🎉 HAI VINTO ${prize.name.toUpperCase()}! (+${amount} coins)`;
            this._sendWebhookLog(prize.name, amount);
        }

        this.credits += amount;
        this.score += Math.floor(amount * 0.7);
        this.totalWon += amount;
        this.message = msg;
        this.messageTimer = isRare ? 160 : 110;

        const col = isRare ? '#f9ca24' : prize.color;
        const particleCount = isRare ? 55 : 22;

        for (let i = 0; i < particleCount; i++) {
            const a = Math.random() * Math.PI * 2;
            const spd = isRare ? (2 + Math.random() * 4) : (1.5 + Math.random() * 3);
            this._particle(this.claw.x, this.machine.top + 70 + this.claw.armLength,
                Math.cos(a) * spd, Math.sin(a) * spd - 1.8, col, isRare ? 45 : 35);
        }

        setTimeout(() => {
            this.prizes = this.prizes.filter(p => p.id !== prize.id);
            if (this.prizes.length < 5) this._genPrizes();
        }, isRare ? 700 : 500);
    }

    _releasePrize() {
        this.prizes.forEach(p => {
            if (p.grabbed) {
                p.grabbed = false;
                p.vx = (Math.random() - 0.5) * 3;
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

    async _sendWebhookLog(prizeName, amount) {
        if (!DISCORD_WEBHOOK_URL) return;

        try {
            const playerName = (document.getElementById('player-name')?.value || 'GIOCATORE').toUpperCase().slice(0, 12);

            const payload = {
                content: `🎰 **${playerName}** ha trovato un **PREMIO RARO** nella **MACCHINA A GANCIO**!`,
                embeds: [{
                    title: "🎁 VINCITA RARA - RUOLO CUSTOM",
                    description: `**${playerName}**\nPremio: **${prizeName}**\nValore: **${amount} coins**`,
                    color: 0xf9ca24,
                    timestamp: new Date().toISOString()
                }]
            };

            await fetch(DISCORD_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (e) {
            console.log('%c[Webhook] Errore invio Discord (non bloccante)', 'color:#f66');
        }
    }

    draw() {
        const c = this.ctx;
        c.fillStyle = '#0a0c14';
        c.fillRect(0, 0, this.width, this.height);

        // Cabinet
        c.fillStyle = '#1f2533';
        c.fillRect(this.machine.left, this.machine.top - 5, this.machine.width, this.machine.height + 35);
        c.strokeStyle = '#f9ca24';
        c.lineWidth = 5;
        c.strokeRect(this.machine.left, this.machine.top - 5, this.machine.width, this.machine.height + 35);

        // Glass
        c.fillStyle = 'rgba(15,20,35,0.4)';
        c.fillRect(this.machine.glassLeft, this.machine.glassTop, this.machine.glassW, this.machine.glassH);
        c.strokeStyle = 'rgba(249,202,36,0.55)';
        c.lineWidth = 3;
        c.strokeRect(this.machine.glassLeft, this.machine.glassTop, this.machine.glassW, this.machine.glassH);

        // Floor
        c.fillStyle = '#2d3446';
        c.fillRect(this.machine.glassLeft + 4, this.machine.glassTop + this.machine.glassH - 20, this.machine.glassW - 8, 16);

        // Prizes
        this.prizes.forEach(p => {
            c.save();
            c.translate(p.x, p.y);
            if (p.grabbed) c.rotate(Math.sin(Date.now() / 130) * 0.06);

            c.fillStyle = 'rgba(0,0,0,0.3)';
            c.beginPath();
            c.ellipse(3, p.r + 3, p.r * 0.75, 3.5, 0, 0, Math.PI * 2);
            c.fill();

            c.fillStyle = p.color;
            c.beginPath();
            c.arc(0, 0, p.r, 0, Math.PI * 2);
            c.fill();

            c.fillStyle = 'rgba(255,255,255,0.3)';
            c.beginPath();
            c.arc(-p.r * 0.28, -p.r * 0.28, p.r * 0.32, 0, Math.PI * 2);
            c.fill();
            c.restore();
        });

        // Claw
        const baseY = this.machine.top + 35;
        c.strokeStyle = '#ccc';
        c.lineWidth = 5;
        c.beginPath();
        c.moveTo(this.claw.x, baseY);
        c.lineTo(this.claw.x, baseY + this.claw.armLength);
        c.stroke();

        const cy = baseY + this.claw.armLength;
        c.fillStyle = '#f9ca24';
        c.fillRect(this.claw.x - 12, cy - 4, 24, 8);

        const open = this.claw.state === 'GRABBING' ? this.claw.grabOffset : 0;
        c.strokeStyle = '#ddd';
        c.lineWidth = 4;
        c.beginPath();
        c.moveTo(this.claw.x - 6, cy + 2);
        c.lineTo(this.claw.x - 11 - open, cy + 15);
        c.stroke();
        c.beginPath();
        c.moveTo(this.claw.x + 6, cy + 2);
        c.lineTo(this.claw.x + 11 + open, cy + 15);
        c.stroke();

        // Particles
        this.particles.forEach(p => {
            c.globalAlpha = p.life / p.maxLife;
            c.fillStyle = p.color;
            c.beginPath();
            c.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
            c.fill();
        });
        c.globalAlpha = 1;

        this._drawHUD(c);

        if (this.message && this.messageTimer > 0) {
            const alpha = Math.min(1, this.messageTimer / 30);
            c.fillStyle = `rgba(10,12,20,${0.9 * alpha})`;
            c.fillRect(this.width/2 - 230, 55, 460, 52);
            c.strokeStyle = this.message.includes('RUOLO') || this.message.includes('RARO') ? '#f9ca24' : '#55efc4';
            c.lineWidth = 3;
            c.strokeRect(this.width/2 - 230, 55, 460, 52);

            c.fillStyle = this.message.includes('RUOLO') || this.message.includes('RARO') ? '#f9ca24' : '#fff';
            c.font = 'bold 16px Inter, system-ui';
            c.textAlign = 'center';
            c.fillText(this.message, this.width/2, 82);
        }

        if (this.showGuide) this._drawGuide(c);

        if (this.showDiscordPrompt) {
            const pw = Math.min(460, this.width * 0.9);
            const px = (this.width - pw) / 2;
            const py = this.height * 0.18;

            c.fillStyle = 'rgba(10,12,20,0.97)';
            c.fillRect(px, py, pw, 210);
            c.strokeStyle = '#f9ca24';
            c.lineWidth = 4;
            c.strokeRect(px, py, pw, 210);

            c.fillStyle = '#f9ca24';
            c.font = 'bold 16px Inter, system-ui';
            c.textAlign = 'center';
            c.fillText('TENTATIVI ESAURITI', this.width/2, py + 30);

            c.fillStyle = '#ddd';
            c.font = '13px Inter, system-ui';
            c.fillText('Scrivi almeno 8 messaggi su Discord', this.width/2, py + 58);
            c.fillText('per sbloccare altri 5 tentativi', this.width/2, py + 76);

            c.fillStyle = '#55efc4';
            c.fillRect(px + 30, py + 100, pw - 60, 44);
            c.strokeStyle = '#fff';
            c.lineWidth = 3;
            c.strokeRect(px + 30, py + 100, pw - 60, 44);

            c.fillStyle = '#111';
            c.font = 'bold 13px Inter, system-ui';
            c.fillText('HO SCRITTO I MESSAGGI! +5 TENTATIVI', this.width/2, py + 128);
        }
    }

    _drawHUD(c) {
        c.fillStyle = 'rgba(15,18,28,0.95)';
        c.fillRect(0, 0, this.width, 48);
        c.strokeStyle = 'rgba(249,202,36,0.3)';
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(0, 48);
        c.lineTo(this.width, 48);
        c.stroke();

        c.fillStyle = '#f9ca24';
        c.font = 'bold 16px Inter, system-ui';
        c.textAlign = 'left';
        c.fillText('🎰 MACCHINA A GANCIO', 15, 28);

        c.fillStyle = '#55efc4';
        c.font = 'bold 14px Inter, system-ui';
        c.fillText(`$ ${this.credits}`, this.width - 120, 28);

        const attColor = this.attemptsLeft > 2 ? '#55efc4' : this.attemptsLeft > 0 ? '#f9ca24' : '#d63031';
        c.fillStyle = attColor;
        c.font = 'bold 11px Inter, system-ui';
        c.fillText(`Tentativi: ${this.attemptsLeft}/${this.maxAttempts}`, this.width - 120, 43);
    }

    _drawGuide(c) {
        const gw = Math.min(440, this.width * 0.9);
        const gx = (this.width - gw) / 2;
        const gy = this.height * 0.08;

        c.fillStyle = 'rgba(10,12,20,0.96)';
        c.fillRect(gx, gy, gw, 250);
        c.strokeStyle = '#a29bfe';
        c.lineWidth = 3;
        c.strokeRect(gx, gy, gw, 250);

        c.fillStyle = '#a29bfe';
        c.font = 'bold 16px Inter, system-ui';
        c.textAlign = 'center';
        c.fillText('COME SI GIOCA', this.width/2, gy + 24);

        c.fillStyle = '#ddd';
        c.font = '13px Inter, system-ui';
        c.textAlign = 'left';
        const lines = [
            '• Muovi il gancio con ← → o toccando i lati',
            '• Tocca il pulsante giallo per lanciare',
            '• Il gancio si chiude da solo',
            '• I premi rari fanno partire il webhook su Discord!',
            '• Ogni lancio costa 200 crediti',
            '• R = Ricarica la macchina'
        ];
        lines.forEach((line, i) => c.fillText(line, gx + 18, gy + 52 + i * 20));

        c.fillStyle = '#888';
        c.font = '12px Inter, system-ui';
        c.textAlign = 'center';
        c.fillText('Premi ? o ESC per chiudere', this.width/2, gy + 230);
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
