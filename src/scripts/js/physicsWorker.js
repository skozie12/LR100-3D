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

// Add constants to match main.js
const INITIAL_SEGMENTS = 40;

// Keep track of the current max segments
let currentMaxSegments = 400; // Default to 400, will be updated with messages

// Rope related variables
let segmentCount = INITIAL_SEGMENTS; // Use the constant
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

// Enhance the reset function to be more thorough
function resetRope() {
  try {
    console.log("Worker: Beginning rope reset");
    isRopeFinalized = false; // Make sure flag is reset
    
    // Ensure all constraints are properly removed
    if (world && world.constraints) {
      const constraintsToRemove = [...world.constraints]; // Create a copy to avoid mutation issues
      for (const constraint of constraintsToRemove) {
        try {
          world.removeConstraint(constraint);
        } catch (e) {
          console.error("Error removing constraint:", e);
        }
      }
    }
    
    // Ensure all bodies are properly removed
    if (ropeBodies && ropeBodies.length) {
      const bodiesToRemove = [...ropeBodies]; // Create a copy to avoid mutation issues
      for (const body of bodiesToRemove) {
        if (body && world) {
          try {
            world.removeBody(body);
          } catch (e) {
            console.error("Error removing body:", e);
          }
        }
      }
    }
    
    ropeBodies.length = 0;
    
    // Reset our variables instead of window variables
    addedSegments = 0;
    currentDirection = 1;
    currentZ = 0;
    
    console.log("Worker: Rope reset complete - bodies:", ropeBodies.length);
    return true;
  } catch (err) {
    console.error("Error in resetRope:", err);
    return false;
  }
}

// Simplify the addRopeSegment function
function addRopeSegment(coilerConfig, activeCoilerType, maxSegments) {
  try {
    // Use the provided maxSegments parameter
    const segmentLimit = maxSegments || currentMaxSegments;
    
    // Check against the specific limit for this coiler
    if (ropeBodies.length >= segmentLimit) return;
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
        newBody.velocity.set(dx * 0.02, dy * 0.02, 0);
      }
    }
    
    newBody.angularDamping = 0.95;
    newBody.linearDamping = 0.95;
    world.addBody(newBody);
    
    // Remove existing constraints between segments 10 and 11
    const constraintsToUpdate = [];
    world.constraints.forEach((constraint) => {
      if ((constraint.bodyA === ropeBodies[10] && constraint.bodyB === ropeBodies[11]) ||
          (constraint.bodyA === ropeBodies[11] && constraint.bodyB === ropeBodies[10])) {
        constraintsToUpdate.push(constraint);
        world.removeConstraint(constraint);
      }
    });
    
    const nextBody = ropeBodies[11];
    
    // Track added segments for z-oscillation using local variables
    addedSegments++;
    
    if (addedSegments % 30 === 0) {
      currentDirection *= -1;
    }
    
    const config = coilerConfig[activeCoilerType];
    const zRange = (config.sideOffset1 - config.sideOffset2) * 0.8;
    currentZ += currentDirection * (zRange / 50) * 0.9;
    const maxZ = zRange * 0.45;
    currentZ = Math.max(Math.min(currentZ, maxZ), -maxZ);
    
    // Insert new segment at position 11
    const tailSegments = ropeBodies.slice(11);
    ropeBodies.length = 11;
    ropeBodies.push(newBody);
    ropeBodies.push(...tailSegments);
    
    // Add new constraints
    const constraintPrev = new DistanceConstraint(ropeBodies[10], newBody, segmentDistance, 1e5);
    const constraintNext = new DistanceConstraint(newBody, nextBody, segmentDistance, 1e5);
    constraintPrev.collideConnected = false;
    constraintNext.collideConnected = false;
    constraintPrev.maxForce = 1e3;
    constraintNext.maxForce = 1e3;
    world.addConstraint(constraintPrev);
    world.addConstraint(constraintNext);
    
    // Update anchor end constraint if needed
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

