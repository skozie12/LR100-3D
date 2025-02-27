import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { World, Body, Cylinder, Material, ContactMaterial, Sphere, Vec3, DistanceConstraint, BODY_TYPES, Quaternion as CQuaternion, Box } from 'cannon-es';

// Description: Main JavaScript file for the LR100 project.
const canvas = document.getElementById('lr100-canvas');
const scene = new THREE.Scene();
scene.background = new THREE.Color('lightgray');

const camera = new THREE.PerspectiveCamera(
  75,
  canvas.clientWidth / canvas.clientHeight,
  0.1,
  1000
);
camera.position.set(0, 1, 5);
camera.zoom = 5;
camera.updateProjectionMatrix();

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(canvas.clientWidth, canvas.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 1;
controls.maxDistance = 10;
controls.enablePan = false;

const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(0, 10, 10);
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
  const logoTexture = textureLoader.load('./src/assets/taymer_logo.png');
  const topMaterial = new THREE.MeshPhongMaterial({ map: logoTexture, transparent: true });
  const brownMaterial = new THREE.MeshPhongMaterial({ color: 0xD2B48C });
  const legMaterial = new THREE.MeshPhongMaterial({ color: 0xEDCAA1 });
  const materials = [brownMaterial, brownMaterial, topMaterial, brownMaterial, brownMaterial, brownMaterial];

  const boxGeometry = new THREE.BoxGeometry(2, 0.025, 0.5);
  const box = new THREE.Mesh(boxGeometry, materials);
  box.position.y = -0.41;
  scene.add(box);

  const boxFix = new THREE.BoxGeometry(2, 0.022, 0.5);
  const box1 = new THREE.Mesh(boxFix, brownMaterial);
  box1.position.y = -0.41;
  scene.add(box1);

  const legGeo = new THREE.BoxGeometry(0.06, 0.35, 0.06);
  function makeLeg(x, z) {
    const leg = new THREE.Mesh(legGeo, legMaterial);
    leg.position.set(x, -0.59, z);
    scene.add(leg);
  }
  makeLeg(-0.95, -0.2);
  makeLeg(-0.95,  0.2);
  makeLeg( 0.95, -0.2);
  makeLeg( 0.95,  0.2);
}
createLogoFloor();

const canvasOverlay = document.getElementById('canvas-overlay');
const playBtn = document.getElementById('playBtn');
const pauseBtn = document.getElementById('pauseBtn');
const priceDisplay = document.getElementById('price-display');

function onCanvasClick(){
  canvasOverlay.style.display = 'none';
  renderer.domElement.removeEventListener('pointerdown', onCanvasClick);
}
renderer.domElement.addEventListener('pointerdown', onCanvasClick);

let isPlaying = false;
let isPaused = false;
let segmentTimer = null;

function onPlayClick() {
  if (!isPlaying) { 
    isPlaying = true;
    
    // Reset coiling variables when starting
    addedSegments = 0;
    currentZ = -coilerHeight * 0.4; // Start from one end
    currentDirection = 1;
    
    segmentTimer = setInterval(() => {
      if (isPlaying) {
        addRopeSegment();
      }
    }, 95);
  }
}
playBtn.addEventListener('pointerdown', onPlayClick);

function onPauseClick(){
  isPlaying = false;
  isPaused = true;
  clearInterval(segmentTimer);
}
pauseBtn.addEventListener('pointerdown', onPauseClick);

const loader = new GLTFLoader();

let reelModel    = null;
let counterModel = null;
let standModel   = null;
let movingModel  = null;
let cutterModel  = null;

