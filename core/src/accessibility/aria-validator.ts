/**
 * ARIA Validator for Tsyne
 *
 * Validates ARIA roles, states, and properties based on WAI-ARIA 1.2 specification
 * Adapted from aria-query (https://github.com/A11yance/aria-query)
 */

export interface AriaRole {
  name: string;
  abstract?: boolean;
  requiredProps?: Set<string>;
  supportedProps?: Set<string>;
  requiredContext?: Set<string>;
  requiredOwned?: Set<string>;
  superclassRoles?: Set<string>;
  prohibitedProps?: Set<string>;
}

/**
 * ARIA Roles database (subset - full spec has 80+ roles)
 */
const ARIA_ROLES: Map<string, AriaRole> = new Map([
  ['button', {
    name: 'button',
    requiredProps: new Set(),
    supportedProps: new Set(['aria-expanded', 'aria-pressed']),
    superclassRoles: new Set(['command'])
  }],
  ['checkbox', {
    name: 'checkbox',
    requiredProps: new Set(['aria-checked']),
    supportedProps: new Set(['aria-readonly']),
    superclassRoles: new Set(['input'])
  }],
  ['dialog', {
    name: 'dialog',
    requiredProps: new Set(),
    supportedProps: new Set(['aria-modal']),
    requiredOwned: new Set(['document', 'application']),
    superclassRoles: new Set(['window'])
  }],
  ['grid', {
    name: 'grid',
    requiredProps: new Set(),
    supportedProps: new Set([
      'aria-level',
      'aria-multiselectable',
      'aria-readonly',
      'aria-activedescendant',
      'aria-colcount',
      'aria-rowcount'
    ]),
    requiredOwned: new Set(['row', 'rowgroup']),
    superclassRoles: new Set(['composite', 'table'])
  }],
  ['gridcell', {
    name: 'gridcell',
    requiredProps: new Set(),
    supportedProps: new Set([
      'aria-readonly',
      'aria-required',
      'aria-selected',
      'aria-colindex',
      'aria-colspan',
      'aria-rowindex',
      'aria-rowspan'
    ]),
    requiredContext: new Set(['row']),
    superclassRoles: new Set(['cell', 'widget'])
  }],
  ['heading', {
    name: 'heading',
    requiredProps: new Set(['aria-level']),
    supportedProps: new Set(),
    superclassRoles: new Set(['sectionhead'])
  }],
  ['listbox', {
    name: 'listbox',
    requiredProps: new Set(),
    supportedProps: new Set([
      'aria-multiselectable',
      'aria-readonly',
      'aria-required',
      'aria-activedescendant',
      'aria-orientation'
    ]),
    requiredOwned: new Set(['option']),
    superclassRoles: new Set(['select'])
  }],
  ['menu', {
    name: 'menu',
    requiredProps: new Set(),
    supportedProps: new Set(['aria-activedescendant', 'aria-orientation']),
    requiredOwned: new Set(['menuitem', 'menuitemcheckbox', 'menuitemradio']),
    superclassRoles: new Set(['select'])
  }],
  ['menuitem', {
    name: 'menuitem',
    requiredProps: new Set(),
    supportedProps: new Set(['aria-posinset', 'aria-setsize']),
    requiredContext: new Set(['menu', 'menubar']),
    superclassRoles: new Set(['command'])
  }],
  ['navigation', {
    name: 'navigation',
    requiredProps: new Set(),
    supportedProps: new Set(),
    superclassRoles: new Set(['landmark'])
  }],
  ['option', {
    name: 'option',
    requiredProps: new Set(['aria-selected']),
    supportedProps: new Set([
      'aria-checked',
      'aria-posinset',
      'aria-setsize'
    ]),
    requiredContext: new Set(['listbox']),
    superclassRoles: new Set(['input'])
  }],
  ['row', {
    name: 'row',
    requiredProps: new Set(),
    supportedProps: new Set([
      'aria-colindex',
      'aria-level',
      'aria-rowindex',
      'aria-selected',
      'aria-activedescendant'
    ]),
    requiredOwned: new Set(['cell', 'columnheader', 'gridcell', 'rowheader']),
    requiredContext: new Set(['grid', 'rowgroup', 'table', 'treegrid']),
    superclassRoles: new Set(['group', 'widget'])
  }],
  ['tab', {
    name: 'tab',
    requiredProps: new Set(),
    supportedProps: new Set([
      'aria-posinset',
      'aria-selected',
      'aria-setsize'
    ]),
    requiredContext: new Set(['tablist']),
    superclassRoles: new Set(['sectionhead', 'widget'])
  }],
  ['tabpanel', {
    name: 'tabpanel',
    requiredProps: new Set(),
    supportedProps: new Set(),
    superclassRoles: new Set(['section'])
  }],
  ['textbox', {
    name: 'textbox',
    requiredProps: new Set(),
    supportedProps: new Set([
      'aria-activedescendant',
      'aria-autocomplete',
      'aria-multiline',
      'aria-placeholder',
      'aria-readonly',
      'aria-required'
    ]),
    superclassRoles: new Set(['input'])
  }],
  ['alert', {
    name: 'alert',
    requiredProps: new Set(),
    supportedProps: new Set(),
    superclassRoles: new Set(['section']),
    // Alert is a live region with implicit aria-live="assertive" and aria-atomic="true"
  }],
  ['alertdialog', {
    name: 'alertdialog',
    requiredProps: new Set(),
    supportedProps: new Set(['aria-modal']),
    requiredOwned: new Set(['alert']),
    superclassRoles: new Set(['alert', 'dialog'])
  }]
]);

