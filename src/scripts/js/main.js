import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
// Remove all cannon-es imports

const canvas = document.getElementById('lr100-canvas');
const scene = new THREE.Scene();
scene.background = new THREE.Color('lightgray');

const camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
camera.position.set(0, 1, 5);
camera.zoom = 5;
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
    new THREE.BoxGeometry(4, 2.5, 0.06), 
    new THREE.MeshPhongMaterial({ color: 0xA9a9a9 })
  );
  floor.receiveShadow = true; // Fix typo: recieveShadow → receiveShadow
  floor.position.y = -0.77;
  floor.position.z = -0.75
  floor.rotateX(-Math.PI / 2);
  scene.add(floor);

  const boxGeometry = new THREE.BoxGeometry(2, 0.025, 0.5);
  const box = new THREE.Mesh(boxGeometry, materials);
  box.castShadow = true;
  box.receiveShadow = true; // Add this
  box.position.y = -0.41;
  scene.add(box);

  const boxFix = new THREE.BoxGeometry(2, 0.022, 0.5);
  const box1 = new THREE.Mesh(boxFix, brownMaterial);
  box1.castShadow = true; // Add this
  box1.receiveShadow = true; // Add this
  box1.position.y = -0.41;
  scene.add(box1);

  const legGeo = new THREE.BoxGeometry(0.06, 0.35, 0.06);
  function makeLeg(x, z) {
    const leg = new THREE.Mesh(legGeo, legMaterial);
    leg.position.set(x, -0.59, z);
    leg.castShadow = true; // Add this
    leg.receiveShadow = true; // Add this
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
    console.log("Play clicked, animation starting");
    
    // Add an initial impulse to make movement more visible
    if (ropeBodies.length > 10) {
      try {
        for (let i = 5; i < ropeBodies.length - 5; i += 2) {
          const impulse = new AmmoLib.btVector3(
            (Math.random() - 0.5) * 0.2,
            (Math.random() - 0.5) * 0.2,
            (Math.random() - 0.5) * 0.1
          );
          ropeBodies[i].applyCentralImpulse(impulse);
        }
      } catch (err) {
        console.error("Error applying initial impulse:", err);
      }
    }
    
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
      model.position.y = 0.01;
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

  if (coilerValue) {
    playBtn.style.visibility = 'visible';
    pauseBtn.style.visibility = 'visible';
  } else {
    playBtn.style.visibility = 'hidden';
    pauseBtn.style.visibility = 'hidden';

    if (isPlaying) {
      isPlaying = false;
    }
  }

  oldReelValue = reelValue;
  oldCounterValue = counterValue;
  oldCoilerValue = coilerValue;
  oldCutterValue = cutterValue;
  
  if (coilerValue) {
    playBtn.style.visibility = 'visible';
    pauseBtn.style.visibility = 'visible';
  } else {
    playBtn.style.visibility = 'hidden';
    pauseBtn.style.visibility = 'hidden';
  }
  
  updatePrice();
  checkAndCreateRope();
}