function disposeModel(model) {
  if (!model) return;
  model.traverse((child) => {
    if (child.isMesh) {
      if (child.geometry)  child.geometry.dispose();
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
    `./src/assets/${fileName}`,
    (gltf) => {
      const model = gltf.scene;
      model.rotation.y = Math.PI;
      model.position.x = 0.57;
      scene.add(model);
      if (onLoad) onLoad(model);
    },
    undefined,
    (error) => console.error('Error loading combo file:', fileName, error)
  );
}

let oldReelValue    = '';
let oldCounterValue = '';
let oldCoilerValue  = '';
let oldCutterValue  = '';

function onDropdownChange() {
  const reelValue    = reelSelect.value;
  const counterValue = counterSelect.value;
  const coilerValue  = coilerSelect.value;
  const cutterValue  = cutterSelect.value;

  if (reelValue !== oldReelValue) {
    disposeModel(reelModel);
    reelModel = null;
    if (reelValue) {
      loadCombo(reelValue, (model) => {
        reelModel = model;
      });
    }
  }

  if (counterValue !== oldCounterValue) {
    disposeModel(counterModel);
    counterModel = null;
    if (counterValue) {
      loadCombo(counterValue, (model) => {
        counterModel = model;
      });
    }
  }

  if (coilerValue !== oldCoilerValue) {
    
    disposeModel(standModel);  standModel  = null;
    disposeModel(movingModel); movingModel = null;
    createCoiler();
    createCoilerSides();
    if (coilerValue === '100-10.gltf') {
      loadCombo('100-10-STAND.gltf', (model) => {
        standModel = model;
      });
      loadCombo('100-10-MOVING.gltf', (model) => {
        movingModel = model;
        dummy = new THREE.Object3D();
        dummy.position.set(0.19, 0.06, -0.03);
        movingModel.add(dummy);
        createCoiler();
        createCoilerSides();
      });
    }
    else if (coilerValue === '100-99.gltf') {
      loadCombo('100-99-STAND.gltf', (model) => {
        standModel = model;
      });
      loadCombo('100-99-MOVING.gltf', (model) => {
        movingModel = model;
      });
    }
    else if (coilerValue === '100-200.gltf') {
      loadCombo('100-200-STAND.gltf', (model) => {
        standModel = model;
      });
      loadCombo('100-200-MOVING.gltf', (model) => {
        movingModel = model;
      });
    }
    else if (coilerValue) {
      loadCombo(coilerValue, (model) => {
        standModel = model; 
      });
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

  oldReelValue    = reelValue;
  oldCounterValue = counterValue;
  oldCoilerValue  = coilerValue;
  oldCutterValue  = cutterValue;
  if (coilerValue) {
    playBtn.style.visibility  = 'visible';
    pauseBtn.style.visibility = 'visible';
  } else {
    playBtn.style.visibility  = 'hidden';
    pauseBtn.style.visibility = 'hidden';
  }
  updatePrice();
}

const reelSelect    = document.getElementById('reelStandSelect');
const counterSelect = document.getElementById('counterSelect');
const coilerSelect  = document.getElementById('coilerSelect');
const cutterSelect  = document.getElementById('cutterSelect');

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
  const coilerVal  = coilerSelect.options[coilerSelect.selectedIndex]?.id || '';
  const reelVal    = reelSelect.options[reelSelect.selectedIndex]?.id || '';
  const counterVal = counterSelect.options[counterSelect.selectedIndex]?.id || '';
  const cutterVal  = cutterSelect.options[cutterSelect.selectedIndex]?.id || '';

  const coilerPrice  = PRICE_MAP[coilerVal]  || 0;
  const reelPrice    = PRICE_MAP[reelVal]    || 0;
  const counterPrice = PRICE_MAP[counterVal] || 0;
  const cutterPrice  = PRICE_MAP[cutterVal]  || 0;

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
  gravity: new Vec3(0, -9.81, 0), // Standard gravity
});

const defaultMaterial = new Material('defaultMaterial');
const COLLISION_GROUPS = {
  COILER: 1,
  ROPE: 2
};

// Improve contact physics for better rope-coiler interaction
world.defaultContactMaterial = new ContactMaterial(defaultMaterial, defaultMaterial, {
  friction: 1.5, // Higher friction to help rope grip the coiler
  restitution: 0.1,
  contactEquationStiffness: 1e7, // Balanced stiffness
  contactEquationRelaxation: 4 // Slightly higher relaxation for stability
});
world.defaultMaterial = defaultMaterial;

const segmentCount = 20; // Play with
const segmentWidth = 0.015;
const segmentMass = 0.5; // Lower mass for more stable physics
const segmentDistance = 0.008;

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
  const tubeGeometry = new THREE.TubeGeometry(
    curve, 
    segmentCount * 20, // Reduced multiplier for better alignment
    ropeRadius * 0.8, // Slightly reduced radius to match spheres
    32, 
    false
  );

  const ropeMaterial = new THREE.MeshStandardMaterial({
    map: new THREE.TextureLoader().load('./src/assets(moving)/Rope002.png'),
    normalScale: new THREE.Vector2(1, 1),
    roughness: 0.7,
    metalness: 0.2,
    side: THREE.DoubleSide
  });

  const tubeMesh = new THREE.Mesh(tubeGeometry, ropeMaterial);
  scene.add(tubeMesh);
  ropeMeshes.push(tubeMesh);
}

for (let i = 0; i < segmentCount; i++) {
  const sphereShape = new Sphere(segmentWidth / 2);
  const segmentBody = new Body({ 
    mass: segmentMass, 
    shape: sphereShape, 
    position: new Vec3(0, 3 - i * segmentDistance, 0), 
    material: defaultMaterial,
    collisionFilterGroup: COLLISION_GROUPS.ROPE,
    collisionFilterMask: COLLISION_GROUPS.COILER
  });
  segmentBody.angularDamping = 0.99;
  segmentBody.linearDamping = 0.99;

  world.addBody(segmentBody);
  ropeBodies.push(segmentBody);
}

for (let i = 0; i < segmentCount -1; i++) {
  const bodyA = ropeBodies[i];
  const bodyB = ropeBodies[i + 1];  
  const constraint = new DistanceConstraint(bodyA, bodyB, segmentDistance);
  world.addConstraint(constraint);
}

const endOfRope = ropeBodies[segmentCount - 1];
const midRope = 10;

const anchorStart = new Body({ mass: 0, type: BODY_TYPES.STATIC });
anchorStart.position.set(-0.6, 0.07, 0.03);
world.addBody(anchorStart);
const anchorStartConstraint = new DistanceConstraint(anchorStart, ropeBodies[0], 0);
world.addConstraint(anchorStartConstraint);

const anchor = new Body({ mass: 0, type: BODY_TYPES.STATIC });
anchor.position.set(0.09, 0.065, 0.03);
world.addBody(anchor);
const anchorConstraint = new DistanceConstraint(anchor, ropeBodies[midRope], 0);
world.addConstraint(anchorConstraint);

const anchorEnd = new Body({ mass: 0, type: BODY_TYPES.STATIC });
anchorEnd.position.set(0.19, 0.06, -0.03);
world.addBody(anchorEnd);
const anchorEndConstraint = new DistanceConstraint(anchorEnd, endOfRope, 0);
world.addConstraint(anchorEndConstraint);

const ropeMeshes = [];

/*for (let i = 0; i < segmentCount; i++) {
  const mesh = new THREE.Mesh(ropeGeom, ropeMaterial);
  scene.add(mesh);
  ropeMeshes.push(mesh);
}*/

// Add a helper function to distribute rope along the coiler
function getCoilPosition(progress) {
  // This will determine where along the coiler height to place the rope
  // progress goes from 0 to 1 as more rope is added
  const coilerZ = coilerBody.position.z;
  
  // Calculate position along coiler based on winding progress
  // Start from one side and gradually move to the other side
  const zOffset = ((progress % 1) * coilerHeight) - (coilerHeight / 2);
  
  return coilerZ + zOffset;
}

// Track how many segments we've added for coil distribution
let addedSegments = 0;
const maxSegmentsPerLayer = 20;
let currentZ = 0;
let currentDirection = 1;

function addRopeSegment(){
  if (ropeBodies.length >= 2000) return;
  
  const prevBody = ropeBodies[10]; 
  const nextBody = ropeBodies[11]; 
  
  world.constraints.forEach((constraint) => {
    if ((constraint.bodyA === prevBody && constraint.bodyB === nextBody) ||
        (constraint.bodyA === nextBody && constraint.bodyB === prevBody)) {
      world.removeConstraint(constraint);
    }
  });

  // Calculate ideal z position for even coiling
  addedSegments++;
  
  // When we reach max segments in a layer, change direction
  if (addedSegments % maxSegmentsPerLayer === 0) {
    currentDirection *= -1; // Reverse direction
  }
  
  // Gradually move along Z axis in current direction
  currentZ += currentDirection * (coilerHeight / maxSegmentsPerLayer) * 0.8;
  
  // Keep within coiler bounds
  const zMax = coilerHeight * 0.4;
  currentZ = Math.max(Math.min(currentZ, zMax), -zMax);
  
  // Add offset to the z position of the new segment to help guide winding
  const zTarget = coilerBody.position.z + currentZ;

  const newBody = new Body({ 
    mass: segmentMass, 
    shape: new Sphere(segmentWidth / 2), 
    position: new Vec3(
      (prevBody.position.x + nextBody.position.x) * 0.5,
      (prevBody.position.y + nextBody.position.y) * 0.5,
      (prevBody.position.z + nextBody.position.z) * 0.5
    ),
    material: defaultMaterial,
    collisionFilterGroup: COLLISION_GROUPS.ROPE,
    collisionFilterMask: COLLISION_GROUPS.COILER
  });
  
  // Add damping to reduce jittery movement
  newBody.angularDamping = 0.99;
  newBody.linearDamping = 0.99;
  
  world.addBody(newBody);
  ropeBodies.splice(11, 0, newBody); 
  
  // Make constraints slightly stronger for more stability
  const constraintPrev = new DistanceConstraint(prevBody, newBody, segmentDistance, 1e5);
  const constraintNext = new DistanceConstraint(newBody, nextBody, segmentDistance, 1e5);
  world.addConstraint(constraintPrev);
  world.addConstraint(constraintNext);
  
  // Apply a small force in the target Z direction to guide the rope
  newBody.applyForce(new Vec3(0, 0, (zTarget - newBody.position.z) * 1), newBody.position);
}

let dummy = null;
const temp = new THREE.Vector3();

let coilerBody = null;
let coilerBodyMesh = null;
let coilerRadius = 0.2;
let coilerHeight = 0.18;

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
  
  // Create a compound shape for better physics interaction
  coilerBody = new Body({ 
    mass: 0, 
    type: BODY_TYPES.KINEMATIC, 
    material: defaultMaterial,
    collisionFilterGroup: COLLISION_GROUPS.COILER,
    collisionFilterMask: COLLISION_GROUPS.ROPE
  });
  
  // Main cylinder
  const cylinderShape = new Cylinder(coilerRadius, coilerRadius, coilerHeight, 16);
  coilerBody.addShape(cylinderShape, new Vec3(0, 0, 0), new CQuaternion().setFromAxisAngle(new Vec3(1, 0, 0), Math.PI / 2));
  
  // Add guide ridges along the cylinder to help distribute the rope
  // These are smaller cylinders arranged in a spiral pattern
  const smallCylinderRadius = coilerRadius * 0.08;
  const spiralTurns = 4;
  
  for (let i = 0; i < 24; i++) {
    // Create a spiral pattern along the length of the cylinder
    const angle = (i / 24) * Math.PI * 2 * spiralTurns;
    const zPos = ((i / 24) * coilerHeight) - (coilerHeight / 2);
    
    const x = coilerRadius * 0.95 * Math.cos(angle);
    const y = coilerRadius * 0.95 * Math.sin(angle);
    
    const smallCylinder = new Cylinder(smallCylinderRadius, smallCylinderRadius, smallCylinderRadius * 2, 8);
    coilerBody.addShape(
      smallCylinder, 
      new Vec3(x, y, zPos), 
      new CQuaternion().setFromAxisAngle(new Vec3(0, 0, 1), angle + Math.PI/2)
    );
  }
  
  coilerBody.position.set(0.57, 0.0, 0.025);
  world.addBody(coilerBody);

  // Visual representation  
  const cylinderGeo = new THREE.CylinderGeometry(coilerRadius, coilerRadius, coilerHeight, 16, 1);
  cylinderGeo.rotateZ(Math.PI / 2); 
  cylinderGeo.rotateY(Math.PI / 2); 

  const wireMat = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    transparent: true,
    opacity: 0.5,
    wireframe: true,
  });

  coilerBodyMesh = new THREE.Mesh(cylinderGeo, wireMat);
  coilerBodyMesh.position.set(0.57, 0.0, 0.025);
  scene.add(coilerBodyMesh);
  
  // Reset coiling variables
  addedSegments = 0;
  currentZ = -coilerHeight * 0.4; // Start from one end
  currentDirection = 1;
}

