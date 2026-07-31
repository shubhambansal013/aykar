import { describe, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parseForm16Text, parseForm16ToDetailedBundle } from '../form16/parser';
import { parseDetailedAIS } from '../ais/parser';
import { parseDetailedTIS } from '../tis/parser';
import { parseDetailedForm26AS } from '../form26as/parser';
import { stringifyTextProto } from './textproto';
import { createForm16Proxy } from './compatibilityProxy';

describe('convert flat expected JSON files to official spec-compliant textproto using parser output', () => {
  it('converts everything', () => {
    const testdataDir = path.resolve(__dirname, '../itr/testdata');

    // 1. Priya Patel Form 16
    const mjsTextPath = path.resolve(testdataDir, 'Priya_Patel/f16_1.txt');
    if (fs.existsSync(mjsTextPath)) {
      const text = fs.readFileSync(mjsTextPath, 'utf-8');
      const parsed = parseForm16Text(text);
      const rawBundle = parsed.__bundle || parsed;
      fs.writeFileSync(path.resolve(testdataDir, 'Priya_Patel/expected_form16.textproto'), stringifyTextProto(rawBundle, 'tax.sources.form16.Form16Bundle'), 'utf-8');
    }

    // 2. Arjun Sharma Form 16
    const taF16Texts = [
      path.resolve(testdataDir, 'Arjun_Sharma/f16_1.txt'),
      path.resolve(testdataDir, 'Arjun_Sharma/f16_2.txt'),
      path.resolve(testdataDir, 'Arjun_Sharma/f16_3.txt'),
    ];
    const taTexts: string[] = [];
    for (const f of taF16Texts) {
      if (fs.existsSync(f)) {
        taTexts.push(fs.readFileSync(f, 'utf-8'));
      }
    }
    if (taTexts.length > 0) {
      const parsed = parseForm16ToDetailedBundle(taTexts);
      const rawBundle = parsed.__bundle || parsed;
      fs.writeFileSync(path.resolve(testdataDir, 'Arjun_Sharma/expected_form16.textproto'), stringifyTextProto(rawBundle, 'tax.sources.form16.Form16Bundle'), 'utf-8');
    }

    // 3. Arjun Sharma AIS
    const taAisPath = path.resolve(testdataDir, 'Arjun_Sharma/ais.txt');
    if (fs.existsSync(taAisPath)) {
      const text = fs.readFileSync(taAisPath, 'utf-8');
      const parsed = parseDetailedAIS(text);
      const rawAis = parsed.__bundle || parsed;
      fs.writeFileSync(path.resolve(testdataDir, 'Arjun_Sharma/expected_ais.textproto'), stringifyTextProto(rawAis, 'tax.sources.ais.AnnualInformationStatement'), 'utf-8');
    }

    // 4. Arjun Sharma TIS
    const taTisPath = path.resolve(testdataDir, 'Arjun_Sharma/tis.txt');
    if (fs.existsSync(taTisPath)) {
      const text = fs.readFileSync(taTisPath, 'utf-8');
      const parsed = parseDetailedTIS(text);
      const rawTis = parsed.__bundle || parsed;
      fs.writeFileSync(path.resolve(testdataDir, 'Arjun_Sharma/expected_tis.textproto'), stringifyTextProto(rawTis, 'tax.sources.tis.TaxpayerInformationSummary'), 'utf-8');
    }

    // 5. Arjun Sharma Form 26AS
    const taF26asPath = path.resolve(testdataDir, 'Arjun_Sharma/f26as.txt');
    if (fs.existsSync(taF26asPath)) {
      const text = fs.readFileSync(taF26asPath, 'utf-8');
      const parsed = parseDetailedForm26AS(text);
      const rawF26as = parsed.__bundle || parsed;
      fs.writeFileSync(path.resolve(testdataDir, 'Arjun_Sharma/expected_form26as.textproto'), stringifyTextProto(rawF26as, 'tax.sources.form26as.Form26AS'), 'utf-8');
    }

    // 6. Mock form 16 mapper input
    const mockJsonPath = path.resolve(testdataDir, 'mock_form16_mapper_input.json');
    if (fs.existsSync(mockJsonPath)) {
      const flat = JSON.parse(fs.readFileSync(mockJsonPath, 'utf-8'));
      const proxy = createForm16Proxy(flat);
      const rawBundle = proxy.__bundle;
      fs.writeFileSync(path.resolve(testdataDir, 'mock_form16_mapper_input.textproto'), stringifyTextProto(rawBundle, 'tax.sources.form16.Form16Bundle'), 'utf-8');
    }

    // Delete original JSON expected files
    const deleteJsonFiles = [
      path.resolve(testdataDir, 'Priya_Patel/expected_form16.json'),
      path.resolve(testdataDir, 'Arjun_Sharma/expected_form16.json'),
      path.resolve(testdataDir, 'Arjun_Sharma/expected_ais.json'),
      path.resolve(testdataDir, 'Arjun_Sharma/expected_tis.json'),
      path.resolve(testdataDir, 'Arjun_Sharma/expected_form26as.json'),
      path.resolve(testdataDir, 'mock_form16_mapper_input.json'),
    ];
    for (const f of deleteJsonFiles) {
      if (fs.existsSync(f)) {
        fs.unlinkSync(f);
      }
    }
  });
});
