//THIS FILE IS THE UNMOVING EDITION - WORKING AND LATEST
//THIS FILE LOADS EACH COMBINATION AS ITS OWN .GLTF TO REDUCE MEMORY USAGE
//THE MOVING VERSION OF THIS FILE LOADS EACH INDIVIDUAL COMPONENT WITHIN THREE.JS, AND HAS TROUBLE FREEING MEMORY

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const canvas = document.getElementById('lr100-canvas');
const scene = new THREE.Scene();
scene.background = new THREE.Color('lightgray');

const camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
camera.position.set(0, 1, 5);
camera.zoom = 5;
camera.updateProjectionMatrix();

function createLogoFloor(scene) {
  const textureLoader = new THREE.TextureLoader();
  const logoTexture = textureLoader.load('./src/assets/taymer_logo.png');
  const topMaterial = new THREE.MeshPhongMaterial({  map: logoTexture, transparent: true });
  const brownMaterial = new THREE.MeshPhongMaterial({ color: 0xD2B48C, transparent: false });
  const legMaterial = new THREE.MeshPhongMaterial({ color: 0xEDCAA1 });
  const materials = [brownMaterial, brownMaterial, topMaterial, brownMaterial, brownMaterial, brownMaterial];

  const boxGeometry = new THREE.BoxGeometry(2, 0.025, 0.5);
  const box = new THREE.Mesh(boxGeometry, materials);
  box.position.y = -0.41;
  box.receiveShadow = true;
  scene.add(box);

  const boxFix = new THREE.BoxGeometry(2, 0.022, 0.5);
  const box1 = new THREE.Mesh(boxFix, brownMaterial);
  box1.position.y = -0.41;
  box1.receiveShadow = true;
  scene.add(box1);

  const legGeo = new THREE.BoxGeometry(0.06, 0.35, 0.06);
  const leg = new THREE.Mesh(legGeo, legMaterial);
  leg.position.x = -0.95;
  leg.position.y = -0.59;
  leg.position.z = -0.2;
  scene.add(leg);

  const legGeo2 = new THREE.BoxGeometry(0.06, 0.35, 0.06);
  const leg2 = new THREE.Mesh(legGeo2, legMaterial);
  leg2.position.x = -0.95;
  leg2.position.y = -0.59;
  leg2.position.z = 0.2;
  scene.add(leg2);

  const legGeo3 = new THREE.BoxGeometry(0.06, 0.35, 0.06);
  const leg3 = new THREE.Mesh(legGeo3, legMaterial);
  leg3.position.x = 0.95;
  leg3.position.y = -0.59;
  leg3.position.z = -0.2;
  scene.add(leg3);

  const legGeo4 = new THREE.BoxGeometry(0.06, 0.35, 0.06);
  const leg4 = new THREE.Mesh(legGeo4,legMaterial);
  leg4.position.x = 0.95;
  leg4.position.y = -0.59;
  leg4.position.z = 0.2;
  scene.add(leg4);
}
createLogoFloor(scene);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
});

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
const priceDisplay = document.getElementById('price-display');

function onCanvasClick(){
  canvasOverlay.style.display = 'none';
  renderer.domElement.removeEventListener('pointerdown', onCanvasClick);
}
renderer.domElement.addEventListener('pointerdown', onCanvasClick);

const loader = new GLTFLoader();
let currentComboModel = null;

function removeCurrentCombo() {
  if (currentComboModel) {
    scene.remove(currentComboModel);
    currentComboModel = null;
  }
}

function loadCombo(fileName) {
  loader.load(
    `./src/assets/${fileName}`,
    (gltf) => {
      currentComboModel = gltf.scene;
      currentComboModel.rotation.y = Math.PI;
      currentComboModel.position.x = 0.57;   
      scene.add(currentComboModel);
    },
    undefined,
    (error) => console.error('Error loading combo file:', fileName, error)
  );
}

const counterSelect = document.getElementById('counterSelect');
const reelSelect = document.getElementById('reelStandSelect');
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

counterSelect.addEventListener('change', onDropdownChange);
reelSelect.addEventListener('change', onDropdownChange);
coilerSelect.addEventListener('change', onDropdownChange);
cutterSelect.addEventListener('change', onDropdownChange);

