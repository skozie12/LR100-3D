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
let segmentMass = 0.25; // Reduced from 0.5 to 0.25 (half the weight)
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

// Add a variable to track the current max segments based on coiler type
let currentMaxSegments = 400; // Default, will be updated with messages
let lastSegmentAngle = 0;

// Track which segments have been made static
let staticSegments = new Set();

// Add these variables to the top of the file with other state variables
let frameCounter = 0; // Added to fix reference error

// Add reference to coiler config to ensure correct coiler radius is used
let COILER_CONFIG = null;
let activeCoilerType = "100-10"; // Default value

// Refined constants for consistent physics simulation
const FIXED_TIMESTEP = 1 / 60; // Run at consistent 60Hz physics regardless of framerate
const FIXED_SUBSTEPS = 4; // Always use 4 substeps for consistent behavior

// Replace the fixed SEGMENT_ANGLE_INCREMENT with a map for each coiler type
const SEGMENT_ANGLE_INCREMENT_MAP = {
  "100-10": Math.PI / 18, // Increased from π/12 to π/18 (1.5x faster)
  "100-99": Math.PI / 14.76, // Increased from π/9.84 to π/14.76 (1.5x faster)
  "100-200": Math.PI / 10.005 // Increased from π/6.67 to π/10.005 (1.5x faster)
};

// Change the STATIC_SEGMENT_INTERVAL to 1 (make every segment static)
const STATIC_SEGMENT_INTERVAL = 1; // Changed from 4 to 1 - make EVERY segment static

// Simplify and make more aggressive
const ROTATION_BEFORE_STATIC = Math.PI / 4; // Reduced from π/2 to π/4 for faster conversion
const ATTRACTION_STRENGTH = 12.0; // Increased from 5.0 to 12.0 for stronger coiler contact
const CONTACT_DISTANCE_THRESHOLD = 0.08; // Increased from 0.05 for more aggressive contact detection
const IMMEDIATE_STATIC_CONVERSION = true; // New flag to enable immediate static conversion

// Add a debug flag to track static conversions
let debugStaticConversions = true;

const CONTACT_DAMPING = 0.85; // Stronger damping for segments in contact with coiler

// Add this tracking variable at the top with other state variables
let creationIndices = new Map(); // Maps segment body to its creation index

// Make sure simulationTime and totalRotationAngle are properly declared at the top with other state variables
let simulationTime = 0;      // Total elapsed physics time
let totalRotationAngle = 0;  // Total coiler rotation angle - ensure it's defined
let segmentContactTracking = new Map(); // Map segment index to contact data - ensure it's defined
let segmentWrapTimes = [];   // Tracks how long each segment has been near coiler - ensure it's defined

