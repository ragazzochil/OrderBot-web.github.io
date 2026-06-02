/**
 * GALAXY WORLD - Space Economy Arcade Game v5
 * Free camera · Zoom · Guide · Android 14 vector style
 */

const GITHUB_REPO = 'OrderBot-web/OrderBot-web.github.io';
const GITHUB_TOKEN = '';

class SpaceGame {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx    = this.canvas.getContext('2d');
        this.resize();

        // ── Physics ────────────────────────────────────────────────────────
        this.G         = 0.38;
        this.friction  = 0.997;
        this.baseAccel = 0.22;
        this.mapLimit  = 2600;

        // ── State ──────────────────────────────────────────────────────────
        this.running      = false;
        this.score        = 0;
        this.credits      = 3000;
        this.cargo        = [];
        this.maxCargo     = 8;
        this.hull         = 3;
        this.asteroidHitCooldown = 0;
        this.activeCrises = [];
        this.particles    = [];
        this.pilots       = [];
        this.showHireMenu = false;
        this.showGuide    = false;
        this.mobileKeys   = {};
        this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        this.stars        = this._genStars(260);
        this.sun          = { x: 0, y: 0, size: 32 };

        // ── Free camera ────────────────────────────────────────────────────
        // zoom = screen pixels per world unit
        this.camera = { x: 0, y: 0, zoom: 0.44, targetZoom: 0.44, panX: 0, panY: 0 };
        this._isPanning   = false;
        this._lastPan     = { x: 0, y: 0 };
        this._pinchDist   = 0;

        // ── City founding ──────────────────────────────────────────────────
        this.launchState   = 'CHOOSE_CITY';
        this.launchTimer   = 0;
        this.hoveredBody   = null;
        this.selectedBody  = null;
        this.homeBody      = null;
        this.foundingTimer = 0;

        // ── Planets ────────────────────────────────────────────────────────
        this.planets = [
            { id:'mercurio', name:'MERCURIO', dist:110,  size:6,  color:'#b2bec3', speed:0.016,  res:'SOLARE',       req:'FILTRI',    deliveries:0, crisis:null },
            { id:'venere',   name:'VENERE',   dist:170,  size:9,  color:'#e17055', speed:0.009,  res:'ACIDO',        req:'CIBO',      deliveries:0, crisis:null },
            { id:'terra',    name:'TERRA',    dist:250,  size:11, color:'#0984e3', speed:0.005,  res:'CIBO',         req:'ELIO-3',    deliveries:0, crisis:null },
            { id:'marte',    name:'MARTE',    dist:390,  size:9,  color:'#d63031', speed:0.004,  res:'FERRO',        req:'ACQUA',     deliveries:0, crisis:null },
            { id:'giove',    name:'GIOVE',    dist:620,  size:24, color:'#e67e22', speed:0.0012, res:'GAS',          req:'CHIPS',     deliveries:0, crisis:null },
            { id:'saturno',  name:'SATURNO',  dist:880,  size:20, color:'#f9ca24', speed:0.0008, res:'GHIACCIO',    req:'MEDS',      deliveries:0, crisis:null, rings:true },
            { id:'urano',    name:'URANO',    dist:1130, size:16, color:'#81ecec', speed:0.0005, res:'DIAMANTI',    req:'GAS',       deliveries:0, crisis:null },
            { id:'nettuno',  name:'NETTUNO',  dist:1450, size:16, color:'#6c5ce7', speed:0.0003, res:'ENERGIA',     req:'DIAMANTI',  deliveries:0, crisis:null },
        ];
        this.moons = [
            { id:'luna',     name:'LUNA',     parent:'terra',   dist:32, size:5,  color:'#dfe6e9', speed:0.030, res:'ELIO-3',      req:'CIBO',     deliveries:0, crisis:null },
            { id:'phobos',   name:'PHOBOS',   parent:'marte',   dist:22, size:3,  color:'#b2bec3', speed:0.080, res:'ACQUA',       req:'FERRO',    deliveries:0, crisis:null },
            { id:'deimos',   name:'DEIMOS',   parent:'marte',   dist:38, size:3,  color:'#95a5a6', speed:0.040, res:'SILICIO',     req:'ENERGIA',  deliveries:0, crisis:null },
            { id:'io',       name:'IO',       parent:'giove',   dist:40, size:5,  color:'#f9ca24', speed:0.055, res:'ZOLFO',      req:'GAS',      deliveries:0, crisis:null },
            { id:'europa',   name:'EUROPA',   parent:'giove',   dist:56, size:5,  color:'#dfe6e9', speed:0.035, res:'ACQUA',      req:'CHIPS',    deliveries:0, crisis:null },
            { id:'ganimede', name:'GANIMEDE', parent:'giove',   dist:74, size:6,  color:'#636e72', speed:0.022, res:'GHIACCIO',   req:'MEDS',     deliveries:0, crisis:null },
            { id:'callisto', name:'CALLISTO', parent:'giove',   dist:94, size:5,  color:'#2d3436', speed:0.014, res:'MINERALI',   req:'CIBO',     deliveries:0, crisis:null },
            { id:'titano',   name:'TITANO',   parent:'saturno', dist:62, size:6,  color:'#fdcb6e', speed:0.020, res:'IDROCARBURI',req:'FILTRI',   deliveries:0, crisis:null },
            { id:'encelado', name:'ENCELADO', parent:'saturno', dist:42, size:4,  color:'#f5f6fa', speed:0.040, res:'ACQUA',      req:'MINERALI', deliveries:0, crisis:null },
            { id:'titania',  name:'TITANIA',  parent:'urano',   dist:52, size:5,  color:'#81ecec', speed:0.028, res:'CRISTALLI',  req:'ENERGIA',  deliveries:0, crisis:null },
            { id:'tritone',  name:'TRITONE',  parent:'nettuno', dist:46, size:5,  color:'#74b9ff', speed:0.025, res:'AZOTO',      req:'DIAMANTI', deliveries:0, crisis:null },
        ];
        this.allBodies = [...this.planets, ...this.moons];

        this.asteroids = Array.from({ length:52 }, (_,i) => {
            const angle = (i/52)*Math.PI*2 + (Math.random()-0.5)*0.5;
            const dist  = 460 + Math.random()*100;
            return { angle, dist, speed:0.0016+Math.random()*0.001,
                     size:1.5+Math.random()*2.5,
                     color:Math.random()>0.5?'#636e72':'#95a5a6', x:0, y:0 };
        });

        this.pilotRoster = [
            { type:'ROOKIE',      cost:800,  speed:2.0, skillDodge:false, color:'#74b9ff', desc:'Economico · vulnerabile agli asteroidi' },
            { type:'SPERICOLATO', cost:1500, speed:3.8, skillDodge:false, color:'#fd79a8', desc:'Velocissimo · ignora i rischi' },
            { type:'VETERANO',    cost:3000, speed:2.8, skillDodge:true,  color:'#55efc4', desc:'Costoso · evita la fascia asteroidi' },
        ];

        // Init positions
        this.planets.forEach(p => { p.angle=0; p.x=p.dist; p.y=0; });
        this.moons.forEach(m => {
            m.angle=0;
            const par = this.planets.find(p=>p.id===m.parent);
            m.x=(par?par.x:0)+m.dist; m.y=par?par.y:0;
        });
        this.asteroids.forEach(a => { a.x=Math.cos(a.angle)*a.dist; a.y=Math.sin(a.angle)*a.dist; });