function checkAndCreateRope() {
  if (completeConfig()) {
    if (ropeBodies.length === 0) {
      console.log("Creating rope - all components selected");
      createRopeSegments();
    }
  } else {
    if (ropeBodies.length > 0) {
      console.log("Removing rope - not all components selected");
      resetRope();
    }
  }
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

// Define collision groups equivalent to cannon-es groups
const COLLISION_GROUPS = {
  COILER: 1,
  ROPE: 2,
  ROPE_SEGMENT: 4
};

// Declare variables before they are referenced
const segmentCount = 40;
const segmentWidth = 0.012;
const segmentMass = 0.5;
const segmentDistance = 0.012;
const ropeRadius = segmentWidth / 2;

// Initialize Ammo.js variables
let physicsWorld;
let tmpTrans;
let ropeBodies = [];
let ropePoints = [];
let anchorEnd, anchorStart, anchor;
let ammoReady = false;
let constraints = [];
let frameCount = 0; 
let AmmoLib;
const ropeMeshes = []; // Move this declaration to the top as well
let coilerBodySide1 = null;
let coilerBodyMeshSide1 = null;
let coilerBodySide2 = null;
let coilerBodyMeshSide2 = null;
let dummy = null;
const temp = new THREE.Vector3();

// Remove the manual script loading since we're loading it in HTML
function preloadAmmo() {
  console.log("Attempting to load Ammo.js");
  
  // Check if Ammo is already available (from the script tag)
  if (typeof Ammo === 'function' || typeof Ammo !== 'undefined') {
    console.log("Ammo is already available, initializing...");
    if (typeof Ammo === 'function') {
      Ammo().then(setupPhysics);
    } else {
      setupPhysics(Ammo);
    }
    return;
  }
  
  // Try CDN as a last resort
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/ammo.js@0.0.2/builds/ammo.js';
  
  script.onload = () => {
    console.log("Successfully loaded Ammo.js from CDN");
    if (typeof Ammo === 'function') {
      Ammo().then(setupPhysics);
    } else if (typeof Ammo !== 'undefined') {
      setupPhysics(Ammo);
    }
  };
  
  script.onerror = () => {
    console.error("Failed to load Ammo.js");
    alert("Failed to load physics engine. The simulation won't work properly.");
  };
  
  document.head.appendChild(script);
}

// Complete initialization sequence
function setupPhysics(ammo) {
  console.log("Setting up physics with Ammo.js");
  AmmoLib = ammo;
  window.AmmoLib = ammo;
  
  // Initialize physics world first
  initializePhysics();
  
  // Then create anchors
  createAnchors();
  
  // Mark physics as ready
  ammoReady = true;
  console.log("Physics setup complete!");
  
  // Attempt to create rope after a delay
  setTimeout(() => {
    checkAndCreateRope();
    setTimeout(checkPhysicsState, 1000);
  }, 500);
}

// Create anchors function - This must be defined BEFORE initializePhysics calls it
function createAnchors() {
  if (!AmmoLib) {
    console.error("AmmoLib not available in createAnchors");
    return;
  }
  
  console.log("Creating anchor points");
  try {
    anchor = createStaticBody(new AmmoLib.btSphereShape(0.01), 0, 0.075, 0.03);
    anchorStart = createStaticBody(new AmmoLib.btSphereShape(0.01), -0.6, 0.07, 0.03);
    anchorEnd = createStaticBody(new AmmoLib.btSphereShape(0.01), 0.57, 0.01, 0.025);
    console.log("Anchors created");
  } catch (error) {
    console.error("Error creating anchors:", error);
  }
}

function createStaticBody(shape, x, y, z) {
  if (!AmmoLib || !physicsWorld) {
    console.error("AmmoLib or physicsWorld not available in createStaticBody");
    return null;
  }
  
  try {
    const transform = new AmmoLib.btTransform();
    transform.setIdentity();
    transform.setOrigin(new AmmoLib.btVector3(x, y, z));
    
    const motionState = new AmmoLib.btDefaultMotionState(transform);
    const localInertia = new AmmoLib.btVector3(0, 0, 0);
    const rbInfo = new AmmoLib.btRigidBodyConstructionInfo(
      0, motionState, shape, localInertia
    );
    
    const body = new AmmoLib.btRigidBody(rbInfo);
    body.setCollisionFlags(body.getCollisionFlags() | 2); // KINEMATIC_OBJECT
    body.setActivationState(4); // DISABLE_DEACTIVATION
    
    physicsWorld.addRigidBody(body);
    return body;
  } catch (error) {
    console.error("Error creating static body:", error);
    return null;
  }
}

// Initialize physics world with soft body support
function initializePhysics() {
  console.log("Initializing physics world with soft body support");
  try {
    if (!AmmoLib) {
      console.error("AmmoLib not available");
      return;
    }
    
    // Create soft body physics world components
    const collisionConfiguration = new AmmoLib.btSoftBodyRigidBodyCollisionConfiguration();
    const dispatcher = new AmmoLib.btCollisionDispatcher(collisionConfiguration);
    const broadphase = new AmmoLib.btDbvtBroadphase();
    const solver = new AmmoLib.btSequentialImpulseConstraintSolver();
    const softBodySolver = new AmmoLib.btDefaultSoftBodySolver();
    
    // Create soft-rigid dynamics world instead of discrete dynamics world
    physicsWorld = new AmmoLib.btSoftRigidDynamicsWorld(
      dispatcher, broadphase, solver, collisionConfiguration, softBodySolver
    );
    
    // Set gravity
    const gravity = new AmmoLib.btVector3(0, -20.0, 0);
    physicsWorld.setGravity(gravity);
    physicsWorld.getWorldInfo().set_m_gravity(gravity);
    
    tmpTrans = new AmmoLib.btTransform();
    
    console.log("Soft body physics world initialized");
  } catch (error) {
    console.error("Error initializing physics world:", error);
  }
}

// Create a soft body rope using Ammo.js soft body helpers
function createRopeSegments() {
  if (!ammoReady || !AmmoLib || !physicsWorld) {
    console.error("Physics not ready for rope creation");
    return;
  }
  
  console.log("Creating soft body rope");
  resetRope();
  
  try {
    // Define rope start and end points
    const startPos = { x: -0.6, y: 0.07, z: 0.03 };
    const endPos = { x: 0.57, y: 0.01, z: 0.025 };
    
    // Create soft body helpers
    const softBodyHelpers = new AmmoLib.btSoftBodyHelpers();
    
    // Create rope between start and end points
    const ropeStart = new AmmoLib.btVector3(startPos.x, startPos.y, startPos.z);
    const ropeEnd = new AmmoLib.btVector3(endPos.x, endPos.y, endPos.z);
    
    // Create the rope with segmentCount - 1 internal segments (total points = segmentCount + 1)
    const ropeSoftBody = softBodyHelpers.CreateRope(
      physicsWorld.getWorldInfo(),
      ropeStart, 
      ropeEnd,
      segmentCount - 1,  // internal segments
      0                  // fixed ends flag
    );
    
    // Configure the soft body for better animation
    const sbConfig = ropeSoftBody.get_m_cfg();
    sbConfig.set_viterations(10);    // Velocity constraint solver iterations
    sbConfig.set_piterations(10);    // Position constraint solver iterations
    sbConfig.set_kDP(0.005);         // Damping coefficient
    sbConfig.set_kDF(0.2);           // Dynamic friction coefficient 
    sbConfig.set_kSHR(1.0);          // Soft vs rigid hardness 
    sbConfig.set_kCHR(1.0);          // Soft vs rigid collision hardness
    
    // Set total mass - lighter for more movement
    ropeSoftBody.setTotalMass(1.0, false);
    
    // Set collision margin
    const margin = 0.05;
    AmmoLib.castObject(ropeSoftBody, AmmoLib.btCollisionObject).getCollisionShape().setMargin(margin);
    
    // Add the soft body to the world
    physicsWorld.addSoftBody(ropeSoftBody, 1, -1);
    
    // Disable deactivation
    ropeSoftBody.setActivationState(4);
    
    // Store the soft body for later reference
    ropeBodies = [];
    ropeBodies.push(ropeSoftBody);  // Just store one soft body instead of many rigid bodies
    
    // Add anchors to fixed points
    if (anchorStart) {
      ropeSoftBody.appendAnchor(0, anchorStart, true, 1.0);
    }
    
    if (anchorEnd) {
      ropeSoftBody.appendAnchor(segmentCount, anchorEnd, true, 1.0);
    }
    
    console.log("Soft body rope created with " + segmentCount + " segments");
    
    // Initialize points array for visualization
    updateRopeCurve();
    createRopeMesh();
  } catch (error) {
    console.error("Error creating rope:", error);
  }
}

// Reset soft body rope
function resetRope() {
  try {
    // Remove all soft bodies from the world
    if (ropeBodies && ropeBodies.length > 0) {
      for (let softBody of ropeBodies) {
        if (softBody) {
          physicsWorld.removeSoftBody(softBody);
        }
      }
    }
    
    // Clear arrays
    ropeBodies = [];
    ropePoints = [];
    
    // Remove meshes
    if (ropeMeshes.length > 0) {
      ropeMeshes.forEach(mesh => {
        scene.remove(mesh);
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(m => m.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      });
      ropeMeshes.length = 0;
    }
    
    console.log("Rope reset complete");
  } catch (error) {
    console.error("Error resetting rope:", error);
  }
}

// Update rope curve points from soft body nodes
function updateRopeCurve() {
  if (!ammoReady || ropeBodies.length === 0) return;
  
  try {
    // Clear existing points
    ropePoints.length = 0;
    
    // Get the soft body
    const softBody = ropeBodies[0];
    if (!softBody) return;
    
    // Get nodes from soft body
    const nodes = softBody.get_m_nodes();
    const nodeCount = softBody.get_m_nodes().size();
    
    // Extract positions from each node
    for (let i = 0; i < nodeCount; i++) {
      const node = nodes.at(i);
      const nodePos = node.get_m_x();
      
      // Get position
      const x = nodePos.x();
      const y = nodePos.y();
      const z = nodePos.z();
      
      if (isFinite(x) && isFinite(y) && isFinite(z)) {
        ropePoints.push(new THREE.Vector3(x, y, z));
      }
    }
    
    // If we couldn't get valid points, use fallback
    if (ropePoints.length < 2) {
      console.warn("Failed to get valid rope points, using fallback");
      const startPos = { x: -0.6, y: 0.07, z: 0.03 };
      const endPos = { x: 0.57, y: 0.01, z: 0.025 };
      
      // Create a simple line with points
      for (let i = 0; i <= segmentCount; i++) {
        const t = i / segmentCount;
        const x = startPos.x + (endPos.x - startPos.x) * t;
        const y = startPos.y + (endPos.y - startPos.y) * t - Math.sin(t * Math.PI) * 0.25;
        const z = startPos.z + (endPos.z - startPos.z) * t;
        
        ropePoints.push(new THREE.Vector3(x, y, z));
      }
    }
  } catch (error) {
    console.error("Error updating rope curve:", error);
    ropePoints.length = 0;
  }
}

// Apply rotation force to soft body rope
function applyRotationForceToRope() {
  if (!ammoReady || !coilerBody || ropeBodies.length === 0) return;
  
  try {
    // Get the soft body
    const softBody = ropeBodies[0];
    if (!softBody) return;
    
    // Get coiler position
    const ms = coilerBody.getMotionState();
    if (!ms) return;
    
    ms.getWorldTransform(tmpTrans);
    const coilerPos = tmpTrans.getOrigin();
    const config = COILER_CONFIG[activeCoilerType];
    
    // Rotate coiler model
    if (movingModel) {
      // Higher rotation speed
      const rotationSpeed = isPlaying ? 0.25 : 0.05;
      movingModel.rotation.z += rotationSpeed;
      
      // Add wobble for realism
      if (isPlaying) {
        movingModel.position.y = 0.01 + Math.sin(frameCount * 0.1) * 0.003;
      }
    }
    
    // Get nodes from soft body
    const nodes = softBody.get_m_nodes();
    const nodeCount = nodes.size();
    
    // Apply force to each node
    for (let i = 0; i < nodeCount; i++) {
      const node = nodes.at(i);
      const nodePos = node.get_m_x();
      
      const dx = nodePos.x() - coilerPos.x();
      const dy = nodePos.y() - coilerPos.y();
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Apply rotation force with range
      if (distance <= coilerRadius * 10.0) {
        const angle = Math.atan2(dy, dx);
        
        // Very strong rotation force - key for good animation
        const baseRotationSpeed = isPlaying ? -100.0 : -15.0;
        
        // Calculate tangential force components
        const tangentX = -Math.sin(angle) * baseRotationSpeed;
        const tangentY = Math.cos(angle) * baseRotationSpeed;
        
        // Exponential force falloff
        const contactFactor = Math.pow(1.0 - (distance / (coilerRadius * 10.0)), 3);
        const forceStrength = isPlaying ? 1.0 : 0.2;
        
        // Create force vector
        const force = new AmmoLib.btVector3(
          tangentX * forceStrength * contactFactor,
          tangentY * forceStrength * contactFactor,
          0
        );
        
        // Apply force to node
        node.m_f.setX(node.m_f.x() + force.x());
        node.m_f.setY(node.m_f.y() + force.y());
        node.m_f.setZ(node.m_f.z() + force.z());
        
        // Apply additional inward pull near coiler
        if (distance <= coilerRadius * 2.5) {
          const pullStrength = isPlaying ? 0.25 : 0.05;
          node.m_f.setX(node.m_f.x() - (dx/distance * pullStrength));
          node.m_f.setY(node.m_f.y() - (dy/distance * pullStrength));
          
          // Add z-confinement between coiler sides
          const midZ = (config.sideOffset1 + config.sideOffset2) / 2;
          const zDiff = nodePos.z() - midZ;
          const zWidth = (config.sideOffset1 - config.sideOffset2) * 0.45;
          
          if (Math.abs(zDiff) > zWidth) {
            node.m_f.setZ(node.m_f.z() - (zDiff * 0.1));
          }
        }
      }
      
      // Add random force for continuous movement
      if (frameCount % 10 === i % 10) {
        const jitterScale = isPlaying ? 0.05 : 0.01;
        node.m_f.setX(node.m_f.x() + (Math.random() - 0.5) * jitterScale);
        node.m_f.setY(node.m_f.y() + (Math.random() - 0.5) * jitterScale);
        node.m_f.setZ(node.m_f.z() + (Math.random() - 0.5) * jitterScale);
      }
    }
    
    // Occasionally wake the soft body to ensure it doesn't deactivate
    if (frameCount % 60 === 0) {
      softBody.activate();
    }
  } catch (error) {
    console.error("Error applying rotation force to rope:", error);
  }
}

// Enhanced physics animation loop
function animate() {
  requestAnimationFrame(animate);
  
  frameCount++;
  controls.update();
  
  // Run physics simulation in EVERY frame - crucial for continuous animation
  if (ammoReady && physicsWorld) {
    try {
      // Physics stepping with high precision 
      const timeStep = 1/180;  // 180 Hz simulation rate for smoothness
      const maxSubSteps = isPlaying ? 5 : 3;
      
      // Step physics world
      physicsWorld.stepSimulation(timeStep, maxSubSteps, timeStep/maxSubSteps);
      
      // Apply forces to rope
      applyRotationForceToRope();
      
      // Periodically apply larger forces during play mode
      if (isPlaying && frameCount % 20 === 0) {
        applyExtraSoftBodyForces();
      }
      
      // Update rope visualization with current physics state
      updateRopeCurve();
      
      // Update visual mesh
      if (frameCount % 2 === 0 && ropePoints.length >= 2) {
        createRopeMesh();
      }
      
      // Update anchor positions
      updateEndAnchor();
    } catch (error) {
      console.error("Physics error:", error);
    }
  }
  
  renderer.render(scene, camera);
}

// Additional forces for more movement
function applyExtraSoftBodyForces() {
  if (!ammoReady || ropeBodies.length === 0) return;
  
  try {
    const softBody = ropeBodies[0];
    if (!softBody) return;
    
    const nodes = softBody.get_m_nodes();
    const nodeCount = nodes.size();
    
    // Apply random forces to nodes in the middle section
    const midStart = Math.floor(nodeCount * 0.2);
    const midEnd = Math.floor(nodeCount * 0.8);
    
    for (let i = midStart; i < midEnd; i++) {
      if (i % 3 !== 0) continue; // Only affect every third node
      
      const node = nodes.at(i);
      
      // Apply stronger random impulses
      const forceX = (Math.random() - 0.5) * 0.4;
      const forceY = (Math.random() - 0.5) * 0.4;
      const forceZ = (Math.random() - 0.5) * 0.2;
      
      node.m_f.setX(node.m_f.x() + forceX);
      node.m_f.setY(node.m_f.y() + forceY); 
      node.m_f.setZ(node.m_f.z() + forceZ);
    }
  } catch (error) {
    console.error("Error applying extra forces:", error);
  }
}

// Add new rope segments during play mode
function addRopeSegment() {
  console.log("Soft body rope doesn't support adding segments dynamically");
  // The soft body approach doesn't easily support adding segments dynamically
  // If needed, we could recreate the entire rope with a different configuration
}

// Update end anchor position
function updateEndAnchor() {
  if (!dummy || !anchorEnd || !movingModel) return;
  
  try {
    // Get world position of dummy object
    const worldPos = new THREE.Vector3();
    dummy.getWorldPosition(worldPos);
    
    // Update the end anchor position
    const transform = new AmmoLib.btTransform();
    transform.setIdentity();
    transform.setOrigin(new AmmoLib.btVector3(worldPos.x, worldPos.y, worldPos.z));
    
    const ms = anchorEnd.getMotionState();
    if (ms) {
      ms.setWorldTransform(transform);
    }
  } catch (error) {
    console.error("Error updating end anchor:", error);
  }
}

// Improved animation loop with continuous physics simulation
function animate() {
  requestAnimationFrame(animate);
  
  frameCount++;
  controls.update();
  
  // Always run physics simulation in every frame
  if (ammoReady && physicsWorld) {
    try {
      // Higher precision physics stepping - critical for rope simulation
      const subSteps = isPlaying ? 4 : 2;
      const timeStep = 1/60;
      
      // Step physics with more substeps for better accuracy
      physicsWorld.stepSimulation(timeStep, subSteps, timeStep/subSteps);
      
      // Wake up all rope bodies to prevent deactivation (crucial for continuous movement)
      for (let i = 0; i < ropeBodies.length; i++) {
        if (ropeBodies[i]) {
          // Activate the body to ensure physics continues processing it
          ropeBodies[i].activate();
          
          // Add tiny random force to prevent static equilibrium
          if (frameCount % 10 === i % 10) {
            const tinyForce = new AmmoLib.btVector3(
              (Math.random() - 0.5) * 0.01,
              (Math.random() - 0.5) * 0.01,
              (Math.random() - 0.5) * 0.01
            );
            ropeBodies[i].applyCentralForce(tinyForce);
          }
        }
      }
      
      // Apply stronger continuous forces to the rope
      applyRotationForceToRope();
      
      // Periodically apply larger forces to create visible movement
      if (frameCount % 30 === 0 && isPlaying) {
        applyExtraForcesToRope();
      }
      
      // Update rope visualization AFTER physics step
      updateRopeCurve();
      
      // Re-create the rope mesh with the updated physics positions
      if (ropePoints.length >= 2) {
        createRopeMesh();
      }
      
      // Update anchor positions
      updateEndAnchor();
      
      // Debug output every few seconds
      if (frameCount % 300 === 0) {
        console.log(`Physics active - Rope has ${ropeBodies.length} segments, Frame ${frameCount}`);
        
        // Only call if function exists
        if (typeof checkRopeActivity === 'function') {
          checkRopeActivity();
        }
      }
    } catch (error) {
      console.error("Physics error:", error);
    }
  }
  
  renderer.render(scene, camera);
}

// New function to apply extra forces periodically for more visible movement
function applyExtraForcesToRope() {
  if (!ropeBodies.length) return;
  
  try {
    // Apply random forces to middle sections for more dynamic movement
    const midStart = Math.floor(ropeBodies.length * 0.3);
    const midEnd = Math.floor(ropeBodies.length * 0.7);
    
    for (let i = midStart; i < midEnd; i++) {
      if (!ropeBodies[i]) continue;
      
      const force = new AmmoLib.btVector3(
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3, 
        (Math.random() - 0.5) * 0.15
      );
      
      ropeBodies[i].applyCentralForce(force);
    }
    
    // Add downward impulse for gravity effect
    for (let i = 0; i < ropeBodies.length; i += 3) {
      if (!ropeBodies[i]) continue;
      
      const impulse = new AmmoLib.btVector3(0, -0.05, 0);
      ropeBodies[i].applyCentralImpulse(impulse);
    }
  } catch (error) {
    console.error("Error applying extra forces:", error);
  }
}

// Update end anchor position
function updateEndAnchor() {
  if (!dummy || !anchorEnd || !movingModel) return;
  
  try {
    const worldPos = new THREE.Vector3();
    dummy.getWorldPosition(worldPos);
    
    const transform = new AmmoLib.btTransform();
    transform.setIdentity();
    transform.setOrigin(new AmmoLib.btVector3(worldPos.x, worldPos.y, worldPos.z));
    
    const ms = anchorEnd.getMotionState();
    if (ms) {
      ms.setWorldTransform(transform);
    }
  } catch (error) {
    console.error("Error updating end anchor:", error);
  }
}

// Much more robust updateRopeCurve function
function updateRopeCurve() {
  if (!ammoReady || ropeBodies.length === 0) return;
  
  try {
    // Clean existing points
    ropePoints.length = 0;
    
    // Get positions from physics bodies
    for (let i = 0; i < ropeBodies.length; i++) {
      const body = ropeBodies[i];
      if (!body) continue;
      
      const ms = body.getMotionState();
      if (!ms) continue;
      
      try {
        ms.getWorldTransform(tmpTrans);
        const pos = tmpTrans.getOrigin();
        
        if (pos) {
          const x = pos.x();
          const y = pos.y();
          const z = pos.z();
          
          if (isFinite(x) && isFinite(y) && isFinite(z)) {
            ropePoints.push(new THREE.Vector3(x, y, z));
          } else {
            // Use a reasonable fallback position if NaN
            const t = i / (ropeBodies.length - 1);
            const startPos = { x: -0.6, y: 0.07, z: 0.03 };
            const endPos = { x: 0.57, y: 0.01, z: 0.025 };
            const fallbackX = startPos.x + (endPos.x - startPos.x) * t;
            const fallbackY = startPos.y + (endPos.y - startPos.y) * t - Math.sin(t * Math.PI) * 0.3;
            const fallbackZ = startPos.z + (endPos.z - startPos.z) * t;
            
            ropePoints.push(new THREE.Vector3(fallbackX, fallbackY, fallbackZ));
            
            // Try to fix the physics body
            const transform = new AmmoLib.btTransform();
            transform.setIdentity();
            transform.setOrigin(new AmmoLib.btVector3(fallbackX, fallbackY, fallbackZ));
            ms.setWorldTransform(transform);
          }
        }
      } catch (err) {
        // Skip problematic transform
      }
    }
  } catch (error) {
    console.error("Error updating rope curve:", error);
    // Ensure we have some points to avoid Three.js errors
    if (ropePoints.length < 2) {
      const startPos = { x: -0.6, y: 0.07, z: 0.03 };
      const endPos = { x: 0.57, y: 0.01, z: 0.025 };
      ropePoints.push(new THREE.Vector3(startPos.x, startPos.y, startPos.z));
      ropePoints.push(new THREE.Vector3(endPos.x, endPos.y, endPos.z));
    }
  }
}

// Improve the createRopeMesh function with better error handling
function createRopeMesh() {
  try {
    if (ropeMeshes.length > 0) {
      ropeMeshes.forEach(mesh => {
        scene.remove(mesh);
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(m => m.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      });
      ropeMeshes.length = 0;
    }

    // Ensure we have valid points
    if (!ropePoints || ropePoints.length < 2) {
      console.log("Not enough valid rope points to create mesh");
      return;
    }

    // Create curve and geometry with error handling
    try {
      const curve = new THREE.CatmullRomCurve3(ropePoints); 
      const tubeGeometry = new THREE.TubeGeometry(
        curve, 
        Math.min(segmentCount * 8, ropePoints.length * 4),
        ropeRadius * 0.8,
        16, 
        false
      );

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

      // Compute UV mapping safely
      tubeGeometry.computeBoundingBox();
      const boundingBox = tubeGeometry.boundingBox;
      if (boundingBox) {
        const size = new THREE.Vector3();
        boundingBox.getSize(size);
        const uvAttribute = tubeGeometry.attributes.uv;
        if (uvAttribute) {
          for (let i = 0; i < uvAttribute.count; i++) {
            let u = uvAttribute.getX(i);
            uvAttribute.setXY(i, u * size.length() * 0.5, uvAttribute.getY(i));
          }
          uvAttribute.needsUpdate = true;
        }
      }

      const ropeMaterial = new THREE.MeshStandardMaterial({
        map: colourMap,
        normalMap: normalMap,
        roughnessMap: roughnessMap,
        roughness: 0.7,
        metalness: 0.2,
        side: THREE.DoubleSide
      });

      const tubeMesh = new THREE.Mesh(tubeGeometry, ropeMaterial);
      tubeMesh.castShadow = true;
      tubeMesh.receiveShadow = true; // Fix typo: recieveShadow → receiveShadow
      scene.add(tubeMesh);
      ropeMeshes.push(tubeMesh);
    } catch (err) {
      console.error("Error creating rope tube geometry:", err);
    }
  } catch (error) {
    console.error("Error in createRopeMesh:", error);
  }
}

// Start animation loop
animate();

// Make sure we call setTimeout for checkAndCreateRope to ensure the rope is created
setTimeout(() => {
  console.log("Delayed rope creation check");
  checkAndCreateRope();
}, 2000); // Increased timeout to ensure everything is loaded

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
      spoolModel.position.set(-0.55, -0.06, 0.035);
      spoolModel.scale.set(11, 11, 11);
      scene.add(spoolModel);
    },
  );
}

