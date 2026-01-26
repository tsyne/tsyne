/**
 * Tsyne PhoneTop for Android
 *
 * Composition root for Android APK builds.
 * Creates stubbed services that show warnings for unavailable hardware features.
 *
 * To regenerate the app manifest:
 *   npx tsx phone-apps/generate-app-manifest.ts
 */

import { App } from 'tsyne';
import { PhoneTopOptions, StaticAppDefinition, buildPhoneTop } from './index';
import { allApps, getAppsForPlatform, GeneratedAppDefinition } from '../../phone-apps/all-apps.generated';
import {
  PhoneServices,
  MockContactsService,
  ApkStubbedTelephonyService,
  ApkStubbedSMSService,
} from '../../phone-apps/services';

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

/**
 * Create services for Android APK (composition root)
 * Uses stubbed services that show warnings for unavailable hardware
 */
function createAndroidApkServices(showWarning: (feature: string) => void): PhoneServices {
  return {
    contacts: new MockContactsService(),  // Contacts could work via content provider later
    telephony: new ApkStubbedTelephonyService(showWarning),
    sms: new ApkStubbedSMSService(showWarning),
  };
}

/**
 * Build PhoneTop for Android APK (composition root)
 */
export async function buildPhoneTopAndroid(a: App, options?: PhoneTopOptions) {
  // Create stubbed services with warning dialog
  const services = createAndroidApkServices((feature: string) => {
    a.dialog({
      title: 'Feature Not Available',
      message: `${feature} is not available in this APK build.\n\nHardware access requires native Android integration.`,
      buttons: ['OK']
    });
  });

  await buildPhoneTop(a, {
    ...options,
    staticApps: getPhoneApps(),
    services,  // Inject services (IoC)
  });
}

// Export individual builders for potential direct use
export { allApps, getAppsForPlatform } from '../../phone-apps/all-apps.generated';

// Also re-export the original buildPhoneTop
export { buildPhoneTop } from './index';
