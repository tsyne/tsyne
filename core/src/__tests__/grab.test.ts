import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  parseGrabDirectives,
  getGrabCacheDir,
  getGrabNodePath,
  GrabDirective,
} from '../grab';

describe('Grab Module', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsyne-grab-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('parseGrabDirectives', () => {
    it('should return empty array for file without @grab directives', () => {
      const appPath = path.join(tempDir, 'app.ts');
      fs.writeFileSync(appPath, `console.log("hello");`);

      const directives = parseGrabDirectives(appPath);
      expect(directives).toEqual([]);
    });

    it('should parse simple @grab directive', () => {
      const appPath = path.join(tempDir, 'app.ts');
      fs.writeFileSync(
        appPath,
        `// @grab lodash@4.17.21
import _ from 'lodash';
console.log(_.capitalize("hello"));
`
      );

      const directives = parseGrabDirectives(appPath);
      expect(directives).toHaveLength(1);
      expect(directives[0].package).toBe('lodash');
      expect(directives[0].version).toBe('4.17.21');
      expect(directives[0].line).toBe(1);
    });

    it('should parse Groovy-style @Grab directive', () => {
      const appPath = path.join(tempDir, 'app.ts');
      fs.writeFileSync(
        appPath,
        `// @Grab('lodash@4.17.21')
import _ from 'lodash';
`
      );

      const directives = parseGrabDirectives(appPath);
      expect(directives).toHaveLength(1);
      expect(directives[0].package).toBe('lodash');
      expect(directives[0].version).toBe('4.17.21');
    });

    it('should parse @Grab with double quotes', () => {
      const appPath = path.join(tempDir, 'app.ts');
      fs.writeFileSync(
        appPath,
        `// @Grab("dayjs@1.11.0")
import dayjs from 'dayjs';
`
      );

      const directives = parseGrabDirectives(appPath);
      expect(directives).toHaveLength(1);
      expect(directives[0].package).toBe('dayjs');
      expect(directives[0].version).toBe('1.11.0');
    });

    it('should parse multiple @grab directives', () => {
      const appPath = path.join(tempDir, 'app.ts');
      fs.writeFileSync(
        appPath,
        `// @grab lodash@4.17.21
// @grab dayjs@1.11.0
// @Grab('chalk@5.0.0')
console.log("hello");
`
      );

      const directives = parseGrabDirectives(appPath);
      expect(directives).toHaveLength(3);
      expect(directives[0].package).toBe('lodash');
      expect(directives[1].package).toBe('dayjs');
      expect(directives[2].package).toBe('chalk');
    });

    it('should handle scoped packages', () => {
      const appPath = path.join(tempDir, 'app.ts');
      fs.writeFileSync(
        appPath,
        `// @grab @types/node@20.0.0
// @grab @emotion/styled@11.0.0
`
      );

      const directives = parseGrabDirectives(appPath);
      expect(directives).toHaveLength(2);
      expect(directives[0].package).toBe('@types/node');
      expect(directives[0].version).toBe('20.0.0');
      expect(directives[1].package).toBe('@emotion/styled');
      expect(directives[1].version).toBe('11.0.0');
    });

    it('should use latest for package without version', () => {
      const appPath = path.join(tempDir, 'app.ts');
      fs.writeFileSync(
        appPath,
        `// @grab lodash
import _ from 'lodash';
`
      );

      const directives = parseGrabDirectives(appPath);
      expect(directives).toHaveLength(1);
      expect(directives[0].package).toBe('lodash');
      expect(directives[0].version).toBe('latest');
    });

    it('should return empty array for non-existent file', () => {
      const directives = parseGrabDirectives('/non/existent/file.ts');
      expect(directives).toEqual([]);
    });

    it('should handle version ranges', () => {
      const appPath = path.join(tempDir, 'app.ts');
      fs.writeFileSync(
        appPath,
        `// @grab lodash@^4.17.0
// @grab dayjs@~1.11.0
`
      );

      const directives = parseGrabDirectives(appPath);
      expect(directives).toHaveLength(2);
      expect(directives[0].version).toBe('^4.17.0');
      expect(directives[1].version).toBe('~1.11.0');
    });

    it('should preserve line numbers correctly', () => {
      const appPath = path.join(tempDir, 'app.ts');
      fs.writeFileSync(
        appPath,
        `// Some comment
// Another comment

// @grab lodash@4.17.21

import _ from 'lodash';

// @grab dayjs@1.11.0
`
      );

      const directives = parseGrabDirectives(appPath);
      expect(directives).toHaveLength(2);
      expect(directives[0].line).toBe(4);
      expect(directives[1].line).toBe(8);
    });

    it('should be case-insensitive for @grab/@Grab', () => {
      const appPath = path.join(tempDir, 'app.ts');
      fs.writeFileSync(
        appPath,
        `// @GRAB lodash@4.17.21
// @Grab('dayjs@1.11.0')
`
      );

      const directives = parseGrabDirectives(appPath);
      expect(directives).toHaveLength(2);
    });
  });

  describe('getGrabCacheDir', () => {
    it('should return path in home directory', () => {
      const cacheDir = getGrabCacheDir();
      const home = process.env.HOME || process.env.USERPROFILE || '/tmp';
      expect(cacheDir).toBe(path.join(home, '.tsyne', 'packages'));
    });
  });

  describe('getGrabNodePath', () => {
    it('should return node_modules path for default cache', () => {
      const nodePath = getGrabNodePath();
      const cacheDir = getGrabCacheDir();
      expect(nodePath).toBe(path.join(cacheDir, 'node_modules'));
    });

    it('should return node_modules path for custom cache', () => {
      const customCache = '/custom/cache';
      const nodePath = getGrabNodePath(customCache);
      expect(nodePath).toBe(path.join(customCache, 'node_modules'));
    });
  });
});
