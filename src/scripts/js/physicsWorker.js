import { World, Body, Cylinder, Material, ContactMaterial, Sphere, Vec3, DistanceConstraint, BODY_TYPES, Quaternion as CQuaternion } from 'cannon-es';

let world;
let defaultMaterial;
const COLLISION_GROUPS = {
  COILER: 1,
  ROPE: 2,
  ROPE_SEGMENT: 4,
  ANCHOR: 8
};

let accumulator = 0;
let physicsTime = 0;
let coilerAngle = 0;

const FIXED_TIMESTEP = 1 / 60;
const FIXED_SUBSTEPS = 8;

const STATIC_CONVERSION_DELAY_FRAMES = 60;

const segmentCount = 56;
const segmentWidth = 0.012;
const segmentMass = 0.15;
const segmentDistance = 0.006;
let ropeBodies = [];
let anchorEnd, anchorStart, anchor;
let coilerBody, coilerBodySide1, coilerBodySide2;
const midRope = 13;

let addedSegments = 0;
let currentDirection = 1;
let currentZ = 0;

let isRopeFinalized = false;

let currentMaxSegments = 400;
let lastSegmentAngle = 0;

let staticSegments = new Set();

const INITIAL_STATIC_SEGMENTS = new Set();

let frameCounter = 0;

let COILER_CONFIG = null;
let activeCoilerType = "100-10";

const SEGMENT_ANGLE_INCREMENT_MAP = {
  "100-10": Math.PI / 18.9,
  "100-99": Math.PI / 15.498,
  "100-200": Math.PI / 10.505
};

const STATIC_SEGMENT_INTERVAL = 1;

const ROTATION_BEFORE_STATIC = Math.PI / 4;
const ATTRACTION_STRENGTH = 40.0;
const CONTACT_DISTANCE_THRESHOLD = 0.04;
const IMMEDIATE_STATIC_CONVERSION = true;
const CONTACT_FRAMES_BEFORE_STATIC = 60;

let debugStaticConversions = true;

const CONTACT_DAMPING = 0.85;

let creationIndices = new Map();

let simulationTime = 0;
let totalRotationAngle = 0;
let segmentContactTracking = new Map();
let segmentWrapTimes = [];

let staticTrackingArray = [];

let maxConstraintForce = 2e2;
let constraintStiffness = 5e4;
const ROPE_STRETCH_FACTOR = 0.9;

const INITIAL_ROPE_TOP_OFFSET = 0.05;

const STARTUP_DELAY_FRAMES = 60;
let currentDelayFrames = 0;
let delayActive = false;

const MAX_VELOCITY = 5.0;
const MAX_ANGULAR_VELOCITY = 10.0;

let previousRotationSpeed = 0;

let initializing = true;

let isFirstLoad = true;

function initPhysics() {
  world = new World({
    gravity: new Vec3(0, -9.81, 0),
  });

  defaultMaterial = new Material('defaultMaterial');

  world.defaultContactMaterial = new ContactMaterial(defaultMaterial, defaultMaterial, {
    friction: 0.8,
    restitution: 0.01,
    contactEquationStiffness: 5e5,
    contactEquationRelaxation: 5,
    frictionEquationStiffness: 5e5 * 1.5,
    frictionEquationRelaxation: 5
  });
  world.defaultMaterial = defaultMaterial;

  anchorEnd = new Body({ mass: 0 });
  anchorEnd.position.set(0.57, 0.225 + 0.2, 0.025);
  anchorEnd.type = BODY_TYPES.KINEMATIC;
  world.addBody(anchorEnd);

  anchorStart = new Body({ mass: 0 });
  anchorStart.position.set(-0.6, 0.27, -0.058);
  anchorStart.type = BODY_TYPES.STATIC;
  world.addBody(anchorStart);

  anchor = new Body({ mass: 0 });
  anchor.position.set(0, 0.3, 0.03);
  anchor.type = BODY_TYPES.STATIC;
  world.addBody(anchor);

  staticSegments = new Set();
}

