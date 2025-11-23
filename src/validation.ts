/**
 * Validation Module for Tsyne
 *
 * Provides input validation for forms and data entry.
 * Supports declarative validation rules and real-time validation feedback.
 *
 * @example
 * ```typescript
 * // Create validators
 * const emailValidator = validators.email('Please enter a valid email');
 * const passwordValidator = validators.all(
 *   validators.required('Password is required'),
 *   validators.minLength(8, 'Password must be at least 8 characters')
 * );
 *
 * // Validate values
 * const result = emailValidator.validate('test@example.com');
 * if (result.valid) {
 *   console.log('Email is valid');
 * } else {
 *   console.log('Error:', result.error);
 * }
 * ```
 */

import { Entry, Label, PasswordEntry } from './widgets';
import { StringBinding } from './binding';

/**
 * Widget that has getText method - used for syncing values from widgets
 */
interface TextWidget {
  getText(): Promise<string>;
}

/**
 * Result of a validation check
 */
export interface ValidationResult {
  /** Whether the value is valid */
  valid: boolean;
  /** Error message if invalid */
  error?: string;
}

/**
 * Validator function type
 */
export type ValidatorFn = (value: string) => ValidationResult;

/**
 * Validator interface
 */
export interface Validator {
  /** Validate a string value */
  validate(value: string): ValidationResult;
}

/**
 * Simple validator implementation
 */
class SimpleValidator implements Validator {
  constructor(private validateFn: ValidatorFn) {}

  validate(value: string): ValidationResult {
    return this.validateFn(value);
  }
}

/**
 * Composite validator that combines multiple validators
 */
class CompositeValidator implements Validator {
  constructor(
    private validators: Validator[],
    private mode: 'all' | 'any' = 'all'
  ) {}

  validate(value: string): ValidationResult {
    if (this.mode === 'all') {
      // All validators must pass
      for (const validator of this.validators) {
        const result = validator.validate(value);
        if (!result.valid) {
          return result;
        }
      }
      return { valid: true };
    } else {
      // Any validator must pass
      const errors: string[] = [];
      for (const validator of this.validators) {
        const result = validator.validate(value);
        if (result.valid) {
          return { valid: true };
        }
        if (result.error) {
          errors.push(result.error);
        }
      }
      return { valid: false, error: errors.join(', ') };
    }
  }
}

/**
 * Built-in validators factory
 */
