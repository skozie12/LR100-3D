import { World, Body, Cylinder, Material, ContactMaterial, Sphere, Vec3, DistanceConstraint, BODY_TYPES, Quaternion as CQuaternion } from 'cannon-es';

// Physics constants
let world;
let defaultMaterial;
const COLLISION_GROUPS = {
  COILER: 1,
  ROPE: 2,
  ROPE_SEGMENT: 4,
  ANCHOR: 8
};

// Rope related variables
let segmentCount = 40;
let segmentWidth = 0.012;
let segmentMass = 0.5;
let segmentDistance = 0.012;
let ropeBodies = [];
let anchorEnd, anchorStart, anchor;
let coilerBody, coilerBodySide1, coilerBodySide2;
let midRope = 10;

// Add these variables to replace window references
let addedSegments = 0;
let currentDirection = 1;
let currentZ = 0;

// Add at the top with other state variables
let isRopeFinalized = false;

// Add this flag at the top with other state variables
let isAnimationStarted = false;

// Add a variable to track the current max segments based on coiler type
let currentMaxSegments = 400; // Default, will be updated with messages

// Add accumulator variables for fixed timestep
const fixedTimeStep = 1/60; // Physics at 60Hz for better precision
let accumulator = 0;
let physicsTime = 0;

// Add rotation tracking variables
let coilerAngle = 0;
let segmentsPerRotation = 8; // Reduced from 12 to 8 for fewer segments per rotation
let segmentAngleInterval = (Math.PI * 2) / segmentsPerRotation;
let lastSegmentAngle = 0;

// Fix detection constants for more precise contact
const COILER_WRAP_DISTANCE = 0.03; // Smaller - only detect real contacts
const WRAP_ROTATION_THRESHOLD = 0; // Convert immediately on contact
const STATIC_SEGMENTS_FOLLOW_COILER = true;

// Track which segments have been made static
let staticSegments = new Set();

// Add tracking for segments near coiler
let segmentWrapTimes = []; // Tracks how long each segment has been near coiler

// Add these variables to the top of the file with other state variables
let frameCounter = 0; // Added to fix reference error

// Add reference to coiler config to ensure correct coiler radius is used
let COILER_CONFIG = null;
let activeCoilerType = "100-10"; // Default value

// Add a fallback mechanism for static conversion
const MAX_SEGMENT_AGE = 120; // Force static after this many frames near coiler

// Simplified constants
const COILER_CONTACT_MARGIN = 0.05;

// Refined constants for consistent physics simulation
const FIXED_TIMESTEP = 1/60; // Run at consistent 60Hz physics regardless of framerate
const FIXED_SUBSTEPS = 4;    // Always use 4 substeps for consistent behavior
const SEGMENT_ANGLE_INCREMENT = Math.PI / 16; // Create new segment every 11.25 degrees of rotation

// Track simulation state
let simulationTime = 0;      // Total elapsed physics time
let totalRotationAngle = 0;  // Total coiler rotation angle

// Initialize the physics world
function initPhysics() {
  world = new World({
    gravity: new Vec3(0, -9.81, 0),
  });

  defaultMaterial = new Material('defaultMaterial');
  
  world.defaultContactMaterial = new ContactMaterial(defaultMaterial, defaultMaterial, {
    friction: 0.5,
    restitution: 0.01,
    contactEquationStiffness: 5e5,
    contactEquationRelaxation: 5,
    frictionEquationStiffness: 5e5,
    frictionEquationRelaxation: 5
  });
  world.defaultMaterial = defaultMaterial;
  
  // Create anchor points
  anchorEnd = new Body({ mass: 0 });
  anchorEnd.position.set(0.57, 0.225, 0.025);
  anchorEnd.type = BODY_TYPES.KINEMATIC;
  world.addBody(anchorEnd);

  anchorStart = new Body({ mass: 0 });
  anchorStart.position.set(-0.6, 0.27, -0.058);
  world.addBody(anchorStart);

  anchor = new Body({ mass: 0 });
  anchor.position.set(0, 0.3, 0.03);
  world.addBody(anchor);

  // Reset segment wrap tracking
  segmentWrapTimes = [];
  
  // Reset tracking for static segments
  staticSegments = new Set();
}