function positionEndAnchorAtCoilerTop() {
  if (!coilerBody || !anchorEnd) return;

  const config = COILER_CONFIG?.[activeCoilerType];
  if (!config) return;

  const coilerRadius = config.radius;
  anchorEnd.position.x = coilerBody.position.x;
  anchorEnd.position.y = coilerBody.position.y + coilerRadius + INITIAL_ROPE_TOP_OFFSET;
  anchorEnd.position.z = coilerBody.position.z;

  console.log(`Positioned end anchor at top of coiler: (${anchorEnd.position.x.toFixed(3)}, ${anchorEnd.position.y.toFixed(3)}, ${anchorEnd.position.z.toFixed(3)})`);
}

function createRopeSegments() {
  resetRope();

  positionEndAnchorAtCoilerTop();

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

      const heightBoost = Math.sin(segT * Math.PI) * 0.15;
      y = anchor.position.y + segT * (anchorEnd.position.y - anchor.position.y) + heightBoost;

      z = anchor.position.z + segT * (anchorEnd.position.z - anchorEnd.position.z);
    }

    const segmentBody = new Body({
      mass: segmentMass,
      shape: sphereShape,
      position: new Vec3(x, y, z),
      material: defaultMaterial,
      collisionFilterGroup: COLLISION_GROUPS.ROPE | COLLISION_GROUPS.ROPE_SEGMENT,
      collisionFilterMask: COLLISION_GROUPS.COILER | COLLISION_GROUPS.ROPE_SEGMENT
    });

    segmentBody.type = BODY_TYPES.DYNAMIC;

    segmentBody.angularDamping = 0.99;
    segmentBody.linearDamping = 0.99;

    world.addBody(segmentBody);
    ropeBodies.push(segmentBody);
  }

  for (let i = 0; i < segmentCount - 1; i++) {
    const constraint = new DistanceConstraint(
      ropeBodies[i],
      ropeBodies[i + 1],
      segmentDistance * ROPE_STRETCH_FACTOR,
      constraintStiffness
    );
    constraint.collideConnected = false;
    constraint.maxForce = maxConstraintForce;
    world.addConstraint(constraint);
  }

  const anchorConstraint = new DistanceConstraint(anchor, ropeBodies[midRope], 0);
  world.addConstraint(anchorConstraint);

  const anchorStartConstraint = new DistanceConstraint(anchorStart, ropeBodies[0], 0);
  world.addConstraint(anchorStartConstraint);

  const anchorEndConstraint = new DistanceConstraint(anchorEnd, ropeBodies[segmentCount - 1], 0);
  world.addConstraint(anchorEndConstraint);
}

function limitVelocities() {
  for (let i = 0; i < ropeBodies.length; i++) {
    const body = ropeBodies[i];
    if (!body || body.type === BODY_TYPES.STATIC) continue;

    const vMag = body.velocity.length();
    if (vMag > MAX_VELOCITY) {
      body.velocity.scale(MAX_VELOCITY / vMag);
    }

    const avMag = body.angularVelocity.length();
    if (avMag > MAX_ANGULAR_VELOCITY) {
      body.angularVelocity.scale(MAX_ANGULAR_VELOCITY / avMag);
    }
  }
}

function resetRope(resetAngle = false) {
  try {
    isRopeFinalized = false;

    frameCounter = 0;

    simulationTime = 0;
    totalRotationAngle = 0;

    if (segmentContactTracking) {
      segmentContactTracking.clear();
    } else {
      segmentContactTracking = new Map();
    }

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

    addedSegments = 0;
    currentDirection = 1;
    currentZ = 0;

    accumulator = 0;
    physicsTime = 0;

    if (resetAngle) {
      coilerAngle = 0;
      lastSegmentAngle = 0;
    }

    segmentWrapTimes = [];

    staticSegments.clear();

    staticTrackingArray = [];

    setStartupDelay();
  } catch (err) {
    console.error("Error in resetRope:", err);
  }
}

