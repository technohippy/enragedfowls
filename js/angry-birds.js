var AngryBirds = AngryBirds || {};

var $ = $ || function(id) { return document.getElementById(id) };

(function(AngryBirds) {
"use strict";

AngryBirds.Texture = {
  BIRD: THREE.ImageUtils.loadTexture('image/bird.jpg'),
  PIGGY: THREE.ImageUtils.loadTexture('image/pig.jpg'),
  BOARD: THREE.ImageUtils.loadTexture('image/board.jpg'),
  POST: THREE.ImageUtils.loadTexture('image/post.jpg'),
  ICE: THREE.ImageUtils.loadTexture('image/ice.jpg'),
  LEATHER: THREE.ImageUtils.loadTexture('image/leather.png'),
  CLOD: THREE.ImageUtils.loadTexture('image/brick_closeup_5132569.JPG'),
  ROCK: THREE.ImageUtils.loadTexture('image/RockSmooth0076_5_thumblarge.jpg'),
  get GRASS() {
    if (!this._GRASS) {
      this._GRASS = THREE.ImageUtils.loadTexture('image/grass_grass_0100_02_preview.jpg');
      this._GRASS.wrapS = THREE.RepeatWrapping;
      this._GRASS.wrapT = THREE.RepeatWrapping;
      this._GRASS.repeat.set(100, 100);
    }
    return this._GRASS;
  }
};

AngryBirds.Color = {
  FIXED: 0x660000,
  STONE: 0x999999
};

AngryBirds.GameMode = {
  TITLE: 0,
  SIGHT_SETTING: 1,
  FLYING: 2,
  LANDING: 3,
  CLEAR_STAGE: 4
};

AngryBirds.ViewMode = {
  BIRDVIEW: 1,
  SIDEVIEW: 2
};

AngryBirds.Setting = function(density) {
  this.density = density || 2;
  this.waitingTimeToReshot = 8000;
};

AngryBirds.Piggy = function(radius, opts) {
  opts = opts || {};
  opts.map = AngryBirds.Texture.PIGGY;
  C3.Sphere.call(this, radius, opts);
  this.damage = 0;
  this.damageListeners = [];
  this.dieListeners = [];
  this.isDead = false;
};

AngryBirds.Piggy.prototype = Object.create(C3.Sphere.prototype);
AngryBirds.Piggy.prototype.constructor = AngryBirds.Piggy;
AngryBirds.Piggy.prototype.construct = function() {
  C3.Sphere.prototype.construct.call(this);
  this.addEventListener('collide', function(evt) {
    var mass = evt.with.mass === 0 ? 100 : evt.with.mass;
    var impact = evt.with.velocity.distanceTo(this.cannonBody.velocity) * mass;
    this.addDamage(impact);
  }.bind(this));
};
AngryBirds.Piggy.prototype.addDamage = function(damage) {
  if (this.isDead) return;
  if (damage < 15) return;
  this.damageListeners.forEach(function(listener) {
    listener(this, damage);
  }, this);
  this.damage += damage;
  if (100 < this.damage) {
    this.isDead = true;
    this.dieListeners.forEach(function(listener) {
      listener(this);
    }, this);
    this.removeFromWorld();
  }
};
AngryBirds.Piggy.prototype.addDamageListener = function(listener) {
  this.damageListeners.push(listener);
};
AngryBirds.Piggy.prototype.addDieListener = function(listener) {
  this.dieListeners.push(listener);
};

AngryBirds.Stage = function() {
  this.game = null;
  this.index = 0;
  this.piggies = [];
  this.bodies = [];
};

AngryBirds.Stage.prototype = {
  constructor: AngryBirds.Stage,

  createBox: function(size, position, opts) {
    opts = opts || {};
    opts.receiveShadow = true;
    if (!opts.mass && !opts.fixed) {
      opts.mass = size.width * size.height * size.depth * this.game.setting.density;
    }
    var box = new C3.Box(size.width, size.height, size.depth, opts);
    box.position.copy(position);
    this.bodies.push(box);
    return box;
  },

  createBoard: function(size, position, opts) {
    opts = opts || {};
    // TODO: 厚さを指定しなくていいようにしたり
    if (!opts.map && !opts.color) opts.map = AngryBirds.Texture.BOARD;
    return this.createBox(size, position, opts);
  },

  createPost: function(size, position, opts) {
    opts = opts || {};
    // TODO: 太さを指定しなくていいようにしたり
    if (!opts.map && !opts.color) opts.map = AngryBirds.Texture.POST;
    return this.createBox(size, position, opts);
  },

  destructFromFrom: function(world) {
    this.bodies.forEach(function(body) {
      world.bodies.splice(world.bodies.indexOf(body), 1);
      world.cannonWorld.remove(body.cannonBody);
      world.threeScene.remove(body.threeMesh);
    });
    this.piggies.forEach(function(piggy) {
      world.bodies.splice(world.bodies.indexOf(piggy), 1);
      world.cannonWorld.remove(piggy.cannonBody);
      world.threeScene.remove(piggy.threeMesh);
    });
  },

  setupEventListeners: function() {
    this.piggies.forEach(function(piggy) {
      piggy.addDamageListener(function(piggy, damage) {
        var p = piggy.getPosition2D();
        var elm = document.getElementById('hit');
        //elm.innerText = '' + Math.floor(damage) + '!!';
        elm.innerText = 'Ouch!';
        elm.style.left = p.left + 'px';
        elm.style.top = p.top + 'px';
        elm.className = 'show';
        setTimeout(function() {elm.className = 'hide'}, 2000);
      });
      piggy.addDieListener(function(piggy) {
        var p = piggy.getPosition2D();
        var elm = document.getElementById('hit');
        //elm.innerText = '' + Math.floor(damage) + '!!';
        elm.innerText = 'Argh!!';
        elm.style.left = p.left + 'px';
        elm.style.top = p.top + 'px';
        elm.className = 'show';
        setTimeout(function() {elm.className = 'hide'}, 2000);
        this.game.addSmoke(piggy);

        this.piggies.splice(this.piggies.indexOf(piggy), 1);
        if (this.piggies.length == 0) {

          // TODO: isSmartphone
          if (this.game.isSmartphone) {
            $('game-clear').className = 'show';
            this.game.nextStageTimer = null;
            setTimeout(function() {
              $('game-clear').className = 'hide';
              this.game.startSmartphoneMode();
              this.game.world.stop();
            }.bind(this), 5000);
            return;
          }

          this.game.clearStage(this);
        }
      }.bind(this));
    }.bind(this));
  }
};

AngryBirds.Game = function(opts) {
  if (!opts.stages) throw 'stages is the mandatory option.';
  this.setHiScore(parseInt(localStorage.getItem('hiscore'), 10) || 9999);
  this.shotCount = 0;
  this.stages = opts.stages;
  this.stages.forEach(function(stage, index) {
    stage.game = this;
    stage.index = index;
  }, this);
  this.currentStageNo = 0;
  this.setting = new AngryBirds.Setting(opts.density);
  this.setGameMode(AngryBirds.GameMode.TITLE);
  this.setViewMode(AngryBirds.ViewMode.BIRDVIEW);
  this.world = null;
  this.skybox = null;
  this.slingshot = null;
  this.ground = null;
  this.bird = null;
  this.birdStartPosition = new THREE.Vector3(0, 2.5/*bar*/ + 2/*arm*/, 0);
  this.piggy = null;
  this.tracks = [];

  this.isBirdDragging = false;
  this.isWorldDragging = false;
  this.dragStartMousePosition = null;
  this.projector = new THREE.Projector();
  this.nextStageTimer = null;
};

AngryBirds.Game.prototype = {
  constructor: AngryBirds.Game,

  construct: function() {
    this.world = new C3.World();
    this.world.addDirectionalLight(0xffffff);
    this.world.addAmbientLight(0x666666);
    this.world.fog = new THREE.FogExp2(0xccccff, 0.007);

    // lens flare
    this.world.threeScene.add(this.createLensFlare());

    // skybox
    this.skybox = this.createSkybox();
    this.world.threeScene.add(this.skybox);

    // ground
    this.ground = new C3.Ground({map:AngryBirds.Texture.GRASS});
    this.world.add(this.ground);

    // slingshot
    this.slingshot = this.createSlingshotMesh();
    //this.slingshot.position.z += 1;
    this.world.threeScene.add(this.slingshot);

    // bird
    this.bird = this.createBird();
    this.bird.position.copy(this.birdStartPosition);
    this.bird.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI/2);
    this.world.add(this.bird);

    // rubber
    var leftRubberGeometry = new THREE.Geometry();
    var basePoint = new THREE.Vector3();
    basePoint.y = 2 + 2.5 + 0.2 - 0.1;
    basePoint.x = 2 - 0.2;
    leftRubberGeometry.vertices.push(basePoint);
    leftRubberGeometry.vertices.push(new THREE.Vector3(
      this.bird.position.x + 0.5,
      this.bird.position.y,
      this.bird.position.z
    ));
    this.leftRubber = new THREE.Line(leftRubberGeometry, new THREE.LineBasicMaterial({
      color:0x999966,
      linewidth:2
    }));
    this.world.threeScene.add(this.leftRubber);

    var rightRubberGeometry = new THREE.Geometry();
    var basePoint = new THREE.Vector3();
    basePoint.y = 2 + 2.5 + 0.2 - 0.1;
    basePoint.x = -2 + 0.2;
    rightRubberGeometry.vertices.push(basePoint);
    rightRubberGeometry.vertices.push(new THREE.Vector3(
      this.bird.position.x - 0.5,
      this.bird.position.y,
      this.bird.position.z
    ));
    this.rightRubber = new THREE.Line(rightRubberGeometry, new THREE.LineBasicMaterial({
      color:0x999966,
      linewidth:2
    }));
    this.world.threeScene.add(this.rightRubber);

    var pouchGeometry = new THREE.SphereGeometry(0.55, 8, 6, 0, Math.PI, -Math.PI/2 + Math.PI/8, -Math.PI/4);
    var pouchMaterial = new THREE.MeshPhongMaterial({
      map:AngryBirds.Texture.LEATHER, 
      ambient:0x999999,
      side:THREE.DoubleSide,
      transparent:true,
      blending:THREE.NormalBlending,
      depthTest:false
    });
    this.pouch = new THREE.Mesh(pouchGeometry, pouchMaterial);
    this.pouch.position.copy(this.birdStartPosition);
    this.world.threeScene.add(this.pouch);

    this.constructStage();
  },
  
  createLensFlare: function() {
    var textureFlare0 = THREE.ImageUtils.loadTexture('image/lensflare0.png');
    var textureFlare2 = THREE.ImageUtils.loadTexture('image/lensflare2.png');
    var textureFlare3 = THREE.ImageUtils.loadTexture('image/lensflare3.png');
    var flareColor = new THREE.Color(0xffccdd);
    var lensFlare = new THREE.LensFlare(textureFlare0, 700, 0.0, THREE.AdditiveBlending, flareColor);
    lensFlare.add(textureFlare2, 512, 0.0, THREE.AdditiveBlending);
    lensFlare.add(textureFlare2, 512, 0.0, THREE.AdditiveBlending);
    lensFlare.add(textureFlare2, 512, 0.0, THREE.AdditiveBlending);
    lensFlare.add(textureFlare3, 60, 0.6, THREE.AdditiveBlending);
    lensFlare.add(textureFlare3, 70, 0.7, THREE.AdditiveBlending);
    lensFlare.add(textureFlare3, 120, 0.9, THREE.AdditiveBlending);
    lensFlare.add(textureFlare3, 70, 1.0, THREE.AdditiveBlending);
    lensFlare.position = new THREE.Vector3(-50, 200, -100);
    return lensFlare;
  },

  createSkybox: function() {
    var urls = [
      'image/cube01.jpg',
      'image/cube02.jpg',
      'image/cube03.jpg',
      'image/cube04.jpg',
      'image/cube05.jpg',
      'image/cube06.jpg'
    ];

    var cubemap = THREE.ImageUtils.loadTextureCube(urls); // load textures
    cubemap.format = THREE.RGBFormat;

    var shader = THREE.ShaderLib['cube']; // init cube shader from built-in lib
    shader.uniforms['tCube'].value = cubemap; // apply textures to shader

    var skyBoxMaterial = new THREE.ShaderMaterial( {
      fragmentShader: shader.fragmentShader,
      vertexShader: shader.vertexShader,
      uniforms: shader.uniforms,
      depthWrite: false,
      side: THREE.BackSide
    });

    return new THREE.Mesh(
      new THREE.CubeGeometry(300, 300, 300),
      skyBoxMaterial
    );
  },

  createBird: function(world) {
    var bird = new C3.Sphere(0.5, {
      mass:1.1, 
      angularDamping:0.8,
      threeMaterial:new THREE.MeshPhongMaterial({
        map:AngryBirds.Texture.BIRD, 
        ambient:0x999999,
        transparent:true,
        blending:THREE.NormalBlending,
        depthTest:false
      }),
      cannonMaterial:this.world.cannonWorld.defaultMaterial
    });
    return bird;
  },

  constructStage: function() {
    var stage = this.getCurrentStage();
    stage.constructOn(this.world);
    stage.setupEventListeners();
  },

  createSlingshotMesh: function() {
    var slingshotGeometry = new THREE.Geometry();
    var barGeometry = new THREE.CylinderGeometry(0.2, 0.2, 2.5, 8);
    var bar = new THREE.Mesh(barGeometry);
    bar.position.set(0, 2.5/2, 0);

    var armGeometry = new THREE.TorusGeometry(2, 0.2, 8, 16, Math.PI);
    var arm = new THREE.Mesh(armGeometry);
    arm.position.set(0, 2.5+2+0.2-0.03, 0);
    arm.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI);
    
    THREE.GeometryUtils.merge(slingshotGeometry, bar);
    THREE.GeometryUtils.merge(slingshotGeometry, arm);
    var slingshot = new THREE.Mesh(slingshotGeometry, new THREE.MeshPhongMaterial({
      map:AngryBirds.Texture.BOARD,
      transparent:true,
      blending:THREE.NormalBlending
    }));
    slingshot.castShadow = true;
    return slingshot;
  },

  addTrack: function() {
    var radius = 0.05 + 0.025 * Math.random();
    var sphereGeometry = new THREE.SphereGeometry(radius, 3, 3);
    var sphereMaterial = new THREE.MeshLambertMaterial({
      color:0xffffff,
      blending: THREE.AdditiveBlending,
      transparent: true
    });
    var sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphereMesh.position.copy(this.bird.threeMesh.position);
    this.world.threeScene.add(sphereMesh);

    this.tracks.push(sphereMesh);
  },

  removeTracks: function() {
    this.tracks.forEach(function(track) {
      this.world.threeScene.remove(track);
    }.bind(this));
    this.tracks = [];
  },

  addSmoke: function(piggy) {
    var maxRad = 2;
    var geometry = new THREE.Geometry();
    for (var i = 0 ; i < 5000; i++) {
      var rad = Math.random() * maxRad;
      var angleY = Math.random() * 2 * Math.PI;
      var angleX = Math.random() * Math.PI;
      var point = new THREE.Vector3(
        rad * Math.sin(angleY) * Math.cos(angleX),
        rad * Math.cos(angleY) * Math.cos(angleX),
        rad * Math.sin(angleY) * Math.sin(angleX)
      );
      geometry.vertices.push(point);
    }
    var material = new THREE.ParticleBasicMaterial({
      size: 0.01, 
      color: 0x88ff88, 
      blending: THREE.AdditiveBlending,
      transparent: true
    });
    var mesh = new THREE.ParticleSystem(geometry, material);
    mesh.position.copy(piggy.threeMesh.position);
    mesh.sortParticles = false;
    this.world.threeScene.add(mesh);

    setTimeout(function() {
      this.world.threeScene.remove(mesh);
    }.bind(this), 2500);
  },

  setGameMode: function(gameMode) {
    // TODO: ゲームモードはbodyとかにclassで持たせて、要素の表示／非表示はcssに持たせたい
    this.gameMode = gameMode;
    var header = document.getElementsByTagName('header')[0];
    var scores = $('scores');
    var toolbar = $('toolbar');
    if (0 <= [AngryBirds.GameMode.SIGHT_SETTING, AngryBirds.GameMode.FLYING, AngryBirds.GameMode.LANDING].indexOf(this.gameMode) && !this.isSmartphone /*TODO*/) {
      header.className = 'show';
      scores.className = 'show';
      toolbar.className = 'show';
    }
    else {
      header.className = 'hide';
      scores.className = 'hide';
      toolbar.className = 'hide';
    }
  },

  showHelp: function() {
    $('help').className = 'show';
  },

  setViewMode: function(viewMode) {
    this.viewMode = viewMode;
    var elm = $('viewpoint-button-label');
    if (elm) {
      if (this.viewMode === AngryBirds.ViewMode.BIRDVIEW) {
        elm.textContent = 'Bird View';
      }
      else if (this.viewMode === AngryBirds.ViewMode.SIDEVIEW) {
        elm.textContent = 'Side View';
      }
    }
  },

  dragWorld: function(event) {
    event.preventDefault();
    var dx = this.dragStartMousePosition.x - event.clientX;
    var dy = this.dragStartMousePosition.y - event.clientY;
    this.dragStartMousePosition = new THREE.Vector3(event.clientX, event.clientY, 0);

    var yAxis = new THREE.Vector3(0, 1, 0);
    var yawAngle = -dx / 5000 * Math.PI;
    var yawMatrix = new THREE.Matrix4().makeRotationAxis(yAxis, yawAngle);
    var xAxis = new THREE.Vector3(1, 0, 0);
    var pitchAngle = dy / 5000 * Math.PI;
    var pitchMatrix = new THREE.Matrix4().makeRotationAxis(xAxis, pitchAngle);
    var backupCameraDirection = new THREE.Vector3().copy(this.cameraDirection);
    this.cameraDirection.applyMatrix4(yawMatrix);
    this.cameraDirection.applyMatrix4(pitchMatrix);
    if (this.cameraDirection.z < 2.3) {
      this.cameraDirection.copy(backupCameraDirection);
      return;
    }
    this.world.threeCamera.position.copy(new THREE.Vector3().copy(this.bird.threeMesh.position).sub(this.cameraDirection));
    this.world.threeCamera.lookAt(this.bird.threeMesh.position);
//    this.slingshot.lookAt(new THREE.Vector3(this.cameraDirection.x, 0, this.cameraDirection.z).add(this.slingshot.position));
  },

  dragBird: function(event) {
    event.preventDefault();
    var currentMousePosition = new THREE.Vector3(event.clientX, event.clientY, 0);
    var dist = this.dragStartMousePosition.distanceTo(currentMousePosition) / 600;
    if (0.4 < dist) dist = 0.4;

    this.bird.position.set(
      this.birdStartPosition.x - this.cameraDirection.x * dist,
      this.birdStartPosition.y - this.cameraDirection.y * dist,
      this.birdStartPosition.z - this.cameraDirection.z * dist
    );
    return dist;
  },

  startCameraDetector: function() {
    // TODO
    if (this.detector === undefined) {
      this.detector = new Detector();
      this.detector.addDetectHandler(function(data, gc) {
        if (this.gameMode !== AngryBirds.GameMode.SIGHT_SETTING) {
          return;
        }

        if (data.isShot) {
          this.shot(26);
        }
        else if (10 < data.redPoints.size) {
          var center = data.redPoints.centerAverage;
          var dx = center.x / Detector.DEFAULT_WIDTH - 0.5;
          var dy = center.y / Detector.DEFAULT_HEIGHT - 0.5;

          var yAxis = new THREE.Vector3(0, 1, 0);
          var yawAngle = -dx * Math.PI/2;
          var yawMatrix = new THREE.Matrix4().makeRotationAxis(yAxis, yawAngle);
          var xAxis = new THREE.Vector3(1, 0, 0);
          var pitchAngle = -dy * Math.PI/4 - Math.PI/8;
          var pitchMatrix = new THREE.Matrix4().makeRotationAxis(xAxis, pitchAngle);
          this.cameraDirection = new THREE.Vector3(0, 0, 5);
          this.cameraDirection.applyMatrix4(yawMatrix);
          this.cameraDirection.applyMatrix4(pitchMatrix);
          this.world.threeCamera.position.copy(new THREE.Vector3().copy(this.bird.threeMesh.position).sub(this.cameraDirection));
          this.world.threeCamera.lookAt(this.bird.threeMesh.position);
//          this.slingshot.lookAt(new THREE.Vector3(this.cameraDirection.x, 0, this.cameraDirection.z).add(this.slingshot.position));
        }
      }.bind(this));
      this.detector.start();
    }
    this.detector.detect();
  },

  stopCameraDetector: function() {
    if (this.detector) this.detector.stop();
  },

  shot: function(impulseScalar) {
    this.removeTracks();

    this.shotCount += 1;
    $('score-value').textContent = this.shotCount; // TODO: この処理の場所を変えたい...
    if (1 < this.shotCount) $('score-unit').textContent = 'shots';
    var impulseDir = new CANNON.Vec3(this.cameraDirection.x, this.cameraDirection.y, this.cameraDirection.z);
    impulseDir.normalize();
    var impulse = impulseDir.mult(impulseScalar);
    this.bird.applyImpulse(impulse, this.bird.cannonBody.position);
    this.world.isStopped = false;
    this.setGameMode(AngryBirds.GameMode.FLYING);
  },

  togglePause: function() {
    if (this.gameMode !== AngryBirds.GameMode.FLYING) return;

    if (this.world.isStopped) {
      this.unpause();
    }
    else {
      this.pause();
    }
  },

  pause: function() {
    this.world.stop();
    $('pause-button-icon').src = 'image/icon/start.png';
    $('pause-button-label').textContent = 'Start';
  },

  unpause: function() {
    this.world.isStopped = false;
    $('pause-button-icon').src = 'image/icon/stop.png';
    $('pause-button-label').textContent = 'Pause';
  },

  isHiScore: function(score) {
    return this.hiScore === 0 || score < this.hiScore;
  },

  setHiScore: function(score) {
    this.hiScore = score;
    $('hi-score-value').textContent = this.hiScore;
    if (1 < this.hiScore) {
      $('hi-score-unit').textContent = 'shots';
    }
    localStorage.setItem('hiscore', this.hiScore);
  },

  getCurrentStage: function() {
    return this.stages[this.currentStageNo];
  },

  // TODO
  clearStage: function(stage) {
    this.clearNextStageTimer();
    this.removeTracks();
    this.setGameMode(AngryBirds.GameMode.CLEAR_STAGE);
    var nextStageIndex = stage.index + 1;
    if (this.stages.length <= nextStageIndex) {
      if (this.isHiScore(this.shotCount)) {
        this.setHiScore(this.shotCount);
      }
    }
    document.getElementById('stage-id').textContent = nextStageIndex;
    document.getElementById('stage-clear').className = 'show';
  },

  moveNextStage: function() {
    this.getCurrentStage().destructFromFrom(this.world);
    this.currentStageNo++;
    this.constructStage();
  },

  restartStage: function() {
    this.getCurrentStage().destructFromFrom(this.world);
    this.constructStage();
  },

  restartGame: function() {
    window.location.reload();
/*
    document.getElementById('title').className = 'show';
    document.getElementById('game-clear').className = 'hide';

    this.getCurrentStage().destructFromFrom(this.world);
    this.currentStageNo = 0;
    this.constructStage();

    this.ready();
    this.gameMode = AngryBirds.GameMode.TITLE;
    this.world.stop();
*/
  },

  mouseDownListener: function(event) {
    if (this.gameMode != AngryBirds.GameMode.SIGHT_SETTING) return;

    this.dragStartMousePosition = new THREE.Vector3(event.clientX, event.clientY, 0);
    var vector = new THREE.Vector3(
      (event.clientX / window.innerWidth) * 2 - 1, 
      -(event.clientY / window.innerHeight) * 2 + 1, 
      0.5
    );
    var camera = this.world.threeCamera;
    this.projector.unprojectVector(vector, camera);
    var ray = new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize());
    var intersects = ray.intersectObjects([this.bird.threeMesh]);
    if (0 < intersects.length) {
      this.isBirdDragging = true;
      this.isWorldDragging = false;
    }
    else {
      this.isBirdDragging = false;
      if (this.viewMode == AngryBirds.ViewMode.BIRDVIEW) {
        this.isWorldDragging = true;
      }
    }
  },

  mouseMoveListener: function(event) {
    if (this.gameMode != AngryBirds.GameMode.SIGHT_SETTING) return;

    if (this.isBirdDragging) {
      this.dragBird(event);
    }
    else if (this.isWorldDragging) {
      this.dragWorld(event);
    }
  },

  mouseUpListener: function(event) {
    if (this.gameMode != AngryBirds.GameMode.SIGHT_SETTING) return;

    if (this.isBirdDragging) {
      this.isBirdDragging = false;
      var dist = this.dragBird(event);

      var f = dist * 4000;
      var dt = 1/60;
      if (f < 600) {
        this.ready();
      }
      else {
        this.shot(f * dt);
      }
    }
    else if (this.isWorldDragging) {
      this.isWorldDragging = false;
    }
  },

  keyPressListener: function(event) {
    if (event.charCode === 13) { // enter
      if (this.gameMode === AngryBirds.GameMode.TITLE) {
        document.getElementById('title').className = 'hide';
        this.setGameMode(AngryBirds.GameMode.SIGHT_SETTING);
      }
      else if (this.gameMode === AngryBirds.GameMode.FLYING
               || this.gameMode === AngryBirds.GameMode.CLEAR_STAGE) {
        // ignore
      }
      else if (this.world.isStopped) {
        this.restartGame();
      }
      else {
        this.world.stop();
        this.ready();
      }
    }
    else if (event.charCode === 32) { // space
      if (this.viewMode === AngryBirds.ViewMode.BIRDVIEW) {
        this.setViewMode(AngryBirds.ViewMode.SIDEVIEW);
      }
      else if (this.viewMode === AngryBirds.ViewMode.SIDEVIEW) {
        this.setViewMode(AngryBirds.ViewMode.BIRDVIEW);
      }
    }
    else if (event.charCode === 112) { // 'p'
      this.togglePause();
    }
  },

  startSmartphoneMode: function() {
    this.isSmartphone = true; // TODO

    this.setting.waitingTimeToReshot = 15000;
    this.getCurrentStage().destructFromFrom(this.world);
    var stage = new AngryBirds.Stage1({x:0, z:30});
    stage.game = this;
    stage.index = 0;
    this.stages = [stage];
    this.constructStage();
    this.ready();

    this.setGameMode(AngryBirds.GameMode.SIGHT_SETTING);

    var header = document.getElementsByTagName('header')[0];
    var scores = $('scores');
    var toolbar = $('toolbar');
    header.className = 'hide';
    scores.className = 'hide';
    toolbar.className = 'hide';
  },

  setupEventListeners: function() {
    document.addEventListener('mousedown', this.mouseDownListener.bind(this));
    document.addEventListener('mousemove', this.mouseMoveListener.bind(this));
    document.addEventListener('mouseup', this.mouseUpListener.bind(this));
    document.addEventListener('keypress', this.keyPressListener.bind(this));
    $('start-button').addEventListener('click', function(event) {
      $('title').className = 'hide';
      this.setGameMode(AngryBirds.GameMode.SIGHT_SETTING);
    }.bind(this));
    $('smartphone-button').addEventListener('click', function(event) {
      $('title').className = 'hide';
      this.startCameraDetector();
      this.startSmartphoneMode();
    }.bind(this));
    $('help-menu-button').addEventListener('click', function(event) {
      this.showHelp();
    }.bind(this));
    $('camera-button').addEventListener('click', function(event) {
      $('camera-button').blur();
      if (this.detector && this.detector.isDetecting) {
        this.stopCameraDetector();
        $('camera-button-label').textContent = 'OFF';
      }
      else {
        $('prepare-camera').className = 'show';
        $('prepare-camera-dialog-url').textContent = 
          location.protocol + '//' + location.hostname + location.pathname;
      }
    }.bind(this));
    $('prepare-camera').addEventListener('click', function(event) {
      $('prepare-camera').className = 'hide';
      this.startCameraDetector();
      $('camera-button-label').textContent = 'ON';
    }.bind(this));
    $('pause-button').addEventListener('click', function(event) {
      $('pause-button').blur();
      this.togglePause();
    }.bind(this));
    $('viewpoint-button').addEventListener('click', function(event) {
      $('viewpoint-button').blur();
      if (this.viewMode === AngryBirds.ViewMode.BIRDVIEW) {
        this.setViewMode(AngryBirds.ViewMode.SIDEVIEW);
      }
      else if (this.viewMode === AngryBirds.ViewMode.SIDEVIEW) {
        this.setViewMode(AngryBirds.ViewMode.BIRDVIEW);
      }
    }.bind(this));
    $('restart-stage-button').addEventListener('click', function(event) {
      $('restart-stage-button').blur();
      this.restartStage();
    }.bind(this));
    $('restart-game-button').addEventListener('click', function(event) {
      window.location.reload();
    }.bind(this));
    $('help-button').addEventListener('click', function(event) {
      $('help-button').blur();
      this.showHelp();
    }.bind(this));
    $('next-shot-button').addEventListener('click', function(event) {
      $('next-shot-button').blur();
      this.world.stop();
      this.ready();
    }.bind(this));
    $('help').addEventListener('click', function(event) {
      $('help').className = 'hide';
    });
    $('stage-clear').addEventListener('click', function(event) {
      // TODO
      var nextStageIndex = parseInt($('stage-id').textContent, 10);
      $('stage-clear').className = 'hide';
      if (this.stages.length <= nextStageIndex) {
        $('game-clear').className = 'show';
      }
      else {
        this.world.stop();
        this.moveNextStage();
        this.ready();
      }
    }.bind(this));
    $('game-clear').addEventListener('click', function(event) {
      this.restartGame();
    }.bind(this));

    this.nextStageTimer = this.bird.addEventListener('collide', function(evt) {
      if (this.gameMode === AngryBirds.GameMode.FLYING) {
        this.setGameMode(AngryBirds.GameMode.LANDING);
        var currentShotCount = this.shotCount;
        setTimeout(function() {
          if (currentShotCount === this.shotCount
              && this.gameMode === AngryBirds.GameMode.LANDING) {
            this.world.stop();
            this.ready();
          }
        }.bind(this), this.setting.waitingTimeToReshot);
      }
    }.bind(this));
  },

  clearNextStageTimer: function() {
    if (this.nextStageTimer) {
      window.clearTimerout(this.nextStageTimer);
      this.nextStageTimer = null;
    }
  },

  ready: function() {
    this.clearNextStageTimer();
    this.setGameMode(AngryBirds.GameMode.SIGHT_SETTING);
    this.setViewMode(AngryBirds.ViewMode.BIRDVIEW);
    this.isBirdDragging = false;
    this.isWorldDragging = false;
    this.bird.cannonBody.velocity.set(0, 0, 0);
    this.bird.position.copy(this.birdStartPosition);
    this.bird.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI/2);
    this.cameraDirection = new THREE.Vector3(0, 0, 5);
    this.world.threeCamera.position.copy(new THREE.Vector3().copy(this.bird.threeMesh.position).sub(this.cameraDirection));
    this.world.threeCamera.lookAt(this.bird.threeMesh.position);
    this.slingshot.lookAt(new THREE.Vector3(0, 0, 1).add(this.slingshot.position));
  },

  start: function(isRestart) {
    this.construct();
    this.setupEventListeners();
    this.ready();
    this.setGameMode(AngryBirds.GameMode.TITLE);
    var step = 1;
    this.world.start(1/24, function() {
      if (this.gameMode === AngryBirds.GameMode.TITLE) {
        step += 1;
        var angle = step * 180 / Math.PI / 5000;
        var radius = 12 + 2 * Math.sin(angle / 3);
        this.world.threeCamera.position.set(0 + radius * Math.cos(angle), 7 + 3 * Math.cos(angle * 2), 43 + radius * Math.sin(angle));
        this.world.threeCamera.lookAt(new THREE.Vector3(0, 5, 48));
      }
      else if (this.viewMode === AngryBirds.ViewMode.BIRDVIEW) {
        this.bird.threeMesh.material.opacity = 0.5;
        if (this.gameMode === AngryBirds.GameMode.SIGHT_SETTING) {
          this.slingshot.material.opacity = 0.5;
          this.pouch.material.opacity = 0.5;
          var behindBird = new THREE.Vector3().copy(this.bird.threeMesh.position
            ).sub(this.cameraDirection);
          this.world.threeCamera.position.copy(behindBird);
          this.world.threeCamera.lookAt(this.bird.threeMesh.position);
        }
        else if (this.getCurrentStage().piggies.length != 0) {
          this.slingshot.material.opacity = 1;
          this.pouch.material.opacity = 1;
          this.world.threeCamera.position.copy(this.bird.threeMesh.position);
          // TODO: piggiesの重心とかにする？
          this.world.threeCamera.lookAt(this.getCurrentStage().piggies[0].threeMesh.position);
        }
      }
      else if (this.viewMode === AngryBirds.ViewMode.SIDEVIEW) {
        this.bird.threeMesh.material.opacity = 1;
        this.slingshot.material.opacity = 1;
        this.pouch.material.opacity = 1;
        this.world.threeCamera.position.set(-35, 15, 30);
        this.world.threeCamera.lookAt(new THREE.Vector3(0, 5, 30));
      }

      if (0 < this.bird.threeMesh.position.z) {
        this.leftRubber.geometry.vertices[1].set(
          0.55,
          this.leftRubber.geometry.vertices[0].y,
          0
        );
        this.rightRubber.geometry.vertices[1].set(
          -0.55,
          this.rightRubber.geometry.vertices[0].y,
          0
        );
        this.pouch.position.set(
          0,
          this.rightRubber.geometry.vertices[0].y,
          0
        );
      }
      else {
        this.leftRubber.geometry.vertices[1].set(
          this.bird.threeMesh.position.x + 0.5,
          this.bird.threeMesh.position.y,
          this.bird.threeMesh.position.z
        );
        this.rightRubber.geometry.vertices[1].set(
          this.bird.threeMesh.position.x - 0.5,
          this.bird.threeMesh.position.y,
          this.bird.threeMesh.position.z
        );
        this.pouch.position.copy(this.bird.threeMesh.position);
      }
      this.leftRubber.geometry.verticesNeedUpdate = true;
      this.rightRubber.geometry.verticesNeedUpdate = true;

      if (this.gameMode === AngryBirds.GameMode.FLYING) {
        this.addTrack();
      }
    }.bind(this));
    this.world.stop();
  }
};

AngryBirds.Game.start = function(opts) {
//  new AngryBirds.Game(opts || {}).start();

  // TODO: one-tap-mode
  var game = new AngryBirds.Game(opts || {});
  game.start();
  if (location.hash === '#onetap') {
    $('title').className = 'hide';
    game.startCameraDetector();
    game.startSmartphoneMode();
  }
};

}).call(this, AngryBirds);
