/**
 * Tsyne PhoneTop for Android
 *
 * This is an Android-specific entry point that uses the generated app manifest
 * instead of dynamically scanning the filesystem.
 *
 * Apps are filtered to only include phone-compatible ones.
 *
 * To regenerate the app manifest:
 *   npx tsx phone-apps/generate-app-manifest.ts
 */

import { App } from 'tsyne';
import { PhoneTopOptions, StaticAppDefinition, buildPhoneTop } from './index';
import { allApps, getAppsForPlatform, GeneratedAppDefinition } from './all-apps.generated';

// Re-export app and buildPhoneTop for the bundle
export { app } from 'tsyne';

/**
 * Convert GeneratedAppDefinition to StaticAppDefinition
 */
function toStaticAppDef(app: GeneratedAppDefinition): StaticAppDefinition {
  return {
    name: app.name,
    builder: app.builder,
    icon: app.icon,
    category: app.category,
    args: app.args,
    count: app.count,
  };
}

/**
 * Get static app definitions for phone platform
 */
export function getPhoneApps(): StaticAppDefinition[] {
  return getAppsForPlatform('phone').map(toStaticAppDef);
}

/**
 * All apps from the generated manifest (for reference)
 */
export const staticAppDefs: StaticAppDefinition[] = allApps.map(toStaticAppDef);

// Android-specific buildPhoneTop that uses generated app imports
export async function buildPhoneTopAndroid(a: App, options?: PhoneTopOptions) {
  // For Android, use phone-compatible apps from the generated manifest
  await buildPhoneTop(a, {
    ...options,
    staticApps: getPhoneApps(),
  });
}

// Export individual builders for potential direct use
export { allApps, getAppsForPlatform } from './all-apps.generated';

// Also re-export the original buildPhoneTop
export { buildPhoneTop } from './index';
