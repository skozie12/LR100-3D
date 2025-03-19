import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { World, Body, Cylinder, Material, ContactMaterial, Sphere, Vec3, DistanceConstraint, BODY_TYPES, Quaternion as CQuaternion, Box } from 'cannon-es';

const canvas = document.getElementById('lr100-canvas');
const scene = new THREE.Scene();
scene.background = new THREE.Color('lightgray');

const camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
camera.position.set(0, 2, 5);
camera.zoom = 4;
camera.updateProjectionMatrix();

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(canvas.clientWidth, canvas.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2;
controls.minDistance = 1;
controls.maxDistance = 10;
controls.enablePan = false;

const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(0, 5, 4);
dirLight.castShadow = true;
scene.add(dirLight);

window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
});



function createLogoFloor() {
  const textureLoader = new THREE.TextureLoader();
  const logoTexture = textureLoader.load('./assets/taymer_logo.png');
  const topMaterial = new THREE.MeshPhongMaterial({ map: logoTexture, transparent: true });
  const brownMaterial = new THREE.MeshPhongMaterial({ color: 0xD2B48C });
  const legMaterial = new THREE.MeshPhongMaterial({ color: 0xEDCAA1 });
  const materials = [brownMaterial, brownMaterial, topMaterial, brownMaterial, brownMaterial, brownMaterial];

  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(4, 2, 0.06), 
    new THREE.MeshPhongMaterial({ color: 0xA9a9a9 })
  );
  floor.receiveShadow = true;
  floor.position.y = -0.77;
  floor.position.z = 0
  floor.rotateX(-Math.PI / 2);
  scene.add(floor);
  
  const boxGeometry = new THREE.BoxGeometry(2.25, 0.025, 0.75);
  const box = new THREE.Mesh(boxGeometry, materials);
  box.castShadow = true;
  box.receiveShadow = true;
  box.position.y = -0.2;
  scene.add(box);

  const boxFix = new THREE.BoxGeometry(2.25, 0.022, 0.75);
  const box1 = new THREE.Mesh(boxFix, brownMaterial);
  box1.castShadow = true;
  box1.receiveShadow = true;
  box1.position.y = -0.2;
  scene.add(box1);

  const legGeo = new THREE.BoxGeometry(0.1, 0.6, 0.1);
  function makeLeg(x, z) {
    const leg = new THREE.Mesh(legGeo, legMaterial);
    leg.position.set(x, -0.5, z);
    leg.castShadow = true;
    leg.receiveShadow = true;
    scene.add(leg);
  }
  makeLeg(-0.95, -0.3);
  makeLeg(-0.95,  0.3);
  makeLeg( 0.95, -0.3);
  makeLeg( 0.95,  0.3);
}
createLogoFloor();

const canvasOverlay = document.getElementById('canvas-overlay');
const priceDisplay = document.getElementById('price-display');

function onCanvasClick(){
  canvasOverlay.style.display = 'none';
  renderer.domElement.removeEventListener('pointerdown', onCanvasClick);
}
renderer.domElement.addEventListener('pointerdown', onCanvasClick);

let isPlaying = false;
let isPaused = false;
let segmentTimer = null;

const loader = new GLTFLoader();

let reelModel = null;
let counterModel = null;
let standModel = null;
let movingModel = null;
let cutterModel = null;

function disposeModel(model) {
  if (!model) return;
  model.traverse((child) => {
    if (child.isMesh) {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }
  });
  scene.remove(model);
}

function loadCombo(fileName, onLoad) {
  if (!fileName) return;
  loader.load(
    `./assets/${fileName}`,
    (gltf) => {
      const model = gltf.scene;
      model.rotation.y = Math.PI;
      model.position.x = 0.57;
      model.position.y = 0.225;
      scene.add(model);
      if (onLoad) onLoad(model);
    },
    undefined,
    (error) => console.error('Error loading combo file:', fileName, error)
  );
}

let oldReelValue = '';
let oldCounterValue = '';
let oldCoilerValue = '';
let oldCutterValue = '';

const COILER_CONFIG = {
  "100-10": {
    radius: 0.2,
    height: 0.18,
    color: 0x00ff00,
    zOffset: 0.025,
    sideOffset1: 0.12,
    sideOffset2: -0.07
  },
  "100-99": {
    radius: 0.16,
    height: 0.15,
    color: 0x0088ff,
    zOffset: 0.025,
    sideOffset1: 0.09,
    sideOffset2: -0.05
  },
  "100-200": {
    radius: 0.12,
    height: 0.13,
    color: 0xff5500,
    zOffset: 0.025,
    sideOffset1: 0.07,
    sideOffset2: -0.03
  }
};

