// Phaser 3 touch platformer (Arcade Physics)
// No external assets: textures generated at runtime.

class MainScene extends Phaser.Scene {
  constructor(){ super('main'); }

  preload(){
    const frameTotal = 11;
    this.playerFrames = [];
    for(let i = 1; i <= frameTotal; i++){
      const id = i.toString().padStart(2, '0');
      const key = `run_${id}`;
      this.playerFrames.push(key);
      this.load.image(key, `run_11/run_${id}.png`);
    }

    // Procedural textures used by UI and platforms
    this.makeRect('platform', 260, 26, 0x6d6d6d);
    this.makeCircle('btn', 72, 0xffffff, 0.18); // translucent
    this.makeCircle('stick-base', 120, 0xffffff, 0.12);
    this.makeCircle('stick-top', 56, 0xffffff, 0.25);
  }

  create(){
    const W = 900, H = 540;
    this.cameras.main.setBackgroundColor('#2b2b2b');

    this.physics.world.setBounds(0, 0, W, H);

    // Level layout: две платформы с разрывом
    this.platforms = this.physics.add.staticGroup();
    const leftPlatform = this.addPlatform(80, 520);
    const rightPlatform = this.addPlatform(420, 520);

    // Player
    const spawnX = leftPlatform.x + leftPlatform.displayWidth * 0.4;
    const spawnY = leftPlatform.y - leftPlatform.displayHeight - 10;
    this.spawnPoint = { x: spawnX, y: spawnY };
    this.player = this.physics.add.sprite(spawnX, spawnY, this.playerFrames[0]);
    this.player.setCollideWorldBounds(true);
    this.player.setScale(0.2);
    this.player.body.setSize(60, 110).setOffset(20, 10);
    this.player.setDragX(1200);
    this.player.setMaxVelocity(360, 900);

    this.physics.add.collider(this.player, this.platforms);

    // Camera
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setLerp(0.15, 0.15);
    this.cameras.main.setBounds(0, 0, W, H);

    // Controls
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('A,D,SPACE');

    // Touch controls
    this.mobile = this.isTouch();
    this.createTouchControls();

    // Resize game to parent size while maintaining aspect ratio
    this.scale.on('resize', this.resize, this);
    this.resize(this.scale.gameSize);

    // Up swipe detection
    this.swipe = {start:null};
    this.input.on('pointerdown', (p)=>{ this.swipe.start = {x:p.x, y:p.y, t:this.time.now}; });
    this.input.on('pointerup',   (p)=>{
      if(!this.swipe.start) return;
      const dx = p.x - this.swipe.start.x;
      const dy = p.y - this.swipe.start.y;
      const dt = this.time.now - this.swipe.start.t;
      const isUp = dy < -40 && Math.abs(dy) > Math.abs(dx) && dt < 400;
      if(isUp) this.wantJump = true;
      this.swipe.start = null;
    });

    // Animations
    this.anims.create({
      key: 'run',
      frames: this.playerFrames.map((key)=> ({ key })),
      frameRate: 14,
      repeat: -1
    });
    this.anims.create({
      key: 'idle',
      frames: [{ key: this.playerFrames[0] }]
    });
    this.player.play('idle');
  }

  addPlatform(x, y){
    const pl = this.platforms.create(x, y, 'platform').setOrigin(0,1);
    pl.refreshBody();
    return pl;
  }

  makeRect(key, w, h, color){
    const g = this.make.graphics({x:0,y:0, add:false});
    g.fillStyle(color, 1).fillRect(0,0,w,h);
    g.generateTexture(key, w, h);
    g.destroy();
  }
  makeCircle(key, d, color, alpha=1){
    const g = this.make.graphics({x:0,y:0, add:false});
    g.fillStyle(color, alpha).fillCircle(d/2, d/2, d/2);
    g.generateTexture(key, d, d);
    g.destroy();
  }

  isTouch(){ return this.sys.game.device.input.touch; }

