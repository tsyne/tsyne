/**
 * Central registry of all Tsyne apps.
 *
 * Each environment (PhoneTop, TabletTop, Desktop) imports this and filters
 * based on compatibility before sorting into folders for presentation.
 *
 * Apps that fail to resolve (missing dependencies, not built, etc.) are
 * silently skipped - this is normal for environment-specific apps.
 *
 * Apps are categorized by license type:
 * - ALL_BSD_OR_MIT_APPS: Apps with permissive licenses (MIT, BSD, Apache 2.0, etc.)
 * - ALL_GPL_APPS: Apps with copyleft licenses (GPL-2.0, GPL-3.0, LGPL, etc.)
 */

export { tryResolve } from './app-resolver';
export { ALL_BSD_OR_MIT_APPS } from './bsd-mit-apps';
export { ALL_GPL_APPS } from './gpl-apps';

import { ALL_BSD_OR_MIT_APPS } from './bsd-mit-apps';
import { ALL_GPL_APPS } from './gpl-apps';

/**
 * All apps combined (backward compatibility)
 */
export const ALL_APPS = [...ALL_BSD_OR_MIT_APPS, ...ALL_GPL_APPS];