/**
 * Global ARIA properties that apply to all roles
 */
const GLOBAL_ARIA_PROPS = new Set([
  'aria-atomic',
  'aria-busy',
  'aria-controls',
  'aria-current',
  'aria-describedby',
  'aria-details',
  'aria-disabled',
  'aria-dropeffect',
  'aria-errormessage',
  'aria-flowto',
  'aria-grabbed',
  'aria-haspopup',
  'aria-hidden',
  'aria-invalid',
  'aria-keyshortcuts',
  'aria-label',
  'aria-labelledby',
  'aria-live',
  'aria-owns',
  'aria-relevant',
  'aria-roledescription'
]);

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class AriaValidator {
  /**
   * Validate ARIA role and properties
   */
  validate(
    role: string | undefined,
    attributes: Record<string, any>
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!role) {
      warnings.push('No ARIA role specified');
      return { valid: true, errors, warnings };
    }

    const roleData = ARIA_ROLES.get(role);

    if (!roleData) {
      errors.push(`Unknown ARIA role: "${role}"`);
      return { valid: false, errors, warnings };
    }

    if (roleData.abstract) {
      errors.push(`Cannot use abstract role: "${role}"`);
      return { valid: false, errors, warnings };
    }

    // Check required properties
    if (roleData.requiredProps) {
      for (const requiredProp of roleData.requiredProps) {
        const attrKey = this.ariaToAttrKey(requiredProp);
        if (attributes[attrKey] === undefined) {
          errors.push(`Role "${role}" requires property "${requiredProp}"`);
        }
      }
    }

    // Check for prohibited properties
    if (roleData.prohibitedProps) {
      for (const prohibitedProp of roleData.prohibitedProps) {
        const attrKey = this.ariaToAttrKey(prohibitedProp);
        if (attributes[attrKey] !== undefined) {
          errors.push(`Role "${role}" prohibits property "${prohibitedProp}"`);
        }
      }
    }

    // Validate supported properties
    const ariaAttrs = this.extractAriaAttributes(attributes);
    for (const attr of ariaAttrs) {
      if (!this.isValidAriaProperty(role, attr, roleData)) {
        warnings.push(
          `Property "${attr}" is not supported for role "${role}"`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get required properties for a role
   */
  getRequiredProps(role: string): string[] {
    const roleData = ARIA_ROLES.get(role);
    return roleData?.requiredProps ? Array.from(roleData.requiredProps) : [];
  }

  /**
   * Get supported properties for a role
   */
  getSupportedProps(role: string): string[] {
    const roleData = ARIA_ROLES.get(role);
    if (!roleData) return [];

    const supported = new Set<string>(GLOBAL_ARIA_PROPS);

    if (roleData.requiredProps) {
      roleData.requiredProps.forEach(p => supported.add(p));
    }

    if (roleData.supportedProps) {
      roleData.supportedProps.forEach(p => supported.add(p));
    }

    return Array.from(supported);
  }

  /**
   * Check if role requires specific context (parent role)
   */
  getRequiredContext(role: string): string[] {
    const roleData = ARIA_ROLES.get(role);
    return roleData?.requiredContext ? Array.from(roleData.requiredContext) : [];
  }

  /**
   * Check if role requires specific children (owned roles)
   */
  getRequiredOwned(role: string): string[] {
    const roleData = ARIA_ROLES.get(role);
    return roleData?.requiredOwned ? Array.from(roleData.requiredOwned) : [];
  }

  /**
   * Validate widget hierarchy (parent-child relationships)
   */
  validateHierarchy(
    widgetRole: string,
    parentRole: string | undefined,
    childRoles: string[]
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const roleData = ARIA_ROLES.get(widgetRole);
    if (!roleData) {
      errors.push(`Unknown role: "${widgetRole}"`);
      return { valid: false, errors, warnings };
    }

    // Check required context (parent)
    if (roleData.requiredContext && roleData.requiredContext.size > 0) {
      if (!parentRole) {
        errors.push(
          `Role "${widgetRole}" requires parent role: ${Array.from(roleData.requiredContext).join(', ')}`
        );
      } else if (!roleData.requiredContext.has(parentRole)) {
        errors.push(
          `Role "${widgetRole}" requires parent role: ${Array.from(roleData.requiredContext).join(', ')}, but parent is "${parentRole}"`
        );
      }
    }

    // Check required owned (children)
    if (roleData.requiredOwned && roleData.requiredOwned.size > 0) {
      if (childRoles.length === 0) {
        warnings.push(
          `Role "${widgetRole}" should contain: ${Array.from(roleData.requiredOwned).join(', ')}`
        );
      } else {
        const hasRequiredChild = childRoles.some(childRole =>
          roleData.requiredOwned!.has(childRole)
        );
        if (!hasRequiredChild) {
          warnings.push(
            `Role "${widgetRole}" should contain: ${Array.from(roleData.requiredOwned).join(', ')}`
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  private isValidAriaProperty(
    role: string,
    ariaProp: string,
    roleData: AriaRole
  ): boolean {
    // Global properties are valid for all roles
    if (GLOBAL_ARIA_PROPS.has(ariaProp)) return true;

    // Check required properties
    if (roleData.requiredProps?.has(ariaProp)) return true;

    // Check supported properties
    if (roleData.supportedProps?.has(ariaProp)) return true;

    return false;
  }

  private extractAriaAttributes(attributes: Record<string, any>): string[] {
    return Object.keys(attributes)
      .filter(key => this.isAriaAttribute(key))
      .map(key => this.attrKeyToAria(key));
  }

  private isAriaAttribute(key: string): boolean {
    // Check if key starts with 'aria'
    // Could be 'ariaLabel', 'ariaDescribedBy', etc.
    return key.startsWith('aria');
  }

  private ariaToAttrKey(ariaProp: string): string {
    // Convert 'aria-label' to 'ariaLabel'
    return ariaProp.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  private attrKeyToAria(attrKey: string): string {
    // Convert 'ariaLabel' to 'aria-label'
    return attrKey.replace(/([A-Z])/g, '-$1').toLowerCase();
  }
}

/**
 * Singleton instance
 */
let validatorInstance: AriaValidator | null = null;

/**
 * Get global ARIA validator instance
 */
export function getAriaValidator(): AriaValidator {
  if (!validatorInstance) {
    validatorInstance = new AriaValidator();
  }
  return validatorInstance;
}