let coilerBodySide1 = null;
let coilerBodyMeshSide1 = null;
let coilerBodySide2 = null;
let coilerBodyMeshSide2 = null;

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

  // Create flared sides to help guide the rope
  const cylinderShapeSide1 = new Cylinder(coilerRadius * 2.2, coilerRadius * 2, coilerHeight / 8, 16);
  const cylinderShapeSide2 = new Cylinder(coilerRadius * 2.2, coilerRadius * 2, coilerHeight / 8, 16);
 
  coilerBodySide1 = new Body({ 
    mass: 0, 
    type: BODY_TYPES.KINEMATIC, 
    shape: cylinderShapeSide1, 
    material: defaultMaterial,
    collisionFilterGroup: COLLISION_GROUPS.COILER,
    collisionFilterMask: COLLISION_GROUPS.ROPE
  });
  coilerBodySide1.position.set(0.57, 0.0, 0.12); 
  coilerBodySide1.quaternion.setFromEuler(Math.PI / 2, 0, 0); 
  world.addBody(coilerBodySide1);

  coilerBodySide2 = new Body({ 
    mass: 0, 
    type: BODY_TYPES.KINEMATIC, 
    shape: cylinderShapeSide2, 
    material: defaultMaterial,
    collisionFilterGroup: COLLISION_GROUPS.COILER,
    collisionFilterMask: COLLISION_GROUPS.ROPE
  });
  coilerBodySide2.position.set(0.57, 0.0, -0.07); 
  coilerBodySide2.quaternion.setFromEuler(Math.PI / 2, 0, 0); 
  world.addBody(coilerBodySide2);
  
  // Visual representation for the sides
  const cylinderGeoSide1 = new THREE.CylinderGeometry(coilerRadius * 2.2, coilerRadius * 2, coilerHeight / 8, 16, 1);
  const cylinderGeoSide2 = new THREE.CylinderGeometry(coilerRadius * 2.2, coilerRadius * 2, coilerHeight / 8, 16, 1);
  cylinderGeoSide1.rotateX(Math.PI / 2);
  cylinderGeoSide2.rotateX(Math.PI / 2);

  const wireMatSide = new THREE.MeshBasicMaterial({
    color: 0x0000FF,
    transparent: true,
    opacity: 0.5,
    wireframe: true,
  });

  coilerBodyMeshSide1 = new THREE.Mesh(cylinderGeoSide1, wireMatSide);
  coilerBodyMeshSide1.position.set(0.57, 0.0, 0.12);
  scene.add(coilerBodyMeshSide1);
  
  coilerBodyMeshSide2 = new THREE.Mesh(cylinderGeoSide2, wireMatSide);
  coilerBodyMeshSide2.position.set(0.57, 0.0, -0.07);
  scene.add(coilerBodyMeshSide2);
  
};

