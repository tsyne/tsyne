import { parseAppMetadata, getAppMetadata } from '../app-metadata';
import * as path from 'path';

describe('app-metadata', () => {
  describe('parseAppMetadata', () => {
    it('should parse metadata from calculator example', () => {
      const calcPath = path.join(__dirname, '../../../examples/calculator.ts');
      const meta = parseAppMetadata(calcPath);

      expect(meta).not.toBeNull();
      expect(meta?.name).toBe('Calculator');
      expect(meta?.builder).toBe('buildCalculator');
      expect(meta?.category).toBe('utilities');
      expect(meta?.count).toBe('desktop-many');
    });

    it('should return null for file without @tsyne-app:name', () => {
      const indexPath = path.join(__dirname, '../index.ts');
      const meta = parseAppMetadata(indexPath);
      expect(meta).toBeNull();
    });
  });

  describe('getAppMetadata', () => {
    it('should parse metadata when given explicit file path', () => {
      const calcPath = path.join(__dirname, '../../../examples/calculator.ts');
      const meta = getAppMetadata(calcPath);

      expect(meta).not.toBeNull();
      expect(meta?.name).toBe('Calculator');
    });

    it('should return null for non-existent file', () => {
      const meta = getAppMetadata('/nonexistent/file.ts');
      expect(meta).toBeNull();
    });
  });
});