let coilerBody = null;
let coilerBodyMesh = null;
let coilerRadius = 0.2;
let coilerHeight = 0.18;
let activeCoilerType = "100-10";

function onDropdownChange() {
  const reelValue = reelSelect.value;
  const counterValue = counterSelect.value;
  const coilerValue = coilerSelect.value;
  const cutterValue = cutterSelect.value;

  if (reelValue !== oldReelValue) {
    disposeModel(reelModel);
    reelModel = null;
    if (spoolModel) {
      disposeModel(spoolModel);
      spoolModel = null;
    }

    if (floorCoilMesh) {
      scene.remove(floorCoilMesh);
      floorCoilMesh.geometry.dispose();
      floorCoilMesh.material.dispose();
      floorCoilMesh = null;
    }

    if (reelValue) {
      loadCombo(reelValue, (model) => {
        reelModel = model;
        checkAndCreateRope();
      });
      loadSpoolFromMovingAssets();
    } else {
      resetRope();
    }
  }

  if (counterValue !== oldCounterValue) {
    disposeModel(counterModel);
    counterModel = null;
    if (counterValue) {
      loadCombo(counterValue, (model) => {
        counterModel = model;
        checkAndCreateRope();
      });
    } else {
      resetRope();
    }
  }

  if (coilerValue !== oldCoilerValue) {
    disposeModel(standModel);
    standModel = null;
    disposeModel(movingModel);
    movingModel = null;
    
    resetRope();
    
    if (coilerValue === '100-10.gltf') {
      activeCoilerType = "100-10";
    }
    else if (coilerValue === '100-99.gltf') {
      activeCoilerType = "100-99";
    }
    else if (coilerValue === '100-200.gltf') {
      activeCoilerType = "100-200";
    }
    
    createCoiler();
    createCoilerSides();
    
    if (coilerValue === '100-10.gltf') {
      loadCombo('100-10-STAND.gltf', (model) => {
        standModel = model;
        checkAndCreateRope();
      });
      loadCombo('100-10-MOVING.gltf', (model) => {
        movingModel = model;
        dummy = new THREE.Object3D();
        dummy.position.set(0.18, 0.06, -0.03);
        movingModel.add(dummy);
        createCoiler();
        createCoilerSides();
        checkAndCreateRope();
      });
    }
    else if (coilerValue === '100-99.gltf') {
      loadCombo('100-99-STAND.gltf', (model) => {
        standModel = model;
        checkAndCreateRope();
      });
      loadCombo('100-99-MOVING.gltf', (model) => {
        movingModel = model;
        dummy = new THREE.Object3D();
        dummy.position.set(0.14, 0.06, -0.03);
        movingModel.add(dummy);
        createCoiler();
        createCoilerSides();
        checkAndCreateRope();
      });
    }
    else if (coilerValue === '100-200.gltf') {
      loadCombo('100-200-STAND.gltf', (model) => {
        standModel = model;
        checkAndCreateRope();
      });
      loadCombo('100-200-MOVING.gltf', (model) => {
        movingModel = model;
        dummy = new THREE.Object3D();
        dummy.position.set(0.11, 0.04, 0);
        movingModel.add(dummy);
        createCoiler();
        createCoilerSides();
        checkAndCreateRope();
      });
    }
    else if (coilerValue) {
      loadCombo(coilerValue, (model) => {
        standModel = model;
        checkAndCreateRope();
      });
    } else {
      resetRope();
    }
  }
  
  if (cutterValue !== oldCutterValue) {
    disposeModel(cutterModel);
    cutterModel = null;
    if (cutterValue) {
      loadCombo(cutterValue, (model) => {
        cutterModel = model;
      });
    }
  }

  if (completeConfig()) {
    if (!isPlaying) {
      isPlaying = true;
      segmentTimer = setInterval(() => {
        if (isPlaying) {
          addRopeSegment();
        }
      }, 125);
    }
  } else {
    if (isPlaying) {
      isPlaying = false;
      clearInterval(segmentTimer);
      segmentTimer = null;
    }
  }

  oldReelValue = reelValue;
  oldCounterValue = counterValue;
  oldCoilerValue = coilerValue;
  oldCutterValue = cutterValue;
  
  updatePrice();
  checkAndCreateRope();
}