function createCounterTube(){
 
  const counterTubeGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.1, 16, 1, true, 0, Math.PI * 2);
  const counterTubeMat = new THREE.MeshPhongMaterial({ 
    color: 0x0000FF,
    side: THREE.DoubleSide
  });
  const counterTubeMesh = new THREE.Mesh(counterTubeGeo, counterTubeMat);
  counterTubeMesh.position.set(0.03, 0.06, 0.03);
  counterTubeMesh.rotation.set(0, 0, Math.PI / 2);
  scene.add(counterTubeMesh);

  const cannonTubeShape = new Cylinder(0.02, 0.02, 0.1, 16);
  const cannonTube = new Body({
    mass: 0,
    type: BODY_TYPES.STATIC,
    shape: cannonTubeShape,
    material: defaultMaterial
  });
  cannonTube.position.set(0.03, 0.06, 0.03);
  const q = new CQuaternion();
  q.setFromAxisAngle(new Vec3(0, 0, 1), Math.PI / 2);
  cannonTube.quaternion.copy(q);
  world.addBody(cannonTube);

  const debugGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.1, 16);
  const debugMat = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    wireframe: true,
    opacity: 0.5,
    transparent: true
  });
  const debugMesh = new THREE.Mesh(debugGeo, debugMat);
  debugMesh.position.copy(counterTubeMesh.position);
  debugMesh.rotation.copy(counterTubeMesh.rotation);
  scene.add(debugMesh);
}
createCounterTube();