let benchModel = null;
loader.load(
  './assets/table.gltf',
  (gltf) => {
    benchModel = gltf.scene;
    benchModel.position.set(-1.8, -0.6, -1.235);
    benchModel.scale.set(0.5, 0.5, 0.5);
    benchModel.rotation.y = (Math.PI / 2);
    scene.add(benchModel);
  }
);
let benchModel2 = null;
loader.load(
  './assets/table.gltf',
  (gltf) => {
    benchModel2 = gltf.scene;
    benchModel2.position.set(-1.15, -0.6, -1.8);
    benchModel2.scale.set(0.5, 0.5, 0.5);
    scene.add(benchModel2);
  }
);
let toolbox = null;
loader.load(
  './assets/toolbox.gltf',
  (gltf) => {
    toolbox = gltf.scene;
    toolbox.position.set(1.5, -0.65, -1.8);
    toolbox.scale.set(0.6, 0.6, 0.6);
    scene.add(toolbox);
  }
);

let model1410 = null;
loader.load(
  './assets/100-10-STAND.gltf',
  (gltf) => {
    model1410 = gltf.scene;
    model1410.position.set(-0.5, -0.85, -1.71);
    model1410.rotation.x = (Math.PI / 2);
    model1410.rotation.z = (Math.PI / 2.5);
    model1410.rotation.y = (Math.PI / 1.02);
    scene.add(model1410);
  }
);

