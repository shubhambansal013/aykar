const KNOWN_REPEATED_FIELDS = new Set([
  'certificates',
  'quarterSummaries',
  'quarter_summaries',
  'challanDeposits',
  'challan_deposits',
  'section10Exemptions',
  'section10_exemptions',
  'otherDeductions',
  'other_deductions',
  'categories',
  'details',
  'records',
  'transactions',
  'savingsInterest',
  'savings_interest',
  'depositInterest',
  'deposit_interest',
  'securitySales',
  'security_sales',
  'securityPurchases',
  'security_purchases',
  'taxPayments',
  'tax_payments',
  'salaries',
  'tdsSalary',
  'tds_salary',
  'tdsOther',
  'tds_other',
  'tcsDetails',
  'tcs_details',
  'advanceTax',
  'advance_tax',
  'selfAssessmentTax',
  'self_assessment_tax',
  'otherSources',
  'other_sources',
  'exemptAllowancesUs10',
  'discrepancies',
  'detectedIncomeSources',
  'detected_income_sources',
  'items'
]);

export function parseTextProto(text: string): any {
  const lines = text.split(/\r?\n/);
  let lineIdx = 0;

  function parseObject(): any {
    const obj: any = {};
    while (lineIdx < lines.length) {
      const line = lines[lineIdx].trim();
      if (!line || line.startsWith('#')) {
        lineIdx++;
        continue;
      }
      if (line === '}') {
        lineIdx++;
        return obj;
      }

      // Check if it's a block start like "nested {"
      const blockMatch = line.match(/^([a-zA-Z0-9_]+)\s*\{$/);
      if (blockMatch) {
        const key = blockMatch[1];
        lineIdx++;
        const nestedObj = parseObject();
        if (KNOWN_REPEATED_FIELDS.has(key)) {
          if (obj[key] === undefined) {
            obj[key] = [nestedObj];
          } else {
            obj[key].push(nestedObj);
          }
        } else {
          obj[key] = nestedObj;
        }
        continue;
      }

      // Check if it's a key-value pair like "field: value"
      const kvMatch = line.match(/^([a-zA-Z0-9_]+)\s*:\s*(.*)$/);
      if (kvMatch) {
        const key = kvMatch[1];
        let valStr = kvMatch[2].trim();
        lineIdx++;

        // Parse value
        let val: any;
        if (valStr.startsWith('"') && valStr.endsWith('"')) {
          val = valStr.substring(1, valStr.length - 1).replace(/\\"/g, '"');
        } else if (valStr === 'true') {
          val = true;
        } else if (valStr === 'false') {
          val = false;
        } else if (!isNaN(Number(valStr)) && valStr !== '') {
          val = Number(valStr);
        } else {
          val = valStr;
        }

        if (KNOWN_REPEATED_FIELDS.has(key)) {
          if (obj[key] === undefined) {
            obj[key] = [val];
          } else {
            obj[key].push(val);
          }
        } else {
          obj[key] = val;
        }
        continue;
      }

      lineIdx++;
    }
    return obj;
  }

  return parseObject();
}

export function stringifyTextProto(obj: any, indent = 0): string {
  const spaces = ' '.repeat(indent);
  let result = '';

  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val === undefined || val === null) {
      continue;
    }

    if (Array.isArray(val)) {
      for (const item of val) {
        if (typeof item === 'object') {
          result += `${spaces}${key} {\n`;
          result += stringifyTextProto(item, indent + 2);
          result += `${spaces}}\n`;
        } else {
          result += `${spaces}${key}: ${formatValue(item)}\n`;
        }
      }
    } else if (typeof val === 'object' && !(val instanceof Date)) {
      result += `${spaces}${key} {\n`;
      result += stringifyTextProto(val, indent + 2);
      result += `${spaces}}\n`;
    } else {
      result += `${spaces}${key}: ${formatValue(val)}\n`;
    }
  }

  return result;
}

function formatValue(val: any): string {
  if (val instanceof Date) {
    return `"${val.toISOString()}"`;
  }
  if (typeof val === 'string') {
    return `"${val.replace(/"/g, '\\"')}"`;
  }
  return String(val);
}
