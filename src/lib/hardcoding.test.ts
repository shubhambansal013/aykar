import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const PARSER_DIRS = [
  'src/lib/form16',
  'src/lib/ais',
  'src/lib/tis',
  'src/lib/form26as',
];

const FORBIDDEN_PATTERNS = [
  { name: 'PAN: CYXPA6852K', regex: /CYXPA6852K/i },
  { name: 'PAN: AFNPS1912F', regex: /AFNPS1912F/i },
  { name: 'Name: Tarush', regex: /\bTarush\b/i },
  { name: 'Name: Arora', regex: /\bArora\b/i },
  { name: 'Name: Manak', regex: /\bManak\b/i },
  { name: 'Name: Jeet', regex: /\bJeet\b/i },
  { name: 'Name: Singh', regex: /\bSingh\b/i },
  { name: 'Employer: Parametric Technology', regex: /PARAMETRIC\s+TECHNOLOGY/i },
  { name: 'Employer: Thomson Reuters', regex: /THOMSON\s+REUTERS/i },
  { name: 'Employer Email: SHCHOUDHARY@PTC.COM', regex: /SHCHOUDHARY@PTC\.COM/i },
  { name: 'Employer Email: Payrollhelpdesk.India', regex: /Payrollhelpdesk\.India/i },
  { name: 'Employer: Optum Global', regex: /OPTUM\s+GLOBAL/i },
];

// Helper to strip comments from typescript code to avoid false positives in documentation
function stripComments(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '') // Strip block comments (/* ... */)
    .replace(/\/\/.*/g, '');          // Strip line comments (// ...)
}

// Recursively find TS and TSX files
function getFiles(dir: string): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(fullPath));
    } else if (
      (file.endsWith('.ts') || file.endsWith('.tsx')) &&
      !file.endsWith('.test.ts') &&
      !file.endsWith('.test.tsx') &&
      !file.endsWith('.d.ts')
    ) {
      results.push(fullPath);
    }
  });
  return results;
}

describe('Global Form Parsers Hardcoding Checks', () => {
  const filesToScan: string[] = [];
  for (const dirName of PARSER_DIRS) {
    const absoluteDir = path.resolve(process.cwd(), dirName);
    filesToScan.push(...getFiles(absoluteDir));
  }

  it('should scan at least some parser files', () => {
    expect(filesToScan.length).toBeGreaterThan(0);
  });

  filesToScan.forEach((filePath) => {
    const relativePath = path.relative(process.cwd(), filePath);
    it(`should not contain hardcoded user or PAN specific data in ${relativePath}`, () => {
      const content = fs.readFileSync(filePath, 'utf-8');
      const cleanContent = stripComments(content);

      FORBIDDEN_PATTERNS.forEach(({ name, regex }) => {
        const hasForbidden = regex.test(cleanContent);
        expect(
          hasForbidden,
          `File ${relativePath} contains forbidden hardcoded pattern/name matching "${name}"`
        ).toBe(false);
      });
    });
  });
});
