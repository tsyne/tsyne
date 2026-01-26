/**
 * Tsyne PhoneTop for PostmarketOS
 *
 * Composition root for PostmarketOS deployments.
 * Uses real ModemManager services via D-Bus for telephony and SMS.
 *
 * Requires:
 * - ModemManager running on the system
 * - 'dbus' npm package
 */

import { App } from 'tsyne';
import { PhoneTopOptions, StaticAppDefinition, buildPhoneTop } from './index';
import { allApps, getAppsForPlatform, GeneratedAppDefinition } from '../../phone-apps/all-apps.generated';
import {
  PhoneServices,
  MockContactsService,
  MockTelephonyService,
  MockSMSService,
} from '../../phone-apps/services';

// Re-export app for the bundle
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
 * Create services for PostmarketOS (composition root)
 *
 * Note: Apps that need real modem access (Phone, Messages) should
 * use ModemManagerService and ModemManagerSMSService directly via
 * the 'modem' arg, which provides the lower-level IModemManagerService.
 *
 * These ITelephonyService/ISMSService implementations are fallbacks
 * for apps that use the generic interface.
 */
function createPostmarketOSServices(): PhoneServices {
  // TODO: Create adapters that wrap ModemManagerService to implement ITelephonyService
  // For now, use mocks as fallback - Phone app uses ModemManagerService directly
  console.log('[PostmarketOS] Using mock services as ITelephonyService fallback');
  console.log('[PostmarketOS] Phone/Messages apps should use ModemManagerService directly');

  return {
    contacts: new MockContactsService(),  // TODO: PIM/EDS integration
    telephony: new MockTelephonyService(), // Fallback - apps use ModemManagerService
    sms: new MockSMSService(),             // Fallback - apps use ModemManagerSMSService
  };
}

/**
 * Build PhoneTop for PostmarketOS (composition root)
 */
export async function buildPhoneTopPostmarketOS(a: App, options?: PhoneTopOptions) {
  const services = createPostmarketOSServices();

  await buildPhoneTop(a, {
    ...options,
    staticApps: getPhoneApps(),  // Pre-bundled static apps
    services,  // Inject services (IoC)
  });
}

// Also re-export the original buildPhoneTop
export { buildPhoneTop } from './index';
