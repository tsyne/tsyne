import { describe, test, expect } from '@jest/globals';

class Sonic3Helper {
  private archives: any[] = [];

  addArchive(name: string, format: string): void {
    const timestamp = new Date().getTime();
    this.archives.push({
      id: `arc-${timestamp}`,
      name,
      format,
      size: 0,
      encrypted: false
    });
  }

  getArchives(): any[] {
    return [...this.archives];
  }

  count() {
    return this.archives.length;
  }
}

describe('Sonic3 Archive Manager', () => {
  test('should add archive', () => {
    const h = new Sonic3Helper();
    h.addArchive('test.zip', 'ZIP');
    expect(h.count()).toBe(1);
  });

  test('should handle multiple archives', () => {
    const h = new Sonic3Helper();
    h.addArchive('file1.zip', 'ZIP');
    h.addArchive('file2.tar.gz', 'TAR.GZ');
    expect(h.count()).toBe(2);
  });

  test('should support different formats', () => {
    const h = new Sonic3Helper();
    h.addArchive('a.zip', 'ZIP');
    h.addArchive('b.tar.gz', 'TAR.GZ');
    h.addArchive('c.tar.xz', 'TAR.XZ');
    expect(h.count()).toBe(3);
  });

  test('should store archive metadata', () => {
    const h = new Sonic3Helper();
    h.addArchive('document.zip', 'ZIP');
    const archives = h.getArchives();
    expect(archives[0].name).toBe('document.zip');
    expect(archives[0].format).toBe('ZIP');
  });
});
