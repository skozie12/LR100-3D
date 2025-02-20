// THIS FILE IS THE MOVING EDITION // Uses more memory, believe cache is not properly being cleared after (onDropDown) is being called

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

let standModel = null;
let movingModel = null;
let counterModel = null;
let reelModel = null;

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
playBtn.addEventListener('pointerdown', onPlayClick)

function onPauseClick(){
    isPlaying = false;
    isPaused = true;
}
pauseBtn.addEventListener('pointerdown',onPauseClick);

const loader = new GLTFLoader();
let model = null;

// The main issue with current remove (this is also applicable to main(static)) is that it does not dispose of the objects
// after they are removed, and it causes a SEVERE memory leak that will eventually crash the system.
// Find a way to LOAD each model when it is called, and DISPOSE of the model when it is removed, while looping this behaviour
// The alternative is to only load each model ONCE, which is a jankier way to complete this task, but could then just
// hide and unhide the models dependant on what is selected. the upsides to this method would be that it only allocates
// memory once, and will not have memory leaks, but will have a downside of longer initial loading times, and potentially slowers
// response times becasue all the models are already loaded, but may also have instant changes, as it does not rely on the webgl loader
// everytime dropdown is changed. I think we will try to load and dispose of each model accordingly, as it is similar to a malloc/free call,
// and will create a stable memory environment, which will in turn, create a stable page as part of the wordpress plugin, that does not have
// a sudden burst of memory usage when it is launched, potentially slowing user systems. In the plugin if all 9 parts are allocated at the same time,
// It would use like a gigabyte of memory, which ontop of the existing wordpress site, could slow the entire site as it would be loaded and not freed
// until taymer.com is exited

// GOAL: REPLICATE A MALLOC()/FREE() WITH THE WEBGL RENDERER, TO AVOID MASSIVE MEMORY LEAKS OF THE ENTIRE MODELS EVERY TIME A DROPDOWN IS CHANGED
// BECAUSE THE HEAP BECOMES FULL, WE START TO EXPERIENCE UNDEFINED BEHAVIOR, SUCH AS MULTIPLE COILERS, AS MEMORY IN HEAP BEGINS TO BE OVERWRITEEN

function removeCurrentCombo() { 
  if (model) {
    scene.remove(model);
    model = null;
  }
  if (movingModel) {
    scene.remove(movingModel);
    movingModel = null;
  }
  if (standModel) {
    scene.remove(standModel);
    standModel = null;
  }
}

function loadCombo(fileNames, onLoad) {
  if (!Array.isArray(fileNames)) {
    fileNames = [fileNames]; 
  }
  fileNames.forEach((fileName) => {
    loader.load(`./src/assets/${fileName}`, (gltf) => {
        model = gltf.scene; // This is taking the coiler (moving), and the (stand), twice :/ isolate the stand further
        model.rotation.y = Math.PI;
        model.position.x = 0.57;
        scene.add(model);
        if (onLoad) {
          onLoad(model);
        }
      },
      undefined,
      (error) => console.error('Error loading combo file:', fileName, error)
    );
  });
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

  loadCombo(reelValue);
  loadCombo(counterValue);
  loadCombo(cutterValue);

  if (coilerValue == '100-10.gltf'){
    loadCombo('100-10-STAND.gltf', (model) => {
      standModel = model;
    });
    loadCombo('100-10-MOVING.gltf', (model) => {
      movingModel = model; 
    });
  }
  
  if (coilerValue == '100-99.gltf'){
    loadCombo('100-99-STAND.gltf', (model) => {
      standModel = model;
    });
    loadCombo('100-99-MOVING.gltf', (model) => {
      movingModel = model;
    })
  }

  if (coilerValue == '100-200.gltf'){
    loadCombo('100-200-STAND.gltf', (model) => {
      standModel = model;
    });
    loadCombo('100-200-MOVING.gltf', (model) => {
      movingModel = model;
    })
  }

  if (coilerValue != '') {
    playBtn.style.visibility = 'visible';
    pauseBtn.style.visibility = 'visible';
  }
  if (coilerValue == '') {
    playBtn.style.visibility = 'hidden';
    pauseBtn.style.visibility = 'hidden';
  }
  else {
    console.warn('No valid combo for:', counterValue, reelValue, coilerValue, cutterValue);
  }
  updatePrice();
}

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
  const coilerVal = coilerSelect.options[coilerSelect.selectedIndex].id;
  const reelVal = reelSelect.options[reelSelect.selectedIndex].id;
  const counterVal = counterSelect.options[counterSelect.selectedIndex].id;
  const cutterVal = cutterSelect.options[cutterSelect.selectedIndex].id;
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
  
  if (movingModel && standModel) {
    standModel.position.y = 0.01;
    movingModel.position.y = 0.01;
  }

  if (isPlaying && movingModel) { 
    movingModel.rotation.z += 0.016;
  }

  controls.update();
  renderer.render(scene, camera);
}

animate();

