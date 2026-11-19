import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyRubberBand, animateSpring } from './physics.js';

test('rubber-band resistance preserves values within boundaries', () => {
  assert.equal(applyRubberBand(0, -100, 100), 0);
  assert.equal(applyRubberBand(50, -100, 100), 50);
  assert.equal(applyRubberBand(-50, -100, 100), -50);
  assert.equal(applyRubberBand(-100, -100, 100), -100);
  assert.equal(applyRubberBand(100, -100, 100), 100);
});

test('rubber-band applies non-linear exponential resistance on overshoot', () => {
  const min = -100;
  const max = 100;

  // Past max by 100 (current = 200) -> 100 + 100^0.55
  const overMax = applyRubberBand(200, min, max, 0.55);
  const expectedOverMax = max + Math.pow(100, 0.55);
  assert.ok(Math.abs(overMax - expectedOverMax) < 1e-6);
  assert.ok(overMax < 200, 'Tension should compress displacement below linear');

  // Past min by 100 (current = -200) -> -100 - 100^0.55
  const underMin = applyRubberBand(-200, min, max, 0.55);
  const expectedUnderMin = min - Math.pow(100, 0.55);
  assert.ok(Math.abs(underMin - expectedUnderMin) < 1e-6);
  assert.ok(underMin > -200, 'Tension should compress negative displacement above linear');
});

test('animateSpring accepts initial velocity and options', () => {
  // Test instantiation and cancellation
  const cancel = animateSpring({
    from: 50,
    to: 0,
    velocity: -0.5,
    stiffness: 380,
    damping: 35,
    onUpdate: () => {},
  });
  assert.equal(typeof cancel, 'function');
  cancel();
});
