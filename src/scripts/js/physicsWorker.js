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

// Add this flag at the top with other state variables
let isAnimationStarted = false;

// Add a variable to track the current max segments based on coiler type
let currentMaxSegments = 400; // Default, will be updated with messages

// Add accumulator variables for fixed timestep
const fixedTimeStep = 1 / 60; // Physics at 60Hz for better precision
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
const FIXED_TIMESTEP = 1 / 60; // Run at consistent 60Hz physics regardless of framerate
const FIXED_SUBSTEPS = 4; // Always use 4 substeps for consistent behavior

// Replace the fixed SEGMENT_ANGLE_INCREMENT with a map for each coiler type
const SEGMENT_ANGLE_INCREMENT_MAP = {
  "100-10": Math.PI / 18, // Increased from π/12 to π/18 (1.5x faster)
  "100-99": Math.PI / 14.76, // Increased from π/9.84 to π/14.76 (1.5x faster)
  "100-200": Math.PI / 10.005 // Increased from π/6.67 to π/10.005 (1.5x faster)
};

// Fix the STATIC_SEGMENT_INTERVAL value - change back to 4 from 1
const STATIC_SEGMENT_INTERVAL = 4; // Only make every 4th segment static

// Track simulation state
let simulationTime = 0; // Total elapsed physics time
let totalRotationAngle = 0; // Total coiler rotation angle

// Track simulation state
let segmentContactTracking = new Map(); // Map segment index to contact data

// Improve contact handling constants
const ROTATION_BEFORE_STATIC = Math.PI / 3; // Increased from π/4 to π/3 for smoother curves
const CONTACT_DAMPING = 0.85; // Stronger damping for segments in contact with coiler
const ATTRACTION_STRENGTH = 5.0; // Reduced from 8.0 to 5.0

// Add this tracking variable at the top with other state variables
let creationIndices = new Map(); // Maps segment body to its creation index

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

    // Clear segment contact tracking
    segmentContactTracking.clear();

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

