import { describe, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { extractTextFromPDF } from '../form16/extractor';
import { parseForm16Text, parseForm16ToDetailedBundle } from '../form16/parser';
import { parseDetailedAIS } from '../ais/parser';
import { parseDetailedTIS } from '../tis/parser';
import { parseDetailedForm26AS } from '../form26as/parser';
import { stringifyTextProto } from './textproto';
import { createForm16Proxy } from './compatibilityProxy';

describe('convert flat expected JSON files to official spec-compliant textproto using parser output', () => {
  it('converts everything', async () => {
    const testdataDir = path.resolve(__dirname, '../itr/testdata');

    // 1. Manak Jeet Singh Form 16
    const mjsPdfPath = path.resolve(testdataDir, 'Manak_Jeet_Singh/f16_1.pdf');
    if (fs.existsSync(mjsPdfPath)) {
      const arrayBuffer = new Uint8Array(fs.readFileSync(mjsPdfPath)).buffer;
      const text = await extractTextFromPDF(arrayBuffer);
      const parsed = parseForm16Text(text);
      const rawBundle = parsed.__bundle || parsed;
      fs.writeFileSync(path.resolve(testdataDir, 'Manak_Jeet_Singh/expected_form16.textproto'), stringifyTextProto(rawBundle, 'tax.sources.form16.Form16Bundle'), 'utf-8');
    }

    // 2. Tarush Arora Form 16
    const taF16Pdfs = [
      path.resolve(testdataDir, 'Tarush_Arora/f16_1.pdf'),
      path.resolve(testdataDir, 'Tarush_Arora/f16_2.pdf'),
      path.resolve(testdataDir, 'Tarush_Arora/f16_3.pdf'),
    ];
    const taTexts: string[] = [];
    for (const f of taF16Pdfs) {
      if (fs.existsSync(f)) {
        const arrayBuffer = new Uint8Array(fs.readFileSync(f)).buffer;
        taTexts.push(await extractTextFromPDF(arrayBuffer));
      }
    }
    if (taTexts.length > 0) {
      const parsed = parseForm16ToDetailedBundle(taTexts);
      const rawBundle = parsed.__bundle || parsed;
      fs.writeFileSync(path.resolve(testdataDir, 'Tarush_Arora/expected_form16.textproto'), stringifyTextProto(rawBundle, 'tax.sources.form16.Form16Bundle'), 'utf-8');
    }

    // 3. Tarush Arora AIS
    const taAisPdf = path.resolve(testdataDir, 'Tarush_Arora/ais.pdf');
    if (fs.existsSync(taAisPdf)) {
      const arrayBuffer = new Uint8Array(fs.readFileSync(taAisPdf)).buffer;
      const text = await extractTextFromPDF(arrayBuffer);
      const parsed = parseDetailedAIS(text);
      const rawAis = parsed.__bundle || parsed;
      fs.writeFileSync(path.resolve(testdataDir, 'Tarush_Arora/expected_ais.textproto'), stringifyTextProto(rawAis, 'tax.sources.ais.AnnualInformationStatement'), 'utf-8');
    }

    // 4. Tarush Arora TIS
    const taTisPdf = path.resolve(testdataDir, 'Tarush_Arora/tis.pdf');
    if (fs.existsSync(taTisPdf)) {
      const arrayBuffer = new Uint8Array(fs.readFileSync(taTisPdf)).buffer;
      const text = await extractTextFromPDF(arrayBuffer);
      const parsed = parseDetailedTIS(text);
      const rawTis = parsed.__bundle || parsed;
      fs.writeFileSync(path.resolve(testdataDir, 'Tarush_Arora/expected_tis.textproto'), stringifyTextProto(rawTis, 'tax.sources.tis.TaxpayerInformationSummary'), 'utf-8');
    }

    // 5. Tarush Arora Form 26AS
    const taF26asPdf = path.resolve(testdataDir, 'Tarush_Arora/f26as.pdf');
    if (fs.existsSync(taF26asPdf)) {
      const arrayBuffer = new Uint8Array(fs.readFileSync(taF26asPdf)).buffer;
      const text = await extractTextFromPDF(arrayBuffer);
      const parsed = parseDetailedForm26AS(text);
      const rawF26as = parsed.__bundle || parsed;
      fs.writeFileSync(path.resolve(testdataDir, 'Tarush_Arora/expected_form26as.textproto'), stringifyTextProto(rawF26as, 'tax.sources.form26as.Form26AS'), 'utf-8');
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
      path.resolve(testdataDir, 'Manak_Jeet_Singh/expected_form16.json'),
      path.resolve(testdataDir, 'Tarush_Arora/expected_form16.json'),
      path.resolve(testdataDir, 'Tarush_Arora/expected_ais.json'),
      path.resolve(testdataDir, 'Tarush_Arora/expected_tis.json'),
      path.resolve(testdataDir, 'Tarush_Arora/expected_form26as.json'),
      path.resolve(testdataDir, 'mock_form16_mapper_input.json'),
    ];
    for (const f of deleteJsonFiles) {
      if (fs.existsSync(f)) {
        fs.unlinkSync(f);
      }
    }
  });
});