// Create rope segments with physics
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

  // Add constraints between rope segments
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

  // Add constraints to anchor points
  const anchorConstraint = new DistanceConstraint(anchor, ropeBodies[midRope], 0);
  world.addConstraint(anchorConstraint);

  const anchorStartConstraint = new DistanceConstraint(anchorStart, ropeBodies[0], 0);
  world.addConstraint(anchorStartConstraint);

  const anchorEndConstraint = new DistanceConstraint(anchorEnd, ropeBodies[segmentCount - 1], 0);
  world.addConstraint(anchorEndConstraint);
}

// Reset the rope physics
function resetRope(resetAngle = false) {
  try {
    isRopeFinalized = false; // Make sure flag is reset
    
    // Reset frame counter when rope is reset
    frameCounter = 0;
    
    for (let i = world?.constraints?.length - 1; i >= 0; i--) {
      if (world.constraints[i] instanceof DistanceConstraint) {
        world.removeConstraint(world.constraints[i]);
      }
    }
    
    for (let i = 0; i < ropeBodies.length; i++) {
      world.removeBody(ropeBodies[i]);
    }
    
    ropeBodies.length = 0;
    
    // Reset our variables instead of window variables
    addedSegments = 0;
    currentDirection = 1;
    currentZ = 0;

    // Reset physics time tracking
    accumulator = 0;
    physicsTime = 0;

    // Reset angle tracking if requested
    if (resetAngle) {
      coilerAngle = 0;
      lastSegmentAngle = 0;
    }

    // Reset segment wrap tracking
    segmentWrapTimes = [];
    
    // Reset static segments tracking
    staticSegments.clear();
  } catch (err) {
    console.error("Error in resetRope:", err);
  }
}

// Completely redesigned physics step that synchronizes time across entire simulation
function stepPhysics(timeStep, subSteps, maxSegments, rotationSpeed, currentRotationAngle) {
  // Always use fixed timestep for consistent physics regardless of framerate
  const fixedStep = FIXED_TIMESTEP;
  const fixedSubsteps = FIXED_SUBSTEPS;
  
  // Track total simulation time
  simulationTime += fixedStep;
  
  // Update total rotation angle based on rotation speed
  const angleIncrement = rotationSpeed * fixedStep;
  totalRotationAngle += angleIncrement;
  
  // Step the physics world with fixed parameters
  for (let i = 0; i < fixedSubsteps; i++) {
    world.step(fixedStep / fixedSubsteps);
  }
  
  // Call separate functions for coiler interactions
  applyRopeForces(rotationSpeed);
  processCoilerContacts();
  rotateStaticSegments(angleIncrement);
  
  // Check if we need a new segment based on rotation angle
  // This ensures consistent segment spacing regardless of framerate
  if (Math.abs(totalRotationAngle - lastSegmentAngle) >= SEGMENT_ANGLE_INCREMENT) {
    const segmentAdded = tryAddSegment(COILER_CONFIG, activeCoilerType, maxSegments, totalRotationAngle);
    if (segmentAdded) {
      lastSegmentAngle = totalRotationAngle;
    }
  }
  
  // Return validated positions for rendering
  return {
    positions: getValidPositions(),
    segmentCount: ropeBodies.length,
    staticCount: staticSegments.size,
    simulationTime: simulationTime,
    rotationAngle: totalRotationAngle
  };
}

// Apply forces to rope segments based on physics properties
function applyRopeForces(rotationSpeed) {
  if (!coilerBody || isRopeFinalized) return;
  
  // Get coiler configuration
  const config = COILER_CONFIG?.[activeCoilerType];
  if (!config) return;
  
  const coilerRadius = config.radius;
  const coilerPos = coilerBody.position;
  const rotationDirection = Math.sign(rotationSpeed);
  
  // Apply forces to non-static rope segments
  for (let i = 0; i < ropeBodies.length; i++) {
    const body = ropeBodies[i];
    if (!body || body.type === BODY_TYPES.STATIC) continue;
    
    // Vector from segment to coiler
    const dx = coilerPos.x - body.position.x;
    const dy = coilerPos.y - body.position.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    
    // Only affect segments within range
    const maxRange = coilerRadius * 3;
    if (dist > maxRange) continue;
    
    // Normalized direction toward coiler
    const nx = dx / dist;
    const ny = dy / dist;
    
    // Tangential direction for rotation
    const tx = -ny;
    const ty = nx;
    
    // Radial force toward coiler surface
    const targetDist = coilerRadius + 0.01; // Slightly offset from surface
    const distError = dist - targetDist;
    const radialForce = 12.0 * distError;
    
    // Apply stronger force when further away
    body.applyForce(
      new Vec3(nx * radialForce, ny * radialForce, 0),
      new Vec3(0, 0, 0)
    );
    
    // Apply tangential force matching coiler rotation
    const tangentialForce = Math.abs(rotationSpeed) * 5.0;
    body.applyForce(
      new Vec3(tx * tangentialForce * rotationDirection, ty * tangentialForce * rotationDirection, 0),
      new Vec3(0, 0, 0)
    );
    
    // Add damping for stability near the coiler
    if (Math.abs(distError) < 0.1) {
      body.velocity.scale(0.9);
      body.angularVelocity.scale(0.9);
    }
  }
}

