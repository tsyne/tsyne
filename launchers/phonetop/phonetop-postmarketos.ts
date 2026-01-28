/**
 * Tsyne PhoneTop for PostmarketOS
 *
 * Composition root for PostmarketOS deployments.
 * Uses ModemManager services via mmcli for telephony.
 *
 * Requires:
 * - ModemManager running on the system
 * - 'mmcli' command line tool
 */

import { App } from 'tsyne';
import { PhoneTopOptions, StaticAppDefinition, buildPhoneTop } from './index';
import { allApps, getAppsForPlatform, GeneratedAppDefinition } from '../../phone-apps/all-apps.generated';
import {
  PhoneServices,
  MockContactsService,
  MockSMSService,
} from '../../phone-apps/services';
import { MmcliModemManagerService } from '../../phone-apps/dialer/mmcli-service';

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
 * Uses MmcliModemManagerService for telephony, which shells out to mmcli.
 * This avoids native D-Bus bindings while providing real calling capability.
 */
function createPostmarketOSServices(): PhoneServices {
  const mmcliService = new MmcliModemManagerService();
  
  return {
    contacts: new MockContactsService(),  // TODO: PIM/EDS integration
    telephony: mmcliService, // Used as both ITelephonyService and IModemManagerService via alias
    sms: new MockSMSService(), // TODO: Implement MmcliSMSService
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