function stepPhysics(timeStep, subSteps, maxSegments, rotationSpeed, currentRotationAngle) {
  const fixedStep = FIXED_TIMESTEP;
  const fixedSubsteps = FIXED_SUBSTEPS;

  simulationTime += fixedStep;

  frameCounter++;

  let effectiveRotationSpeed = rotationSpeed;
  if (delayActive) {
    currentDelayFrames--;
    if (currentDelayFrames <= 0) {
      delayActive = false;
      console.log("Delay complete - starting coiler rotation");
    } else {
      effectiveRotationSpeed = 0;
    }
  }

  const angleIncrement = effectiveRotationSpeed * fixedStep;

  if (totalRotationAngle === undefined) {
    totalRotationAngle = 0;
  }

  totalRotationAngle += angleIncrement;

  for (let i = 0; i < fixedSubsteps; i++) {
    world.step(fixedStep / fixedSubsteps);

    limitVelocities();
  }

  applyRopeForces(effectiveRotationSpeed);
  processCoilerContacts();
  rotateStaticSegments(angleIncrement);

  const segmentAngleIncrement = SEGMENT_ANGLE_INCREMENT_MAP[activeCoilerType] || Math.PI / 12;

  if (Math.abs(totalRotationAngle - lastSegmentAngle) >= segmentAngleIncrement) {
    const segmentAdded = tryAddSegment(COILER_CONFIG, activeCoilerType, maxSegments, totalRotationAngle);
    if (segmentAdded) {
      lastSegmentAngle = totalRotationAngle;
      console.log(`Added segment for ${activeCoilerType} at angle: ${totalRotationAngle.toFixed(3)} radians (${(totalRotationAngle * 180 / Math.PI).toFixed(1)}°), increment: ${segmentAngleIncrement.toFixed(4)}`);
    }
  }

  return {
    positions: getValidPositions(),
    segmentCount: ropeBodies.length,
    staticCount: staticSegments.size,
    simulationTime: simulationTime,
    rotationAngle: totalRotationAngle,
    delayActive: delayActive,
    delayRemaining: currentDelayFrames
  };
}

function setStartupDelay(frames = STARTUP_DELAY_FRAMES) {
  currentDelayFrames = frames;
  delayActive = true;
  console.log(`Setting startup delay: ${frames} frames`);
}

function applyRopeForces(rotationSpeed) {
  if (!coilerBody || isRopeFinalized) return;

  const config = COILER_CONFIG?.[activeCoilerType];
  if (!config) return;

  const coilerRadius = config.radius;
  const coilerPos = coilerBody.position;
  const rotationDirection = Math.sign(rotationSpeed);

  for (let i = 0; i < ropeBodies.length; i++) {
    const body = ropeBodies[i];
    if (!body || body.type === BODY_TYPES.STATIC) continue;

    const dx = coilerPos.x - body.position.x;
    const dy = coilerPos.y - body.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const maxRange = coilerRadius * 4;
    if (dist > maxRange) continue;

    const nx = dx / dist;
    const ny = dy / dist;

    const tx = -ny;
    const ty = nx;

    const targetDist = coilerRadius + 0.01;
    const distError = dist - targetDist;
    const distFactor = Math.min(1.0, Math.max(0.0, 1.0 - Math.abs(distError) / maxRange));
    const forceStrength = 20.0;

    const radialForce = distError * forceStrength * distFactor;
    body.applyForce(
      new Vec3(nx * radialForce, ny * radialForce, 0),
      new Vec3(0, 0, 0)
    );

    const tangentialForce = Math.abs(rotationSpeed) * 10.0 * distFactor;
    body.applyForce(
      new Vec3(tx * tangentialForce * rotationDirection, ty * tangentialForce * rotationDirection, 0),
      new Vec3(0, 0, 0)
    );

    if (Math.abs(distError) < 0.1) {
      body.velocity.scale(0.75);
      body.angularVelocity.scale(0.75);
    }
  }
}