function applyRotationForceToRope() {
  if (!coilerBody || !isPlaying) return;
  
  const coilerPos = coilerBody.position;
  const rotationSpeed = 3; // Match this with the coiler rotation speed
  
  // Apply different forces based on segment position
  ropeBodies.forEach((segment, index) => {
    const dx = segment.position.x - coilerPos.x;
    const dy = segment.position.y - coilerPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Only apply force if segment is close enough to coiler
    if (distance < coilerRadius * 3) {
      // Calculate tangential direction based on current position relative to coiler
      const angle = Math.atan2(dy, dx);
      const tangentX = -Math.sin(angle) * rotationSpeed * 0.05;
      const tangentY = Math.cos(angle) * rotationSpeed * 0.05;
      
      // Apply stronger rotational force to segments closer to coiler
      const forceFactor = 0.05 * (1 - (distance / (coilerRadius * 3)));
      segment.applyForce(new Vec3(tangentX * forceFactor * 2, tangentY * forceFactor * 2, 0), segment.position);
      
      // Add a slight pulling force toward the coiler center on X-Y plane
      if (distance > coilerRadius * 0.9) {
        const pullForce = 0.001 * (distance / coilerRadius);
        segment.applyForce(
          new Vec3(-dx * pullForce, -dy * pullForce, 0), 
          segment.position
        );
      }
      
      // Apply a small force to maintain the vertical distribution
      // Stronger for segments that are actively being coiled (around index 11)
      if (Math.abs(index - 11) < 5) {
        // Calculate ideal Z position for this segment based on coil progress
        const idealZ = coilerPos.z + currentZ;
        const zDiff = idealZ - segment.position.z;
        
        // Apply corrective force in Z direction
        segment.applyForce(new Vec3(0, 0, zDiff * 0.01), segment.position);
      }
    }
  });
}

