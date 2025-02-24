// Description: Main JavaScript file for the LR100 project.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { World, Body, Cylinder, Material, ContactMaterial, Sphere, Vec3, DistanceConstraint, BODY_TYPES } from 'cannon-es';

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
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(0, 5, 10);
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

function onPlayClick(){
  isPaused = false;
  isPlaying = true;
}
playBtn.addEventListener('pointerdown', onPlayClick);

function onPauseClick(){
  isPlaying = false;
  isPaused = true;
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
    if (coilerValue === '100-10.gltf') {
      loadCombo('100-10-STAND.gltf', (model) => {
        standModel = model;
      });
      loadCombo('100-10-MOVING.gltf', (model) => {
        movingModel = model;

        dummy = new THREE.Object3D();
        dummy.position.set(0.18, 0.06, 0.03);
        movingModel.add(dummy);
        createCoiler();

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
  createCoiler();
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
  gravity: new Vec3(0, -9.82, 0),
});

const defaultMaterial = new Material('defaultMaterial');
world.defaultContactMaterial = new ContactMaterial(defaultMaterial, defaultMaterial, {
  friction: 0.4,
  restitution: 0.0,
});
world.defaultMaterial = defaultMaterial;

const segmentCount = 50;
const segmentWidth = 0.025;
const segmentMass = 0.1;
const segmentDistance = 0.005;
const ropeBodies = [];

for (let i = 0; i < segmentCount; i++) {
  const sphereShape = new Sphere(segmentWidth / 2);
  const segmentBody = new Body({ mass: segmentMass, shape: sphereShape, position: new Vec3(0, 3 -i * segmentDistance, 0), material: defaultMaterial });
  segmentBody.angularDamping = 0.8;
  segmentBody.linearDamping = 0.2;
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
const midRope = segmentCount / 2;

const anchorEnd = new Body({ mass: 0 });
anchorEnd.position.set(0.75, 0.07, 0.);
anchorEnd.type = BODY_TYPES.KINEMATIC;
world.addBody(anchorEnd);

const anchorStart = new Body({ mass: 0 });
anchorStart.position.set(-0.6, 0.07, 0.03);
world.addBody(anchorStart);

const anchor = new Body({ mass: 0 });
anchor.position.set(0, 0.075, 0.03);
world.addBody(anchor);

const anchorConstraint = new DistanceConstraint(anchor, ropeBodies[midRope], 0);
world.addConstraint(anchorConstraint);

const anchorStartConstraint = new DistanceConstraint(anchorStart, ropeBodies[0], 0);
world.addConstraint(anchorStartConstraint);

const anchorEndConstraint = new DistanceConstraint(anchorEnd, endOfRope, 0);
world.addConstraint(anchorEndConstraint);

const ropeMeshes = [];
const ropeGeom = new THREE.SphereGeometry(segmentWidth / 2, 16, 16);
const ropeMaterial = new THREE.MeshPhongMaterial({ color: 0x0000ff });

for (let i = 0; i < segmentCount; i++) {
  const mesh = new THREE.Mesh(ropeGeom, ropeMaterial);
  scene.add(mesh);
  ropeMeshes.push(mesh);
}

let dummy = null;
const temp = new THREE.Vector3();

let coilerBody = null;
let coilerBodyMesh = null;
let coilerRadius = 0.187;
let coilerHeight = 0.13;

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
  const cylinderShape = new Cylinder(coilerRadius, coilerRadius, coilerHeight, 16);
  coilerBody = new Body({ mass: 0, type: BODY_TYPES.KINEMATIC, shape: cylinderShape, material: defaultMaterial, color: 0x00ff00 });
  coilerBody.position.set(0.57, 0.0, 0.025);
  world.addBody(coilerBody);

  const cylinderGeo = new THREE.CylinderGeometry(coilerRadius, coilerRadius, coilerHeight, 16, 1);
  const wireMat = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    transparent: true,
    opacity: 0.5,
    wireframe: true,
  })
  coilerBodyMesh = new THREE.Mesh(cylinderGeo, wireMat);
  coilerBodyMesh.position.set(0.57, 0.0, 0.025);
  scene.add(coilerBodyMesh);
  cylinderGeo.rotateZ(Math.PI / 2);
  cylinderGeo.rotateY(Math.PI / 2);
};

function animate() {
  requestAnimationFrame(animate);

  world.step(1/200);
  for (let i = 0; i < segmentCount; i++) {
    ropeMeshes[i].position.copy(ropeBodies[i].position);
    ropeMeshes[i].quaternion.copy(ropeBodies[i].quaternion);
  }

  if (isPlaying && movingModel) {
    movingModel.rotation.z += 0.016;
  }

  if (dummy){
    dummy.getWorldPosition(temp);
    anchorEnd.position.x = temp.x;
    anchorEnd.position.y = temp.y;
    anchorEnd.position.z = temp.z;
    anchorEnd.velocity.set(0, 0, 0);
    anchorEnd.angularVelocity.set(0, 0, 0);
  }

  controls.update();
  renderer.render(scene, camera);
}
createCoiler();
animate();
