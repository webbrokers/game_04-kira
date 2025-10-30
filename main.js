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

    this.load.image('forest-bg', 'img/forest.png');

    // Procedural textures (UI + платформы)
    this.makePlatformTexture();
    this.makeArrowButton('arrow-up', 'up');
    this.makeArrowButton('arrow-down', 'down');
    this.makeArrowButton('arrow-left', 'left');
    this.makeArrowButton('arrow-right', 'right');
    this.makeFullscreenIcon('fs-enter');
    this.makeFullscreenIcon('fs-exit', true);
  }

  create(){
    const W = 900, H = 540;
    this.cameras.main.setBackgroundColor('#2b2b2b');

    this.physics.world.setBounds(0, 0, W, H);

    this.createParallaxBackground(W, H);

    // Level layout using procedural platforms
    this.platforms = this.physics.add.staticGroup();
    const groundY = 520;
    const leftPlatform = this.addPlatform(280, groundY, 320);
    this.addPlatform(620, groundY, 320);

    // Player
    const spawnX = leftPlatform.x - leftPlatform.displayWidth * 0.25;
    const spawnY = leftPlatform.y - leftPlatform.displayHeight - 10;
    this.spawnPoint = { x: spawnX, y: spawnY };
    this.player = this.physics.add.sprite(spawnX, spawnY, this.playerFrames[0]);
    this.player.setCollideWorldBounds(true);
    this.player.setScale(0.2);
    this.player.body.setSize(60, 110).setOffset(20, 10);
    this.player.setDragX(1200);
    this.player.setMaxVelocity(360, 900);
    this.defaultBodySize = { width: 60, height: 110, offsetX: 20, offsetY: 10 };
    this.isCrouching = false;

    this.physics.add.collider(this.player, this.platforms);

    // Camera
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setLerp(0.15, 0.15);
    this.cameras.main.setBounds(0, 0, W, H);

    // Controls
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('A,D,SPACE');

    // Touch/UI controls
    this.touchButtons = { left:false, right:false, crouch:false };
    this.createTouchControls();

    // Resize game to parent size while maintaining aspect ratio
    this.scale.on('resize', this.resize, this);
    this.scale.on('enterfullscreen', this.updateFullscreenIcon, this);
    this.scale.on('leavefullscreen', this.updateFullscreenIcon, this);
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

  addPlatform(x, y, width=320){
    const pl = this.platforms.create(x, y, 'platform').setOrigin(0.5,1);
    const platformHeight = 72;
    pl.setDisplaySize(width, platformHeight);
    pl.refreshBody();
    if(pl.body){
      const body = pl.body;
      const topMargin = pl.displayHeight * 0.18;
      const hitHeight = Math.max(20, pl.displayHeight - topMargin);
      body.setSize(pl.displayWidth, hitHeight);
      body.setOffset(0, topMargin);
      body.updateFromGameObject();
    }
    return pl;
  }

  makePlatformTexture(){
    const key = 'platform';
    if(this.textures.exists(key)){
      this.textures.remove(key);
    }
    const w = 320, h = 80;
    const g = this.make.graphics({x:0,y:0, add:false});
    // тень
    g.fillStyle(0x141414, 0.35);
    g.fillRoundedRect(6, 8, w-12, h-10, 16);
    // грунт
    g.fillStyle(0x3b2415, 1);
    g.fillRoundedRect(0, 18, w, h-24, 18);
    // трава
    const grassHeight = 30;
    g.fillStyle(0x2c6f1a, 1);
    g.fillRoundedRect(0, 0, w, grassHeight, { tl: 16, tr: 16, bl: 8, br: 8 });
    g.fillStyle(0x49a72b, 1);
    const blades = 28;
    for(let i = 0; i < blades; i++){
      const bladeX = (i / blades) * w;
      g.fillTriangle(bladeX, grassHeight, bladeX + 12, 8, bladeX + 24, grassHeight);
    }
    g.generateTexture(key, w, h);
    g.destroy();
  }

  makeArrowButton(key, direction, size=128){
    const g = this.make.graphics({x:0,y:0, add:false});
    const radius = Math.round(size * 0.22);
    g.fillStyle(0x000000, 0.32);
    g.fillRoundedRect(0,0,size,size,radius);
    g.fillStyle(0xffffff, 0.92);
    const pad = size * 0.28;
    const mid = size / 2;
    g.beginPath();
    switch(direction){
      case 'up':
        g.moveTo(mid, pad);
        g.lineTo(size - pad, size - pad);
        g.lineTo(pad, size - pad);
        break;
      case 'down':
        g.moveTo(pad, pad);
        g.lineTo(size - pad, pad);
        g.lineTo(mid, size - pad);
        break;
      case 'left':
        g.moveTo(pad, mid);
        g.lineTo(size - pad, pad);
        g.lineTo(size - pad, size - pad);
        break;
      case 'right':
      default:
        g.moveTo(pad, pad);
        g.lineTo(size - pad, mid);
        g.lineTo(pad, size - pad);
        break;
    }
    g.closePath();
    g.fillPath();
    g.generateTexture(key, size, size);
    g.destroy();
  }

  makeFullscreenIcon(key, exit=false, size=120){
    const g = this.make.graphics({x:0,y:0, add:false});
    const radius = Math.round(size * 0.22);
    g.fillStyle(0x000000, 0.32);
    g.fillRoundedRect(0,0,size,size,radius);
    g.lineStyle(size * 0.08, 0xffffff, 0.92);
    const arm = size * 0.18;
    const pad = size * 0.26;
    const end = size - pad;
    const mid = size / 2;
    g.beginPath();
    if(exit){
      // inward corners
      g.moveTo(pad, pad + arm);
      g.lineTo(pad, pad);
      g.lineTo(pad + arm, pad);
      g.moveTo(end, pad);
      g.lineTo(end, pad + arm);
      g.lineTo(end - arm, pad);
      g.moveTo(pad, end);
      g.lineTo(pad + arm, end);
      g.lineTo(pad, end - arm);
      g.moveTo(end, end);
      g.lineTo(end - arm, end);
      g.lineTo(end, end - arm);
    }else{
      // outward corners
      g.moveTo(pad, mid - arm * 0.1);
      g.lineTo(pad, pad);
      g.lineTo(mid - arm * 0.1, pad);
      g.moveTo(end, pad);
      g.lineTo(end, mid - arm * 0.1);
      g.lineTo(mid + arm * 0.1, pad);
      g.moveTo(pad, end);
      g.lineTo(mid - arm * 0.1, end);
      g.lineTo(pad, mid + arm * 0.1);
      g.moveTo(end, end);
      g.lineTo(end, mid + arm * 0.1);
      g.lineTo(mid + arm * 0.1, end);
    }
    g.strokePath();
    g.generateTexture(key, size, size);
    g.destroy();
  }

  isTouch(){ return this.sys.game.device.input.touch; }

  createTouchControls(){
    this.btnJump = this.makeButtonImage('arrow-up');
    this.btnCrouch = this.makeButtonImage('arrow-down');
    this.btnLeft = this.makeButtonImage('arrow-left');
    this.btnRight = this.makeButtonImage('arrow-right');
    this.btnFullscreen = this.makeButtonImage('fs-enter', 0.62);

    this.bindTapButton(this.btnJump, ()=>{
      this.wantJump = true;
    });
    this.bindHoldButton(this.btnCrouch, 'crouch');
    this.bindHoldButton(this.btnLeft, 'left');
    this.bindHoldButton(this.btnRight, 'right');
    this.setupFullscreenButton();

    this.positionTouchUI();
    this.events.on('resize-ui', this.positionTouchUI, this);
  }

  makeButtonImage(key, scale=0.74){
    return this.add.image(0, 0, key)
      .setScrollFactor(0)
      .setDepth(20)
      .setAlpha(0.95)
      .setScale(scale);
  }

  bindHoldButton(button, key){
    button.setInteractive({ useHandCursor: false });
    const activate = (pointer)=>{
      if(button.getData('pointerId') !== null) return;
      button.setData('pointerId', pointer.id);
      button.setTint(0x66c1ff);
      this.touchButtons[key] = true;
      if(this.input?.manager?.setPollAlways) this.input.manager.setPollAlways();
      if(pointer?.event && pointer.event.cancelable) pointer.event.preventDefault();
    };
    const deactivate = (pointer)=>{
      const trackedId = button.getData('pointerId');
      if(trackedId === null || (pointer && pointer.id !== trackedId)) return;
      button.setData('pointerId', null);
      button.clearTint();
      this.touchButtons[key] = false;
      if(pointer?.event && pointer.event.cancelable) pointer.event.preventDefault();
    };
    button.setData('pointerId', null);
    button.on('pointerdown', activate);
    button.on('pointerup', deactivate);
    button.on('pointerupoutside', deactivate);
    button.on('pointerout', deactivate);
    button.on('pointercancel', deactivate);
    return button;
  }

  bindTapButton(button, callback){
    button.setInteractive({ useHandCursor: false });
    const press = (pointer)=>{
      button.setTint(0x66c1ff);
      if(this.input?.manager?.setPollAlways) this.input.manager.setPollAlways();
      callback();
      if(pointer?.event && pointer.event.cancelable) pointer.event.preventDefault();
    };
    const release = (pointer)=>{
      button.clearTint();
      if(pointer?.event && pointer.event.cancelable) pointer.event.preventDefault();
    };
    button.on('pointerdown', press);
    button.on('pointerup', release);
    button.on('pointerupoutside', release);
    button.on('pointerout', release);
    button.on('pointercancel', release);
    return button;
  }

  setupFullscreenButton(){
    if(!this.btnFullscreen) return;
    this.btnFullscreen.removeAllListeners();
    this.btnFullscreen.setInteractive({ useHandCursor: true });
    const down = (pointer)=>{
      this.btnFullscreen.setData('pointerId', pointer.id);
      this.btnFullscreen.setTint(0x66c1ff);
      this.toggleFullscreen();
      if(pointer.event && pointer.event.cancelable) pointer.event.preventDefault();
    };
    const clear = (pointer)=>{
      if(pointer && this.btnFullscreen.getData('pointerId') !== pointer.id) return;
      this.btnFullscreen.clearTint();
      this.btnFullscreen.setData('pointerId', null);
      this.updateFullscreenIcon();
    };
    this.btnFullscreen.on('pointerdown', down);
    this.btnFullscreen.on('pointerup', clear);
    this.btnFullscreen.on('pointerupoutside', clear);
    this.btnFullscreen.on('pointerout', clear);
    this.btnFullscreen.on('pointercancel', clear);
    this.updateFullscreenIcon();
  }

  createParallaxBackground(W, H){
    this.background = this.add.image(W * 0.5, H * 0.5, 'forest-bg')
      .setDepth(-20)
      .setScrollFactor(0.3, 0.1);
    this.adjustBackgroundSize();
  }

  adjustBackgroundSize(){
    if(!this.background) return;
    const cam = this.cameras.main;
    const width = cam.width;
    const height = cam.height;
    this.background.setDisplaySize(width * 1.1, height * 1.1);
    this.background.setPosition(cam.midPoint.x, cam.midPoint.y);
  }

  positionTouchUI(){
    const w = this.scale.width;
    const h = this.scale.height;
    const bottomPad = Math.max(68, h * 0.08);
    const verticalGap = Math.max(120, h * 0.2);
    const leftX = Math.max(90, w * 0.1);
    const rightBase = w - Math.max(90, w * 0.1);
    const scaleFactor = Phaser.Math.Clamp(w / 960, 0.65, 1.05);

    [this.btnJump, this.btnCrouch, this.btnLeft, this.btnRight].forEach((btn)=>{
      if(btn) btn.setScale(0.74 * scaleFactor);
    });
    if(this.btnFullscreen) this.btnFullscreen.setScale(0.62 * Phaser.Math.Clamp(w / 960, 0.7, 1.1));

    if(this.btnJump) this.btnJump.setPosition(leftX, h - bottomPad - verticalGap);
    if(this.btnCrouch) this.btnCrouch.setPosition(leftX, h - bottomPad);
    if(this.btnLeft) this.btnLeft.setPosition(rightBase - 130, h - bottomPad);
    if(this.btnRight) this.btnRight.setPosition(rightBase, h - bottomPad);
    if(this.btnFullscreen) this.btnFullscreen.setPosition(w - 70, 70);
  }

  toggleFullscreen(){
    if(this.scale.isFullscreen){
      this.scale.stopFullscreen();
    }else{
      this.scale.startFullscreen();
    }
  }

  updateFullscreenIcon(){
    if(!this.btnFullscreen) return;
    const texture = this.scale.isFullscreen ? 'fs-exit' : 'fs-enter';
    this.btnFullscreen.setTexture(texture);
  }

  resize(){
    const parent = document.getElementById('game');
    const w = parent.clientWidth || window.innerWidth;
    const h = window.innerHeight;
    const ratio = 16 / 9;
    let width = w;
    let height = Math.round(width / ratio);
    if(height > h){
      height = h;
      width = Math.round(height * ratio);
    }
    this.scale.resize(width, height);
    this.adjustBackgroundSize();
    this.events.emit('resize-ui');
  }

  applyCrouch(active){
    if(active && !this.isCrouching){
      this.player.body.setSize(this.defaultBodySize.width, Math.round(this.defaultBodySize.height * 0.65)).setOffset(this.defaultBodySize.offsetX, this.defaultBodySize.offsetY + 38);
      this.player.setMaxVelocity(240, 900);
      this.isCrouching = true;
    }else if(!active && this.isCrouching){
      this.player.body.setSize(this.defaultBodySize.width, this.defaultBodySize.height).setOffset(this.defaultBodySize.offsetX, this.defaultBodySize.offsetY);
      this.player.setMaxVelocity(360, 900);
      this.isCrouching = false;
    }
  }

  update(){
    const onGround = this.player.body.blocked.down;
    let axis = 0;
    if(this.cursors.left.isDown || this.keys.A.isDown) axis -= 1;
    if(this.cursors.right.isDown || this.keys.D.isDown) axis += 1;

    if(this.touchButtons){
      if(this.touchButtons.left && !this.touchButtons.right) axis = -1;
      else if(this.touchButtons.right && !this.touchButtons.left) axis = 1;
      else if(this.touchButtons.left && this.touchButtons.right) axis = 0;
    }

    const wantsCrouch = (this.touchButtons && this.touchButtons.crouch) || this.cursors.down.isDown;
    this.applyCrouch(wantsCrouch && onGround);

    const accel = this.isCrouching ? 520 : 900;
    const maxVX = this.isCrouching ? 220 : 360;

    this.player.setAccelerationX(axis * accel);
    if(!axis) this.player.setAccelerationX(0);

    if(Math.abs(this.player.body.velocity.x) > maxVX){
      this.player.setVelocityX(Phaser.Math.Clamp(this.player.body.velocity.x, -maxVX, maxVX));
    }

    if((Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.keys.SPACE) || this.wantJump) && onGround){
      this.player.setVelocityY(-520);
    }
    this.wantJump = false;

    if(this.isCrouching){
      if(this.player.anims.getName() !== 'idle') this.player.play('idle');
    }else if(Math.abs(axis) > 0.05){
      this.player.setFlipX(axis < 0);
      if(this.player.anims.getName() !== 'run'){
        this.player.play('run', true);
      }
    }else if(this.player.anims.getName() !== 'idle'){
      this.player.play('idle');
    }

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
    mode: Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 900,
    height: 540
  },
  input: {
    activePointers: 4,
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