  createTouchControls(){
    // Virtual joystick (left side)
    this.stick = { base:null, top:null, active:false, id:null, x:100, y:this.scale.height-100, dx:0, dy:0 };
    this.stick.base = this.add.image(100, this.scale.height-100, 'stick-base').setScrollFactor(0).setDepth(10).setInteractive();
    this.stick.top  = this.add.image(100, this.scale.height-100, 'stick-top').setScrollFactor(0).setDepth(11).setInteractive();

    // Jump button (right)
    this.btnJump = this.add.image(this.scale.width-84, this.scale.height-84, 'btn').setScrollFactor(0).setDepth(10).setInteractive();
    this.btnJump.on('pointerdown', (p)=>{ this.input.manager.setPollAlways(); this.wantJump = true; p.event.preventDefault(); });
    this.btnJump.on('pointerup',   (p)=>{ p.event.preventDefault(); });

    // Stick pointer events
    this.input.on('pointerdown', (p)=>{
      // left half activates stick if near base
      if(p.x < this.scale.width*0.55 && !this.stick.active){
        this.stick.active = true; this.stick.id = p.id;
        this.stick.x = p.x; this.stick.y = p.y;
        this.stick.base.setPosition(p.x, p.y).setVisible(true);
        this.stick.top.setPosition(p.x, p.y).setVisible(true);
      }
    });
    this.input.on('pointermove', (p)=>{
      if(this.stick.active && p.id === this.stick.id){
        const dx = p.x - this.stick.x;
        const dy = p.y - this.stick.y;
        const maxR = 60;
        const len = Math.min(Math.hypot(dx,dy), maxR);
        const ang = Math.atan2(dy, dx);
        const nx = Math.cos(ang) * len;
        const ny = Math.sin(ang) * len;
        this.stick.top.setPosition(this.stick.x + nx, this.stick.y + ny);
        this.stick.dx = nx / maxR;
        this.stick.dy = ny / maxR;
        if(p.event && p.event.cancelable) p.event.preventDefault();
      }
    }, this);
    const endStick = (p)=>{
      if(this.stick.active && (!p || p.id === this.stick.id)){
        this.stick.active = false; this.stick.id = null;
        this.stick.dx = 0; this.stick.dy = 0;
        this.stick.base.setPosition(100, this.scale.height-100);
        this.stick.top.setPosition(100, this.scale.height-100);
      }
    };
    this.input.on('pointerup', endStick);
    this.input.on('pointercancel', endStick);

    // Position UI on resize
    this.events.on('resize-ui', ()=>{
      this.stick.base.setPosition(100, this.scale.height-100);
      this.stick.top.setPosition(100, this.scale.height-100);
      this.btnJump.setPosition(this.scale.width-84, this.scale.height-84);
    });
  }

  resize(gameSize){
    const parent = document.getElementById('game');
    const w = parent.clientWidth || window.innerWidth;
    const h = window.innerHeight;
    // Keep 16:9
    const desired = { w: 900, h: 506.25 }; // approx 16:9 minus UI bar
    const ratio = desired.w / desired.h;
    let width = w, height = Math.round(w / ratio);
    if(height > h){ height = h; width = Math.round(h * ratio); }
    this.scale.resize(width, height);
    this.events.emit('resize-ui');
  }

  update(time, delta){
    const onGround = this.player.body.blocked.down;
    const accel = 900;
    const maxVX = 360;

    // Keyboard
    let axis = 0;
    if(this.cursors.left.isDown || this.keys.A.isDown) axis -= 1;
    if(this.cursors.right.isDown || this.keys.D.isDown) axis += 1;

    // Joystick (overrides desktop when active)
    if(this.stick && (this.stick.active || this.mobile)){
      if(Math.abs(this.stick.dx) > 0.1) axis = this.stick.dx;
    }

    // Apply acceleration
    this.player.setAccelerationX(axis * accel);
    if(!axis) this.player.setAccelerationX(0);

    // Clamp X velocity
    if(Math.abs(this.player.body.velocity.x) > maxVX){
      this.player.setVelocityX(Phaser.Math.Clamp(this.player.body.velocity.x, -maxVX, maxVX));
    }

    // Jump (keyboard + button + swipe)
    if((Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.keys.SPACE) || this.wantJump) && onGround){
      this.player.setVelocityY(-520);
    }
    this.wantJump = false;

    // Animation control
    if(Math.abs(axis) > 0.05){
      this.player.setFlipX(axis < 0);
      if(this.player.anims.getName() !== 'run'){
        this.player.play('run', true);
      }
    }else if(this.player.anims.getName() !== 'idle'){
      this.player.play('idle');
    }

    // Simple "fall off world" reset
    if(this.player.y > this.physics.world.bounds.height + 200){
      this.player.setPosition(this.spawnPoint.x, this.spawnPoint.y);
      this.player.setVelocity(0,0);
    }
  }
}

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#2b2b2b',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 1600 },
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.NONE, // we resize manually to keep AR
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 900,
    height: 540
  },
  input: {
    activePointers: 3, // allow multiple fingers
    touch: {
      capture: true
    }
  },
  scene: [MainScene]
};

window.addEventListener('load', ()=>{
  const game = new Phaser.Game(config);
  // Prevent context menu, double-tap zoom, etc.
  document.addEventListener('gesturestart', (e)=> e.preventDefault());
  document.addEventListener('dblclick', (e)=> e.preventDefault());
});