function onDropdownChange() {
  removeCurrentCombo();
  const counterValue = counterSelect.value; 
  const reelValue = reelSelect.value;
  const coilerValue = coilerSelect.value;
  const cutterValue = cutterSelect.value;
  let comboFile = '';

  if ((counterValue === 'LR100-1410.gltf' || counterValue === 'LR100-1420.gltf' || counterValue === 'LR100-1410UR.gltf' || counterValue === 'LR100-1420UR.gltf') && 
       reelValue === 'LR100-284.gltf' && coilerValue === 'LR100-10.gltf' && cutterValue === 'LR100-C.gltf') {
       comboFile = '1410C-284-100-10.gltf';
  }
  else if ((counterValue === 'LR100-1410.gltf' || counterValue === 'LR100-1420.gltf' || counterValue === 'LR100-1410UR.gltf' || counterValue === 'LR100-1420UR.gltf') && 
            reelValue === 'LR100-284.gltf' && coilerValue === 'LR100-10.gltf' && cutterValue === '') {
            comboFile = '1410-284-100-10.gltf';
  }
  else if ((counterValue === 'LR100-1410.gltf' || counterValue === 'LR100-1420.gltf' || counterValue === 'LR100-1410UR.gltf' || counterValue === 'LR100-1420UR.gltf') && 
            reelValue === 'LR100-284.gltf' && coilerValue === 'LR100-99.gltf' && cutterValue === '') {
            comboFile = '1410-284-100-99.gltf';
  }
  else if ((counterValue === 'LR100-1410.gltf' || counterValue === 'LR100-1420.gltf' || counterValue === 'LR100-1410UR.gltf' || counterValue === 'LR100-1420UR.gltf') && 
            reelValue === 'LR100-284.gltf' && coilerValue === 'LR100-99.gltf' && cutterValue === 'LR100-C.gltf') {
            comboFile = '1410C-284-100-99.gltf';
  }
  else if ((counterValue === 'LR100-1410.gltf' || counterValue === 'LR100-1420.gltf' || counterValue === 'LR100-1410UR.gltf' || counterValue === 'LR100-1420UR.gltf') && 
            reelValue === 'LR100-284.gltf' && coilerValue === 'LR100-200.gltf' && cutterValue === '') {
            comboFile = '1410-284-100-200.gltf';
  }
  else if ((counterValue === 'LR100-1410.gltf' || counterValue === 'LR100-1420.gltf' || counterValue === 'LR100-1410UR.gltf' || counterValue === 'LR100-1420UR.gltf') && 
            reelValue === 'LR100-284.gltf' && coilerValue === 'LR100-200.gltf' && cutterValue === 'LR100-C.gltf') {
            comboFile = '1410C-284-100-200.gltf';
  }
  else if ((counterValue === 'LR100-1410.gltf' || counterValue === 'LR100-1420.gltf' || counterValue === 'LR100-1410UR.gltf' || counterValue === 'LR100-1420UR.gltf') && 
            reelValue === '' && coilerValue === 'LR100-200.gltf' && cutterValue === '') {
            comboFile = '1410-100-200.gltf';
  }
  else if ((counterValue === 'LR100-1410.gltf' || counterValue === 'LR100-1420.gltf' || counterValue === 'LR100-1410UR.gltf' || counterValue === 'LR100-1420UR.gltf') && 
            reelValue === '' && coilerValue === 'LR100-200.gltf' && cutterValue === 'LR100-C.gltf') {
            comboFile = '1410C-100-200.gltf';
  }
  else if ((counterValue === 'LR100-1410.gltf' || counterValue === 'LR100-1420.gltf' || counterValue === 'LR100-1410UR.gltf' || counterValue === 'LR100-1420UR.gltf') && 
            reelValue === '' && coilerValue === 'LR100-99.gltf' && cutterValue === '') {
            comboFile = '1410-100-99.gltf';
  }
  else if ((counterValue === 'LR100-1410.gltf' || counterValue === 'LR100-1420.gltf' || counterValue === 'LR100-1410UR.gltf' || counterValue === 'LR100-1420UR.gltf') && 
            reelValue === '' && coilerValue === 'LR100-99.gltf' && cutterValue === 'LR100-C.gltf') {
            comboFile = '1410C-100-99.gltf';
  }   
  else if ((counterValue === 'LR100-1410.gltf' || counterValue === 'LR100-1420.gltf' || counterValue === 'LR100-1410UR.gltf' || counterValue === 'LR100-1420UR.gltf') && 
            reelValue === '' && coilerValue === 'LR100-10.gltf' && cutterValue === '') {
            comboFile = '1410-100-10.gltf';
  }
  else if ((counterValue === 'LR100-1410.gltf' || counterValue === 'LR100-1420.gltf' || counterValue === 'LR100-1410UR.gltf' || counterValue === 'LR100-1420UR.gltf') && 
            reelValue === '' && coilerValue === 'LR100-10.gltf' && cutterValue === 'LR100-C.gltf') {
            comboFile = '1410C-100-10.gltf';
  }
  else if ((counterValue === 'LR100-1410.gltf' || counterValue === 'LR100-1420.gltf' || counterValue === 'LR100-1410UR.gltf' || counterValue === 'LR100-1420UR.gltf') && 
            reelValue === 'LR100-284.gltf' && coilerValue === '' && cutterValue === '') {
            comboFile = '1410-284.gltf';
  }
  else if ((counterValue === 'LR100-1410.gltf' || counterValue === 'LR100-1420.gltf' || counterValue === 'LR100-1410UR.gltf' || counterValue === 'LR100-1420UR.gltf') && 
            reelValue === 'LR100-284.gltf' && coilerValue === '' && cutterValue === 'LR100-C.gltf') {
            comboFile = '1410C-284.gltf';
  }
  else if ((counterValue === 'LR100-1410.gltf' || counterValue === 'LR100-1420.gltf' || counterValue === 'LR100-1410UR.gltf' || counterValue === 'LR100-1420UR.gltf') && 
            reelValue === '' && coilerValue === '' && cutterValue === '') {
            comboFile = '1410.gltf';
  }
  else if ((counterValue === 'LR100-1410.gltf' || counterValue === 'LR100-1420.gltf' || counterValue === 'LR100-1410UR.gltf' || counterValue === 'LR100-1420UR.gltf') && 
            reelValue === '' && coilerValue === '' && cutterValue === 'LR100-C.gltf') {
            comboFile = '1410C.gltf';
  }
  else if (counterValue === '' && reelValue === '' && coilerValue === 'LR100-10.gltf' && cutterValue === '') {
           comboFile = '100-10.gltf'
  }
  else if (counterValue === '' && reelValue === '' && coilerValue === 'LR100-99.gltf' && cutterValue === '') {
           comboFile = '100-99.gltf';
  }
  else if (counterValue === '' && reelValue === '' && coilerValue === 'LR100-200.gltf' && cutterValue === '') {
           comboFile = '100-200.gltf';
  }
  else if (counterValue === '' && reelValue === 'LR100-284.gltf' && coilerValue === 'LR100-10.gltf' && cutterValue === '') {
           comboFile = '284-10.gltf';
  }
  else if (counterValue === '' && reelValue === 'LR100-284.gltf' && coilerValue === 'LR100-99.gltf' && cutterValue === '') {
           comboFile = '284-99.gltf';
  } 
  else if (counterValue === '' && reelValue === 'LR100-284.gltf' && coilerValue === 'LR100-200.gltf' && cutterValue === '') {
           comboFile = '284-200.gltf';
  }
  else if (counterValue === '' && reelValue === 'LR100-284.gltf' && coilerValue === '' && cutterValue === '') {
           comboFile = 'LR100-284.gltf';
  }
  if (coilerValue != '') {
    playBtn.style.visibility = 'visible';
  }
  if (coilerValue == '') {
    playBtn.style.visibility = 'hidden';
  }
  if (comboFile) {
    loadCombo(comboFile);
  } 
  else {
    console.warn('No valid combo for:', counterValue, reelValue, coilerValue, cutterValue);
  }
  updatePrice();
}