function checkAndCreateRope() {
  if (completeConfig()) {
    if (ropeBodies.length === 0) {
      console.log("Creating rope - all components selected");
      createRopeSegments();
      if (!isPlaying) {
        isPlaying = true;
        segmentTimer = setInterval(() => {
          if (isPlaying) {
            addRopeSegment();
          }
        }, 125);
      }
    }
  } else {
    if (ropeBodies.length > 0) {
      console.log("Removing rope - not all components selected");
      resetRope();
    }
  }
}

function createRopeSegments() {
  resetRope();
  for (let i = 0; i < segmentCount; i++) {
    const sphereShape = new Sphere(segmentWidth / 2);
    const t = i / (segmentCount - 1);
    let x, y, z;
    
    if (i <= midRope) {
      const segT = i / midRope;
      x = anchorStart.position.x + segT * (anchor.position.x - anchorStart.position.x);
      y = anchorStart.position.y + segT * (anchor.position.y - anchorStart.position.y);
      z = anchorStart.position.z + segT * (anchor.position.z - anchorStart.position.z);
      y += Math.sin(segT * Math.PI) * 0.05;
    } else {
      const segT = (i - midRope) / (segmentCount - midRope - 1);
      x = anchor.position.x + segT * (anchorEnd.position.x - anchor.position.x);
      y = anchor.position.y + segT * (anchorEnd.position.y - anchor.position.y);
      z = anchor.position.z + segT * (anchorEnd.position.z - anchorEnd.position.z);
      y += Math.sin(segT * Math.PI) * 0.05;
    }
    
    const segmentBody = new Body({ 
      mass: segmentMass, 
      shape: sphereShape, 
      position: new Vec3(x, y, z),
      material: defaultMaterial,
      collisionFilterGroup: COLLISION_GROUPS.ROPE | COLLISION_GROUPS.ROPE_SEGMENT,
      collisionFilterMask: COLLISION_GROUPS.COILER | COLLISION_GROUPS.ROPE_SEGMENT
    });
    segmentBody.angularDamping = 0.95;
    segmentBody.linearDamping = 0.95;
    
    world.addBody(segmentBody);
    ropeBodies.push(segmentBody);
  }

  for (let i = 0; i < segmentCount - 1; i++) {
    const constraint = new DistanceConstraint(
      ropeBodies[i], 
      ropeBodies[i + 1], 
      segmentDistance,
      1e5
    );
    constraint.collideConnected = false;
    constraint.maxForce = 1e3;
    world.addConstraint(constraint);
  }

  const anchorConstraint = new DistanceConstraint(anchor, ropeBodies[midRope], 0);
  world.addConstraint(anchorConstraint);

  const anchorStartConstraint = new DistanceConstraint(anchorStart, ropeBodies[0], 0);
  world.addConstraint(anchorStartConstraint);

  const anchorEndConstraint = new DistanceConstraint(anchorEnd, ropeBodies[segmentCount - 1], 0);
  world.addConstraint(anchorEndConstraint);
  
  createRopeMesh();
}

const reelSelect = document.getElementById('reelStandSelect');
const counterSelect = document.getElementById('counterSelect');
const coilerSelect = document.getElementById('coilerSelect');
const cutterSelect = document.getElementById('cutterSelect');

cutterSelect.disabled = !counterSelect.value;
counterSelect.addEventListener('change', () => {
  if (counterSelect.value) {
    cutterSelect.disabled = false;
    cutterSelect.options[0].textContent = '--- Select Cutter ---';
  } else {
    cutterSelect.disabled = true;
    cutterSelect.value = '';
    cutterSelect.options[0].textContent = '-- Select Counter --';
  }
});

[reelSelect, counterSelect, coilerSelect, cutterSelect].forEach((dropdown) => {
  dropdown.addEventListener('change', onDropdownChange);
});

const PRICE_MAP = {
  '1410': 786,
  '1420': 786,
  '1410UR': 815,
  '1420UR': 815,
  '100-10': 969.75,
  '100-99': 709.50,
  '100-200': 598.50,
  '100-284': 471,
  '100-C': 148.50
};

function updatePrice() {
  const coilerVal = coilerSelect.options[coilerSelect.selectedIndex]?.id || '';
  const reelVal = reelSelect.options[reelSelect.selectedIndex]?.id || '';
  const counterVal = counterSelect.options[counterSelect.selectedIndex]?.id || '';
  const cutterVal = cutterSelect.options[cutterSelect.selectedIndex]?.id || '';

  const coilerPrice = PRICE_MAP[coilerVal] || 0;
  const reelPrice = PRICE_MAP[reelVal] || 0;
  const counterPrice = PRICE_MAP[counterVal] || 0;
  const cutterPrice = PRICE_MAP[cutterVal] || 0;

  let total = coilerPrice + reelPrice + counterPrice + cutterPrice;
  if (counterVal !== '') {
    total += 78;
  }
  if (total === 0) {
    priceDisplay.style.visibility = 'hidden';
  } else {
    priceDisplay.style.visibility = 'visible';
    priceDisplay.textContent = 'Price: $' + total.toFixed(2) + ' USD';
  }
}