const endOfRope = ropeBodies[segmentCount - 1];
const midRope = 10;

function completeConfig(){
  return reelSelect.value && counterSelect.value && coilerSelect.value;
}

// More detailed debug output function
function checkPhysicsState() {
  if (!ammoReady) {
    console.warn("Physics not ready yet");
    return;
  }
  
  console.log("%cPhysics State Check:", "color: green; font-weight: bold", {
    ammoReady: ammoReady,
    physicsWorldExists: !!physicsWorld,
    ropeSegments: ropeBodies.length,
    constraints: constraints.length,
    activeCoilerType: activeCoilerType,
    coilerExists: !!coilerBody,
    isPlaying: isPlaying,
    frameCount: frameCount,
    ropePointsCount: ropePoints.length,
    ropeMeshCount: ropeMeshes.length
  });
  
  // Check if first and last rope segments match the anchors
  if (ropeBodies.length > 0) {
    try {
      const firstBody = ropeBodies[0];
      const lastBody = ropeBodies[ropeBodies.length - 1];
      
      if (!firstBody || !lastBody) {
        console.warn("First or last rope body is null");
        return;
      }
      
      const firstMs = firstBody.getMotionState();
      const lastMs = lastBody.getMotionState();
      
      if (!firstMs || !lastMs) {
        console.warn("Motion state not available for rope endpoints");
        return;
      }
      
      firstMs.getWorldTransform(tmpTrans);
      const firstPos = tmpTrans.getOrigin();
      
      lastMs.getWorldTransform(tmpTrans);
      const lastPos = tmpTrans.getOrigin();
      
      // Make sure we have valid coordinates
      if (!firstPos || !lastPos) {
        console.warn("Rope positions not available");
        return;
      }
      
      const fx = isNaN(firstPos.x()) ? "NaN" : firstPos.x().toFixed(3);
      const fy = isNaN(firstPos.y()) ? "NaN" : firstPos.y().toFixed(3);
      const fz = isNaN(firstPos.z()) ? "NaN" : firstPos.z().toFixed(3);
      
      const lx = isNaN(lastPos.x()) ? "NaN" : lastPos.x().toFixed(3);
      const ly = isNaN(lastPos.y()) ? "NaN" : lastPos.y().toFixed(3);
      const lz = isNaN(lastPos.z()) ? "NaN" : lastPos.z().toFixed(3);
      
      console.log("%cRope endpoints:", "color: blue; font-weight: bold", {
        startX: fx,
        startY: fy,
        startZ: fz,
        endX: lx,
        endY: ly,
        endZ: lz,
        hasMoved: typeof ropeHasMoved === 'function' ? ropeHasMoved() : 'unknown'
      });
      
      // If we have NaN values, try to fix the bodies
      if (fx === "NaN" || fy === "NaN" || fz === "NaN" || 
          lx === "NaN" || ly === "NaN" || lz === "NaN") {
        console.warn("NaN positions detected, attempting to fix rope");
        tryFixRope();
      }
    } catch (e) {
      console.error("Error checking rope positions:", e);
    }
  }
  
  // Schedule next check
  setTimeout(checkPhysicsState, 5000);
}

