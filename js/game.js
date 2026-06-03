/**
 * MACCHINA A GANCIO ARCADE v1
 * Claw Machine Game - Vinci coins e RUOLI CUSTOM!
 * Canvas · Touch/Mouse · Webhook Discord · Stile arcade retrò
 */

const DISCORD_WEBHOOK_URL = 'https://discord.com/api/v10/webhooks/1511405598489575657/kfAincCiahPdZJjkF48XjUFPoeMlc9IhR6V575DS6eWllmXgXH7iWfZ1PnYxja1kgl5T';

class ClawMachineGame {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d', { alpha: true });
        this.resize();

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
            y: 80,
            targetX: 0,
            speed: 4.2,
            state: 'IDLE',
            dropSpeed: 5.5,
            retractSpeed: 3.8,
            grabOffset: 0,
            angle: 0
        };
        this.armLength = 0;
        this.maxArmLength = 210;

        this.prizes = [];
        this.particles = [];
        this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        this.mobileKeys = {};
        this.keys = {};

        this.machine = {
            width: 620,
            height: 520,
            left: 90,
            top: 60,
            glassLeft: 110,
            glassTop: 95,
            glassW: 580,
            glassH: 380
        };

        this._genPrizes();
        this._initControls();
        this.start();
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
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

        for (let i = 0; i < 22; i++) {
            const t = types[Math.floor(Math.random() * types.length)];
            const px = this.machine.glassLeft + 40 + Math.random() * (this.machine.glassW - 80);
            const py = this.machine.glassTop + 120 + Math.random() * (this.machine.glassH - 160);
            this.prizes.push({
                ...t,
                x: px,
                y: py,
                vx: (Math.random() - 0.5) * 0.8,
                vy: (Math.random() - 0.5) * 0.6,
                grabbed: false,
                grabTime: 0,
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
        window.addEventListener('keyup', e => { this.keys[e.code] = false; });

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
            const pw = 620, ph = 280;
            const px = this.width/2 - pw/2;
            const py = this.height/2 - ph/2 - 30;
            const claimY = py + 160;
            if (mx > px + 80 && mx < px + pw - 80 && my > claimY && my < claimY + 58) {
                this.attemptsLeft = this.maxAttempts;
                this.showDiscordPrompt = false;
                this.message = 'Grazie! +5 tentativi sbloccati ❤️';
                this.messageTimer = 120;
                return;
            }
            return;
        }

        const btnX = this.width - 240, btnY = this.height - 155;
        const btnW = 210, btnH = 85;
        if (mx > btnX && mx < btnX + btnW && my > btnY && my < btnY + btnH) {
            this._btnPressed = true;
            setTimeout(() => this._btnPressed = false, 120);
            if (this.claw.state === 'IDLE') this._startDrop();
            return;
        }

        const rX = btnX - 130, rY = btnY + 15;
        if (mx > rX && mx < rX + 110 && my > rY && my < rY + 55) {
            this._resetMachine();
            return;
        }

        if (this.claw.state === 'IDLE') {
            if (mx < this.width * 0.22) {
                this.mobileKeys['left'] = true;
                setTimeout(() => this.mobileKeys['left'] = false, 160);
            } else if (mx > this.width * 0.78) {
                this.mobileKeys['right'] = true;
                setTimeout(() => this.mobileKeys['right'] = false, 160);
            } else if (my > this.height * 0.65) {
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
        this.armLength = 40;
        this.claw.grabOffset = 0;
    }

    _resetMachine() {
        if (this.claw.state !== 'IDLE') return;
        this._genPrizes();
        this.message = 'Macchina ricaricata!';
        this.messageTimer = 90;
    }

    update() {
        if (!this.running) return;
        const mk = this.mobileKeys;

        if (this.claw.state === 'IDLE' || this.claw.state === 'MOVING') {
            let move = 0;
            if (this.keys['ArrowLeft'] || this.keys['KeyA'] || mk['left']) move -= 1;
            if (this.keys['ArrowRight'] || this.keys['KeyD'] || mk['right']) move += 1;

            if (move !== 0) {
                this.claw.state = 'MOVING';
                this.claw.targetX = Math.max(this.machine.glassLeft + 30, Math.min(this.machine.glassLeft + this.machine.glassW - 30, this.claw.x + move * this.claw.speed));
            } else if (this.claw.state === 'MOVING') {
                this.claw.state = 'IDLE';
            }
        }

        if (this.claw.state === 'IDLE' || this.claw.state === 'MOVING') {
            this.claw.x += (this.claw.targetX - this.claw.x) * 0.18;
            if (Math.abs(this.claw.targetX - this.claw.x) < 0.8) this.claw.x = this.claw.targetX;
        }

        switch (this.claw.state) {
            case 'DROPPING':
                this.armLength += this.claw.dropSpeed;
                if (this.armLength >= this.maxArmLength) {
                    this.armLength = this.maxArmLength;
                    this.claw.state = 'GRABBING';
                    this.claw.grabOffset = 12;
                    setTimeout(() => this._tryGrab(), 180);
                }
                break;
            case 'GRABBING':
                this.claw.grabOffset = Math.max(0, this.claw.grabOffset - 1.2);
                if (this.claw.grabOffset <= 0) this.claw.state = 'RETRACTING';
                break;
            case 'RETRACTING':
                this.armLength -= this.claw.retractSpeed;
                if (this.armLength <= 40) {
                    this.armLength = 40;
                    this._releasePrize();
                    this.claw.state = 'IDLE';
                }
                break;
        }

        this.prizes.forEach(p => {
            if (p.grabbed) {
                p.x = this.claw.x;
                p.y = this.machine.top + 70 + this.armLength - 10;
                p.vx *= 0.6;
                p.vy = 0;
            } else {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.035;
                if (p.y > this.machine.glassTop + this.machine.glassH - 25) { p.y = this.machine.glassTop + this.machine.glassH - 25; p.vy *= -0.35; }
                if (p.x < this.machine.glassLeft + 25) { p.x = this.machine.glassLeft + 25; p.vx *= -0.6; }
                if (p.x > this.machine.glassLeft + this.machine.glassW - 25) { p.x = this.machine.glassLeft + this.machine.glassW - 25; p.vx *= -0.6; }
                p.vx *= 0.985;
                p.vy *= 0.985;
            }
        });

        this._updateParticles();
        if (this.messageTimer > 0) this.messageTimer--;
        if (this.messageTimer <= 0) this.message = '';
    }

    _tryGrab() {
        let closest = null;
        let minDist = 999;
        const clawX = this.claw.x;
        const clawY = this.machine.top + 70 + this.armLength;

        this.prizes.forEach(p => {
            if (p.grabbed) return;
            const dist = Math.sqrt((p.x - clawX)**2 + (p.y - clawY)**2);
            if (dist < minDist && dist < p.r + 28) {
                minDist = dist;
                closest = p;
            }
        });

        if (closest) {
            closest.grabbed = true;
            closest.grabTime = Date.now();
            this._winPrize(closest);
        } else {
            this._particle(this.claw.x, this.machine.top + 70 + this.armLength, 0, 2, '#888', 18);
        }
    }

    _winPrize(prize) {
        const isSpecial = prize.rare && Math.random() < 0.35;
        let winAmount = prize.value;
        let prizeMsg = `Hai vinto: ${prize.name} (+${winAmount} coins)`;

        if (isSpecial || Math.random() < 0.06) {
            winAmount = 220;
            prizeMsg = '🎉 HAI VINTO IL RUOLO CUSTOM! +220 coins';
            this._sendWebhookLog(prize.name);
        }

        this.credits += winAmount;
        this.score += Math.floor(winAmount * 0.7);
        this.totalWon += winAmount;
        this.message = prizeMsg;
        this.messageTimer = 140;

        const col = isSpecial ? '#f9ca24' : prize.color;
        for (let i = 0; i < (isSpecial ? 45 : 22); i++) {
            const a = Math.random() * Math.PI * 2;
            const spd = 1.5 + Math.random() * 3.5;
            this._particle(this.claw.x + (Math.random()-0.5)*30, this.machine.top + 90 + this.armLength, Math.cos(a)*spd, Math.sin(a)*spd - 1.5, col, 40 + Math.random()*35);
        }

        setTimeout(() => {
            this.prizes = this.prizes.filter(pr => pr.id !== prize.id);
            if (this.prizes.length < 8) this._spawnNewPrizes(4);
        }, 650);
    }

    _spawnNewPrizes(n) {
        const types = [
            { name: 'Pelouche Blu', value: 25, color: '#74b9ff', r: 18, rare: false },
            { name: 'Pelouche Verde', value: 30, color: '#55efc4', r: 17, rare: false },
            { name: 'Moneta Oro', value: 50, color: '#f9ca24', r: 14, rare: false },
            { name: 'Pelouche Raro', value: 80, color: '#a29bfe', r: 20, rare: true },
        ];
        for (let i = 0; i < n; i++) {
            const t = types[Math.floor(Math.random() * types.length)];
            this.prizes.push({
                ...t,
                x: this.machine.glassLeft + 50 + Math.random() * (this.machine.glassW - 100),
                y: this.machine.glassTop + 140 + Math.random() * 180,
                vx: (Math.random()-0.5)*1.2,
                vy: (Math.random()-0.5)*0.8,
                grabbed: false,
                grabTime: 0,
                id: Date.now() + i
            });
        }
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
            p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.life--;
            return p.life > 0;
        });
    }

    async _sendWebhookLog(prizeName) {
        if (!DISCORD_WEBHOOK_URL) return;
        try {
            const playerName = (document.getElementById('player-name')?.value || 'GIOCATORE').toUpperCase().slice(0,12);
            const payload = {
                content: `🎰 **${playerName}** ha trovato nella **MACCHINA A GANCIO** il **RUOLO CUSTOM** vincendo **${prizeName}**!`,
                embeds: [{
                    title: '🎁 VINCITA SPECIALE - RUOLO CUSTOM',
                    description: `**${playerName}**\nPremio: **${prizeName}**\nCrediti attuali: ${this.credits}\nPartite totali: ${this.plays}`,
                    color: 0xf9ca24,
                    timestamp: new Date().toISOString()
                }]
            };
            await fetch(DISCORD_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (e) {}
    }

    draw() {
        const c = this.ctx;
        c.fillStyle = '#0a0c14';
        c.fillRect(0, 0, this.width, this.height);

        c.fillStyle = '#1f2533';
        c.fillRect(this.machine.left - 20, this.machine.top - 30, this.machine.width + 40, this.machine.height + 80);
        c.strokeStyle = '#f9ca24';
        c.lineWidth = 6;
        c.strokeRect(this.machine.left - 20, this.machine.top - 30, this.machine.width + 40, this.machine.height + 80);

        c.fillStyle = 'rgba(20, 25, 40, 0.35)';
        c.fillRect(this.machine.glassLeft, this.machine.glassTop, this.machine.glassW, this.machine.glassH);
        c.strokeStyle = 'rgba(249,202,36,0.6)';
        c.lineWidth = 3;
        c.strokeRect(this.machine.glassLeft, this.machine.glassTop, this.machine.glassW, this.machine.glassH);

        c.fillStyle = '#2d3446';
        c.fillRect(this.machine.glassLeft + 8, this.machine.glassTop + this.machine.glassH - 35, this.machine.glassW - 16, 30);

        this.prizes.forEach(p => {
            c.save();
            c.translate(p.x, p.y);
            if (p.grabbed) c.rotate(Math.sin(Date.now()/180) * 0.08);

            c.fillStyle = 'rgba(0,0,0,0.35)';
            c.beginPath();
            c.ellipse(4, p.r + 6, p.r * 0.9, 6, 0, 0, Math.PI * 2);
            c.fill();

            c.fillStyle = p.color;
            c.beginPath();
            c.arc(0, 0, p.r, 0, Math.PI * 2);
            c.fill();

            c.fillStyle = 'rgba(255,255,255,0.35)';
            c.beginPath();
            c.arc(-p.r * 0.35, -p.r * 0.35, p.r * 0.45, 0, Math.PI * 2);
            c.fill();

            c.fillStyle = '#111';
            c.fillRect(-5, -3, 3, 3);
            c.fillRect(2, -3, 3, 3);
            c.strokeStyle = '#111';
            c.lineWidth = 1.5;
            c.beginPath();
            c.arc(0, 4, 5, 0.2, Math.PI - 0.2);
            c.stroke();
            c.restore();
        });

        const clawBaseY = this.machine.top + 55;
        const clawX = this.claw.x;

        c.fillStyle = '#3a4255';
        c.fillRect(this.machine.glassLeft, clawBaseY - 18, this.machine.glassW, 22);
        c.strokeStyle = '#f9ca24';
        c.lineWidth = 2;
        c.strokeRect(this.machine.glassLeft, clawBaseY - 18, this.machine.glassW, 22);

        c.strokeStyle = '#e0e0e0';
        c.lineWidth = 7;
        c.beginPath();
        c.moveTo(clawX, clawBaseY);
        c.lineTo(clawX, clawBaseY + this.armLength);
        c.stroke();

        c.strokeStyle = '#888';
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(clawX - 4, clawBaseY);
        c.lineTo(clawX - 4, clawBaseY + this.armLength);
        c.stroke();

        const clawY = clawBaseY + this.armLength;
        c.fillStyle = '#f9ca24';
        c.beginPath();
        c.rect(clawX - 18, clawY - 8, 36, 16);
        c.fill();
        c.strokeStyle = '#c9a227';
        c.lineWidth = 2;
        c.stroke();

        const open = this.claw.state === 'GRABBING' ? this.claw.grabOffset : 0;
        c.strokeStyle = '#ddd';
        c.lineWidth = 5;
        c.beginPath();
        c.moveTo(clawX - 12, clawY + 6);
        c.lineTo(clawX - 22 - open, clawY + 28);
        c.stroke();
        c.beginPath();
        c.moveTo(clawX + 12, clawY + 6);
        c.lineTo(clawX + 22 + open, clawY + 28);
        c.stroke();

        this.particles.forEach(p => {
            c.globalAlpha = Math.max(0.1, p.life / p.maxLife);
            c.fillStyle = p.color;
            c.beginPath();
            c.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
            c.fill();
        });
        c.globalAlpha = 1;

        this._drawHUD(c);

        if (this.message && this.messageTimer > 0) {
            const alpha = Math.min(1, this.messageTimer / 35);
            const isSpecial = this.message.includes('RUOLO CUSTOM');
            c.fillStyle = `rgba(10,12,20,${0.92 * alpha})`;
            c.fillRect(this.width/2 - 320, 85, 640, 78);
            c.strokeStyle = isSpecial ? '#f9ca24' : '#55efc4';
            c.lineWidth = 4;
            c.strokeRect(this.width/2 - 320, 85, 640, 78);

            c.fillStyle = isSpecial ? '#f9ca24' : '#fff';
            c.font = isSpecial ? 'bold 26px "Inter", system-ui' : 'bold 22px "Inter", system-ui';
            c.textAlign = 'center';
            c.fillText(this.message, this.width/2, 125);

            if (isSpecial) {
                c.fillStyle = 'rgba(255,255,255,0.7)';
                c.font = '15px "Inter", system-ui';
                c.fillText('✨ Log inviato su Discord!', this.width/2, 148);
            }
        }

        if (this.showGuide) this._drawGuide(c);

        if (this.showDiscordPrompt && this.attemptsLeft <= 0) {
            const pw = 620, ph = 280;
            const px = this.width/2 - pw/2;
            const py = this.height/2 - ph/2 - 30;

            c.fillStyle = 'rgba(10,12,20,0.97)';
            c.fillRect(px, py, pw, ph);
            c.strokeStyle = '#f9ca24';
            c.lineWidth = 4;
            c.strokeRect(px, py, pw, ph);

            c.fillStyle = '#f9ca24';
            c.font = 'bold 24px "Inter", system-ui';
            c.textAlign = 'center';
            c.fillText('🎰 TENTATIVI ESAURITI!', this.width/2, py + 45);

            c.fillStyle = 'rgba(255,255,255,0.85)';
            c.font = '16px "Inter", system-ui';
            c.fillText('Per sbloccare altri 5 tentativi e continuare a giocare:', this.width/2, py + 85);
            c.fillText('scrivi almeno 8 messaggi nel canale Discord del server', this.width/2, py + 108);
            c.fillText('e poi clicca il pulsante qui sotto.', this.width/2, py + 131);

            const claimY = py + 160;
            c.fillStyle = '#55efc4';
            c.fillRect(px + 80, claimY, pw - 160, 58);
            c.strokeStyle = '#fff';
            c.lineWidth = 3;
            c.strokeRect(px + 80, claimY, pw - 160, 58);

            c.fillStyle = '#111';
            c.font = 'bold 18px "Inter", system-ui';
            c.fillText('HO SCRITTO I MESSAGGI! +5 TENTATIVI', this.width/2, claimY + 37);

            c.fillStyle = 'rgba(255,255,255,0.5)';
            c.font = '13px "Inter", system-ui';
            c.fillText('Questo aiuta a creare attività nel server Discord ❤️', this.width/2, py + ph - 22);
        }
    }

    _drawHUD(c) {
        c.fillStyle = 'rgba(15,18,28,0.95)';
        c.fillRect(0, 0, this.width, 68);
        c.strokeStyle = 'rgba(249,202,36,0.3)';
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(0, 68);
        c.lineTo(this.width, 68);
        c.stroke();

        c.fillStyle = '#f9ca24';
        c.font = 'bold 26px "Inter", system-ui';
        c.textAlign = 'left';
        c.fillText('🎰  MACCHINA A GANCIO', 30, 42);

        c.fillStyle = '#55efc4';
        c.font = 'bold 20px "Inter", system-ui';
        c.fillText(`$ ${this.credits}`, this.width - 300, 42);

        const attColor = this.attemptsLeft > 2 ? '#55efc4' : this.attemptsLeft > 0 ? '#f9ca24' : '#d63031';
        c.fillStyle = attColor;
        c.font = 'bold 18px "Inter", system-ui';
        c.fillText(`Tentativi: ${this.attemptsLeft}/${this.maxAttempts}`, this.width - 300, 62);

        c.fillStyle = 'rgba(255,255,255,0.6)';
        c.font = '14px "Inter", system-ui';
        c.fillText(`SCORE: ${this.score}  •  Vinto: ${this.totalWon}`, this.width - 300, 78);

        const btnX = this.width - 240, btnY = this.height - 155;
        const btnW = 210, btnH = 85;
        const canPlay = this.credits >= 200 && this.claw.state === 'IDLE' && this.attemptsLeft > 0;

        if (this._btnPressed) {
            c.fillStyle = '#c9a227';
            c.fillRect(btnX + 3, btnY + 3, btnW, btnH);
        } else {
            c.fillStyle = 'rgba(0,0,0,0.4)';
            c.fillRect(btnX + 4, btnY + 4, btnW, btnH);
        }

        c.fillStyle = canPlay ? '#f9ca24' : '#555';
        c.fillRect(btnX, btnY, btnW, btnH);
        c.strokeStyle = canPlay ? '#fff' : '#777';
        c.lineWidth = 4;
        c.strokeRect(btnX, btnY, btnW, btnH);

        c.fillStyle = canPlay ? '#111' : '#aaa';
        c.font = 'bold 20px "Inter", system-ui';
        c.textAlign = 'center';
        c.fillText(canPlay ? 'LANCIA IL GANCIO' : (this.attemptsLeft <= 0 ? 'TENTATIVI FINITI' : 'CREDITI BASSI'), btnX + btnW/2, btnY + 38);

        c.font = '13px "Inter", system-ui';
        c.fillText(canPlay ? 'SPAZIO o TAP qui' : '', btnX + btnW/2, btnY + 60);

        const rX = btnX - 130, rY = btnY + 15;
        c.fillStyle = '#3a4255';
        c.fillRect(rX, rY, 110, 55);
        c.strokeStyle = '#a29bfe';
        c.lineWidth = 2;
        c.strokeRect(rX, rY, 110, 55);
        c.fillStyle = '#a29bfe';
        c.font = 'bold 14px "Inter", system-ui';
        c.fillText('RICARICA', rX + 55, rY + 24);
        c.font = '11px "Inter", system-ui';
        c.fillText('(R)', rX + 55, rY + 42);

        c.fillStyle = 'rgba(255,255,255,0.4)';
        c.font = '12px "Inter", system-ui';
        c.textAlign = 'center';
        c.fillText('← → Muovi  •  SPAZIO/TAP = Lancia  •  R = Ricarica  •  ? = Guida  •  Tentativi limitati per attività Discord', this.width/2, this.height - 22);
    }

    _drawGuide(c) {
        const gw = 620, gh = 380;
        const gx = this.width/2 - gw/2;
        const gy = this.height/2 - gh/2;

        c.fillStyle = 'rgba(10,12,20,0.96)';
        c.fillRect(gx, gy, gw, gh);
        c.strokeStyle = '#a29bfe';
        c.lineWidth = 3;
        c.strokeRect(gx, gy, gw, gh);

        c.fillStyle = '#a29bfe';
        c.font = 'bold 24px "Inter", system-ui';
        c.textAlign = 'center';
        c.fillText('COME SI GIOCA', this.width/2, gy + 42);

        c.strokeStyle = 'rgba(162,155,254,0.3)';
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(gx + 40, gy + 58);
        c.lineTo(gx + gw - 40, gy + 58);
        c.stroke();

        const lines = [
            'Muovi il gancio con ← →  (o tocca sinistra/destra dello schermo)',
            '',
            'Premi SPAZIO o tocca il pulsante giallo per LANCIARE il gancio',
            '',
            'Quando il gancio scende, si chiude automaticamente',
            'Se afferra un pelouche o moneta → vinci i coins!',
            '',
            'Premi R per ricaricare la macchina con nuovi premi',
            '',
            '6% di chance base + premi rari = possibilità di vincere il RUOLO CUSTOM',
            '(log inviato automaticamente su Discord)',
            '',
            'Ogni tentativo costa 200 crediti'
        ];

        c.fillStyle = 'rgba(255,255,255,0.85)';
        c.font = '16px "Inter", system-ui';
        c.textAlign = 'left';
        lines.forEach((line, i) => c.fillText(line, gx + 55, gy + 95 + i * 24));

        c.fillStyle = 'rgba(255,255,255,0.4)';
        c.font = '14px "Inter", system-ui';
        c.textAlign = 'center';
        c.fillText('[ ? ] o [ ESC ] per chiudere la guida', this.width/2, gy + gh - 28);
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