function processCoilerContacts() {
  if (!coilerBody || isRopeFinalized) return;

  if (frameCounter < STATIC_CONVERSION_DELAY_FRAMES) {
    if (frameCounter % 10 === 0) {
      console.log(`Waiting ${STATIC_CONVERSION_DELAY_FRAMES - frameCounter} more frames before allowing static conversion`);
    }

    applyAttractionForcesOnly();
    return;
  }

  const config = COILER_CONFIG?.[activeCoilerType];
  if (!config) return;

  const coilerRadius = config.radius;
  const coilerPos = coilerBody.position;

  if (debugStaticConversions && frameCounter % 60 === 0) {
    console.log(`Current static segments: ${staticSegments.size}/${ropeBodies.length}`);
  }

  for (let i = 0; i < ropeBodies.length; i++) {
    const body = ropeBodies[i];

    if (!body || body.type === BODY_TYPES.STATIC || i === 0 || i === midRope) continue;

    const dx = body.position.x - coilerPos.x;
    const dy = body.position.y - coilerPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const distToSurface = Math.abs(dist - coilerRadius);

    if (distToSurface < CONTACT_DISTANCE_THRESHOLD) {
      if (!staticTrackingArray[i]) {
        staticTrackingArray[i] = { pos: { x: body.position.x, y: body.position.y, z: body.position.z } };

        console.log(`Segment ${i} near coiler, dist: ${distToSurface.toFixed(4)}`);
      }

      const nx = dx / dist;
      const ny = dy / dist;
      const targetDist = coilerRadius;
      const distError = dist - targetDist;

      let attractionMultiplier = 2.0;
      if (distToSurface > CONTACT_DISTANCE_THRESHOLD * 0.5) {
        attractionMultiplier = 4.0;
      }

      const attractionForce = distError * ATTRACTION_STRENGTH * attractionMultiplier * 0.8;
      body.applyForce(new Vec3(nx * attractionForce, ny * attractionForce, 0), new Vec3(0, 0, 0));

      body.velocity.scale(0.7);
      body.angularVelocity.scale(0.7);

      if (distToSurface < CONTACT_DISTANCE_THRESHOLD * 0.25) {
        makeSegmentStatic(i);
      }
    }
  }
}

function applyAttractionForcesOnly() {
  if (!coilerBody) return;

  const config = COILER_CONFIG?.[activeCoilerType];
  if (!config) return;

  const coilerRadius = config.radius;
  const coilerPos = coilerBody.position;

  for (let i = 0; i < ropeBodies.length; i++) {
    const body = ropeBodies[i];

    if (!body || body.type === BODY_TYPES.STATIC || i === 0 || i === midRope) continue;

    const dx = body.position.x - coilerPos.x;
    const dy = body.position.y - coilerPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const distToSurface = Math.abs(dist - coilerRadius);

    if (distToSurface < CONTACT_DISTANCE_THRESHOLD * 1.5) {
      const nx = dx / dist;
      const ny = dy / dist;
      const targetDist = coilerRadius;
      const distError = dist - targetDist;

      const attractionForce = distError * ATTRACTION_STRENGTH * 0.7;
      body.applyForce(new Vec3(nx * attractionForce, ny * attractionForce, 0), new Vec3(0, 0, 0));

      body.velocity.scale(0.85);
      body.angularVelocity.scale(0.85);
    }
  }
}

function makeSegmentStatic(index) {
  const body = ropeBodies[index];
  if (!body || body.type === BODY_TYPES.STATIC) return false;

  try {
    const dx = body.position.x - coilerBody.position.x;
    const dy = body.position.y - coilerBody.position.y;
    const angle = Math.atan2(dy, dx);

    const config = COILER_CONFIG?.[activeCoilerType];
    const coilerRadius = config?.radius || 0.18;

    body.position.x = coilerBody.position.x + coilerRadius * Math.cos(angle);
    body.position.y = coilerBody.position.y + coilerRadius * Math.sin(angle);

    body.type = BODY_TYPES.STATIC;
    body.mass = 0;
    body.updateMassProperties();
    body.velocity.set(0, 0, 0);
    body.angularVelocity.set(0, 0, 0);
    body.force.set(0, 0, 0);
    body.torque.set(0, 0, 0);

    body.userData = {
      coilerAttachment: {
        angle: angle,
        radius: coilerRadius,
        z: body.position.z - coilerBody.position.z
      }
    };

    staticSegments.add(index);

    if (debugStaticConversions) {
      console.log(`Segment ${index} static at (${body.position.x.toFixed(3)}, ${body.position.y.toFixed(3)}), exactly on coiler surface`);
    }

    return true;
  } catch (err) {
    console.error(`Error making segment ${index} static:`, err);
    return false;
  }
}