// Process coiler contacts and convert segments to static
function processCoilerContacts() {
  if (!coilerBody || isRopeFinalized) return;
  
  const config = COILER_CONFIG?.[activeCoilerType];
  if (!config) return;
  
  const coilerRadius = config.radius;
  const coilerPos = coilerBody.position;
  
  // Check segments from the end backward for better wrapping order
  for (let i = ropeBodies.length - 1; i >= 0; i--) {
    const body = ropeBodies[i];
    if (!body || body.type === BODY_TYPES.STATIC) continue;
    
    // Distance to coiler center
    const dx = body.position.x - coilerPos.x;
    const dy = body.position.y - coilerPos.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    
    // Check if close to coiler surface
    const distError = Math.abs(dist - coilerRadius);
    if (distError < 0.03) { // Threshold for contact detection
      makeSegmentStatic(i);
      
      // Also make nearby segments static to create smooth wrapping
      let nearby = 3; // Number of neighbors to check for static conversion
      for (let j = i-1; j >= 0 && nearby > 0; j--) {
        if (ropeBodies[j] && ropeBodies[j].type !== BODY_TYPES.STATIC) {
          const jdx = ropeBodies[j].position.x - coilerPos.x;
          const jdy = ropeBodies[j].position.y - coilerPos.y;
          const jdist = Math.sqrt(jdx*jdx + jdy*jdy);
          
          // If neighbor is near enough to coiler, also make it static
          if (Math.abs(jdist - coilerRadius) < 0.05) {
            makeSegmentStatic(j);
            nearby--;
          }
        }
      }
    }
  }
}

// Make a segment static and attach it to the coiler
function makeSegmentStatic(index) {
  const body = ropeBodies[index];
  if (!body || body.type === BODY_TYPES.STATIC) return false;
  
  try {
    // Get coiler configuration
    const config = COILER_CONFIG?.[activeCoilerType];
    if (!config) return false;
    
    const coilerRadius = config.radius;
    
    // Calculate position relative to coiler
    const dx = body.position.x - coilerBody.position.x;
    const dy = body.position.y - coilerBody.position.y;
    const dz = body.position.z - coilerBody.position.z;
    
    // Calculate angle for placement on coiler surface
    const angle = Math.atan2(dy, dx);
    
    // Store attachment data for rotation
    body.userData = body.userData || {};
    body.userData.coilerAttachment = {
      angle: angle,
      radius: coilerRadius, // Exact coiler radius for perfect wrapping
      z: dz
    };
    
    // Position exactly on coiler surface
    body.position.x = coilerBody.position.x + coilerRadius * Math.cos(angle);
    body.position.y = coilerBody.position.y + coilerRadius * Math.sin(angle);
    
    // Make body static
    body.type = BODY_TYPES.STATIC;
    body.mass = 0;
    body.updateMassProperties();
    body.velocity.set(0, 0, 0);
    body.angularVelocity.set(0, 0, 0);
    body.force.set(0, 0, 0);
    body.torque.set(0, 0, 0);
    
    // Track static segments
    staticSegments.add(index);
    return true;
  } catch (err) {
    console.error(`Error making segment ${index} static:`, err);
    return false;
  }
}

