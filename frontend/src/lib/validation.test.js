import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanPhoneNumber,
  validatePhoneNumber,
  cleanEmail,
  validateCollegeEmail,
  validateUsername,
  validateName,
  validatePassword
} from './validation.js';

test('cleanPhoneNumber removes trailing and leading spaces', () => {
  assert.equal(cleanPhoneNumber('9876543210 '), '9876543210');
  assert.equal(cleanPhoneNumber(' 9876543210'), '9876543210');
  assert.equal(cleanPhoneNumber(' 9876543210 '), '9876543210');
});

test('cleanPhoneNumber removes internal spaces and hyphens', () => {
  assert.equal(cleanPhoneNumber('98765 43210'), '9876543210');
  assert.equal(cleanPhoneNumber('987-654-3210'), '9876543210');
  assert.equal(cleanPhoneNumber('(987) 654 3210'), '9876543210');
});

test('cleanPhoneNumber strips +91 and leading 0 country/trunk prefixes', () => {
  assert.equal(cleanPhoneNumber('+91 9876543210'), '9876543210');
  assert.equal(cleanPhoneNumber('+919876543210'), '9876543210');
  assert.equal(cleanPhoneNumber('919876543210'), '9876543210');
  assert.equal(cleanPhoneNumber('09876543210'), '9876543210');
});

test('validatePhoneNumber passes valid numbers with spaces', () => {
  const res1 = validatePhoneNumber('9876543210 ');
  assert.equal(res1.isValid, true);
  assert.equal(res1.value, '9876543210');
  assert.equal(res1.error, null);

  const res2 = validatePhoneNumber('+91 98765 43210');
  assert.equal(res2.isValid, true);
  assert.equal(res2.value, '9876543210');
});

test('validatePhoneNumber rejects invalid numbers', () => {
  const shortNum = validatePhoneNumber('98765');
  assert.equal(shortNum.isValid, false);
  assert.match(shortNum.error, /10 digits/);

  const emptyNum = validatePhoneNumber('   ');
  assert.equal(emptyNum.isValid, false);
});

test('validateCollegeEmail handles whitespace and casing', () => {
  const res = validateCollegeEmail('  Student123@ANITS.edu.in  ');
  assert.equal(res.isValid, true);
  assert.equal(res.value, 'student123@anits.edu.in');
  assert.equal(res.error, null);

  const nonAnits = validateCollegeEmail('student@gmail.com');
  assert.equal(nonAnits.isValid, false);
  assert.match(nonAnits.error, /restricted to official campus emails/);
});

test('validateUsername and validateName trim whitespace', () => {
  const u = validateUsername('  321126510001  ');
  assert.equal(u.isValid, true);
  assert.equal(u.value, '321126510001');

  const name = validateName('  Prudhvi  ', 'First Name');
  assert.equal(name.isValid, true);
  assert.equal(name.value, 'Prudhvi');
});

test('validatePassword validates length and matching', () => {
  assert.equal(validatePassword('short').isValid, false);
  assert.equal(validatePassword('secret123', 'different').isValid, false);
  assert.equal(validatePassword('secret123', 'secret123').isValid, true);
});