// Helper to check if rope has moved from initial positions
function ropeHasMoved() {
  if (ropeBodies.length < 3) return false;
  
  try {
    // Check middle segment for movement
    const middleIndex = Math.floor(ropeBodies.length / 2);
    const body = ropeBodies[middleIndex];
    if (!body) return false;
    
    try {
      const ms = body.getMotionState();
      if (!ms) return false;
      
      ms.getWorldTransform(tmpTrans);
      
      const vel = body.getLinearVelocity();
      if (!vel) return false;
      
      const isMoving = Math.abs(vel.x()) > 0.01 || 
                      Math.abs(vel.y()) > 0.01 || 
                      Math.abs(vel.z()) > 0.01;
                      
      return isMoving;
    } catch (e) {
      console.warn("Error checking velocity:", e);
      return false;
    }
  } catch (e) {
    console.warn("Error in ropeHasMoved:", e);
    return false;
  }
}

// Add the missing checkRopeActivity function
function checkRopeActivity() {
  if (ropeBodies.length < 5) return;
  
  try {
    let activeCount = 0;
    let totalVelocity = 0;
    
    for (let i = 0; i < ropeBodies.length; i++) {
      const body = ropeBodies[i];
      if (!body) continue;
      
      try {
        // Check if body is active in physics simulation
        if (body.isActive()) {
          activeCount++;
        }
        
        // Get and sum velocity magnitudes
        const vel = body.getLinearVelocity();
        if (vel) {
          totalVelocity += Math.sqrt(vel.x()*vel.x() + vel.y()*vel.y() + vel.z()*vel.z());
        }
      } catch (bodyError) {
        // Skip individual problematic bodies
        console.warn("Error checking rope segment activity:", bodyError);
      }
    }
    
    console.log(`Rope activity: ${activeCount}/${ropeBodies.length} segments active, Avg velocity: ${(totalVelocity/ropeBodies.length).toFixed(4)}`);
    
    // Re-activate bodies if too many are sleeping
    if (activeCount < ropeBodies.length * 0.5) {
      console.log("Reactivating rope bodies");
      for (let i = 0; i < ropeBodies.length; i++) {
        const body = ropeBodies[i];
        if (body) {
          try {
            body.activate();
            body.setActivationState(4); // DISABLE_DEACTIVATION
          } catch (err) {
            console.warn("Failed to activate body:", err);
          }
        }
      }
    }
  } catch (error) {
    console.error("Error checking rope activity:", error);
  }
}