// Enhanced contact tracking and processing
function processCoilerContacts() {
  if (!coilerBody || isRopeFinalized) return;

  const config = COILER_CONFIG?.[activeCoilerType];
  if (!config) return;

  const coilerRadius = config.radius;
  const coilerPos = coilerBody.position;
  const rotationSpeed = coilerBody.angularVelocity.z;

  // First, update all segments that are already being tracked
  for (const [index, contactData] of segmentContactTracking.entries()) {
    const body = ropeBodies[index];

    // Remove tracking if segment no longer exists or is already static
    if (!body || body.type === BODY_TYPES.STATIC) {
      segmentContactTracking.delete(index);
      continue;
    }

    // Update accumulated rotation
    contactData.accumulatedRotation += Math.abs(rotationSpeed * FIXED_TIMESTEP);

    // Get this segment's creation index
    const creationIndex = body.userData?.creationIndex ?? creationIndices.get(body.id);

    // Log the accumulated rotation to track progress
    if (frameCounter % 60 === 0 && creationIndex % STATIC_SEGMENT_INTERVAL === 0) {
      console.log(`Segment ${index} (creation ${creationIndex}) rotation: ${contactData.accumulatedRotation.toFixed(3)}/${ROTATION_BEFORE_STATIC}`);
    }

    // Check if segment should now be made static
    if (contactData.accumulatedRotation >= ROTATION_BEFORE_STATIC && creationIndex !== undefined && creationIndex % STATIC_SEGMENT_INTERVAL === 0) {
      // As we approach static conversion, gradually position the segment more precisely
      const progress = Math.min(1.0, contactData.accumulatedRotation / ROTATION_BEFORE_STATIC);
      if (progress > 0.8) {
        // In the last 20% of transition, align precisely with coiler surface
        const dx = body.position.x - coilerPos.x;
        const dy = body.position.y - coilerPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        // Blend current position with ideal position
        const blendFactor = (progress - 0.8) * 5; // Map 0.8-1.0 to 0-1
        const idealX = coilerPos.x + coilerRadius * Math.cos(angle);
        const idealY = coilerPos.y + coilerRadius * Math.sin(angle);

        body.position.x = body.position.x * (1 - blendFactor) + idealX * blendFactor;
        body.position.y = body.position.y * (1 - blendFactor) + idealY * blendFactor;

        // Apply increased damping to stabilize
        body.velocity.scale(0.7);
        body.angularVelocity.scale(0.7);
      }

      // If fully ready, make it static
      if (progress >= 1.0) {
        const success = makeSegmentStatic(index);
        console.log(`Attempt to make segment ${index} static: ${success}`);
        segmentContactTracking.delete(index);
      }
    } else {
      // For non-static segments, keep them following the coiler well
      const dx = body.position.x - coilerPos.x;
      const dy = body.position.y - coilerPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Keep segment close to coiler surface
      const nx = dx / dist;
      const ny = dy / dist;
      const targetDist = coilerRadius + 0.01;
      const distError = dist - targetDist;
      const forceValue = distError * ATTRACTION_STRENGTH;

      body.applyForce(new Vec3(nx * forceValue, ny * forceValue, 0), new Vec3(0, 0, 0));

      // Apply tangential force in direction of rotation
      const tx = -ny;
      const ty = nx;
      const tangentialForce = Math.abs(rotationSpeed) * 4.0;
      const rotationDirection = Math.sign(rotationSpeed);

      body.applyForce(
        new Vec3(tx * tangentialForce * rotationDirection, ty * tangentialForce * rotationDirection, 0),
        new Vec3(0, 0, 0)
      );

      // Progressive damping
      const increasedDamping = 0.975; // Higher damping coefficient for more friction
      body.velocity.scale(increasedDamping);
      body.angularVelocity.scale(increasedDamping);
    }
  }

  // Now check for new segments that came into contact with the coiler
  for (let i = ropeBodies.length - 1; i >= 0; i--) {
    const body = ropeBodies[i];
    if (!body || body.type === BODY_TYPES.STATIC || segmentContactTracking.has(i)) continue;

    // Distance to coiler center
    const dx = body.position.x - coilerPos.x;
    const dy = body.position.y - coilerPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Check if close to coiler surface
    const distError = Math.abs(dist - coilerRadius);
    if (distError < 0.04) { // Slightly increased threshold for better detection
      // Start tracking this segment with 0 accumulated rotation
      segmentContactTracking.set(i, {
        contactStartTime: simulationTime,
        accumulatedRotation: 0
      });

      // Apply initial damping to help it follow the coiler better
      body.velocity.scale(0.8);

      // Also check if we have neighboring segments to this one
      // This helps create smoother groups of segments following the coiler
      for (let j = Math.max(0, i - 3); j < Math.min(ropeBodies.length, i + 4); j++) {
        if (j !== i && !segmentContactTracking.has(j) && ropeBodies[j]?.type !== BODY_TYPES.STATIC) {
          // Calculate distance from this segment to coiler
          const jdx = ropeBodies[j].position.x - coilerPos.x;
          const jdy = ropeBodies[j].position.y - coilerPos.y;
          const jdist = Math.sqrt(jdx * jdx + jdy * jdy);
          const jdistError = Math.abs(jdist - coilerRadius);

          // If nearby segment is also close to coiler, start tracking it too
          if (jdistError < 0.08) {
            segmentContactTracking.set(j, {
              contactStartTime: simulationTime,
              accumulatedRotation: 0
            });
          }
        }
      }
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

    // Create new segment with reduced mass
    const newSegment = new Body({
      mass: 0.35, // Slightly higher than before but still lighter than original
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
      creationTime: simulationTime,
      creationIndex: creationIndex
    };

    // Increment global counter so we know total segments created
    addedSegments++;

    // Add initial velocity toward coiler with appropriate force
    if (coilerBody) {
      const dx = coilerBody.position.x - baseSegment.position.x;
      const dy = coilerBody.position.y - baseSegment.position.y;

      // Adjust velocity based on distance to coiler
      const dist = Math.sqrt(dx * dx + dy * dy);
      const velocityScale = dist > 0.5 ? 0.6 : 0.4; // More gentle if closer

      newSegment.velocity.set(dx * velocityScale, dy * velocityScale, 0);
    }

    // Adjust damping for better friction and dynamics
    newSegment.linearDamping = 0.85; // Increased damping for better friction
    newSegment.angularDamping = 0.85;

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

// Fix the makeSegmentStatic function to properly check for staticness
function makeSegmentStatic(index) {
  const body = ropeBodies[index];
  if (!body) return false;

  // Check if body is already static
  if (body.type === BODY_TYPES.STATIC) return false;

  // Get the segment's creation index
  const creationIndex = body.userData?.creationIndex ?? creationIndices.get(body.id);

  // Fix this condition - only make static if it's a 4th segment (creationIndex % STATIC_SEGMENT_INTERVAL === 0)
  if (creationIndex === undefined || creationIndex % STATIC_SEGMENT_INTERVAL !== 0) return false;

  try {
    body.type = BODY_TYPES.STATIC;
    body.mass = 0;
    body.updateMassProperties();
    body.velocity.set(0, 0, 0);
    body.angularVelocity.set(0, 0, 0);
    body.force.set(0, 0, 0);
    body.torque.set(0, 0, 0);

    // Save the current position relative to the coiler for rotation tracking
    const dx = body.position.x - coilerBody.position.x;
    const dy = body.position.y - coilerBody.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    // Store attachment info for rotating with coiler
    body.userData.coilerAttachment = {
      angle: angle,
      radius: dist,
      z: body.position.z - coilerBody.position.z
    };

    // Track static segments
    staticSegments.add(index);
    console.log(`Made segment ${index} (creation index ${creationIndex}) static`);
    return true;
  } catch (err) {
    console.error(`Error making segment ${index} static:`, err);
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

// Update makeRopeBodiesStatic to respect creation indices
function makeRopeBodiesStatic() {
  isRopeFinalized = true;

  // First set proper damping for all segments
  for (let i = 0; i < ropeBodies.length; i++) {
    const body = ropeBodies[i];
    if (!body) continue;

    // Get creation index
    const creationIndex = body.userData?.creationIndex ?? creationIndices.get(body.id);

    // Make non-4th segments highly damped but still dynamic
    if (creationIndex === undefined || creationIndex % STATIC_SEGMENT_INTERVAL !== 0) {
      body.linearDamping = 0.98;
      body.angularDamping = 0.98;
      body.velocity.scale(0.2);
      body.angularVelocity.scale(0.2);

      // Create gentle curves between static segments
      if (creationIndex > 0 && ropeBodies[creationIndex - 1]) {
        const staticBody = ropeBodies[Math.floor(creationIndex / STATIC_SEGMENT_INTERVAL) * STATIC_SEGMENT_INTERVAL];
        if (staticBody && staticBody.userData?.coilerAttachment) {
          const attachment = staticBody.userData.coilerAttachment;
          const curveAmount = (Math.sin((creationIndex % STATIC_SEGMENT_INTERVAL / STATIC_SEGMENT_INTERVAL) * Math.PI) * 0.015);

          body.position.x += body.position.x > coilerBody.position.x ? curveAmount : -curveAmount;
          body.position.y += body.position.y > coilerBody.position.y ? curveAmount : -curveAmount;
        }
      }
    } else {
      // Make every 4th segment fully static
      body.type = BODY_TYPES.STATIC;
      body.mass = 0;
      body.updateMassProperties();
      body.velocity.set(0, 0, 0);
      body.angularVelocity.set(0, 0, 0);
      body.force.set(0, 0, 0);
      body.torque.set(0, 0, 0);

      // Track static segments
      staticSegments.add(i);
    }
  }

  // Make anchor points static
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