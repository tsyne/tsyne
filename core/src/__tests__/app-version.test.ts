import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  getVersionRequirement,
  validateVersion,
  checkAppVersion,
  VersionRequirement,
} from '../app-version';
import { TSYNE_VERSION } from '../version';

describe('App Version Module', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsyne-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('getVersionRequirement', () => {
    it('should return source: none when no requirement found', () => {
      const appPath = path.join(tempDir, 'app.ts');
      fs.writeFileSync(appPath, 'console.log("hello");');

      const req = getVersionRequirement(appPath);
      expect(req.source).toBe('none');
    });

    it('should parse @tsyne-version directive from source file', () => {
      const appPath = path.join(tempDir, 'app.ts');
      fs.writeFileSync(appPath, `// @tsyne-version >=0.1.0 <1.0.0
import { App } from 'tsyne';
`);

      const req = getVersionRequirement(appPath);
      expect(req.source).toBe('directive');
      expect(req.range).toBe('>=0.1.0 <1.0.0');
    });

    it('should parse tsyne section from package.json', () => {
      const appPath = path.join(tempDir, 'app.ts');
      fs.writeFileSync(appPath, 'console.log("hello");');
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-app',
          tsyne: {
            minVersion: '0.1.0',
            maxVersion: '<1.0.0',
          },
        })
      );

      const req = getVersionRequirement(appPath);
      expect(req.source).toBe('package.json');
      expect(req.minVersion).toBe('0.1.0');
      expect(req.maxVersion).toBe('<1.0.0');
    });

    it('should parse peerDependencies.tsyne from package.json', () => {
      const appPath = path.join(tempDir, 'app.ts');
      fs.writeFileSync(appPath, 'console.log("hello");');
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-app',
          peerDependencies: {
            tsyne: '^0.1.0',
          },
        })
      );

      const req = getVersionRequirement(appPath);
      expect(req.source).toBe('package.json');
      expect(req.range).toBe('^0.1.0');
    });

    it('should prefer directive over package.json', () => {
      const appPath = path.join(tempDir, 'app.ts');
      fs.writeFileSync(appPath, `// @tsyne-version >=0.2.0
console.log("hello");
`);
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-app',
          tsyne: { minVersion: '0.1.0' },
        })
      );

      const req = getVersionRequirement(appPath);
      expect(req.source).toBe('directive');
      expect(req.range).toBe('>=0.2.0');
    });
  });

  describe('validateVersion', () => {
    it('should return valid for no requirement', () => {
      const req: VersionRequirement = { source: 'none' };
      const result = validateVersion(req);
      expect(result.valid).toBe(true);
    });

    it('should return valid when current version satisfies range', () => {
      const req: VersionRequirement = {
        range: `>=${TSYNE_VERSION}`,
        source: 'directive',
      };
      const result = validateVersion(req);
      expect(result.valid).toBe(true);
    });

    it('should return invalid when current version is too old', () => {
      const req: VersionRequirement = {
        range: '>=99.0.0',
        source: 'directive',
      };
      const result = validateVersion(req);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('requires Tsyne >=99.0.0');
    });

    it('should return invalid when current version is too new', () => {
      const req: VersionRequirement = {
        range: '<0.0.1',
        source: 'directive',
      };
      const result = validateVersion(req);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('requires Tsyne <0.0.1');
    });

    it('should handle minVersion/maxVersion format', () => {
      const req: VersionRequirement = {
        minVersion: '0.0.1',
        maxVersion: '<99.0.0',
        source: 'package.json',
      };
      const result = validateVersion(req);
      expect(result.valid).toBe(true);
    });

    it('should handle caret ranges', () => {
      // ^0.1.0 means >=0.1.0 <0.2.0 for 0.x versions
      const req: VersionRequirement = {
        range: '^0.1.0',
        source: 'package.json',
      };
      const result = validateVersion(req);
      // Current TSYNE_VERSION is 0.1.0, so ^0.1.0 should match
      expect(result.valid).toBe(true);
    });

    it('should handle tilde ranges', () => {
      // ~0.1.0 means >=0.1.0 <0.2.0
      const req: VersionRequirement = {
        range: '~0.1.0',
        source: 'package.json',
      };
      const result = validateVersion(req);
      expect(result.valid).toBe(true);
    });
  });

  describe('checkAppVersion', () => {
    it('should return null for compatible app', () => {
      const appPath = path.join(tempDir, 'app.ts');
      fs.writeFileSync(appPath, `// @tsyne-version >=${TSYNE_VERSION}
console.log("hello");
`);

      const error = checkAppVersion(appPath);
      expect(error).toBeNull();
    });

    it('should return error message for incompatible app', () => {
      const appPath = path.join(tempDir, 'app.ts');
      fs.writeFileSync(appPath, `// @tsyne-version >=99.0.0
console.log("hello");
`);

      const error = checkAppVersion(appPath);
      expect(error).not.toBeNull();
      expect(error).toContain('requires Tsyne >=99.0.0');
      expect(error).toContain(`You have Tsyne ${TSYNE_VERSION}`);
    });
  });
});
