/**
 * Registration Form Tests
 *
 * Tests for the validation system and registration form demo.
 *
 * Usage:
 *   npm test examples/registration-form.test.ts
 *   TSYNE_HEADED=1 npm test examples/registration-form.test.ts  # Visual debugging
 */

import { TsyneTest, TestContext } from '../core/src/index-test';
import { createRegistrationFormApp } from './registration-form';
import {
  validators,
  createFormValidator,
  ValidatedField,
  FormValidator
} from '../core/src/validation';

describe('Validation Unit Tests', () => {
  describe('validators.required', () => {
    const validator = validators.required('Required');

    test('should pass for non-empty string', () => {
      expect(validator.validate('hello').valid).toBe(true);
    });

    test('should fail for empty string', () => {
      const result = validator.validate('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Required');
    });

    test('should fail for whitespace-only string', () => {
      const result = validator.validate('   ');
      expect(result.valid).toBe(false);
    });
  });

  describe('validators.minLength', () => {
    const validator = validators.minLength(5, 'Too short');

    test('should pass for string at minimum length', () => {
      expect(validator.validate('hello').valid).toBe(true);
    });

    test('should pass for string above minimum length', () => {
      expect(validator.validate('hello world').valid).toBe(true);
    });

    test('should fail for string below minimum length', () => {
      const result = validator.validate('hi');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Too short');
    });
  });

  describe('validators.maxLength', () => {
    const validator = validators.maxLength(10, 'Too long');

    test('should pass for string at maximum length', () => {
      expect(validator.validate('0123456789').valid).toBe(true);
    });

    test('should pass for string below maximum length', () => {
      expect(validator.validate('short').valid).toBe(true);
    });

    test('should fail for string above maximum length', () => {
      const result = validator.validate('this is too long');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Too long');
    });
  });

  describe('validators.email', () => {
    const validator = validators.email('Invalid email');

    test('should pass for valid email', () => {
      expect(validator.validate('test@example.com').valid).toBe(true);
    });

    test('should pass for empty string', () => {
      expect(validator.validate('').valid).toBe(true);
    });

    test('should fail for invalid email - no @', () => {
      const result = validator.validate('testexample.com');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid email');
    });

    test('should fail for invalid email - no domain', () => {
      const result = validator.validate('test@');
      expect(result.valid).toBe(false);
    });

    test('should fail for invalid email - no local part', () => {
      const result = validator.validate('@example.com');
      expect(result.valid).toBe(false);
    });
  });

  describe('validators.numeric', () => {
    const validator = validators.numeric('Not a number');

    test('should pass for integer', () => {
      expect(validator.validate('42').valid).toBe(true);
    });

    test('should pass for float', () => {
      expect(validator.validate('3.14').valid).toBe(true);
    });

    test('should pass for negative number', () => {
      expect(validator.validate('-10').valid).toBe(true);
    });

    test('should pass for empty string', () => {
      expect(validator.validate('').valid).toBe(true);
    });

    test('should fail for non-numeric', () => {
      const result = validator.validate('abc');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Not a number');
    });
  });

  describe('validators.integer', () => {
    const validator = validators.integer('Not an integer');

    test('should pass for integer', () => {
      expect(validator.validate('42').valid).toBe(true);
    });

    test('should fail for float', () => {
      const result = validator.validate('3.14');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Not an integer');
    });
  });

  describe('validators.range', () => {
    const validator = validators.range(1, 100, 'Out of range');

    test('should pass for value in range', () => {
      expect(validator.validate('50').valid).toBe(true);
    });

    test('should pass for value at min', () => {
      expect(validator.validate('1').valid).toBe(true);
    });

    test('should pass for value at max', () => {
      expect(validator.validate('100').valid).toBe(true);
    });

    test('should fail for value below min', () => {
      const result = validator.validate('0');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Out of range');
    });

    test('should fail for value above max', () => {
      const result = validator.validate('101');
      expect(result.valid).toBe(false);
    });
  });

  describe('validators.pattern', () => {
    const validator = validators.pattern(/^[A-Z]{3}$/, 'Must be 3 uppercase letters');

    test('should pass for matching pattern', () => {
      expect(validator.validate('ABC').valid).toBe(true);
    });

    test('should pass for empty string', () => {
      expect(validator.validate('').valid).toBe(true);
    });

    test('should fail for non-matching pattern', () => {
      const result = validator.validate('abc');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Must be 3 uppercase letters');
    });
  });

  describe('validators.url', () => {
    const validator = validators.url('Invalid URL');

    test('should pass for valid URL', () => {
      expect(validator.validate('https://example.com').valid).toBe(true);
    });

    test('should pass for URL with path', () => {
      expect(validator.validate('https://example.com/path/to/page').valid).toBe(true);
    });

    test('should pass for empty string', () => {
      expect(validator.validate('').valid).toBe(true);
    });

    test('should fail for invalid URL', () => {
      const result = validator.validate('not a url');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid URL');
    });
  });

  describe('validators.phone', () => {
    const validator = validators.phone('Invalid phone');

    test('should pass for valid phone number', () => {
      expect(validator.validate('+1234567890').valid).toBe(true);
    });

    test('should pass for phone with dashes', () => {
      expect(validator.validate('123-456-7890').valid).toBe(true);
    });

    test('should pass for phone with parentheses', () => {
      expect(validator.validate('(123) 456-7890').valid).toBe(true);
    });

    test('should pass for empty string', () => {
      expect(validator.validate('').valid).toBe(true);
    });

    test('should fail for too short number', () => {
      const result = validator.validate('12345');
      expect(result.valid).toBe(false);
    });
  });

  describe('validators.alphanumeric', () => {
    const validator = validators.alphanumeric('Alphanumeric only');

    test('should pass for alphanumeric', () => {
      expect(validator.validate('abc123').valid).toBe(true);
    });

    test('should pass for empty string', () => {
      expect(validator.validate('').valid).toBe(true);
    });

    test('should fail for special characters', () => {
      const result = validator.validate('abc@123');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Alphanumeric only');
    });
  });

  describe('validators.password', () => {
    const validator = validators.password({
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumber: true,
      requireSpecial: false
    });

    test('should pass for valid password', () => {
      expect(validator.validate('Password1').valid).toBe(true);
    });

    test('should pass for empty string', () => {
      expect(validator.validate('').valid).toBe(true);
    });

    test('should fail for password without uppercase', () => {
      const result = validator.validate('password1');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('uppercase');
    });

    test('should fail for password without number', () => {
      const result = validator.validate('Password');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('number');
    });

    test('should fail for short password', () => {
      const result = validator.validate('Pass1');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('8 characters');
    });
  });

  describe('validators.matches', () => {
    test('should pass when values match', () => {
      const getValue = () => 'password123';
      const validator = validators.matches(getValue, 'No match');
      expect(validator.validate('password123').valid).toBe(true);
    });

    test('should fail when values do not match', () => {
      const getValue = () => 'password123';
      const validator = validators.matches(getValue, 'No match');
      const result = validator.validate('different');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('No match');
    });
  });

  describe('validators.all', () => {
    const validator = validators.all(
      validators.required('Required'),
      validators.minLength(3, 'Too short'),
      validators.alphanumeric('Alphanumeric only')
    );

    test('should pass when all validators pass', () => {
      expect(validator.validate('abc123').valid).toBe(true);
    });

    test('should fail when first validator fails', () => {
      const result = validator.validate('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Required');
    });

    test('should fail when middle validator fails', () => {
      const result = validator.validate('ab');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Too short');
    });

    test('should fail when last validator fails', () => {
      const result = validator.validate('abc@123');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Alphanumeric only');
    });
  });

  describe('validators.any', () => {
    const validator = validators.any(
      validators.email('Not email'),
      validators.url('Not URL')
    );

    test('should pass when first validator passes', () => {
      expect(validator.validate('test@example.com').valid).toBe(true);
    });

    test('should pass when second validator passes', () => {
      expect(validator.validate('https://example.com').valid).toBe(true);
    });

    test('should fail when all validators fail', () => {
      const result = validator.validate('not-email-or-url');
      expect(result.valid).toBe(false);
    });
  });
});