function rotateStaticSegments(angleIncrement) {
  if (!coilerBody || angleIncrement === 0) return;

  const adjustedIncrement = angleIncrement * 0.95;

  for (let i = 0; i < ropeBodies.length; i++) {
    const body = ropeBodies[i];
    if (!body || body.type !== BODY_TYPES.STATIC || !body.userData?.coilerAttachment) continue;

    const attachment = body.userData.coilerAttachment;

    attachment.angle += adjustedIncrement;

    body.position.x = coilerBody.position.x + attachment.radius * Math.cos(attachment.angle);
    body.position.y = coilerBody.position.y + attachment.radius * Math.sin(attachment.angle);
    body.position.z = coilerBody.position.z + attachment.z;
  }
}

function tryAddSegment(coilerConfig, coilerType, maxSegments, currentAngle) {
  const segmentLimit = maxSegments || (coilerType === "100-200" ? 300 : 400);
  if (ropeBodies.length >= segmentLimit) return false;
  if (ropeBodies.length < 22) return false;

  try {
    const baseSegment = ropeBodies[20];
    const nextSegment = ropeBodies[21];

    if (!baseSegment || !nextSegment) return false;

    const newSegment = new Body({
      mass: segmentMass,
      shape: new Sphere(segmentWidth / 2),
      position: new Vec3(baseSegment.position.x, baseSegment.position.y, baseSegment.position.z),
      material: defaultMaterial,
      collisionFilterGroup: COLLISION_GROUPS.ROPE | COLLISION_GROUPS.ROPE_SEGMENT,
      collisionFilterMask: COLLISION_GROUPS.COILER | COLLISION_GROUPS.ROPE_SEGMENT
    });

    newSegment.type = BODY_TYPES.DYNAMIC;

    const creationIndex = addedSegments;
    creationIndices.set(newSegment.id, creationIndex);

    newSegment.userData = {
      creationAngle: currentAngle,
      creationTime: simulationTime || 0,
      creationIndex: creationIndex
    };

    addedSegments++;

    if (coilerBody) {
      const dx = coilerBody.position.x - baseSegment.position.x;
      const dy = coilerBody.position.y - baseSegment.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const velocityScale = dist > 0.5 ? 1.2 : 0.8;
      newSegment.velocity.set(dx * velocityScale, dy * velocityScale, 0);
    }

    newSegment.linearDamping = 0.95;
    newSegment.angularDamping = 0.95;

    world.addBody(newSegment);

    world.constraints.forEach(constraint => {
      if ((constraint.bodyA === baseSegment && constraint.bodyB === nextSegment) ||
        (constraint.bodyA === nextSegment && constraint.bodyB === baseSegment)) {
        world.removeConstraint(constraint);
      }
    });

    if (addedSegments % 30 === 0) {
      currentDirection *= -1;
    }

    if (!currentZ) currentZ = 0;

    const config = coilerConfig[coilerType];
    if (config) {
      const zRange = (config.sideOffset1 - config.sideOffset2) * 0.8;

      const angleBasedOffset = Math.sin(currentAngle * 0.5) * 0.3;

      currentZ += currentDirection * (zRange / 50) * 0.9;
      currentZ += angleBasedOffset * 0.01;

      const maxZ = zRange * 0.45;
      currentZ = Math.max(Math.min(currentZ, maxZ), -maxZ);
      newSegment.position.z += currentZ * 0.3;
    }

    const tailSegments = ropeBodies.slice(21);
    ropeBodies.length = 21;
    ropeBodies.push(newSegment);
    ropeBodies.push(...tailSegments);

    const c1 = new DistanceConstraint(baseSegment, newSegment, segmentDistance * ROPE_STRETCH_FACTOR, constraintStiffness);
    const c2 = new DistanceConstraint(newSegment, ropeBodies[22], segmentDistance * ROPE_STRETCH_FACTOR, constraintStiffness);
    c1.collideConnected = false;
    c2.collideConnected = false;
    c1.maxForce = maxConstraintForce;
    c2.maxForce = maxConstraintForce;
    world.addConstraint(c1);
    world.addConstraint(c2);

    console.log(`Created segment with index ${addedSegments}`);

    return true;
  } catch (err) {
    console.error("Error adding segment:", err);
    return false;
  }
}