// Create coiler physics body
function createCoiler(config, activeCoilerType) {
  if (coilerBody) {
    world.removeBody(coilerBody);
    coilerBody = null;
  }
  
  const coilerConfig = config[activeCoilerType];
  const coilerRadius = coilerConfig.radius;
  const coilerHeight = coilerConfig.height;
  
  // Add debug log for all coiler types and include z position for 100-200
  if (isAnimationStarted) {
    if (activeCoilerType === "100-200") {
      console.log(`Creating ${activeCoilerType} coiler with radius: ${coilerConfig.radius}, height: ${coilerConfig.height}, zOffset: ${coilerConfig.zOffset}`);
    } else if (activeCoilerType === "100-10" || activeCoilerType === "100-99") {
      console.log(`Creating ${activeCoilerType} coiler with radius: ${coilerConfig.radius}, height: ${coilerConfig.height}`);
    }
  }
  
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
  
  coilerBody.position.set(0.57, 0.225, coilerConfig.zOffset);
  world.addBody(coilerBody);
  
  return coilerBody;
}

// Create coiler side physics bodies
function createCoilerSides(config, activeCoilerType) {
  if (coilerBodySide1) {
    world.removeBody(coilerBodySide1);
    coilerBodySide1 = null;
  }
  if (coilerBodySide2) {
    world.removeBody(coilerBodySide2);
    coilerBodySide2 = null;
  }
  
  const coilerConfig = config[activeCoilerType];
  const coilerRadius = coilerConfig.radius;
  const coilerHeight = coilerConfig.height;
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
  
  coilerBodySide1.position.set(0.57, 0.225, coilerConfig.sideOffset1);
  coilerBodySide1.quaternion.setFromEuler(Math.PI / 2, 0, 0); 
  world.addBody(coilerBodySide1);

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

// Update anchor position
function updateAnchorPosition(x, y, z) {
  if (anchorEnd) {
    anchorEnd.position.x = x;
    anchorEnd.position.y = y;
    anchorEnd.position.z = z;
    anchorEnd.velocity.set(0, 0, 0);
    anchorEnd.angularVelocity.set(0, 0, 0);
    
    // Dampen the velocities of the last segments
    const lastSegmentCount = 10;
    for (let i = Math.max(0, ropeBodies.length - lastSegmentCount); i < ropeBodies.length; i++) {
      if (ropeBodies[i]) {
        ropeBodies[i].velocity.scale(0.9);
        ropeBodies[i].angularVelocity.scale(0.9);
      }
    }
  }
}

// Update setCoilerRotation to apply the 10% speed increase for 100-200
function setCoilerRotation(rotationSpeed, activeCoilerType) {
  // Apply 10% faster rotation for 100-200 coiler if not provided in the message
  const speedMultiplier = (activeCoilerType === "100-200") ? 1.1 : 1.0;
  const adjustedSpeed = rotationSpeed * (activeCoilerType ? speedMultiplier : 1.0);
  
  if (coilerBody) {
    coilerBody.angularVelocity.set(0, 0, adjustedSpeed);
  }
  if (coilerBodySide1) {
    coilerBodySide1.angularVelocity.set(0, 0, adjustedSpeed);
  }
  if (coilerBodySide2) {
    coilerBodySide2.angularVelocity.set(0, 0, adjustedSpeed);
  }
}

// Update makeRopeBodiesStatic function to set the flag
function makeRopeBodiesStatic() {
  console.log('Converting rope bodies to static');
  isRopeFinalized = true; // Set flag when rope is finalized
  
  for (let i = 0; i < ropeBodies.length; i++) {
    const body = ropeBodies[i];
    body.type = BODY_TYPES.STATIC;
    body.mass = 0;
    body.updateMassProperties();
    body.velocity.set(0, 0, 0);
    body.angularVelocity.set(0, 0, 0);
    body.force.set(0, 0, 0);
    body.torque.set(0, 0, 0);
  }
  
  // Also make sure anchors are static
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

// Step the physics simulation
function stepPhysics(timeStep, subSteps, maxSegments) {
  const segmentLimit = maxSegments || currentMaxSegments;
  
  // Use the specific limit
  if (ropeBodies.length >= segmentLimit) {
    // Convert all rope bodies to static first time we hit the limit
    if (ropeBodies[0].type !== BODY_TYPES.STATIC) {
      makeRopeBodiesStatic();
    }
  }
  
  for (let i = 0; i < subSteps; i++) {
    world.step(timeStep / subSteps);
  }
  
  // Get positions of all physics bodies
  const positions = ropeBodies.map(body => ({
    x: body.position.x,
    y: body.position.y,
    z: body.position.z
  }));
  
  return positions;
}

// Update the message handler to handle forced resets
self.onmessage = function(e) {
  try {
    const { type, data, forceReset } = e.data;
    
    // Always process these message types even if rope is finalized
    const criticalMessages = ['resetRope', 'init', 'finalizeRope'];
    
    // Handle forced resets immediately
    if (type === 'resetRope' && forceReset === true) {
      console.log("Worker: Forced rope reset requested");
      resetRope();
      isRopeFinalized = false;
      isAnimationStarted = false;
      self.postMessage({ type: 'ropeReset', success: true });
      return;
    }
    
    // Set animation started flag when creating rope (which only happens when all components are selected)
    if (type === 'createRope') {
      isAnimationStarted = true;
    } else if (type === 'resetRope') {
      isAnimationStarted = false;
    }
    
    // Only log addSegment messages with the specific format
    if (type === 'addSegment' && isAnimationStarted && !isRopeFinalized) {
      // Update current max segments if provided
      if (data && data.maxSegments) {
        currentMaxSegments = data.maxSegments;
      }
      
      // Only log this specific message format and nothing else
      console.log(`Worker adding segment for ${data.activeCoilerType}, current count: ${ropeBodies.length}, max: ${currentMaxSegments}`);
    }
    
    // Skip most message types if rope is finalized
    if (isRopeFinalized && !criticalMessages.includes(type)) {
      return; // Silently ignore non-critical messages when rope is finalized
    }
    
    // Update maxSegments if provided
    if (data && data.maxSegments) {
      currentMaxSegments = data.maxSegments;
    }
    
    switch (type) {
      case 'init':
        initPhysics();
        self.postMessage({ type: 'initialized' });
        break;
        
      case 'createRope':
        console.log(`Worker: Creating rope for ${data.activeCoilerType}`);
        createCoilerSides(data.coilerConfig, data.activeCoilerType);
        self.postMessage({ type: 'coilerCreated' });
        break;
        
      case 'addSegment':
        if (data.maxSegments) {
          currentMaxSegments = data.maxSegments;
        }
        
        if (ropeBodies.length < currentMaxSegments) {
          addRopeSegment(data.coilerConfig, data.activeCoilerType, currentMaxSegments);
        }
        
        if (ropeBodies.length >= currentMaxSegments && ropeBodies[0].type !== BODY_TYPES.STATIC) {
          makeRopeBodiesStatic();
        }
        
        const segmentPositions = ropeBodies.map(body => ({
          x: body.position.x,
          y: body.position.y,
          z: body.position.z
        }));
        
        if (ropeBodies.length >= currentMaxSegments) {
          self.postMessage({ 
            type: 'segmentLimitReached',
            positions: segmentPositions 
          });
        } else {
          self.postMessage({ 
            type: 'segmentAdded', 
            positions: segmentPositions 
          });
        }
        break;
        
      case 'updateAnchor':
        updateAnchorPosition(data.x, data.y, data.z);
        break;
        
      case 'setRotation':
        setCoilerRotation(data.rotationSpeed, data.activeCoilerType);
        break;
        
      case 'step':
        const positions = stepPhysics(data.timeStep, data.subSteps, currentMaxSegments);
        self.postMessage({
          type: 'stepped',
          positions: positions,
          count: ropeBodies.length
        });
        break;
        
      case 'finalizeRope':
        makeRopeBodiesStatic(); // This will set isRopeFinalized = true
        
        const finalPositions = ropeBodies.map(body => ({
          x: body.position.x,
          y: body.position.y,
          z: body.position.z
        }));
        
        self.postMessage({ 
          type: 'ropeFinalized',
          positions: finalPositions
        });
        break;
    }
  } catch (err) {
    console.error("Worker error:", err);
    self.postMessage({ type: 'error', error: err.message });
  }
};