const world = new World({
  gravity: new Vec3(0, -9.81, 0),
});

const defaultMaterial = new Material('defaultMaterial');
const COLLISION_GROUPS = {
  COILER: 1,
  ROPE: 2,
  ROPE_SEGMENT: 4,
  ANCHOR: 8
};

world.defaultContactMaterial = new ContactMaterial(defaultMaterial, defaultMaterial, {
  friction: 0.5,
  restitution: 0.01,
  contactEquationStiffness: 5e5,
  contactEquationRelaxation: 5,
  frictionEquationStiffness: 5e5,
  frictionEquationRelaxation: 5
});
world.defaultMaterial = defaultMaterial;

const segmentCount = 40;
const segmentWidth = 0.012;
const segmentMass = 0.5;
const segmentDistance = 0.012;

const ropeBodies = [];
const ropePoints = [];
const ropeRadius = segmentWidth / 2;

function updateRopeCurve() {
  ropePoints.length = 0;
  for (let i = 0; i < ropeBodies.length; i++) {
    ropePoints.push(new THREE.Vector3(
      ropeBodies[i].position.x,
      ropeBodies[i].position.y,
      ropeBodies[i].position.z
    ));
  }
}

function createRopeMesh(){
  if (ropeMeshes.length > 0) {
    ropeMeshes.forEach(mesh => {
      scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
    ropeMeshes.length = 0;
  }

  updateRopeCurve();
  const curve = new THREE.CatmullRomCurve3(ropePoints); 
  window.ropeCurve = curve;
  
  const tubeGeometry = new THREE.TubeGeometry(
    curve, 
    segmentCount * 4, 
    ropeRadius * 0.8,
    16, 
    false
  );
  
  tubeGeometry.userData = {
    tubularSegments: segmentCount * 4,
    radius: ropeRadius * 0.8,
    radialSegments: 16,
    closed: false
  };

  const textureLoader = new THREE.TextureLoader();
  
  const colourMap = textureLoader.load('./assets/Rope002_1K-JPG_Color.jpg', function(texture) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 1);
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  });

  const normalMap = textureLoader.load('./assets/Rope002_1K-JPG_NormalGL.jpg', function(texture) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 1);
  });

  const roughnessMap = textureLoader.load('./assets/Rope002_1K-JPG_Roughness.jpg', function(texture) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 1);
  });

  const metalnessMap = textureLoader.load('./assets/Rope002_1K-JPG_Metalness.jpg', function(texture) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping; 
    texture.repeat.set(8, 1);
  });

  const displacementMap = textureLoader.load('./assets/Rope002_1K-JPG_Displacement.jpg', function(texture) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 1);
  });

  tubeGeometry.computeBoundingBox();
  const boundingBox = tubeGeometry.boundingBox;
  const size = new THREE.Vector3();
  boundingBox.getSize(size);
  const uvAttribute = tubeGeometry.attributes.uv;
  for (let i = 0; i < uvAttribute.count; i++) {
    let u = uvAttribute.getX(i);
    let v = uvAttribute.getY(i);
    uvAttribute.set(i, u * size.length() * 0.5);
  }
  uvAttribute.needsUpdate = true;

  const ropeMaterial = new THREE.MeshStandardMaterial({
    map: colourMap,
    normalMap: normalMap,
    roughnessMap: roughnessMap,
    displacementMap: displacementMap,
    metalnessMap: metalnessMap,
    displacementScale: 0.001,
    normalScale: new THREE.Vector2(0.8, 0.8),
    roughness: 0.7,
    metalness: 0.2,
    side: THREE.DoubleSide,
    envMapIntensity: 0.5
  });

  const tubeMesh = new THREE.Mesh(tubeGeometry, ropeMaterial);
  tubeMesh.castShadow = true;
  tubeMesh.receiveShadow = true; 
  scene.add(tubeMesh);
  ropeMeshes.push(tubeMesh);
  if (!renderer.shadowMap.enabled) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
  }
}