function makeRopeBodiesStatic() {
  isRopeFinalized = true;
  console.log("Finalizing rope - making ALL segments static");

  for (let i = 0; i < ropeBodies.length; i++) {
    const body = ropeBodies[i];
    if (!body) continue;

    body.type = BODY_TYPES.STATIC;
    body.mass = 0;
    body.updateMassProperties();
    body.velocity.set(0, 0, 0);
    body.angularVelocity.set(0, 0, 0);
    body.force.set(0, 0, 0);
    body.torque.set(0, 0, 0);

    if (coilerBody) {
      const dx = body.position.x - coilerBody.position.x;
      const dy = body.position.y - coilerBody.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < coilerBody.shapes[0].radius * 2.0) {
        const angle = Math.atan2(dy, dx);
        body.userData = {
          coilerAttachment: {
            angle: angle,
            radius: dist,
            z: body.position.z - coilerBody.position.z
          }
        };
      }
    }

    staticSegments.add(i);
  }

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

function updateAnchorPosition(x, y, z) {
  if (!anchorEnd) return;

  anchorEnd.position.set(x, y, z);
  anchorEnd.velocity.set(0, 0, 0);
  anchorEnd.angularVelocity.set(0, 0, 0);

  const count = Math.min(10, ropeBodies.length);
  for (let i = ropeBodies.length - count; i < ropeBodies.length; i++) {
    if (ropeBodies[i]) {
      ropeBodies[i].velocity.scale(0.9);
      ropeBodies[i].angularVelocity.scale(0.9);
    }
  }
}

function setCoilerRotation(rotationSpeed) {
  if (!coilerBody) return;

  coilerBody.angularVelocity.set(0, 0, rotationSpeed);

  if (coilerBodySide1) {
    coilerBodySide1.angularVelocity.set(0, 0, rotationSpeed);
  }

  if (coilerBodySide2) {
    coilerBodySide2.angularVelocity.set(0, 0, rotationSpeed);
  }
}

function createCoiler(config, coilerType) {
  const isCoilerTypeChanging = coilerType && activeCoilerType !== coilerType;

  COILER_CONFIG = config;
  activeCoilerType = coilerType || activeCoilerType;

  if (isCoilerTypeChanging) {
    totalRotationAngle = 0;
    lastSegmentAngle = 0;
    console.log(`Coiler type changed to ${activeCoilerType}, reset angle tracking`);
    setStartupDelay();
  }

  const coilerConfig = config[activeCoilerType];
  if (!coilerConfig) {
    console.error("Invalid coiler type:", activeCoilerType);
    return null;
  }

  const coilerRadius = coilerConfig.radius;
  const coilerHeight = coilerConfig.height;

  if (coilerBody) {
    world.removeBody(coilerBody);
  }

  coilerBody = new Body({
    mass: 0,
    type: BODY_TYPES.KINEMATIC,
    material: defaultMaterial,
    collisionFilterGroup: COLLISION_GROUPS.COILER,
    collisionFilterMask: COLLISION_GROUPS.ROPE
  });

  const cylinderShape = new Cylinder(coilerRadius, coilerRadius, coilerHeight, 16);

  coilerBody.addShape(
    cylinderShape,
    new Vec3(0, 0, 0),
    new CQuaternion().setFromAxisAngle(new Vec3(1, 0, 0), Math.PI / 2)
  );

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

  positionEndAnchorAtCoilerTop();

  return coilerBody;
}