export const validators = {
  /**
   * Value is required (non-empty)
   */
  required(message: string = 'This field is required'): Validator {
    return new SimpleValidator((value) => ({
      valid: value.trim().length > 0,
      error: value.trim().length > 0 ? undefined : message
    }));
  },

  /**
   * Minimum length validation
   */
  minLength(min: number, message?: string): Validator {
    const msg = message || `Must be at least ${min} characters`;
    return new SimpleValidator((value) => ({
      valid: value.length >= min,
      error: value.length >= min ? undefined : msg
    }));
  },

  /**
   * Maximum length validation
   */
  maxLength(max: number, message?: string): Validator {
    const msg = message || `Must be at most ${max} characters`;
    return new SimpleValidator((value) => ({
      valid: value.length <= max,
      error: value.length <= max ? undefined : msg
    }));
  },

  /**
   * Exact length validation
   */
  exactLength(length: number, message?: string): Validator {
    const msg = message || `Must be exactly ${length} characters`;
    return new SimpleValidator((value) => ({
      valid: value.length === length,
      error: value.length === length ? undefined : msg
    }));
  },

  /**
   * Email format validation
   */
  email(message: string = 'Please enter a valid email address'): Validator {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return new SimpleValidator((value) => ({
      valid: value === '' || emailRegex.test(value),
      error: value === '' || emailRegex.test(value) ? undefined : message
    }));
  },

  /**
   * Numeric value validation
   */
  numeric(message: string = 'Please enter a valid number'): Validator {
    return new SimpleValidator((value) => {
      if (value === '') return { valid: true };
      const num = parseFloat(value);
      return {
        valid: !isNaN(num),
        error: isNaN(num) ? message : undefined
      };
    });
  },

  /**
   * Integer validation
   */
  integer(message: string = 'Please enter a whole number'): Validator {
    return new SimpleValidator((value) => {
      if (value === '') return { valid: true };
      const num = parseInt(value, 10);
      return {
        valid: !isNaN(num) && num.toString() === value.trim(),
        error: !isNaN(num) && num.toString() === value.trim() ? undefined : message
      };
    });
  },

  /**
   * Minimum value validation (for numeric strings)
   */
  min(minValue: number, message?: string): Validator {
    const msg = message || `Must be at least ${minValue}`;
    return new SimpleValidator((value) => {
      if (value === '') return { valid: true };
      const num = parseFloat(value);
      return {
        valid: !isNaN(num) && num >= minValue,
        error: !isNaN(num) && num >= minValue ? undefined : msg
      };
    });
  },

  /**
   * Maximum value validation (for numeric strings)
   */
  max(maxValue: number, message?: string): Validator {
    const msg = message || `Must be at most ${maxValue}`;
    return new SimpleValidator((value) => {
      if (value === '') return { valid: true };
      const num = parseFloat(value);
      return {
        valid: !isNaN(num) && num <= maxValue,
        error: !isNaN(num) && num <= maxValue ? undefined : msg
      };
    });
  },

  /**
   * Range validation (for numeric strings)
   */
  range(minValue: number, maxValue: number, message?: string): Validator {
    const msg = message || `Must be between ${minValue} and ${maxValue}`;
    return new SimpleValidator((value) => {
      if (value === '') return { valid: true };
      const num = parseFloat(value);
      return {
        valid: !isNaN(num) && num >= minValue && num <= maxValue,
        error: !isNaN(num) && num >= minValue && num <= maxValue ? undefined : msg
      };
    });
  },

  /**
   * Pattern/regex validation
   */
  pattern(regex: RegExp, message: string = 'Invalid format'): Validator {
    return new SimpleValidator((value) => ({
      valid: value === '' || regex.test(value),
      error: value === '' || regex.test(value) ? undefined : message
    }));
  },

  /**
   * URL validation
   */
  url(message: string = 'Please enter a valid URL'): Validator {
    // URL regex pattern for validation (supports http, https, ftp)
    const urlRegex = /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i;
    return new SimpleValidator((value) => {
      if (value === '') return { valid: true };
      return {
        valid: urlRegex.test(value),
        error: urlRegex.test(value) ? undefined : message
      };
    });
  },

  /**
   * Phone number validation (basic format)
   */
  phone(message: string = 'Please enter a valid phone number'): Validator {
    // Accepts formats like: +1234567890, 123-456-7890, (123) 456-7890
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    return new SimpleValidator((value) => {
      if (value === '') return { valid: true };
      const digitsOnly = value.replace(/\D/g, '');
      return {
        valid: phoneRegex.test(value) && digitsOnly.length >= 7 && digitsOnly.length <= 15,
        error: phoneRegex.test(value) && digitsOnly.length >= 7 && digitsOnly.length <= 15 ? undefined : message
      };
    });
  },

  /**
   * Alphanumeric validation
   */
  alphanumeric(message: string = 'Only letters and numbers are allowed'): Validator {
    return new SimpleValidator((value) => ({
      valid: value === '' || /^[a-zA-Z0-9]+$/.test(value),
      error: value === '' || /^[a-zA-Z0-9]+$/.test(value) ? undefined : message
    }));
  },

  /**
   * Alpha only validation
   */
  alpha(message: string = 'Only letters are allowed'): Validator {
    return new SimpleValidator((value) => ({
      valid: value === '' || /^[a-zA-Z]+$/.test(value),
      error: value === '' || /^[a-zA-Z]+$/.test(value) ? undefined : message
    }));
  },

  /**
   * Password strength validation
   */
  password(options: {
    minLength?: number;
    requireUppercase?: boolean;
    requireLowercase?: boolean;
    requireNumber?: boolean;
    requireSpecial?: boolean;
  } = {}): Validator {
    const {
      minLength = 8,
      requireUppercase = true,
      requireLowercase = true,
      requireNumber = true,
      requireSpecial = false
    } = options;

    return new SimpleValidator((value) => {
      if (value === '') return { valid: true };

      const errors: string[] = [];

      if (value.length < minLength) {
        errors.push(`at least ${minLength} characters`);
      }
      if (requireUppercase && !/[A-Z]/.test(value)) {
        errors.push('an uppercase letter');
      }
      if (requireLowercase && !/[a-z]/.test(value)) {
        errors.push('a lowercase letter');
      }
      if (requireNumber && !/\d/.test(value)) {
        errors.push('a number');
      }
      if (requireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
        errors.push('a special character');
      }

      if (errors.length > 0) {
        return {
          valid: false,
          error: `Password must contain ${errors.join(', ')}`
        };
      }

      return { valid: true };
    });
  },

  /**
   * Match another field validation (for confirm password, etc.)
   */
  matches(getValue: () => string, message: string = 'Fields do not match'): Validator {
    return new SimpleValidator((value) => ({
      valid: value === getValue(),
      error: value === getValue() ? undefined : message
    }));
  },

  /**
   * Custom validator
   */
  custom(validateFn: ValidatorFn): Validator {
    return new SimpleValidator(validateFn);
  },

  /**
   * Combine validators - all must pass
   */
  all(...validatorList: Validator[]): Validator {
    return new CompositeValidator(validatorList, 'all');
  },

  /**
   * Combine validators - any must pass
   */
  any(...validatorList: Validator[]): Validator {
    return new CompositeValidator(validatorList, 'any');
  }
};