function updateRopeGeometry() {
  if (ropeMeshes.length === 0 || !ropeMeshes[0]) return;
  const mesh = ropeMeshes[0];
  const geometry = mesh.geometry;
  if (!geometry || !geometry.userData) return;
  updateRopeCurve();
  const curve = new THREE.CatmullRomCurve3(ropePoints);
  window.ropeCurve = curve;
  const { tubularSegments, radius, radialSegments } = geometry.userData;
  const positionAttr = geometry.attributes.position;
  if (!positionAttr) return;
  const frames = curve.computeFrenetFrames(tubularSegments, false);
  const vertex = new THREE.Vector3();
  const normal = new THREE.Vector3();
  let idx = 0;
  for (let i = 0; i <= tubularSegments; i++) {
    const u = i / tubularSegments;
    const point = curve.getPointAt(u);
    const tangent = curve.getTangentAt(u);
    const N = frames.normals[i];
    const B = frames.binormals[i];
    for (let j = 0; j <= radialSegments; j++) {
      const v = j / radialSegments * Math.PI * 2;
      const sin = Math.sin(v);
      const cos = -Math.cos(v);
      normal.x = cos * N.x + sin * B.x;
      normal.y = cos * N.y + sin * B.y;
      normal.z = cos * N.z + sin * B.z;
      normal.multiplyScalar(radius);
      vertex.copy(point).add(normal);
      positionAttr.setXYZ(idx, vertex.x, vertex.y, vertex.z);
      idx++;
    }
  }
  positionAttr.needsUpdate = true;
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
}

const midRope = 10;
const anchorEnd = new Body({ mass: 0 });
anchorEnd.position.set(0.57, 0.225, 0.025);
anchorEnd.type = BODY_TYPES.KINEMATIC;
world.addBody(anchorEnd);

const anchorStart = new Body({ mass: 0 });
anchorStart.position.set(-0.6, 0.27, -0.058);
world.addBody(anchorStart);

const anchor = new Body({ mass: 0 });
anchor.position.set(0, 0.3, 0.03);
world.addBody(anchor);

const ropeMeshes = [];

function addRopeSegment(){
  try {
    if (ropeBodies.length >= 300) return;
    if (ropeBodies.length < 11) return;
    const anchorEndIndex = ropeBodies.length - 1;
    const baseSegment = ropeBodies[10];
    const newBody = new Body({ 
      mass: segmentMass, 
      shape: new Sphere(segmentWidth / 2), 
      position: new Vec3(
        baseSegment.position.x,
        baseSegment.position.y,
        baseSegment.position.z
      ),
      material: defaultMaterial,
      collisionFilterGroup: COLLISION_GROUPS.ROPE | COLLISION_GROUPS.ROPE_SEGMENT,
      collisionFilterMask: COLLISION_GROUPS.COILER | COLLISION_GROUPS.ROPE_SEGMENT
    });
    
    if (coilerBody) {
      const dx = coilerBody.position.x - baseSegment.position.x;
      const dy = coilerBody.position.y - baseSegment.position.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      if (dist > 0.1) {
        newBody.velocity.set(
          dx * 0.02, 
          dy * 0.02, 
          0
        );
      }
    }
    
    newBody.angularDamping = 0.95;
    newBody.linearDamping = 0.95;
    world.addBody(newBody);
    const constraintsToUpdate = [];
    world.constraints.forEach((constraint) => {
      if ((constraint.bodyA === ropeBodies[10] && constraint.bodyB === ropeBodies[11]) ||
          (constraint.bodyA === ropeBodies[11] && constraint.bodyB === ropeBodies[10])) {
        constraintsToUpdate.push(constraint);
        world.removeConstraint(constraint);
      }
    });
    const nextBody = ropeBodies[11];
    if (!window.addedSegments) window.addedSegments = 0;
    window.addedSegments++;
    
    if (!window.currentDirection) window.currentDirection = 1;
    if (!window.currentZ) window.currentZ = 0;
    
    if (window.addedSegments % 30 === 0) {
      window.currentDirection *= -1;
    }
    
    const config = COILER_CONFIG[activeCoilerType];
    const zRange = (config.sideOffset1 - config.sideOffset2) * 0.8;
    window.currentZ += window.currentDirection * (zRange / 50) * 0.9;
    const maxZ = zRange * 0.45;
    window.currentZ = Math.max(Math.min(window.currentZ, maxZ), -maxZ);
    
    const tailSegments = ropeBodies.slice(11);
    ropeBodies.length = 11; 
    ropeBodies.push(newBody); 
    ropeBodies.push(...tailSegments); 
    

    const constraintPrev = new DistanceConstraint(ropeBodies[10], newBody, segmentDistance, 1e5);
    const constraintNext = new DistanceConstraint(newBody, nextBody, segmentDistance, 1e5);
    constraintPrev.collideConnected = false;
    constraintNext.collideConnected = false;
    constraintPrev.maxForce = 1e3;
    constraintNext.maxForce = 1e3;
    world.addConstraint(constraintPrev);
    world.addConstraint(constraintNext);
    

    if (anchorEndIndex === ropeBodies.length - 2) {
      world.constraints.forEach((constraint) => {
        if (constraint instanceof DistanceConstraint && 
            (constraint.bodyA === anchorEnd || constraint.bodyB === anchorEnd)) {
          world.removeConstraint(constraint);
          const newConstraint = new DistanceConstraint(anchorEnd, ropeBodies[ropeBodies.length - 1], 0);
          world.addConstraint(newConstraint);
        }
      });
    }
  } catch (err) {
    console.error("Error in addRopeSegment:", err);
  }
}