function createCoilerSides(config, coilerType) {
  if (coilerBodySide1) {
    world.removeBody(coilerBodySide1);
    coilerBodySide1 = null;
  }

  if (coilerBodySide2) {
    world.removeBody(coilerBodySide2);
    coilerBodySide2 = null;
  }

  const coilerConfig = config[activeCoilerType];
  if (!coilerConfig) return null;

  const coilerRadius = coilerConfig.radius;
  const coilerHeight = coilerConfig.height;

  const sideRadiusMultiplier =
    activeCoilerType === "100-10" ? 2.0 :
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

self.onmessage = function (e) {
  try {
    const { type, data } = e.data;

    switch (type) {
      case 'init':
        initPhysics();
        initializing = true;
        isFirstLoad = true;
        isRopeFinalized = false;
        setStartupDelay();
        self.postMessage({
          type: 'initialized',
          delayActive: delayActive,
          delayRemaining: currentDelayFrames
        });
        
        setTimeout(() => {
          initializing = false;
          console.log("Worker initialization complete - rope is ready for normal operation");
        }, 500);
        break;

      case 'resetRope':
        simulationTime = 0;
        totalRotationAngle = 0;
        lastSegmentAngle = 0;
        isRopeFinalized = false;
        isFirstLoad = true;

        resetRope(data?.resetAngle);

        self.postMessage({
          type: 'ropeReset'
        });
        break;

      case 'createCoiler':
        COILER_CONFIG = data.coilerConfig;
        const isCoilerTypeChanging = activeCoilerType !== data.activeCoilerType;
        activeCoilerType = data.activeCoilerType;

        currentMaxSegments = activeCoilerType === "100-200" ? 300 : 400;

        if (isCoilerTypeChanging) {
          console.log(`Coiler type changed from ${activeCoilerType} to ${data.activeCoilerType}, resetting rope`);
          resetRope(true);
          isRopeFinalized = false;
        }

        createCoiler(data.coilerConfig, data.activeCoilerType);
        createCoilerSides(data.coilerConfig, data.activeCoilerType);

        positionEndAnchorAtCoilerTop();

        self.postMessage({
          type: 'coilerCreated',
          coilerType: activeCoilerType,
          maxSegments: currentMaxSegments
        });
        break;

      case 'createRope':
        createRopeSegments();
        isRopeFinalized = false;
        
        setStartupDelay(); 
        
        for (let i = 0; i < ropeBodies.length; i++) {
          if (ropeBodies[i]) {
            ropeBodies[i].type = BODY_TYPES.DYNAMIC;
            if (ropeBodies[i].mass === 0) {
              ropeBodies[i].mass = segmentMass;
              ropeBodies[i].updateMassProperties();
            }
          }
        }
        
        staticSegments.clear();
        
        const initialPositions = getValidPositions();
        
        console.log("Rope created with " + ropeBodies.length + " dynamic segments");

        self.postMessage({
          type: 'ropeCreated',
          positions: initialPositions,
          delayActive: delayActive,
          delayRemaining: currentDelayFrames
        });
        
        isFirstLoad = false;
        break;

      case 'step':
        if (!initializing && !isFirstLoad && data.rotationSpeed === 0 && previousRotationSpeed !== 0 && !isRopeFinalized) {
          console.log("Detected coiler stopped rotating - immediately finalizing rope");
          makeRopeBodiesStatic();
          
          self.postMessage({
            type: 'ropeFinalized',
            positions: getValidPositions()
          });
        }
        
        previousRotationSpeed = data.rotationSpeed;
        
        if (isRopeFinalized) {
          if (data.rotationSpeed !== 0) {
            rotateStaticSegments(data.rotationSpeed * FIXED_TIMESTEP);
          }

          self.postMessage({
            type: 'stepped',
            positions: getValidPositions(),
            count: ropeBodies.length,
            staticCount: staticSegments.size,
            simulationTime: simulationTime,
            delayActive: false,
            ropeFinalized: true
          });
          break;
        }

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
          rotationAngle: stepResult.rotationAngle,
          delayActive: stepResult.delayActive,
          delayRemaining: stepResult.delayRemaining,
          ropeFinalized: isRopeFinalized
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

      case 'setDelay':
        setStartupDelay(data.frames || STARTUP_DELAY_FRAMES);
        self.postMessage({
          type: 'delaySet',
          delayActive: delayActive,
          delayRemaining: currentDelayFrames
        });
        break;

      case 'addSegment':
        const segmentAdded = tryAddSegment(
          data.coilerConfig || COILER_CONFIG,
          data.activeCoilerType || activeCoilerType,
          data.maxSegments || currentMaxSegments,
          data.rotationAngle || totalRotationAngle
        );
        
        if (segmentAdded) {
          self.postMessage({
            type: 'segmentAdded',
            positions: getValidPositions(),
            count: ropeBodies.length
          });
        }
        break;

      default:
        console.warn(`Unknown message type: ${type}`);
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