describe('FormValidator Tests', () => {
  test('should validate all fields', () => {
    const form = createFormValidator({
      name: { value: '', validator: validators.required('Name required') },
      email: { value: '', validator: validators.email('Invalid email') }
    });

    form.getField('name')!.set('John');
    form.getField('email')!.set('john@example.com');

    const result = form.validateAll();
    expect(result.valid).toBe(true);
    expect(result.errors.size).toBe(0);
  });

  test('should collect all errors', () => {
    const form = createFormValidator({
      name: { value: '', validator: validators.required('Name required') },
      email: { value: '', validator: validators.email('Invalid email') }
    });

    form.getField('email')!.set('not-an-email');

    const result = form.validateAll();
    expect(result.valid).toBe(false);
    expect(result.errors.has('name')).toBe(true);
    expect(result.errors.has('email')).toBe(true);
  });

  test('should get all values', () => {
    const form = createFormValidator({
      name: { value: 'John', validator: validators.required() },
      email: { value: 'john@example.com', validator: validators.email() }
    });

    const values = form.getValues();
    expect(values.name).toBe('John');
    expect(values.email).toBe('john@example.com');
  });

  test('should reset all fields', () => {
    const form = createFormValidator({
      name: { value: 'John', validator: validators.required() }
    });

    form.reset();
    expect(form.getField('name')!.get()).toBe('');
  });
});

describe('Registration Form Integration Tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display registration form', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createRegistrationFormApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Check form header is visible
    await ctx.expect(ctx.getByText('Create Your Account')).toBeVisible();
    await ctx.expect(ctx.getByText('Username *')).toBeVisible();
    await ctx.expect(ctx.getByText('Email Address *')).toBeVisible();
    await ctx.expect(ctx.getByText('Password *')).toBeVisible();
  });

  test('should show password requirements', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createRegistrationFormApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Check password requirements are displayed
    await ctx.expect(ctx.getByText('Password Requirements:')).toBeVisible();
    await ctx.expect(ctx.getByText('- At least 8 characters')).toBeVisible();
    await ctx.expect(ctx.getByText('- Contains uppercase letter')).toBeVisible();
  });

  test('should have Create Account and Clear Form buttons', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createRegistrationFormApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.expect(ctx.getByExactText('Create Account')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Clear Form')).toBeVisible();
  });
});