// Restore normal gravity
function initPhysics() {
  world = new World({
    gravity: new Vec3(0, -9.81, 0), // Restore normal gravity
  });

  defaultMaterial = new Material('defaultMaterial');

  world.defaultContactMaterial = new ContactMaterial(defaultMaterial, defaultMaterial, {
    friction: 0.8, // Moderate friction (not too high)
    restitution: 0.01,
    contactEquationStiffness: 5e5,
    contactEquationRelaxation: 5,
    frictionEquationStiffness: 5e5 * 1.5, // Moderate increase
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

// Create rope segments with physics - update for reduced mass
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
      mass: segmentMass, // Using the reduced mass value
      shape: sphereShape,
      position: new Vec3(x, y, z),
      material: defaultMaterial,
      collisionFilterGroup: COLLISION_GROUPS.ROPE | COLLISION_GROUPS.ROPE_SEGMENT,
      collisionFilterMask: COLLISION_GROUPS.COILER | COLLISION_GROUPS.ROPE_SEGMENT
    });

    // Adjust damping for better friction
    segmentBody.angularDamping = 0.97; // Increased damping
    segmentBody.linearDamping = 0.97;

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

    // Reset time tracking variables
    simulationTime = 0; // Reset simulation time explicitly
    totalRotationAngle = 0; // Reset total rotation angle explicitly

    // Clear segment contact tracking
    if (segmentContactTracking) {
      segmentContactTracking.clear();
    } else {
      segmentContactTracking = new Map(); // Initialize if it doesn't exist
    }

    // Clear creation indices tracking
    creationIndices.clear();

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

  // Increment frame counter
  frameCounter++;

  // Update total rotation angle based on rotation speed
  const angleIncrement = rotationSpeed * fixedStep;

  // Make sure totalRotationAngle is initialized before adding to it
  if (totalRotationAngle === undefined) {
    totalRotationAngle = 0;
  }

  totalRotationAngle += angleIncrement;

  // Step the physics world with fixed parameters
  for (let i = 0; i < fixedSubsteps; i++) {
    world.step(fixedStep / fixedSubsteps);
  }

  // Call separate functions for coiler interactions
  applyRopeForces(rotationSpeed);
  processCoilerContacts();
  rotateStaticSegments(angleIncrement);

  // Get the appropriate segment angle increment based on the coiler type
  const segmentAngleIncrement = SEGMENT_ANGLE_INCREMENT_MAP[activeCoilerType] || Math.PI / 12;

  // Check if we need a new segment based on rotation angle
  // This ensures consistent segment spacing regardless of framerate
  if (Math.abs(totalRotationAngle - lastSegmentAngle) >= segmentAngleIncrement) {
    const segmentAdded = tryAddSegment(COILER_CONFIG, activeCoilerType, maxSegments, totalRotationAngle);
    if (segmentAdded) {
      lastSegmentAngle = totalRotationAngle;
      // Log segment creation for debugging with coiler type info
      console.log(`Added segment for ${activeCoilerType} at angle: ${totalRotationAngle.toFixed(3)} radians (${(totalRotationAngle * 180 / Math.PI).toFixed(1)}°), increment: ${segmentAngleIncrement.toFixed(4)}`);
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
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Only affect segments within range
    const maxRange = coilerRadius * 3;
    if (dist > maxRange) continue;

    // Normalized direction toward coiler
    const nx = dx / dist;
    const ny = dy / dist;

    // Tangential direction for rotation
    const tx = -ny;
    const ty = nx;

    // Calculate optimal distance - segments between static segments should stay closer
    let targetOffset = 0.01;

    // Apply gentler forces for segments in between the static ones to form natural curves
    if (i % STATIC_SEGMENT_INTERVAL !== 0) {
      // Calculate how far this segment is from being static
      const distanceFromStatic = i % STATIC_SEGMENT_INTERVAL;
      const midpoint = STATIC_SEGMENT_INTERVAL / 2;

      // Adjust target offset to create a natural curve - middle segments curve outward
      targetOffset = 0.01 + (Math.sin((distanceFromStatic / STATIC_SEGMENT_INTERVAL) * Math.PI) * 0.02);
    }

    // Radial force toward coiler surface with adjusted target distance
    const targetDist = coilerRadius + targetOffset;
    const distError = dist - targetDist;

    // Scale force based on distance error
    let forceMultiplier;
    if (Math.abs(distError) > 0.1) {
      // Further away - stronger force
      forceMultiplier = 14.0;
    } else {
      // Close to target - gentler force
      forceMultiplier = 8.0;
    }

    // Apply radial force
    const radialForce = distError * forceMultiplier;
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

    // Check if this segment is being tracked for contact
    if (segmentContactTracking.has(i)) {
      // Apply stronger damping for segments in contact with coiler
      body.velocity.scale(CONTACT_DAMPING);
      body.angularVelocity.scale(CONTACT_DAMPING);
    } else if (Math.abs(distError) < 0.1) {
      // Apply moderate damping for segments near the coiler
      body.velocity.scale(0.9);
      body.angularVelocity.scale(0.9);
    }
  }
}

// Completely rewrite makeSegmentStatic to create a more precise attachment to the coiler
function makeSegmentStatic(index) {
  const body = ropeBodies[index];
  if (!body) return false;
  if (body.type === BODY_TYPES.STATIC) return false;

  try {
    // Get current position relative to coiler
    const dx = body.position.x - coilerBody.position.x;
    const dy = body.position.y - coilerBody.position.y;
    const angle = Math.atan2(dy, dx);

    // Calculate distance from coiler center
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Slightly adjust position to be exactly at the coiler radius
    // This looks better visually while still being "instant"
    const config = COILER_CONFIG?.[activeCoilerType];
    const coilerRadius = config?.radius || 0.18;

    body.position.x = coilerBody.position.x + coilerRadius * Math.cos(angle);
    body.position.y = coilerBody.position.y + coilerRadius * Math.sin(angle);

    // Make static
    body.type = BODY_TYPES.STATIC;
    body.mass = 0;
    body.updateMassProperties();
    body.velocity.set(0, 0, 0);
    body.angularVelocity.set(0, 0, 0);
    body.force.set(0, 0, 0);
    body.torque.set(0, 0, 0);

    // Store attachment info for rotating with coiler
    body.userData = {
      coilerAttachment: {
        angle: angle,
        radius: coilerRadius, // Use coiler radius for consistent rotation
        z: body.position.z - coilerBody.position.z
      }
    };

    // Track static segments
    staticSegments.add(index);

    // Log conversion
    if (debugStaticConversions) {
      console.log(`Segment ${index} now STATIC. Static count: ${staticSegments.size}/${ropeBodies.length}`);
    }

    return true;
  } catch (err) {
    console.error(`Error making segment ${index} static:`, err);
    return false;
  }
}

// Completely rewrite processCoilerContacts to make segments static immediately on contact
function processCoilerContacts() {
  if (!coilerBody || isRopeFinalized) return;

  const config = COILER_CONFIG?.[activeCoilerType];
  if (!config) return;

  const coilerRadius = config.radius;
  const coilerPos = coilerBody.position;

  // Log static segment count periodically
  if (debugStaticConversions && frameCounter % 60 === 0) {
    console.log(`Current static segments: ${staticSegments.size}/${ropeBodies.length}`);
  }

  // Check all non-static segments for contact with coiler
  for (let i = ropeBodies.length - 1; i >= 0; i--) {
    const body = ropeBodies[i];
    if (!body || body.type === BODY_TYPES.STATIC) continue;

    // Distance to coiler center
    const dx = body.position.x - coilerPos.x;
    const dy = body.position.y - coilerPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Check if close to coiler surface
    const distError = Math.abs(dist - coilerRadius);

    if (distError < CONTACT_DISTANCE_THRESHOLD) {
      // Make segment static IMMEDIATELY on contact
      const success = makeSegmentStatic(i);

      if (success && debugStaticConversions) {
        console.log(`Segment ${i} made STATIC immediately on contact with coiler`);
      }

      // Skip to next segment since this one is now static
      continue;
    }

    // For segments that aren't in contact yet, help them reach the coiler
    // Apply attraction forces to help segments find the coiler
    if (dist < coilerRadius * 3) {
      // Normalized direction toward coiler
      const nx = dx / dist;
      const ny = dy / dist;

      // Apply force to attract segment to coiler
      const targetDist = coilerRadius + 0.01;
      const distError = dist - targetDist;
      const forceValue = distError * ATTRACTION_STRENGTH * 1.2;

      body.applyForce(new Vec3(nx * forceValue, ny * forceValue, 0), new Vec3(0, 0, 0));

      // Apply some damping to stabilize approach
      body.velocity.scale(0.95);
      body.angularVelocity.scale(0.95);
    }
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

    // Update position based on angle - uses actual radius from attachment
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

    // Create new segment with improved physics properties
    const newSegment = new Body({
      mass: 0.25, // Reduced to make it follow forces better
      shape: new Sphere(segmentWidth / 2),
      position: new Vec3(baseSegment.position.x, baseSegment.position.y, baseSegment.position.z),
      material: defaultMaterial,
      collisionFilterGroup: COLLISION_GROUPS.ROPE | COLLISION_GROUPS.ROPE_SEGMENT,
      collisionFilterMask: COLLISION_GROUPS.COILER | COLLISION_GROUPS.ROPE_SEGMENT
    });

    // Assign creation index to track which segments are 4th
    const creationIndex = addedSegments;
    creationIndices.set(newSegment.id, creationIndex);

    // Store creation data in userData
    newSegment.userData = {
      creationAngle: currentAngle,
      creationTime: simulationTime || 0,
      creationIndex: creationIndex
    };

    // Increment global counter
    addedSegments++;

    // Add stronger initial velocity toward coiler
    if (coilerBody) {
      const dx = coilerBody.position.x - baseSegment.position.x;
      const dy = coilerBody.position.y - baseSegment.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Much stronger initial velocity to help segments reach the coiler quickly
      const velocityScale = dist > 0.5 ? 1.2 : 0.8; // Increased from 0.8/0.6 
      newSegment.velocity.set(dx * velocityScale, dy * velocityScale, 0);
    }

    // Better damping for smoother movement
    newSegment.linearDamping = 0.8; // Less damping to allow segments to reach coiler
    newSegment.angularDamping = 0.8;

    world.addBody(newSegment);

    // Remove constraint between segments 10 and 11
    world.constraints.forEach(constraint => {
      if ((constraint.bodyA === baseSegment && constraint.bodyB === nextSegment) ||
        (constraint.bodyA === nextSegment && constraint.bodyB === baseSegment)) {
        world.removeConstraint(constraint);
      }
    });

    // Handle Z-oscillation for realistic rope appearance
    if (addedSegments % 30 === 0) {
      currentDirection *= -1;
    }

    // Update Z position for distribution across coiler width
    if (!currentZ) currentZ = 0;

    const config = coilerConfig[coilerType];
    if (config) {
      const zRange = (config.sideOffset1 - config.sideOffset2) * 0.8;

      // Use angle-based Z distribution for more even coiling
      // This creates a slight spiral pattern as the coiler rotates
      const angleBasedOffset = Math.sin(currentAngle * 0.5) * 0.3;

      currentZ += currentDirection * (zRange / 50) * 0.9;
      currentZ += angleBasedOffset * 0.01; // Small angle-based variation

      const maxZ = zRange * 0.45;
      currentZ = Math.max(Math.min(currentZ, maxZ), -maxZ);
      newSegment.position.z += currentZ * 0.3;
    }

    // Insert segment at position 11
    const tailSegments = ropeBodies.slice(11);
    ropeBodies.length = 11;
    ropeBodies.push(newSegment);
    ropeBodies.push(...tailSegments);

    // Create constraints with improved parameters
    const c1 = new DistanceConstraint(baseSegment, newSegment, segmentDistance, 1e6);
    const c2 = new DistanceConstraint(newSegment, ropeBodies[12], segmentDistance, 1e6);
    c1.collideConnected = false;
    c2.collideConnected = false;
    c1.maxForce = 1e4;
    c2.maxForce = 1e4;
    world.addConstraint(c1);
    world.addConstraint(c2);

    // Log segment creation index for debugging
    console.log(`Created segment with index ${addedSegments}`);

    return true;
  } catch (err) {
    console.error("Error adding segment:", err);
    return false;
  }
}

// More aggressive implementation of makeRopeBodiesStatic
function makeRopeBodiesStatic() {
  isRopeFinalized = true;
  console.log("Finalizing rope - making ALL segments static");

  for (let i = 0; i < ropeBodies.length; i++) {
    const body = ropeBodies[i];
    if (!body) continue;

    // Force all segments to be static at their current positions
    body.type = BODY_TYPES.STATIC;
    body.mass = 0;
    body.updateMassProperties();
    body.velocity.set(0, 0, 0);
    body.angularVelocity.set(0, 0, 0);
    body.force.set(0, 0, 0);
    body.torque.set(0, 0, 0);

    // If near coiler, calculate relationship using actual current position
    if (coilerBody) {
      const dx = body.position.x - coilerBody.position.x;
      const dy = body.position.y - coilerBody.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < coilerBody.shapes[0].radius * 2.0) { // Increased range for attachment
        // Use current actual position for attachment
        const angle = Math.atan2(dy, dx);
        body.userData = {
          coilerAttachment: {
            angle: angle,
            radius: dist, // Use actual distance, not coiler radius
            z: body.position.z - coilerBody.position.z
          }
        };
      }
    }

    // Track static segments
    staticSegments.add(i);
  }

  // Make anchor points static too
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

  console.log(`Finalized rope with ${staticSegments.size} static segments out of ${ropeBodies.length} total`);
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

// Update createCoiler to reset lastSegmentAngle when coiler type changes
function createCoiler(config, coilerType) {
  // Check if coiler type is changing
  const isCoilerTypeChanging = coilerType && activeCoilerType !== coilerType;

  // Store config reference
  COILER_CONFIG = config;
  activeCoilerType = coilerType || activeCoilerType;

  // Reset angle tracking if coiler type changed
  if (isCoilerTypeChanging) {
    totalRotationAngle = 0;
    lastSegmentAngle = 0;
    console.log(`Coiler type changed to ${activeCoilerType}, reset angle tracking`);
  }

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

// Completely redesigned message handler for better synchronization
self.onmessage = function (e) {
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
        totalRotationAngle = 0; // Reset explicitly
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