// Rotate static segments with coiler
function rotateStaticSegments(angleIncrement) {
  if (!coilerBody || angleIncrement === 0) return;

  // Update all static segments attached to coiler
  for (let i = 0; i < ropeBodies.length; i++) {
    const body = ropeBodies[i];
    if (!body || body.type !== BODY_TYPES.STATIC || !body.userData?.coilerAttachment) continue;
    
    const attachment = body.userData.coilerAttachment;
    
    // Update angle
    attachment.angle += angleIncrement;
    
    // Update position based on angle
    body.position.x = coilerBody.position.x + attachment.radius * Math.cos(attachment.angle);
    body.position.y = coilerBody.position.y + attachment.radius * Math.sin(attachment.angle);
    body.position.z = coilerBody.position.z + attachment.z;
  }
}

// Try to add a new segment - only called at specific rotation angles
function tryAddSegment(coilerConfig, coilerType, maxSegments, currentAngle) {
  // Check limits
  const segmentLimit = maxSegments || (coilerType === "100-200" ? 300 : 400);
  if (ropeBodies.length >= segmentLimit) return false;
  if (ropeBodies.length < 11) return false;
  
  try {
    // Base segment at position 10
    const baseSegment = ropeBodies[10];
    const nextSegment = ropeBodies[11];
    
    if (!baseSegment || !nextSegment) return false;
    
    // Create new segment
    const newSegment = new Body({
      mass: segmentMass,
      shape: new Sphere(segmentWidth / 2),
      position: new Vec3(baseSegment.position.x, baseSegment.position.y, baseSegment.position.z),
      material: defaultMaterial,
      collisionFilterGroup: COLLISION_GROUPS.ROPE | COLLISION_GROUPS.ROPE_SEGMENT,
      collisionFilterMask: COLLISION_GROUPS.COILER | COLLISION_GROUPS.ROPE_SEGMENT
    });
    
    // Add initial velocity toward coiler
    if (coilerBody) {
      const dx = coilerBody.position.x - baseSegment.position.x;
      const dy = coilerBody.position.y - baseSegment.position.y;
      
      // Make initial velocity faster for better coiling
      newSegment.velocity.set(dx * 0.5, dy * 0.5, 0);
    }
    
    // Adjust damping for better dynamics
    newSegment.linearDamping = 0.7;
    newSegment.angularDamping = 0.7;
    
    world.addBody(newSegment);
    
    // Remove constraint between segments 10 and 11
    let foundConstraint = false;
    world.constraints.forEach(constraint => {
      if ((constraint.bodyA === baseSegment && constraint.bodyB === nextSegment) ||
          (constraint.bodyA === nextSegment && constraint.bodyB === baseSegment)) {
        world.removeConstraint(constraint);
        foundConstraint = true;
      }
    });
    
    // Handle Z-oscillation for realistic rope appearance
    addedSegments++;
    
    if (addedSegments % 30 === 0) {
      currentDirection *= -1;
    }
    
    if (!currentZ) currentZ = 0;
    
    const config = coilerConfig[coilerType];
    if (config) {
      const zRange = (config.sideOffset1 - config.sideOffset2) * 0.8;
      currentZ += currentDirection * (zRange / 50) * 0.9;
      const maxZ = zRange * 0.45;
      currentZ = Math.max(Math.min(currentZ, maxZ), -maxZ);
      newSegment.position.z += currentZ * 0.3;
    }
    
    // Insert segment at position 11
    const tailSegments = ropeBodies.slice(11);
    ropeBodies.length = 11;
    ropeBodies.push(newSegment);
    ropeBodies.push(...tailSegments);
    
    // Create constraints with higher force values for stability
    const c1 = new DistanceConstraint(baseSegment, newSegment, segmentDistance, 1e6);
    const c2 = new DistanceConstraint(newSegment, ropeBodies[12], segmentDistance, 1e6);
    c1.collideConnected = false;
    c2.collideConnected = false;
    c1.maxForce = 1e4;
    c2.maxForce = 1e4;
    world.addConstraint(c1);
    world.addConstraint(c2);
    
    return true;
  } catch (err) {
    console.error("Error adding segment:", err);
    return false;
  }
}

// Get validated positions for rendering
function getValidPositions() {
  return ropeBodies.map(body => {
    if (!body || !body.position) return null;
    return {
      x: body.position.x,
      y: body.position.y,
      z: body.position.z
    };
  }).filter(pos => pos !== null);
}