function animate() {
  requestAnimationFrame(animate);
  
  // Use multiple substeps for more stable physics
  const timeStep = 1/60;
  const subSteps = 3; // Increase substeps for more accurate physics
  for (let i = 0; i < subSteps; i++) {
    world.step(timeStep / subSteps);
  }

  // Apply rotation force to help rope coil properly
  applyRotationForceToRope();

  if (ropeBodies.length > 0) {
    updateRopeCurve();
    if (ropeMeshes.length > 0 && ropeMeshes[0]) {
      const curve = new THREE.CatmullRomCurve3(ropePoints);
      ropeMeshes[0].geometry.dispose();
      ropeMeshes[0].geometry = new THREE.TubeGeometry(
        curve, 
        segmentCount * 20, // Segment makes smoother bends
        ropeRadius * 0.8,
        16, // Reduced for better performance
        false
      )
    } 
  };

  if (isPlaying && movingModel) {
    movingModel.rotation.z += 0.019;
  }
  
  if (isPlaying) {
    // Apply rotation to the coiler physics bodies
    const rotationSpeed = -3;
    if (coilerBody) coilerBody.angularVelocity.set(0, 0, rotationSpeed);
    if (coilerBodySide1) coilerBodySide1.angularVelocity.set(0, 0, rotationSpeed);