// Add a function to try to fix broken rope
function tryFixRope() {
  if (!ammoReady || ropeBodies.length === 0) return;
  
  try {
    console.log("Attempting to fix rope with NaN positions");
    
    // Reset any problematic bodies to valid positions
    const startPos = { x: -0.6, y: 0.07, z: 0.03 };
    const endPos = { x: 0.57, y: 0.01, z: 0.025 };
    
    for (let i = 0; i < ropeBodies.length; i++) {
      if (!ropeBodies[i]) continue;
      
      const ms = ropeBodies[i].getMotionState();
      if (!ms) continue;
      
      // Get current position
      ms.getWorldTransform(tmpTrans);
      const pos = tmpTrans.getOrigin();
      
      // If position is NaN or invalid, reset it
      if (!pos || isNaN(pos.x()) || isNaN(pos.y()) || isNaN(pos.z())) {
        const t = i / (ropeBodies.length - 1);
        const x = startPos.x + (endPos.x - startPos.x) * t;
        const y = startPos.y + (endPos.y - startPos.y) * t - Math.sin(t * Math.PI) * 0.25;
        const z = startPos.z + (endPos.z - startPos.z) * t;
        
        // Create new transform with valid position
        const transform = new AmmoLib.btTransform();
        transform.setIdentity();
        transform.setOrigin(new AmmoLib.btVector3(x, y, z));
        
        // Reset motion state
        ms.setWorldTransform(transform);
        
        // Reset velocity
        ropeBodies[i].setLinearVelocity(new AmmoLib.btVector3(0, 0, 0));
        ropeBodies[i].setAngularVelocity(new AmmoLib.btVector3(0, 0, 0));
        
        console.log(`Fixed rope segment ${i}`);
      }
    }
    
    // Wake up all bodies
    for (let body of ropeBodies) {
      if (body) {
        body.activate();
      }
    }
  } catch (error) {
    console.error("Error trying to fix rope:", error);
  }
}

// Initialize immediately
preloadAmmo();
// Run state check after physics is ready
setTimeout(checkPhysicsState, 3000);

setTimeout(() => {
  checkAndCreateRope();
}, 1000);
