// THIS FILE IS THE MOVING EDITION, WHERE THE COILER IS ANIMATED TO SPIN

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

let standModel = null;
let movingModel = null;
let counterModel = null;
let reelModel = null;
let cutterModel = null;

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

function createLogoFloor(scene) {
  const textureLoader = new THREE.TextureLoader();
  const logoTexture = textureLoader.load('./src/assets(moving)/taymer_logo.png');

  const topMaterial = new THREE.MeshPhongMaterial({
    map: logoTexture,
    transparent: true
  });
  const brownMaterial = new THREE.MeshPhongMaterial({ color: 0xd2b48c });
  const legMaterial   = new THREE.MeshPhongMaterial({ color: 0xedcaa1 });

  const boxGeometry = new THREE.BoxGeometry(2, 0.025, 0.5);
  const materials = [
    brownMaterial, brownMaterial,
    topMaterial,   brownMaterial,
    brownMaterial, brownMaterial
  ];
  const box = new THREE.Mesh(boxGeometry, materials);
  box.position.y = -0.41;
  box.receiveShadow = true;
  scene.add(box);

  const boxFixGeo = new THREE.BoxGeometry(2, 0.022, 0.5);
  const boxFix = new THREE.Mesh(boxFixGeo, brownMaterial);
  boxFix.position.y = -0.41;
  boxFix.receiveShadow = true;
  scene.add(boxFix);

  const legGeo = new THREE.BoxGeometry(0.06, 0.35, 0.06);
  function addLeg(x, z) {
    const leg = new THREE.Mesh(legGeo, legMaterial);
    leg.position.set(x, -0.59, z);
    scene.add(leg);
  }
  addLeg(-0.95, -0.2);
  addLeg(-0.95,  0.2);
  addLeg( 0.95, -0.2);
  addLeg( 0.95,  0.2);
}
createLogoFloor(scene);

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

function disposeModel(model) {
  if (!model) return;
  model.traverse((child) => {
    if (child.isMesh) {
      if (child.geometry) {
        child.geometry.dispose();
      }
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => {
            if (mat.map) mat.map.dispose();
            mat.dispose();
          });
        } else {
          if (child.material.map) child.material.map.dispose();
          child.material.dispose();
        }
      }
    }
  });
  scene.remove(model);
}

function removeCurrentCombo() {
  disposeModel(counterModel);
  disposeModel(reelModel);
  disposeModel(standModel);
  disposeModel(movingModel);
  disposeModel(cutterModel);

  counterModel = null;
  reelModel    = null;
  standModel   = null;
  movingModel  = null;
  cutterModel  = null;
}

function loadCombo(fileName, onLoad) {
  if (!fileName) return;
  loader.load(
    `./src/assets(moving)/${fileName}`,
    (gltf) => {
      const newModel = gltf.scene;
      newModel.rotation.y = Math.PI;
      newModel.position.x = 0.57;
      scene.add(newModel);
      if (onLoad) onLoad(newModel);
    },
    undefined,
    (error) => console.error('Error loading GLTF:', fileName, error)
  );
}

const counterSelect = document.getElementById('counterSelect');
const reelSelect    = document.getElementById('reelStandSelect');
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

counterSelect.addEventListener('change', onDropdownChange);
reelSelect.addEventListener('change', onDropdownChange);
coilerSelect.addEventListener('change', onDropdownChange);
cutterSelect.addEventListener('change', onDropdownChange);

function onDropdownChange() {
  removeCurrentCombo();

  const counterValue = counterSelect.value;
  const reelValue    = reelSelect.value;
  const coilerValue  = coilerSelect.value;
  const cutterValue  = cutterSelect.value;

  loadCombo(reelValue,    (model) => { reelModel    = model; });
  loadCombo(counterValue, (model) => { counterModel = model; });
  loadCombo(cutterValue,  (model) => { cutterModel  = model; });

  if (coilerValue === '100-10.gltf') {
    loadCombo('100-10-STAND.gltf',  (m) => { standModel  = m; });
    loadCombo('100-10-MOVING.gltf', (m) => { movingModel = m; });
  }
  else if (coilerValue === '100-99.gltf') {
    loadCombo('100-99-STAND.gltf',  (m) => { standModel  = m; });
    loadCombo('100-99-MOVING.gltf', (m) => { movingModel = m; });
  }
  else if (coilerValue === '100-200.gltf') {
    loadCombo('100-200-STAND.gltf',  (m) => { standModel  = m; });
    loadCombo('100-200-MOVING.gltf', (m) => { movingModel = m; });
  }

  if (coilerValue) {
    playBtn.style.visibility  = 'visible';
    pauseBtn.style.visibility = 'visible';
  } else {
    playBtn.style.visibility  = 'hidden';
    pauseBtn.style.visibility = 'hidden';
  }

  updatePrice();
}

const PRICE_MAP = {
  '1410':    786, 
  '1420':    786,
  '1410UR':  815,
  '1420UR':  815,
  '100-10':  969.75,
  '100-99':  709.50,
  '100-200': 598.50,
  '100-284': 471,
  '100-C':   148.50
};

function updatePrice() {
  const coilerVal  = coilerSelect.options[coilerSelect.selectedIndex]?.id;
  const reelVal    = reelSelect.options[reelSelect.selectedIndex]?.id;
  const counterVal = counterSelect.options[counterSelect.selectedIndex]?.id;
  const cutterVal  = cutterSelect.options[cutterSelect.selectedIndex]?.id;

  const coilerPrice  = PRICE_MAP[coilerVal]  || 0;
  const reelPrice    = PRICE_MAP[reelVal]    || 0;
  const counterPrice = PRICE_MAP[counterVal] || 0;
  const cutterPrice  = PRICE_MAP[cutterVal]  || 0;

  let total = coilerPrice + reelPrice + counterPrice + cutterPrice;

  if (counterVal) {
    total += 78;
  }

  if (total === 0) {
    priceDisplay.style.visibility = 'hidden';
  } else {
    priceDisplay.style.visibility = 'visible';
    priceDisplay.textContent = 'Price: $' + total.toFixed(2) + ' USD';
  }
}

function animate() {
  requestAnimationFrame(animate);
  if (movingModel && standModel) {
    standModel.position.y  = 0.01;
    movingModel.position.y = 0.01;
  }
  if (isPlaying && movingModel) {
    movingModel.rotation.z += 0.016; 
  }

  controls.update();
  renderer.render(scene, camera);
}

animate();