// Update anchor position safely
function updateAnchorPosition(x, y, z) {
  // Only update if anchor exists
  if (!anchorEnd) return;
  
  anchorEnd.position.set(x, y, z);
  anchorEnd.velocity.set(0, 0, 0);
  anchorEnd.angularVelocity.set(0, 0, 0);
  
  // Dampen last few segments for stability
  const count = Math.min(10, ropeBodies.length);
  for (let i = ropeBodies.length - count; i < ropeBodies.length; i++) {
    if (ropeBodies[i]) {
      ropeBodies[i].velocity.scale(0.9);
      ropeBodies[i].angularVelocity.scale(0.9);
    }
  }
}

// Set coiler rotation and track angle
function setCoilerRotation(rotationSpeed) {
  if (!coilerBody) return;
  
  // Set angular velocities for all coiler parts
  coilerBody.angularVelocity.set(0, 0, rotationSpeed);
  
  if (coilerBodySide1) {
    coilerBodySide1.angularVelocity.set(0, 0, rotationSpeed);
  }
  
  if (coilerBodySide2) {
    coilerBodySide2.angularVelocity.set(0, 0, rotationSpeed);
  }
}

// Add missing createCoiler function
function createCoiler(config, coilerType) {
  // Store config reference
  COILER_CONFIG = config;
  activeCoilerType = coilerType || activeCoilerType;
  
  // Get configuration for this coiler type
  const coilerConfig = config[activeCoilerType];
  if (!coilerConfig) {
    console.error("Invalid coiler type:", activeCoilerType);
    return null;
  }
  
  const coilerRadius = coilerConfig.radius;
  const coilerHeight = coilerConfig.height;
  
  // Clean up existing coiler if any
  if (coilerBody) {
    world.removeBody(coilerBody);
  }
  
  // Create new coiler body
  coilerBody = new Body({
    mass: 0,
    type: BODY_TYPES.KINEMATIC,
    material: defaultMaterial,
    collisionFilterGroup: COLLISION_GROUPS.COILER,
    collisionFilterMask: COLLISION_GROUPS.ROPE
  });
  
  // Create cylinder shape
  const cylinderShape = new Cylinder(coilerRadius, coilerRadius, coilerHeight, 16);
  
  // Align cylinder along X-Z plane (rotated around X axis)
  coilerBody.addShape(
    cylinderShape, 
    new Vec3(0, 0, 0),
    new CQuaternion().setFromAxisAngle(new Vec3(1, 0, 0), Math.PI / 2)
  );
  
  // Add grip bumps for better rope interaction
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
  
  // Position the coiler
  coilerBody.position.set(0.57, 0.225, coilerConfig.zOffset);
  world.addBody(coilerBody);
  
  return coilerBody;
}

// Add missing createCoilerSides function
function createCoilerSides(config, coilerType) {
  // Clean up existing side bodies
  if (coilerBodySide1) {
    world.removeBody(coilerBodySide1);
    coilerBodySide1 = null;
  }
  
  if (coilerBodySide2) {
    world.removeBody(coilerBodySide2);
    coilerBodySide2 = null;
  }
  
  // Get configuration
  const coilerConfig = config[activeCoilerType];
  if (!coilerConfig) return null;
  
  const coilerRadius = coilerConfig.radius;
  const coilerHeight = coilerConfig.height;
  
  // Size multiplier depends on coiler type
  const sideRadiusMultiplier = 
    activeCoilerType === "100-10" ? 2.0 : 
    activeCoilerType === "100-99" ? 2.1 : 2.2;
  
  // Create shape for side discs
  const cylinderShapeSide = new Cylinder(
    coilerRadius * sideRadiusMultiplier,
    coilerRadius * sideRadiusMultiplier,
    coilerHeight / 10,
    16
  );
  
  // Create first side body
  coilerBodySide1 = new Body({
    mass: 0,
    type: BODY_TYPES.KINEMATIC,
    shape: cylinderShapeSide,
    material: defaultMaterial
  });
  
  coilerBodySide1.position.set(0.57, 0.225, coilerConfig.sideOffset1);
  coilerBodySide1.quaternion.setFromEuler(Math.PI / 2, 0, 0);
  world.addBody(coilerBodySide1);
  
  // Create second side body
  coilerBodySide2 = new Body({
    mass: 0,
    type: BODY_TYPES.KINEMATIC,
    shape: cylinderShapeSide,
    material: defaultMaterial
  });
  
  coilerBodySide2.position.set(0.57, 0.225, coilerConfig.sideOffset2);
  coilerBodySide2.quaternion.setFromEuler(Math.PI / 2, 0, 0);
  world.addBody(coilerBodySide2);
  
  return { side1: coilerBodySide1, side2: coilerBodySide2 };
}