let dummy = null;
const temp = new THREE.Vector3();

let coilerBodySide1 = null;
let coilerBodyMeshSide1 = null;
let coilerBodySide2 = null;
let coilerBodyMeshSide2 = null;

function completeConfig(){
  return reelSelect.value && counterSelect.value && coilerSelect.value;
}

function resetRope(){
  for (let i = world.constraints.length -1; i >= 0; i--) {
    if (world.constraints[i] instanceof DistanceConstraint) {
      world.removeConstraint(world.constraints[i]);
    }
  }
  for (let i = 0; i < ropeBodies.length; i++){
    world.removeBody(ropeBodies[i])
  }
  ropeBodies.length = 0;
  ropePoints.length = 0;

  if (ropeMeshes.length > 0) {
    ropeMeshes.forEach(mesh => {
      scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
    ropeMeshes.length = 0;
  }

  window.addedSegments = 0;
  window.currentDirection = 1;
  window.currentZ = 0;

  if (segmentTimer) {
    clearInterval(segmentTimer);
    segmentTimer = null;
  }

  isPlaying = false;
  isPaused = false;
}

function createCoiler() {
  if (coilerBody) {
    world.removeBody(coilerBody);
    coilerBody = null;
  }
  if (coilerBodyMesh) {
    scene.remove(coilerBodyMesh);
    coilerBodyMesh.geometry.dispose();
    coilerBodyMesh.material.dispose();
    coilerBodyMesh = null;
  }
  
  const config = COILER_CONFIG[activeCoilerType];
  coilerRadius = config.radius;
  coilerHeight = config.height;
  
  coilerBody = new Body({ 
    mass: 0, 
    type: BODY_TYPES.KINEMATIC, 
    material: defaultMaterial,
    collisionFilterGroup: COLLISION_GROUPS.COILER,
    collisionFilterMask: COLLISION_GROUPS.ROPE
  });
  
  const cylinderShape = new Cylinder(coilerRadius, coilerRadius, coilerHeight, 16);
  coilerBody.addShape(cylinderShape, new Vec3(0, 0, 0), new CQuaternion().setFromAxisAngle(new Vec3(1, 0, 0), Math.PI / 2));
  
  const bumpRadius = coilerRadius * 0.03;
  const spiralTurns = 6;
  
  for (let i = 0; i < 32; i++) {
    const angle = (i / 32) * Math.PI * 2 * spiralTurns;
    const zPos = ((i / 32) * coilerHeight) - (coilerHeight / 2);
    
    const x = coilerRadius * 0.97 * Math.cos(angle);
    const y = coilerRadius * 0.97 * Math.sin(angle);
    
    const bumpShape = new Sphere(bumpRadius);
    coilerBody.addShape(bumpShape, new Vec3(x, y, zPos));
  }
  coilerBody.position.set(0.57, 0.225, config.zOffset);
  world.addBody(coilerBody);

  /* Visual Meshes for Coiler Physics Objects
  const cylinderGeo = new THREE.CylinderGeometry(coilerRadius, coilerRadius, coilerHeight, 16, 1);
  cylinderGeo.rotateZ(Math.PI / 2); 
  cylinderGeo.rotateY(Math.PI / 2); 

  const wireMat = new THREE.MeshBasicMaterial({
    color: config.color,
    transparent: true,
    opacity: 0.2,
    wireframe: true,
  });

  coilerBodyMesh = new THREE.Mesh(cylinderGeo, wireMat);
  coilerBodyMesh.position.set(0.57, 0.225, config.zOffset);
  scene.add(coilerBodyMesh);
  */
}

function createCoilerSides() {
  if (coilerBodySide1) {
    world.removeBody(coilerBodySide1);
    coilerBodySide1 = null;
  }
  if (coilerBodySide2) {
    world.removeBody(coilerBodySide2);
    coilerBodySide2 = null;
  }

  if (coilerBodyMeshSide1) {
    scene.remove(coilerBodyMeshSide1);
    coilerBodyMeshSide1.geometry.dispose();
    coilerBodyMeshSide1.material.dispose();
    coilerBodyMeshSide1 = null;
  }
  if (coilerBodyMeshSide2) {
    scene.remove(coilerBodyMeshSide2);
    coilerBodyMeshSide2.geometry.dispose();
    coilerBodyMeshSide2.material.dispose();
    coilerBodyMeshSide2 = null;
  }
  const config = COILER_CONFIG[activeCoilerType];
  const sideRadiusMultiplier = activeCoilerType === "100-10" ? 2.0 : 
                               activeCoilerType === "100-99" ? 2.1 : 2.2;
                               
  const cylinderShapeSide = new Cylinder(
    coilerRadius * sideRadiusMultiplier, 
    coilerRadius * sideRadiusMultiplier, 
    coilerHeight / 10, 
    16
  );
 
  coilerBodySide1 = new Body({ 
    mass: 0, 
    type: BODY_TYPES.KINEMATIC, 
    shape: cylinderShapeSide, 
    material: defaultMaterial 
  });
  
  coilerBodySide1.position.set(0.57, 0.225, config.sideOffset1);
  coilerBodySide1.quaternion.setFromEuler(Math.PI / 2, 0, 0); 
  world.addBody(coilerBodySide1);

  coilerBodySide2 = new Body({ 
    mass: 0, 
    type: BODY_TYPES.KINEMATIC, 
    shape: cylinderShapeSide, 
    material: defaultMaterial 
  });
  
  coilerBodySide2.position.set(0.57, 0.225, config.sideOffset2);
  coilerBodySide2.quaternion.setFromEuler(Math.PI / 2, 0, 0); 
  world.addBody(coilerBodySide2);
  
  const cylinderGeoSide1 = new THREE.CylinderGeometry(
    coilerRadius * sideRadiusMultiplier, 
    coilerRadius * sideRadiusMultiplier, 
    coilerHeight / 10, 
    16, 
    1
  );
  const cylinderGeoSide2 = new THREE.CylinderGeometry(
    coilerRadius * sideRadiusMultiplier, 
    coilerRadius * sideRadiusMultiplier, 
    coilerHeight / 10, 
    16, 
    1
  );

  cylinderGeoSide1.rotateX(Math.PI / 2);
  cylinderGeoSide2.rotateX(Math.PI / 2);

  const wireMatSide = new THREE.MeshBasicMaterial({
    color: config.color,
    transparent: true,
    opacity: 0.2,
    wireframe: true,
  });

  coilerBodyMeshSide1 = new THREE.Mesh(cylinderGeoSide1, wireMatSide);
  coilerBodyMeshSide1.position.set(0.57, 0.225, config.sideOffset1);
  scene.add(coilerBodyMeshSide1);
  
  coilerBodyMeshSide2 = new THREE.Mesh(cylinderGeoSide2, wireMatSide);
  coilerBodyMeshSide2.position.set(0.57, 0.225, config.sideOffset2);
  scene.add(coilerBodyMeshSide2);
}

let spoolModel = null;

function loadSpoolFromMovingAssets() {
  if (spoolModel) {
    disposeModel(spoolModel);

    spoolModel = null;
  }
  loader.load(
    `./assets/284-SPOOL.gltf`,
    (gltf) => {
      spoolModel = gltf.scene;
      spoolModel.position.set(-0.55, 0.16, 0.035);
      spoolModel.scale.set(11, 11, 11);
      scene.add(spoolModel);
      createFloorCoil();
    },
  );
}

let floorCoilMesh = null;
function createFloorCoil() {
  if (floorCoilMesh) {
    scene.remove(floorCoilMesh);
    floorCoilMesh.geometry.dispose();
    floorCoilMesh.material.dispose();
    floorCoilMesh = null;
  }

  const points = [];
  const coilRadius = 0.12;
  const coilHeight = 0.23;
  const turns = 25;
  const pointsPerTurn = 24;
  
  for (let i = 0; i <= turns * pointsPerTurn; i++) {
    const t = i / (turns * pointsPerTurn);
    const angle = turns * Math.PI * 2 * t;
    
    points.push(new THREE.Vector3(
      coilRadius * Math.cos(angle), 
      -0.74 + (coilHeight * t) + 0.7,  
      coilRadius * Math.sin(angle)     
    ));
  }
  
  const coilCurve = new THREE.CatmullRomCurve3(points);
  const tubeGeometry = new THREE.TubeGeometry(
    coilCurve, 
    points.length, 
    ropeRadius * 0.8,
    12,
    false
  );
  
  const textureLoader = new THREE.TextureLoader();
  const ropeTexture = textureLoader.load('./assets/Rope002_1K-JPG_Color.jpg', function(texture) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(16, 1);
  });
  
  const material = new THREE.MeshStandardMaterial({
    map: ropeTexture,
    roughness: 0.7,
    metalness: 0.2,
    side: THREE.DoubleSide
  });
  
  floorCoilMesh = new THREE.Mesh(tubeGeometry, material);
  floorCoilMesh.position.set(-0.55, 0.21, 0.035);
  floorCoilMesh.castShadow = true;
  floorCoilMesh.receiveShadow = true;
  scene.add(floorCoilMesh);
}

function animate() {
  requestAnimationFrame(animate);
  
  try {
    const timeStep = 1/120;
    const subSteps = 10;
    for (let i = 0; i < subSteps; i++) {
      world.step(timeStep / subSteps);
    }
    if (isPlaying) {
      const baseRotationSpeed = -2.8;
      const sizeRatio = 0.2 / coilerRadius;
      const rotationSpeed = baseRotationSpeed * Math.min(sizeRatio, 1.5);
      if (ropeBodies.length > 299) {
        isPlaying = false;
        coilerBody.angularVelocity.set(0, 0, 0);
        if (coilerBodySide1) coilerBodySide1.angularVelocity.set(0, 0, 0);
        if (coilerBodySide2) coilerBodySide2.angularVelocity.set(0, 0, 0);
        updateRopeCurve();
        const finalRopePoints = [...ropePoints];
        for (let i = world.constraints.length - 1; i >= 0; i--) {
          if (world.constraints[i] instanceof DistanceConstraint) {
        world.removeConstraint(world.constraints[i]);
          }
        }
        for (let i = 0; i < ropeBodies.length; i++) {
          world.removeBody(ropeBodies[i]);
        }
        ropeBodies.length = 0;
        ropePoints.length = 0;
        ropePoints.push(...finalRopePoints);
      }
      if (coilerBody) {
        coilerBody.angularVelocity.set(0, 0, rotationSpeed);
      }
      if (coilerBodySide1) {
        coilerBodySide1.angularVelocity.set(0, 0, rotationSpeed);
      }
      if (coilerBodySide2) {
        coilerBodySide2.angularVelocity.set(0, 0, rotationSpeed);
      }
      const visualRotation = 0.016 * Math.min(sizeRatio, 1.5);
      if (coilerBodyMesh) {
        coilerBodyMesh.rotation.z -= visualRotation;
      }
      if (spoolModel && coilerBody && counterModel) {
        spoolModel.rotation.y -= visualRotation;
        floorCoilMesh.rotation.y -= visualRotation;
      }
      if (coilerBodyMeshSide1) {
        coilerBodyMeshSide1.rotation.z -= visualRotation;
      }
      if (coilerBodyMeshSide2) {
        coilerBodyMeshSide2.rotation.z -= visualRotation;
      }
      if (movingModel) {
        movingModel.rotation.z += visualRotation;
      }
    }
    if (dummy) {
      dummy.getWorldPosition(temp);
      if (anchorEnd) {
        anchorEnd.position.x = temp.x;
        anchorEnd.position.y = temp.y;
        anchorEnd.position.z = temp.z;
        anchorEnd.velocity.set(0, 0, 0);
        anchorEnd.angularVelocity.set(0, 0, 0);
        const lastSegmentCount = 10;
        for (let i = Math.max(0, ropeBodies.length - lastSegmentCount); i < ropeBodies.length; i++) {
          ropeBodies[i].velocity.scale(0.9);
          ropeBodies[i].angularVelocity.scale(0.9);
        }
      }
    }

    if (ropeBodies.length > 0) {
      if (ropeMeshes.length > 0 && ropeMeshes[0]) {
        updateRopeGeometry();
      } else {
        createRopeMesh();
      }
    }
    if (ropeBodies.length > 0 && ropeMeshes.length === 0) {
      createRopeMesh();
    }
    controls.update();
    renderer.render(scene, camera);
  } catch (err) {
    console.error("Error in animation loop:", err);
  }
}
animate();
setTimeout(() => {
  checkAndCreateRope();
}, 1000);