const PRICE_MAP = {
  'LR100-1410.gltf': 786, 
  'LR100-1420.gltf': 786,
  'LR100-1410UR.gltf': 815,
  'LR100-1420UR.gltf': 815,
  'LR100-10.gltf': 969.75,
  'LR100-99.gltf': 709.50,
  'LR100-200.gltf': 598.50,
  'LR100-284.gltf': 471,
  'LR100-C.gltf': 148.50
};

function updatePrice() {
  const coilerVal = coilerSelect.value;
  const reelVal = reelSelect.value;
  const counterVal = counterSelect.value;
  const cutterVal = cutterSelect.value;
  const coilerPrice = PRICE_MAP[coilerVal] || 0;
  const reelPrice = PRICE_MAP[reelVal] || 0;
  const counterPrice = PRICE_MAP[counterVal] || 0;
  const cutterPrice = PRICE_MAP[cutterVal] || 0;
  let total = coilerPrice + reelPrice + counterPrice + cutterPrice;
  if (counterVal !== '') {
    total += 78;
  }
  if (total == 0){
    priceDisplay.style.visibility ='hidden';
  } else {
    priceDisplay.style.visibility = 'visible';
    priceDisplay.textContent = 'Price: $' + total.toFixed(2) + ' USD';
  }
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