        const terra = this.planets.find(p=>p.id==='terra');
        this.ship = { x:terra.x, y:terra.y, vx:0, vy:0, angle:-Math.PI/2 };

        this.camera.x = this.width/2;
        this.camera.y = this.height/2;

        this.init();
    }

    // ── Setup ────────────────────────────────────────────────────────────────

    _genStars(n) {
        return Array.from({ length:n }, () => ({
            x:(Math.random()-0.5)*3800, y:(Math.random()-0.5)*3800,
            r:Math.random()>0.85?1.2:0.55, alpha:0.2+Math.random()*0.8
        }));
    }

    resize() {
        this.width  = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width  = this.width;
        this.canvas.height = this.height;
    }

    init() {
        window.addEventListener('resize', () => this.resize());
        this.keys = {};

        window.addEventListener('keydown', e => {
            this.keys[e.code] = true;
            const s = this.launchState;

            // Guide toggle
            if (e.key === '?' || e.code === 'Slash') { this.showGuide = !this.showGuide; return; }
            if (e.code === 'Escape') { this.showGuide = false; this.showHireMenu = false; return; }

            // Found city
            if ((e.code==='Enter'||e.code==='Space') && s==='CHOOSE_CITY' && this.selectedBody)
                this._foundCity(this.selectedBody);

            // Snap camera back to ship
            if (e.code==='KeyG' && s==='PLAY') { this.camera.panX=0; this.camera.panY=0; }

            // Hire menu
            if (e.code==='KeyH' && s==='PLAY') this.showHireMenu=!this.showHireMenu;
            if (this.showHireMenu) {
                if (e.code==='Digit1') this.hireNPC(0);
                if (e.code==='Digit2') this.hireNPC(1);
                if (e.code==='Digit3') this.hireNPC(2);
            }
        });
        window.addEventListener('keyup', e => { this.keys[e.code]=false; });

        // ── Zoom ───────────────────────────────────────────────────────────
        this.canvas.addEventListener('wheel', e => {
            e.preventDefault();
            const factor = e.deltaY > 0 ? 0.88 : 1/0.88;
            const isOver = this.launchState==='CHOOSE_CITY';
            const minZ = isOver ? 0.06 : 0.12;
            const maxZ = isOver ? 1.2  : 12;
            const oldZ = this.camera.targetZoom;
            const newZ = Math.max(minZ, Math.min(maxZ, oldZ * factor));
            // Zoom toward mouse cursor
            const mx = e.clientX, my = e.clientY;
            // world point under mouse stays fixed:
            // world = (screen - camera) / zoom  →  camera_new = screen - world * newZ
            const wx = (mx - this.camera.x) / oldZ;
            const wy = (my - this.camera.y) / oldZ;
            // We'll adjust panX/panY after targetZoom change applies in update()
            // Store the zoom anchor for smooth interpolation
            this._zoomAnchor = { mx, my, wx, wy, fromZ: oldZ, toZ: newZ };
            this.camera.targetZoom = newZ;
        }, { passive:false });

        // ── Right-click pan ────────────────────────────────────────────────
        this.canvas.addEventListener('mousedown', e => {
            if (e.button===2) {
                this._isPanning = true;
                this._lastPan   = { x:e.clientX, y:e.clientY };
                e.preventDefault();
            }
        });
        window.addEventListener('mousemove', e => {
            if (this._isPanning) {
                this.camera.panX += e.clientX - this._lastPan.x;
                this.camera.panY += e.clientY - this._lastPan.y;
                this._lastPan = { x:e.clientX, y:e.clientY };
            }
            if (this.launchState==='CHOOSE_CITY') this.hoveredBody = this._bodyAtScreen(e.clientX, e.clientY);
        });
        window.addEventListener('mouseup', e => { if (e.button===2) this._isPanning=false; });
        this.canvas.addEventListener('contextmenu', e => e.preventDefault());

        // ── Click (choose city) ────────────────────────────────────────────
        this.canvas.addEventListener('click', e => {
            if (this.launchState!=='CHOOSE_CITY') return;
            const b = this._bodyAtScreen(e.clientX, e.clientY);
            if (b && b.id!=='terra') {
                if (this.selectedBody===b) this._foundCity(b); else this.selectedBody=b;
            }
        });

        // ── Touch ──────────────────────────────────────────────────────────
        this.canvas.addEventListener('touchstart', e => { this._processTouches(e, true);  }, { passive:false });
        this.canvas.addEventListener('touchmove',  e => { this._processTouches(e, false); }, { passive:false });
        this.canvas.addEventListener('touchend',   e => {
            this._processTouches(e, false);
            // CHOOSE_CITY: tap on a body (not on a button)
            if (this.launchState==='CHOOSE_CITY' && e.changedTouches[0]) {
                const ct=e.changedTouches[0];
                if (!this._touchOnButton(ct.clientX, ct.clientY)) {
                    const b=this._bodyAtScreen(ct.clientX, ct.clientY);
                    if (b && b.id!=='terra') { if (this.selectedBody===b) this._foundCity(b); else this.selectedBody=b; }
                }
            }
        }, { passive:false });

        this.crisisInterval = setInterval(() => { if (this.running && this.launchState==='PLAY') this.spawnCrisis(); }, 13000);
        document.getElementById('submit-score-btn').addEventListener('click', () => this.submitScore());
    }

    // ── Mobile controls ──────────────────────────────────────────────────────

    _getMobileButtons() {
        // Recompute only on resize
        if (this._mbCache && this._mbW===this.width && this._mbH===this.height) return this._mbCache;
        const s  = Math.min(this.width, this.height);
        const r  = Math.max(38, s * 0.072);   // base radius, scales with screen
        const mg = r * 1.05;
        const by = this.height - mg - r;       // bottom row y
        this._mbCache = [
            // Flight controls (only during gameplay)
            { id:'left',   cx: mg+r,          cy: by,        r,        key:'ArrowLeft',  label:'◀', flight:true  },
            { id:'right',  cx: mg+r*3.3,      cy: by,        r,        key:'ArrowRight', label:'▶', flight:true  },
            { id:'thrust', cx: this.width-mg-r*1.15, cy: by, r: r*1.15, key:'ArrowUp',   label:'▲', flight:true  },
            // Utility (always)
            { id:'guide',  cx: this.width-mg-r*0.65, cy: mg+r*0.65, r: r*0.62, key:'guide', label:'?', toggle:true },
            { id:'snap',   cx: this.width-mg-r*0.65-r*1.75, cy: mg+r*0.65, r: r*0.62, key:'snap', label:'G', toggle:true },
        ];
        this._mbW=this.width; this._mbH=this.height;
        return this._mbCache;
    }

    _touchOnButton(tx, ty) {
        return this._getMobileButtons().some(b => Math.sqrt((tx-b.cx)**2+(ty-b.cy)**2) < b.r+14);
    }

    _processTouches(e, isStart) {
        e.preventDefault();
        this.isTouchDevice = true;  // confirm touch device on first touch

        // Pinch-to-zoom (2 fingers, no button logic)
        if (e.touches.length >= 2) {
            const dx=e.touches[0].clientX-e.touches[1].clientX;
            const dy=e.touches[0].clientY-e.touches[1].clientY;
            const dist=Math.sqrt(dx*dx+dy*dy);
            if (this._pinchDist>0) {
                const factor=dist/this._pinchDist;
                const isOver=this.launchState==='CHOOSE_CITY';
                this.camera.targetZoom=Math.max(isOver?0.06:0.12, Math.min(isOver?1.2:12, this.camera.targetZoom*factor));
            }
            this._pinchDist=dist;
            this.mobileKeys={}; this.isTouching=false;
            return;
        }
        this._pinchDist=0;

        const btns=this._getMobileButtons();
        const newKeys={};
        let aimTouch=null;

        for (const touch of e.touches) {
            let hit=null;
            for (const btn of btns) {
                if (Math.sqrt((touch.clientX-btn.cx)**2+(touch.clientY-btn.cy)**2) < btn.r+14) { hit=btn; break; }
            }
            if (hit) {
                if (hit.toggle && isStart) {
                    if (hit.id==='guide') this.showGuide=!this.showGuide;
                    if (hit.id==='snap')  { this.camera.panX=0; this.camera.panY=0; }
                } else if (!hit.toggle) {
                    newKeys[hit.key]=true;
                }
            } else if (!aimTouch) {
                aimTouch=touch;
            }
        }

        this.mobileKeys=newKeys;
        this.isTouching = !!aimTouch && this.launchState==='PLAY';
        if (aimTouch) this.touchPos={x:aimTouch.clientX, y:aimTouch.clientY};
        // CHOOSE_CITY hover update
        if (this.launchState==='CHOOSE_CITY' && aimTouch) this.hoveredBody=this._bodyAtScreen(aimTouch.clientX, aimTouch.clientY);
    }

    // ── Coordinate helpers ───────────────────────────────────────────────────

    _worldFromScreen(sx, sy) {
        return { x:(sx-this.camera.x)/this.camera.zoom, y:(sy-this.camera.y)/this.camera.zoom };
    }

    _bodyAtScreen(sx, sy) {
        const { x:wx, y:wy } = this._worldFromScreen(sx, sy);
        return this.allBodies.find(b => {
            const d=Math.sqrt((b.x-wx)**2+(b.y-wy)**2);
            return d < Math.max(b.size*3.5, 28/this.camera.zoom);
        }) || null;
    }

    // ── City Founding ────────────────────────────────────────────────────────

    _foundCity(body) {
        body.deliveries=3; body.isHome=true; this.homeBody=body;
        const bonus=Math.floor(body.dist*2.5);
        this.credits+=bonus; this.score+=bonus;
        this.camera.panX=0; this.camera.panY=0;
        this.camera.targetZoom=2.4;
        this.launchState='FOUNDING'; this.foundingTimer=110;
        for (let i=0; i<55; i++) {
            const a=Math.random()*Math.PI*2, spd=0.5+Math.random()*2.5;
            this._particle(body.x, body.y, Math.cos(a)*spd, Math.sin(a)*spd,
                ['#f9ca24','#55efc4','#a29bfe','#fff','#fd79a8'][Math.floor(Math.random()*5)],
                70+Math.random()*50);
        }
    }

    // ── Fleet ────────────────────────────────────────────────────────────────

    hireNPC(idx) {
        const def=this.pilotRoster[idx];
        if (!def||this.credits<def.cost) return;
        const pool=this.allBodies.filter(b=>b.x!==undefined);
        const from=pool[Math.floor(Math.random()*pool.length)];
        const to=pool.filter(b=>b!==from)[Math.floor(Math.random()*(pool.length-1))];
        this.credits-=def.cost;
        this.pilots.push({...def, x:from.x, y:from.y, vx:0, vy:0, angle:0, hull:2,
                          state:'pickup', cargo:null, fromId:from.id, toId:to.id});
        this.showHireMenu=false;
    }

    // ── Economy ──────────────────────────────────────────────────────────────

    spawnCrisis() {
        const cands=this.allBodies.filter(b=>!b.crisis);
        if (!cands.length) return;
        const body=cands[Math.floor(Math.random()*cands.length)];
        body.crisis={resource:body.req, timer:55, maxTime:55};
        this.activeCrises.push(body);
    }

    dock(body) {
        const idx=this.cargo.indexOf(body.req);
        if (idx!==-1) {
            this.cargo.splice(idx,1);
            let reward=1200;
            if (body.crisis) {
                body.crisis=null;
                this.activeCrises=this.activeCrises.filter(b=>b!==body);
                reward+=4000; this.score+=4000;
            }
            this.credits+=reward; this.score+=reward; body.deliveries++;
            for (let i=0;i<8;i++) { const a=Math.random()*Math.PI*2; this._particle(body.x,body.y,Math.cos(a)*1.2,Math.sin(a)*1.2,'#f9ca24',28); }
        } else if (this.cargo.length<this.maxCargo && this.credits>=100 && body.res) {
            this.cargo.push(body.res); this.credits-=100;
        }
        this.ship.vx*=-0.15; this.ship.vy*=-0.15;
    }

    // ── Update ───────────────────────────────────────────────────────────────

    start() { this.running=true; this.loop(); }

    update() {
        if (!this.running) return;
        this._updateBodies();

        // Smooth zoom with cursor anchor
        const prevZoom = this.camera.zoom;
        this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * 0.12;
        if (this._zoomAnchor && Math.abs(this.camera.zoom - prevZoom) > 0.0001) {
            const { mx, my, wx, wy } = this._zoomAnchor;
            // base follow offset
            const baseX = this.launchState==='CHOOSE_CITY' || this.launchState==='FOUNDING'
                ? (this.homeBody && this.launchState==='FOUNDING' ? -this.homeBody.x*this.camera.zoom+this.width/2 : this.width/2)
                : -this.ship.x*this.camera.zoom+this.width/2;
            const baseY = this.launchState==='CHOOSE_CITY' || this.launchState==='FOUNDING'
                ? (this.homeBody && this.launchState==='FOUNDING' ? -this.homeBody.y*this.camera.zoom+this.height/2 : this.height/2)
                : -this.ship.y*this.camera.zoom+this.height/2;
            // desired camera.x so world point wx stays at mx
            const desiredCX = mx - wx*this.camera.zoom;
            this.camera.panX = desiredCX - baseX;
            const desiredCY = my - wy*this.camera.zoom;
            this.camera.panY = desiredCY - baseY;
        }
        if (Math.abs(this.camera.zoom - this.camera.targetZoom) < 0.001) this._zoomAnchor = null;

        if (this.launchState==='CHOOSE_CITY') {
            this.camera.x = this.width/2  + this.camera.panX;
            this.camera.y = this.height/2 + this.camera.panY;
            return;
        }
        if (this.launchState==='FOUNDING') {
            this.foundingTimer--;
            if (this.homeBody) {
                this.camera.x=-this.homeBody.x*this.camera.zoom+this.width/2  + this.camera.panX;
                this.camera.y=-this.homeBody.y*this.camera.zoom+this.height/2 + this.camera.panY;
            }
            if (this.foundingTimer<=0) { this.launchState='COUNTDOWN'; this.launchTimer=180; this.camera.targetZoom=2.8; }
            this._updateParticles(); return;
        }

        this._updateShip();
        if (this.launchState==='PLAY') { this._updateNPCs(); this._updateCrises(); }
        this._updateParticles();
        this.camera.x=-this.ship.x*this.camera.zoom+this.width/2  + this.camera.panX;
        this.camera.y=-this.ship.y*this.camera.zoom+this.height/2 + this.camera.panY;
    }

    _updateBodies() {
        this.planets.forEach(p => {
            p.angle=(p.angle||0)+p.speed;
            p.x=Math.cos(p.angle)*p.dist; p.y=Math.sin(p.angle)*p.dist;
        });
        this.moons.forEach(m => {
            m.angle=(m.angle||0)+m.speed;
            const par=this.planets.find(p=>p.id===m.parent);
            if (par) { m.x=par.x+Math.cos(m.angle)*m.dist; m.y=par.y+Math.sin(m.angle)*m.dist; }
        });
        this.asteroids.forEach(a => { a.angle+=a.speed; a.x=Math.cos(a.angle)*a.dist; a.y=Math.sin(a.angle)*a.dist; });
    }

    _updateShip() {
        if (this.launchState==='COUNTDOWN') {
            this.launchTimer--;
            const t=this.planets.find(p=>p.id==='terra');
            this.ship.x=t.x; this.ship.y=t.y;
            if (this.launchTimer<=0) { this.launchState='BOOST'; this.launchTimer=70; }
            return;
        }
        if (this.launchState==='BOOST') {
            this.launchTimer--;
            this.ship.vy=-1.5; this.ship.angle=-Math.PI/2;
            if (Math.random()>0.4) this._particle(this.ship.x,this.ship.y,(Math.random()-0.5)*0.4,1.5,'#e17055',28);
            if (this.launchTimer<=0) this.launchState='PLAY';
            return;
        }
        // PLAY
        this.ship.mass=1+this.cargo.length*0.3;
        const accel=this.baseAccel/this.ship.mass;
        const mk=this.mobileKeys;
        if (this.keys['ArrowUp']||this.keys['KeyW']||mk['ArrowUp']) {
            this.ship.vx+=Math.cos(this.ship.angle)*accel;
            this.ship.vy+=Math.sin(this.ship.angle)*accel;
            this._particle(this.ship.x,this.ship.y,
                -Math.cos(this.ship.angle)*0.5+(Math.random()-0.5)*0.3,
                -Math.sin(this.ship.angle)*0.5+(Math.random()-0.5)*0.3,'#e17055',16);
        }
        if (this.keys['ArrowLeft']||this.keys['KeyA']||mk['ArrowLeft'])  this.ship.angle-=0.065;
        if (this.keys['ArrowRight']||this.keys['KeyD']||mk['ArrowRight']) this.ship.angle+=0.065;
        if (this.isTouching && this.touchPos) {
            const wx=(this.touchPos.x-this.camera.x)/this.camera.zoom;
            const wy=(this.touchPos.y-this.camera.y)/this.camera.zoom;
            let diff=Math.atan2(wy-this.ship.y, wx-this.ship.x)-this.ship.angle;
            while (diff<-Math.PI) diff+=Math.PI*2; while (diff>Math.PI) diff-=Math.PI*2;
            this.ship.angle+=diff*0.12;
            this.ship.vx+=Math.cos(this.ship.angle)*accel;
            this.ship.vy+=Math.sin(this.ship.angle)*accel;
        }
        const dSun=Math.sqrt(this.ship.x**2+this.ship.y**2);
        if (dSun<this.sun.size+4) { this.gameOver('BRUCIATO DAL SOLE'); return; }
        const force=this.G*300/(dSun**2);
        this.ship.vx-=(this.ship.x/dSun)*force; this.ship.vy-=(this.ship.y/dSun)*force;
        if (dSun>this.mapLimit) { this.ship.vx-=(this.ship.x/dSun)*2; this.ship.vy-=(this.ship.y/dSun)*2; }
        this.ship.x+=this.ship.vx; this.ship.y+=this.ship.vy;
        this.ship.vx*=this.friction; this.ship.vy*=this.friction;
        for (const b of this.allBodies) {
            const d=Math.sqrt((b.x-this.ship.x)**2+(b.y-this.ship.y)**2);
            if (d<b.size+8) { this.dock(b); break; }
        }
        if (this.asteroidHitCooldown>0) { this.asteroidHitCooldown--; return; }
        for (const a of this.asteroids) {
            const d=Math.sqrt((a.x-this.ship.x)**2+(a.y-this.ship.y)**2);
            if (d<a.size+5) {
                this.hull--;
                if (this.cargo.length>0) this.cargo.pop();
                this.ship.vx=(this.ship.x-a.x)*0.35; this.ship.vy=(this.ship.y-a.y)*0.35;
                for (let i=0;i<12;i++) this._particle(this.ship.x,this.ship.y,(Math.random()-0.5)*3,(Math.random()-0.5)*3,'#d63031',32);
                this.asteroidHitCooldown=90;
                if (this.hull<=0) { this.gameOver('SCAFO DISTRUTTO'); return; }
                break;
            }
        }
    }

    _updateNPCs() {
        this.pilots=this.pilots.filter(pilot => {
            const tid=pilot.state==='pickup'?pilot.fromId:pilot.toId;
            const target=this.allBodies.find(b=>b.id===tid);
            if (!target) return true;
            const dx=target.x-pilot.x, dy=target.y-pilot.y, d=Math.sqrt(dx*dx+dy*dy);
            if (d>1) pilot.angle=Math.atan2(dy,dx);
            if (d>target.size+4) { pilot.vx+=(dx/d)*pilot.speed*0.12; pilot.vy+=(dy/d)*pilot.speed*0.12; }
            if (pilot.skillDodge) {
                for (const a of this.asteroids) { const adx=a.x-pilot.x,ady=a.y-pilot.y,ad=Math.sqrt(adx*adx+ady*ady); if (ad<50) { pilot.vx-=(adx/ad)*0.6; pilot.vy-=(ady/ad)*0.6; } }
            } else {
                for (const a of this.asteroids) { const adx=a.x-pilot.x,ady=a.y-pilot.y; if (Math.sqrt(adx*adx+ady*ady)<a.size+5) { pilot.hull--; for (let i=0;i<6;i++) this._particle(pilot.x,pilot.y,(Math.random()-0.5)*2,(Math.random()-0.5)*2,'#d63031',20); if (pilot.hull<=0) return false; break; } }
            }
            pilot.x+=pilot.vx; pilot.y+=pilot.vy; pilot.vx*=0.90; pilot.vy*=0.90;
            if (d<target.size+8) {
                if (pilot.state==='pickup') { pilot.cargo=target.res; pilot.state='delivery'; }
                else {
                    this.credits+=700; this.score+=700; target.deliveries++;
                    if (target.crisis&&target.crisis.resource===pilot.cargo) { target.crisis=null; this.activeCrises=this.activeCrises.filter(b=>b!==target); this.credits+=2000; this.score+=2000; }
                    pilot.cargo=null; pilot.state='pickup';
                    const others=this.allBodies.filter(b=>b!==target);
                    pilot.fromId=target.id; pilot.toId=others[Math.floor(Math.random()*others.length)].id;
                }
            }
            return true;
        });
    }

    _updateCrises() {
        for (const body of this.activeCrises) {
            if (!body.crisis) continue;
            body.crisis.timer-=1/60;
            if (body.crisis.timer<=0) { this.gameOver(`${body.name} È COLLASSATA`); return; }
        }
    }

    _particle(x,y,vx,vy,color,life) { this.particles.push({x,y,vx,vy,color,life,maxLife:life}); }
    _updateParticles() { this.particles=this.particles.filter(p=>{p.x+=p.vx;p.y+=p.vy;p.life--;return p.life>0;}); }

    // ── Draw ─────────────────────────────────────────────────────────────────

    _citySize(body) {
        const d=body.deliveries;
        if (d>=15) return body.size+7;
        if (d>=7)  return body.size+3.5;
        if (d>=3)  return body.size+1.5;
        return body.size;
    }

    draw() {
        const c=this.ctx;
        c.fillStyle='#06070f'; c.fillRect(0,0,this.width,this.height);
        c.save();
        c.translate(this.camera.x, this.camera.y);
        c.scale(this.camera.zoom, this.camera.zoom);

        // Stars
        this.stars.forEach(s => { c.globalAlpha=s.alpha; c.fillStyle='#fff'; c.beginPath(); c.arc(s.x,s.y,s.r,0,Math.PI*2); c.fill(); });
        c.globalAlpha=1;

        // Orbit rings
        const orbitAlpha = this.launchState==='CHOOSE_CITY'?0.14:0.04;
        this.planets.forEach(p => {
            c.strokeStyle=`rgba(255,255,255,${orbitAlpha})`; c.lineWidth=0.6;
            c.beginPath(); c.arc(0,0,p.dist,0,Math.PI*2); c.stroke();
        });

        // Sun
        const sg=c.createRadialGradient(0,0,0,0,0,this.sun.size*6);
        sg.addColorStop(0,'rgba(255,255,210,1)'); sg.addColorStop(0.15,'rgba(255,215,0,1)');
        sg.addColorStop(0.45,'rgba(255,140,0,0.45)'); sg.addColorStop(1,'rgba(255,80,0,0)');
        c.beginPath(); c.arc(0,0,this.sun.size*6,0,Math.PI*2); c.fillStyle=sg; c.fill();
        c.beginPath(); c.arc(0,0,this.sun.size,0,Math.PI*2); c.fillStyle='#fffde7'; c.fill();

        // Asteroid belt
        this.asteroids.forEach(a => { c.globalAlpha=0.65; c.fillStyle=a.color; c.beginPath(); c.arc(a.x,a.y,a.size,0,Math.PI*2); c.fill(); });
        c.globalAlpha=1;

        // Planets
        this.planets.forEach(p=>this._drawBody(c,p,false));

        // Saturn rings
        const sat=this.planets.find(p=>p.id==='saturno');
        if (sat) {
            const sz=this._citySize(sat);
            c.save(); c.translate(sat.x,sat.y);
            [[sz*2.6,0.27,'rgba(249,202,36,0.32)'],[sz*3.1,0.21,'rgba(249,202,36,0.18)'],[sz*3.6,0.16,'rgba(249,202,36,0.10)']].forEach(([r,b,col])=>{
                c.strokeStyle=col; c.lineWidth=sz*0.36; c.beginPath(); c.ellipse(0,0,r,r*b,0.12,0,Math.PI*2); c.stroke();
            });
            c.restore();
        }

        // Moons
        this.moons.forEach(m=>this._drawBody(c,m,true));

        // CHOOSE_CITY hover / selected
        if (this.launchState==='CHOOSE_CITY') {
            if (this.hoveredBody && this.hoveredBody.id!=='terra') {
                const h=this.hoveredBody, sz=this._citySize(h);
                c.strokeStyle='rgba(255,255,255,0.5)'; c.lineWidth=1.2;
                c.setLineDash([4,4]); c.beginPath(); c.arc(h.x,h.y,sz*2.2,0,Math.PI*2); c.stroke(); c.setLineDash([]);
            }
            if (this.selectedBody) {
                const s=this.selectedBody, sz=this._citySize(s);
                const pulse=0.5+0.5*Math.sin(Date.now()*0.006);
                const sg2=c.createRadialGradient(s.x,s.y,sz,s.x,s.y,sz*4.5);
                sg2.addColorStop(0,`rgba(249,202,36,${0.2*pulse})`); sg2.addColorStop(1,'rgba(249,202,36,0)');
                c.beginPath(); c.arc(s.x,s.y,sz*4.5,0,Math.PI*2); c.fillStyle=sg2; c.fill();
                c.strokeStyle=`rgba(249,202,36,${0.65+0.35*pulse})`; c.lineWidth=2;
                c.beginPath(); c.arc(s.x,s.y,sz*2.2,0,Math.PI*2); c.stroke();
            }
        }

        // Founding glow
        if (this.launchState==='FOUNDING' && this.homeBody) {
            const h=this.homeBody, sz=this._citySize(h), pct=this.foundingTimer/110;
            const fg=c.createRadialGradient(h.x,h.y,sz,h.x,h.y,sz*7*pct);
            fg.addColorStop(0,`rgba(249,202,36,${0.22*pct})`); fg.addColorStop(1,'rgba(249,202,36,0)');
            c.beginPath(); c.arc(h.x,h.y,sz*7,0,Math.PI*2); c.fillStyle=fg; c.fill();
        }

        // Particles
        this.particles.forEach(p => { c.globalAlpha=(p.life/p.maxLife)*0.9; c.fillStyle=p.color; c.beginPath(); c.arc(p.x,p.y,1.2,0,Math.PI*2); c.fill(); });
        c.globalAlpha=1;

        // NPC pilots
        this.pilots.forEach(pilot => {
            c.save(); c.translate(pilot.x,pilot.y); c.rotate(pilot.angle);
            c.fillStyle=pilot.color; c.beginPath(); c.moveTo(5,0); c.lineTo(-3,-3); c.lineTo(-3,3); c.closePath(); c.fill();
            c.restore();
        });

        // Player ship (hidden in CHOOSE_CITY)
        if (this.launchState!=='CHOOSE_CITY') {
            c.save(); c.translate(this.ship.x,this.ship.y); c.rotate(this.ship.angle);
            c.fillStyle='#fff'; c.beginPath(); c.moveTo(10,0); c.lineTo(-6,-5); c.lineTo(-4,0); c.lineTo(-6,5); c.closePath(); c.fill();
            c.fillStyle='#74b9ff'; c.beginPath(); c.arc(3,0,2.5,0,Math.PI*2); c.fill();
            c.restore();
        }

        // Launch text
        c.textAlign='center';
        if (this.launchState==='COUNTDOWN') {
            c.fillStyle='rgba(255,255,255,0.9)'; c.font='bold 14px "Inter",sans-serif';
            c.fillText(Math.ceil(this.launchTimer/60), this.ship.x, this.ship.y-22);
        } else if (this.launchState==='BOOST') {
            c.fillStyle='#e17055'; c.font='bold 11px "Inter",sans-serif';
            c.fillText('LANCIO!', this.ship.x, this.ship.y-22);
        }

        // Ship arrow indicator (when panned far away, show direction back to ship)
        if (this.launchState==='PLAY' && (this.camera.panX!==0 || this.camera.panY!==0)) {
            this._drawShipArrow(c);
        }

        c.restore(); // end world transform

        // HUDs
        if      (this.launchState==='CHOOSE_CITY') this._drawChooseCityHUD();
        else if (this.launchState==='FOUNDING')    this._drawFoundingHUD();
        else                                        this._drawHUD();

        if (this.showGuide)    this._drawGuide();
    }

    // Ship arrow when panned away — drawn in world space before restore
    _drawShipArrow(_c) {
        const screenShipX=this.ship.x;
        const screenShipY=this.ship.y;
        // Only show if ship would be off screen
        const sx=screenShipX*this.camera.zoom+this.camera.x; // screen x of ship
        const sy=screenShipY*this.camera.zoom+this.camera.y;
        if (sx>0&&sx<this.width&&sy>0&&sy<this.height) return;
        // Draw in screen space after restore - so we store info and draw later
        this._pendingShipArrow={sx,sy};
    }

    _drawBody(c, body, isMoon) {
        const sz=this._citySize(body);
        // Glow
        if (body.deliveries>=3) {
            const gr=c.createRadialGradient(body.x,body.y,sz*0.5,body.x,body.y,sz*(body.deliveries>=15?5:body.deliveries>=7?3.5:2.2));
            gr.addColorStop(0,'rgba(255,255,255,0.12)'); gr.addColorStop(1,'rgba(0,0,0,0)');
            c.beginPath(); c.arc(body.x,body.y,sz*(body.deliveries>=15?5:3),0,Math.PI*2);
            c.globalAlpha=0.55; c.fillStyle=gr; c.fill(); c.globalAlpha=1;
        }
        if (body.isHome) {
            const pulse=0.5+0.5*Math.sin(Date.now()*0.004);
            c.strokeStyle=`rgba(249,202,36,${0.5+0.4*pulse})`; c.lineWidth=1.5;
            c.beginPath(); c.arc(body.x,body.y,sz*2,0,Math.PI*2); c.stroke();
        }
        c.beginPath(); c.arc(body.x,body.y,sz,0,Math.PI*2); c.fillStyle=body.color; c.fill();
        c.beginPath(); c.arc(body.x-sz*0.28,body.y-sz*0.28,sz*0.45,0,Math.PI*2); c.fillStyle='rgba(255,255,255,0.18)'; c.fill();
        if (body.crisis) {
            const pulse=0.5+0.5*Math.sin(Date.now()*0.012);
            c.strokeStyle=`rgba(214,48,49,${0.65+0.35*pulse})`; c.lineWidth=2;
            c.beginPath(); c.arc(body.x,body.y,sz*1.65,0,Math.PI*2); c.stroke();
        }
        if (body.deliveries>=15) {
            for (let i=0;i<8;i++) { const a=(i/8)*Math.PI*2; c.fillStyle='rgba(255,255,180,0.7)'; c.beginPath(); c.arc(body.x+Math.cos(a)*(sz+1.5),body.y+Math.sin(a)*(sz+1.5),0.8,0,Math.PI*2); c.fill(); }
        }
        const lbl=(this.launchState==='CHOOSE_CITY'&&body.id==='terra')?'PARTENZA':body.name;
        c.fillStyle=body.id==='terra'&&this.launchState==='CHOOSE_CITY'?'#74b9ff':body.crisis?'#ff7675':'rgba(255,255,255,0.82)';
        c.font=isMoon?'9px "Inter",sans-serif':'bold 11px "Inter",sans-serif';
        c.textAlign='center';
        c.fillText(lbl, body.x, body.y-sz-(isMoon?4:7));
        if (this.launchState==='CHOOSE_CITY'&&!isMoon) {
            c.fillStyle='rgba(255,255,255,0.4)'; c.font='8px "Inter",sans-serif';
            c.fillText(`${body.res} · ${body.req}`, body.x, body.y+sz+12);
        }
    }

    // ── HUDs ─────────────────────────────────────────────────────────────────

    _drawChooseCityHUD() {
        const c=this.ctx;
        if (this.isTouchDevice) this._drawMobileButtons();
        c.fillStyle='rgba(6,7,15,0.88)'; c.fillRect(0,0,this.width,115);
        c.strokeStyle='rgba(249,202,36,0.25)'; c.lineWidth=1;
        c.beginPath(); c.moveTo(0,115); c.lineTo(this.width,115); c.stroke();
        c.textAlign='center';
        c.fillStyle='#f9ca24'; c.font='bold 27px "Inter",sans-serif';
        c.fillText('DOVE FONDERAI LA TUA PRIMA CITTÀ?', this.width/2, 44);
        c.fillStyle='rgba(255,255,255,0.5)'; c.font='14px "Inter",sans-serif';
        c.fillText('Clicca un pianeta o luna  ·  doppio click o ENTER per confermare  ·  scroll per zoomare  ·  click dx per spostare', this.width/2, 72);
        c.fillStyle='#0984e3'; c.font='12px "Inter",sans-serif';
        c.fillText('La Terra è il punto di partenza — non può essere fondata', this.width/2, 96);
        if (!this.selectedBody) return;
        const s=this.selectedBody, bonus=Math.floor(s.dist*2.5);
        const cw=470,ch=110,cx=this.width/2-cw/2,cy=this.height-ch-22;
        c.fillStyle='rgba(6,7,15,0.93)'; c.fillRect(cx,cy,cw,ch);
        c.strokeStyle='#f9ca24'; c.lineWidth=1.4; c.strokeRect(cx,cy,cw,ch);
        c.fillStyle=s.color||'#fff'; c.font='bold 22px "Inter",sans-serif'; c.fillText(s.name, this.width/2, cy+34);
        c.fillStyle='rgba(255,255,255,0.5)'; c.font='13px "Inter",sans-serif'; c.fillText(`Produce: ${s.res}   ·   Richiede: ${s.req}`, this.width/2, cy+60);
        c.fillStyle='#55efc4'; c.font='bold 14px "Inter",sans-serif'; c.fillText(`Bonus fondazione: +$ ${bonus}   ·   [ ENTER / doppio click per confermare ]`, this.width/2, cy+88);
    }

    _drawFoundingHUD() {
        const c=this.ctx, pct=1-this.foundingTimer/110;
        c.fillStyle='rgba(6,7,15,0.72)'; c.fillRect(0,0,this.width,85);
        c.textAlign='center';
        const pulse=0.5+0.5*Math.sin(Date.now()*0.012);
        c.fillStyle=`rgba(249,202,36,${0.75+0.25*pulse})`; c.font='bold 28px "Inter",sans-serif';
        c.fillText(`★  COLONIA FONDATA: ${this.homeBody?this.homeBody.name:''}  ★`, this.width/2, 48);
        c.fillStyle='rgba(255,255,255,0.12)'; c.fillRect(this.width/2-160,60,320,8);
        c.fillStyle='#f9ca24'; c.fillRect(this.width/2-160,60,320*pct,8);
    }

    _drawHUD() {
        const c=this.ctx;
        c.fillStyle='rgba(6,7,15,0.82)'; c.fillRect(0,0,this.width,98);
        c.strokeStyle='rgba(255,255,255,0.05)'; c.lineWidth=1;
        c.beginPath(); c.moveTo(0,98); c.lineTo(this.width,98); c.stroke();
        c.textAlign='left';
        c.fillStyle='#fff'; c.font='bold 22px "Inter",sans-serif'; c.fillText(`$ ${this.credits}`, 22, 36);
        c.fillStyle='#f9ca24'; c.fillText(`SCORE: ${this.score}`, 220, 36);
        const hc=this.hull===1?'#d63031':this.hull===2?'#e67e22':'#00b894';
        c.fillStyle=hc; c.font='bold 16px "Inter",sans-serif';
        c.fillText(`SCAFO  ${'█'.repeat(this.hull)}${'░'.repeat(3-this.hull)}`, 22, 62);
        c.fillStyle='#a29bfe'; c.font='13px "Inter",sans-serif';
        c.fillText(`STIVA [${this.cargo.length}/${this.maxCargo}]:  ${this.cargo.join('  ·  ')||'—'}`, 22, 84);

        c.textAlign='right';
        c.fillStyle='#55efc4'; c.font='13px "Inter",sans-serif';
        c.fillText(`PILOTI: ${this.pilots.length}`, this.width-22, 36);
        c.fillStyle='rgba(255,255,255,0.3)'; c.font='11px "Inter",sans-serif';
        c.fillText('[H] flotta  [G] segui nave  [?] guida', this.width-22, 54);
        if (this.homeBody) { c.fillStyle='#f9ca24'; c.font='12px "Inter",sans-serif'; c.fillText(`⬡ ${this.homeBody.name}`, this.width-22, 72); }

        // Zoom indicator
        c.fillStyle='rgba(255,255,255,0.25)'; c.font='11px "Inter",sans-serif'; c.textAlign='right';
        c.fillText(`zoom ${this.camera.zoom.toFixed(1)}×`, this.width-22, 90);

        // Crisis bars
        this.activeCrises.forEach((body,i) => {
            if (!body.crisis) return;
            const x=this.width-238, y=64+i*38;
            const pct=Math.max(0,body.crisis.timer/body.crisis.maxTime);
            c.fillStyle='rgba(214,48,49,0.15)'; c.fillRect(x,y,218,26);
            c.fillStyle=pct>0.35?'#d63031':'#c0392b'; c.fillRect(x,y,218*pct,26);
            c.fillStyle='#fff'; c.font='bold 11px "Inter",sans-serif'; c.textAlign='left';
            c.fillText(`⚠  ${body.name}: ${body.crisis.resource}`, x+6, y+17);
        });

        // Ship out-of-view arrow
        if (this._pendingShipArrow) {
            this._drawOffscreenArrow(this._pendingShipArrow.sx, this._pendingShipArrow.sy);
            this._pendingShipArrow = null;
        }

        // Mobile on-screen buttons
        if (this.isTouchDevice) this._drawMobileButtons();

        // Hire menu
        if (this.showHireMenu) {
            const mw=440,mh=282,mx=this.width/2-mw/2,my=this.height/2-mh/2;
            c.fillStyle='rgba(6,7,15,0.96)'; c.fillRect(mx,my,mw,mh);
            c.strokeStyle='rgba(157,80,187,0.9)'; c.lineWidth=1.5; c.strokeRect(mx,my,mw,mh);
            c.textAlign='center'; c.fillStyle='#a29bfe'; c.font='bold 18px "Inter",sans-serif';
            c.fillText('── ASSUMI PILOTA ──', this.width/2, my+38);
            this.pilotRoster.forEach((p,i)=>{
                const py=my+78+i*66, ok=this.credits>=p.cost;
                c.fillStyle=ok?(i===0?'#74b9ff':i===1?'#fd79a8':'#55efc4'):'#555';
                c.font='bold 15px "Inter",sans-serif'; c.fillText(`[${i+1}]  ${p.type}  —  $ ${p.cost}`, this.width/2, py);
                c.fillStyle='rgba(255,255,255,0.4)'; c.font='12px "Inter",sans-serif'; c.fillText(p.desc, this.width/2, py+22);
            });
            c.fillStyle='rgba(255,255,255,0.22)'; c.font='11px "Inter",sans-serif'; c.fillText('[H] chiudi', this.width/2, my+mh-16);
        }
    }

    _drawOffscreenArrow(shipSX, shipSY) {
        const c=this.ctx;
        const cx=this.width/2, cy=this.height/2+50;
        const dx=shipSX-cx, dy=shipSY-cy;
        const angle=Math.atan2(dy,dx);
        const edge=Math.min(this.width,this.height)*0.42;
        const ax=cx+Math.cos(angle)*edge, ay=cy+Math.sin(angle)*edge;
        c.save(); c.translate(ax,ay); c.rotate(angle);
        c.fillStyle='rgba(255,255,255,0.5)';
        c.beginPath(); c.moveTo(10,0); c.lineTo(-6,-5); c.lineTo(-6,5); c.closePath(); c.fill();
        c.restore();
        c.fillStyle='rgba(255,255,255,0.35)'; c.font='10px "Inter",sans-serif'; c.textAlign='center';
        c.fillText('NAVE', ax, ay+18);
    }

    _drawMobileButtons() {
        const c   = this.ctx;
        const btns = this._getMobileButtons();
        const isPlay = ['PLAY','COUNTDOWN','BOOST'].includes(this.launchState);

        btns.forEach(btn => {
            if (btn.flight && !isPlay) return; // hide flight buttons outside gameplay

            const pressed = !!this.mobileKeys[btn.key];
            // Active toggle state
            const active = (btn.id==='guide' && this.showGuide);

            // Outer glow when pressed
            if (pressed || active) {
                c.beginPath(); c.arc(btn.cx, btn.cy, btn.r*1.55, 0, Math.PI*2);
                c.fillStyle = btn.flight
                    ? (btn.id==='thrust' ? 'rgba(249,202,36,0.15)' : 'rgba(162,155,254,0.15)')
                    : 'rgba(255,255,255,0.12)';
                c.fill();
            }

            // Button body
            c.beginPath(); c.arc(btn.cx, btn.cy, btn.r, 0, Math.PI*2);
            let bg;
            if (pressed || active) {
                bg = btn.flight
                    ? (btn.id==='thrust' ? 'rgba(249,202,36,0.55)' : 'rgba(162,155,254,0.55)')
                    : 'rgba(255,255,255,0.35)';
            } else {
                bg = 'rgba(6,7,15,0.55)';
            }
            c.fillStyle = bg; c.fill();

            // Border
            c.strokeStyle = pressed || active
                ? (btn.flight ? (btn.id==='thrust' ? 'rgba(249,202,36,0.9)' : 'rgba(162,155,254,0.9)') : 'rgba(255,255,255,0.8)')
                : 'rgba(255,255,255,0.22)';
            c.lineWidth = 1.5; c.stroke();

            // Label
            c.fillStyle  = pressed || active ? '#fff' : 'rgba(255,255,255,0.6)';
            c.font       = `bold ${Math.round(btn.r * 0.68)}px "Inter",sans-serif`;
            c.textAlign  = 'center';
            c.textBaseline = 'middle';
            c.fillText(btn.label, btn.cx, btn.cy);
            c.textBaseline = 'alphabetic';
        });
    }

    // ── Guide overlay ─────────────────────────────────────────────────────────

    _drawGuide() {
        const c=this.ctx;
        const gw=720, gh=460, gx=this.width/2-gw/2, gy=this.height/2-gh/2;

        // Backdrop
        c.fillStyle='rgba(6,7,15,0.96)'; c.fillRect(gx,gy,gw,gh);
        c.strokeStyle='rgba(162,155,254,0.7)'; c.lineWidth=1.5; c.strokeRect(gx,gy,gw,gh);

        // Title
        c.textAlign='center'; c.fillStyle='#a29bfe'; c.font='bold 20px "Inter",sans-serif';
        c.fillText('GUIDA AL GIOCO', this.width/2, gy+32);
        c.strokeStyle='rgba(162,155,254,0.25)'; c.lineWidth=1;
        c.beginPath(); c.moveTo(gx+20,gy+44); c.lineTo(gx+gw-20,gy+44); c.stroke();

        const col1=gx+28, col2=gx+gw/2+14, rowH=26, startY=gy+70;

        // Column headers
        c.fillStyle='rgba(255,255,255,0.35)'; c.font='bold 11px "Inter",sans-serif';
        c.textAlign='left';
        c.fillText('CONTROLLI', col1, startY-8);
        c.fillText('MECCANICHE DI GIOCO', col2, startY-8);

        // Left column — controls
        const ctrl=[
            ['W / ↑','Motore propulsore'],
            ['A / ←','Ruota a sinistra'],
            ['D / →','Ruota a destra'],
            ['Scroll mouse','Zoom avanti / indietro'],
            ['Click destro + trascina','Sposta la visuale liberamente'],
            ['G','Ricentra la visuale sulla nave'],
            ['H','Apri menu assumi pilota'],
            ['?','Apri / chiudi questa guida'],
            ['Logo × 5','Esci dal minigioco'],
            ['ENTER / doppio click','Conferma fondazione città'],
        ];
        ctrl.forEach(([key,desc],i) => {
            const y=startY+i*rowH;
            c.fillStyle='#a29bfe'; c.font='bold 13px "Inter",sans-serif'; c.textAlign='left';
            c.fillText(key, col1, y);
            c.fillStyle='rgba(255,255,255,0.6)'; c.font='12px "Inter",sans-serif';
            c.fillText(desc, col1+170, y);
        });

        // Divider
        c.strokeStyle='rgba(255,255,255,0.08)'; c.lineWidth=1;
        c.beginPath(); c.moveTo(gx+gw/2,gy+54); c.lineTo(gx+gw/2,gy+gh-50); c.stroke();

        // Right column — mechanics
        const mech=[
            ['🚀 Volo','Avvicinati a un corpo celeste per caricare'],
            ['','o scaricare risorse automaticamente'],
            ['⚠ Crisi','Consegna la risorsa prima che il timer'],
            ['','scada — o la città muore (Game Over)'],
            ['⚖ Carico','Più merci = nave più lenta e pesante'],
            ['☀ Sole','Zona letale — la gravità ti attira'],
            ['🪨 Asteroidi','Tra Marte e Giove: −1 scafo per impatto'],
            ['🏙 Città','3 consegne → Colonia'],
            ['','7 consegne → Città  ·  15 → Metropoli'],
            ['👨‍✈️ Flotta','ROOKIE $800 · SPERICOLATO $1500'],
            ['','VETERANO $3000 (evita la fascia)'],
        ];
        mech.forEach(([key,desc],i) => {
            const y=startY+i*rowH;
            if (key) { c.fillStyle='#f9ca24'; c.font='bold 13px "Inter",sans-serif'; c.textAlign='left'; c.fillText(key, col2, y); }
            c.fillStyle='rgba(255,255,255,0.6)'; c.font='12px "Inter",sans-serif';
            c.fillText(desc, key?col2+140:col2+140, y);
        });

        // Footer
        c.fillStyle='rgba(255,255,255,0.25)'; c.font='12px "Inter",sans-serif'; c.textAlign='center';
        c.fillText('[?]  o  [ESC]  per chiudere', this.width/2, gy+gh-16);
    }

    // ── Game Over ────────────────────────────────────────────────────────────

    gameOver(reason) {
        if (!this.running) return;
        this.running=false; clearInterval(this.crisisInterval);
        const modal=document.getElementById('game-modal');
        const h2=modal.querySelector('h2'), p=modal.querySelector('p');
        h2.textContent='GAME OVER'; h2.style.color='#d63031';
        if (p) p.innerHTML=`<span style="color:#a1a1aa">${reason}</span><br>SCORE: <b style="color:#f9ca24">${this.score}</b>`;
        modal.classList.add('active');
    }

    async submitScore() {
        const raw=(document.getElementById('player-name').value||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,3);
        const name=raw.padEnd(3,'_'); if (!raw) return;
        const btn=document.getElementById('submit-score-btn');
        btn.textContent='TRASMISSIONE...'; btn.disabled=true;
        this._playTransmissionAnim();
        let board=[];
        try { const r=await fetch('leaderboard.json?_='+Date.now()); board=await r.json(); } catch(_){}
        board.push({name,score:this.score}); board.sort((a,b)=>b.score-a.score); board=board.slice(0,10);
        if (!board.some(e=>e.name===name&&e.score===this.score)) { btn.textContent='NON NEL TOP 10'; btn.disabled=false; return; }
        if (GITHUB_TOKEN) {
            try {
                const [owner,repo]=GITHUB_REPO.split('/');
                const res=await fetch(`https://api.github.com/repos/${owner}/${repo}/dispatches`,{
                    method:'POST',
                    headers:{Authorization:`token ${GITHUB_TOKEN}`,Accept:'application/vnd.github.v3+json','Content-Type':'application/json'},
                    body:JSON.stringify({event_type:'submit_score',client_payload:{name,score:this.score}}),
                });
                btn.textContent=res.ok?'✓ RECORD INVIATO!':'ERRORE SERVER';
            } catch(_){ btn.textContent='ERRORE CONNESSIONE'; }
        } else { btn.textContent='✓ SALVATO (LOCAL)'; }
        btn.disabled=false;
    }

    _playTransmissionAnim() {
        const c=this.ctx; let f=0;
        const tick=()=>{
            if (f++>80) return;
            c.fillStyle='rgba(6,7,15,0.25)'; c.fillRect(0,0,this.width,this.height);
            c.fillStyle=`rgba(162,155,254,${0.3+Math.sin(f*0.25)*0.25})`;
            c.font='bold 22px "Inter",sans-serif'; c.textAlign='center';
            c.fillText('>> TRASMISSIONE DATI <<',this.width/2,this.height/2-20);
            c.fillStyle='#55efc4'; c.font='13px "Inter",sans-serif';
            c.fillText('Connessione ai server galattici...',this.width/2,this.height/2+16);
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }

    loop() { if (!this.running) return; this.update(); this.draw(); requestAnimationFrame(()=>this.loop()); }
}

// ── Secret Trigger ────────────────────────────────────────────────────────────
let _clicks=0;
document.getElementById('secret-trigger').addEventListener('click', e => {
    e.preventDefault(); e.stopPropagation();
    if (++_clicks>=5) { document.getElementById('game-container').classList.add('active'); new SpaceGame('game-canvas').start(); _clicks=0; }
});