/**
 * Validated field that combines a binding with a validator
 */
export class ValidatedField {
  private binding: StringBinding;
  private validator: Validator;
  private errorLabel?: Label;
  private lastResult: ValidationResult = { valid: true };

  constructor(initialValue: string, validator: Validator) {
    this.binding = new StringBinding(initialValue);
    this.validator = validator;
  }

  /**
   * Get the current value
   */
  get(): string {
    return this.binding.get();
  }

  /**
   * Set a new value and validate
   */
  set(value: string): ValidationResult {
    this.binding.set(value);
    return this.validate();
  }

  /**
   * Get the underlying binding
   */
  getBinding(): StringBinding {
    return this.binding;
  }

  /**
   * Bind to an entry widget
   */
  bindEntry(entry: Entry): () => void {
    return this.binding.bindEntry(entry);
  }

  /**
   * Bind an error label to show validation errors
   */
  bindErrorLabel(label: Label): void {
    this.errorLabel = label;
    this.updateErrorLabel();
  }

  /**
   * Validate the current value
   */
  validate(): ValidationResult {
    this.lastResult = this.validator.validate(this.binding.get());
    this.updateErrorLabel();
    return this.lastResult;
  }

  /**
   * Check if the field is currently valid
   */
  isValid(): boolean {
    return this.lastResult.valid;
  }

  /**
   * Get the last validation result
   */
  getLastResult(): ValidationResult {
    return this.lastResult;
  }

  /**
   * Sync from entry and validate
   * Works with any widget that has a getText() method (Entry, PasswordEntry, etc.)
   */
  async syncAndValidate(entry: TextWidget): Promise<ValidationResult> {
    await this.binding.syncFromEntry(entry);
    return this.validate();
  }

  private updateErrorLabel(): void {
    if (this.errorLabel) {
      this.errorLabel.setText(this.lastResult.error || '');
    }
  }
}

/**
 * Form validator that validates multiple fields
 */
export class FormValidator {
  private fields: Map<string, ValidatedField> = new Map();
  private onValidChange?: (isValid: boolean) => void;

  /**
   * Add a field to the form validator
   */
  addField(name: string, initialValue: string, validator: Validator): ValidatedField {
    const field = new ValidatedField(initialValue, validator);
    this.fields.set(name, field);
    return field;
  }

  /**
   * Get a field by name
   */
  getField(name: string): ValidatedField | undefined {
    return this.fields.get(name);
  }

  /**
   * Validate all fields
   */
  validateAll(): { valid: boolean; errors: Map<string, string> } {
    const errors = new Map<string, string>();
    let allValid = true;

    this.fields.forEach((field, name) => {
      const result = field.validate();
      if (!result.valid && result.error) {
        errors.set(name, result.error);
        allValid = false;
      }
    });

    if (this.onValidChange) {
      this.onValidChange(allValid);
    }

    return { valid: allValid, errors };
  }

  /**
   * Check if all fields are currently valid
   */
  isValid(): boolean {
    for (const field of this.fields.values()) {
      if (!field.isValid()) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get all field values as an object
   */
  getValues(): Record<string, string> {
    const values: Record<string, string> = {};
    this.fields.forEach((field, name) => {
      values[name] = field.get();
    });
    return values;
  }

  /**
   * Set a callback for when overall form validity changes
   */
  onValidityChange(callback: (isValid: boolean) => void): void {
    this.onValidChange = callback;
  }

  /**
   * Reset all fields to empty
   */
  reset(): void {
    this.fields.forEach(field => {
      field.set('');
    });
  }
}

/**
 * Create a form validator with field definitions
 *
 * @example
 * ```typescript
 * const form = createFormValidator({
 *   email: { value: '', validator: validators.all(validators.required(), validators.email()) },
 *   password: { value: '', validator: validators.password() }
 * });
 *
 * const result = form.validateAll();
 * if (result.valid) {
 *   console.log('Form is valid:', form.getValues());
 * }
 * ```
 */
export function createFormValidator(
  fields: Record<string, { value?: string; validator: Validator }>
): FormValidator {
  const form = new FormValidator();

  for (const [name, config] of Object.entries(fields)) {
    form.addField(name, config.value || '', config.validator);
  }

  return form;
}