// Add missing makeRopeBodiesStatic function
function makeRopeBodiesStatic() {
  isRopeFinalized = true;
  
  // Make all rope bodies static
  for (let i = 0; i < ropeBodies.length; i++) {
    const body = ropeBodies[i];
    if (!body) continue;
    
    // Stop all motion and make static
    body.type = BODY_TYPES.STATIC;
    body.mass = 0;
    body.updateMassProperties();
    body.velocity.set(0, 0, 0);
    body.angularVelocity.set(0, 0, 0);
    body.force.set(0, 0, 0);
    body.torque.set(0, 0, 0);
    
    // Add to tracking set
    staticSegments.add(i);
  }
  
  // Also make anchor points static
  if (anchorEnd) {
    anchorEnd.type = BODY_TYPES.STATIC;
    anchorEnd.updateMassProperties();
  }
  
  if (anchorStart) {
    anchorStart.type = BODY_TYPES.STATIC;
    anchorStart.updateMassProperties();
  }
  
  if (anchor) {
    anchor.type = BODY_TYPES.STATIC;
    anchor.updateMassProperties();
  }
}

// Completely redesigned message handler for better synchronization
self.onmessage = function(e) {
  try {
    const { type, data } = e.data;
    
    // Always handle these critical messages
    switch (type) {
      case 'init':
        initPhysics();
        self.postMessage({ 
          type: 'initialized'
        });
        break;

      case 'resetRope':
        // Reset time tracking
        simulationTime = 0;
        totalRotationAngle = 0;
        lastSegmentAngle = 0;
        
        // Reset physics objects
        resetRope(data?.resetAngle);
        isRopeFinalized = false;
        
        self.postMessage({ 
          type: 'ropeReset' 
        });
        break;

      case 'createCoiler':
        // Store configs
        COILER_CONFIG = data.coilerConfig;
        activeCoilerType = data.activeCoilerType;
        
        // Update max segments based on coiler type
        currentMaxSegments = activeCoilerType === "100-200" ? 300 : 400;
        
        // Create physics objects
        createCoiler(data.coilerConfig, data.activeCoilerType);
        createCoilerSides(data.coilerConfig, data.activeCoilerType);
        
        self.postMessage({ 
          type: 'coilerCreated' 
        });
        break;

      case 'createRope':
        createRopeSegments();
        const initialPositions = getValidPositions();
        
        self.postMessage({ 
          type: 'ropeCreated',
          positions: initialPositions
        });
        break;
        
      case 'step':
        // If rope is finalized, still rotate static segments but skip physics
        if (isRopeFinalized) {
          if (data.rotationSpeed !== 0) {
            rotateStaticSegments(data.rotationSpeed * FIXED_TIMESTEP);
          }
          
          self.postMessage({
            type: 'stepped',
            positions: getValidPositions(),
            count: ropeBodies.length,
            staticCount: staticSegments.size,
            simulationTime: simulationTime
          });
          break;
        }
        
        // Normal physics stepping
        const stepResult = stepPhysics(
          FIXED_TIMESTEP,
          FIXED_SUBSTEPS,
          currentMaxSegments,
          data.rotationSpeed,
          data.rotationAngle
        );
        
        self.postMessage({
          type: 'stepped',
          positions: stepResult.positions,
          count: stepResult.segmentCount,
          staticCount: stepResult.staticCount,
          simulationTime: stepResult.simulationTime,
          rotationAngle: stepResult.rotationAngle
        });
        break;
        
      case 'updateAnchor':
        updateAnchorPosition(data.x, data.y, data.z);
        break;

      case 'setRotation':
        setCoilerRotation(data.rotationSpeed);
        break;
        
      case 'finalizeRope':
        makeRopeBodiesStatic();
        self.postMessage({
          type: 'ropeFinalized',
          positions: getValidPositions()
        });
        break;
        
      default:
        break;
    }
  } catch (err) {
    console.error("Worker error:", err);
    self.postMessage({ 
      type: 'error', 
      error: err.toString() 
    });
  }
};