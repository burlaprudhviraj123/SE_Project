/**
 * Physics engine for ResolveDesk micro-interactions.
 * 
 * Includes:
 * 1. Velocity-preserving spring physics solver.
 * 2. Non-linear exponential rubber-band boundary resistance math.
 */

/**
 * Calculates rubber-band resistance for dragging past boundaries.
 * 
 * Formula: offset = limit + sign(overshoot) * (abs(overshoot) ^ exponent)
 * where exponent defaults to 0.55 to simulate physical material tension.
 *
 * @param {number} current Current dragged offset
 * @param {number} min Minimum allowed boundary
 * @param {number} max Maximum allowed boundary
 * @param {number} exponent Tension exponent (default: 0.55)
 * @returns {number} Constrained offset with exponential rubber-band resistance
 */
export function applyRubberBand(current, min, max, exponent = 0.55) {
  if (current < min) {
    const overshoot = min - current;
    return min - Math.pow(Math.max(0, overshoot), exponent);
  }
  if (current > max) {
    const overshoot = current - max;
    return max + Math.pow(Math.max(0, overshoot), exponent);
  }
  return current;
}

/**
 * Velocity-preserving Spring Simulation.
 * Solves damped harmonic oscillator equations so release velocity from
 * pointer/touch gestures is preserved rather than clamped or reset.
 *
 * Default parameters:
 *   stiffness: 380
 *   damping: 35
 *   mass: 1
 *
 * @param {Object} options
 * @param {number} options.from Initial displacement
 * @param {number} options.to Target displacement (e.g. 0)
 * @param {number} [options.velocity=0] Initial velocity vector in px/ms
 * @param {number} [options.stiffness=380] Spring stiffness
 * @param {number} [options.damping=35] Damping coefficient
 * @param {number} [options.mass=1] Mass
 * @param {Function} options.onUpdate Callback with current value (x)
 * @param {Function} [options.onComplete] Callback when spring settles
 * @returns {Function} Cancel function to stop animation early
 */
export function animateSpring({
  from,
  to,
  velocity = 0,
  stiffness = 380,
  damping = 35,
  mass = 1,
  onUpdate,
  onComplete,
}) {
  let isCancelled = false;
  let currentPos = from;
  // Convert velocity from px/ms to px/s for standard physics calculation
  let currentVel = velocity * 1000;
  let lastTimestamp = performance.now();

  const settleThreshold = 0.25;
  const velocityThreshold = 5; // px/s

  const raf =
    typeof requestAnimationFrame !== "undefined"
      ? requestAnimationFrame
      : (cb) => setTimeout(() => cb(performance.now()), 16);

  function tick(timestamp) {
    if (isCancelled) return;

    // Elapsed time in seconds (clamped to prevent huge simulation leaps if tab backgrounded)
    const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.032);
    lastTimestamp = timestamp;

    if (dt > 0) {
      // Spring force: F_spring = -k * (x - target)
      const springForce = -stiffness * (currentPos - to);
      // Damping force: F_damping = -c * v
      const dampingForce = -damping * currentVel;
      // Acceleration: a = F / m
      const acceleration = (springForce + dampingForce) / mass;

      // Semi-implicit Euler integration for fast, stable spring trajectory
      currentVel += acceleration * dt;
      currentPos += currentVel * dt;
    }

    onUpdate?.(currentPos);

    // Check if settled
    const isAtRest =
      Math.abs(currentPos - to) < settleThreshold &&
      Math.abs(currentVel) < velocityThreshold;

    if (isAtRest) {
      onUpdate?.(to);
      onComplete?.();
    } else {
      raf(tick);
    }
  }

  raf((ts) => {
    lastTimestamp = ts;
    raf(tick);
  });

  return () => {
    isCancelled = true;
  };
}
