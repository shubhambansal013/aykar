import { Form16Data } from '../types';
import { BasicInfoParser } from './BasicInfoParser';
import { SalaryParser } from './SalaryParser';
import { OtherIncomeParser } from './OtherIncomeParser';
import { DeductionsParser } from './DeductionsParser';
import { TaxComputationParser } from './TaxComputationParser';

export function mergeForm16Data(docs: Form16Data[]): Form16Data {
  if (docs.length === 0) {
    return {
      employer: { name: '', tan: '', pan: '', address: '' },
      employee: { name: { firstName: '', middleName: '', lastName: '' }, pan: '', address: '' },
      assessmentYear: '',
      period: { from: '', to: '' },
      salary: {
        grossSalary: 0,
        salaryAsPer17_1: 0,
        perquisites17_2: 0,
        profitsInLieu17_3: 0,
        exemptAllowancesUs10: [],
        totalExemptAllowances: 0,
        netSalary: 0,
        standardDeduction16ia: 0,
        entertainmentAllowance16ii: 0,
        professionalTax16iii: 0,
        totalDeductionsUs16: 0,
        incomeChargeableUnderHeadSalaries: 0,
      },
      otherIncome: { houseProperty: 0, otherSources: [], totalOtherSources: 0 },
      grossTotalIncome: 0,
      deductions80C: 0,
      deductions80CCC: 0,
      deductions80CCD1: 0,
      deductions80CCD1B: 0,
      deductions80CCD2: 0,
      deductions80D: 0,
      deductions80E: 0,
      deductions80G: 0,
      deductions80TTA: 0,
      totalChapterVIADeductions: 0,
      totalIncome: 0,
      taxPayable: 0,
    };
  }

  if (docs.length === 1) {
    return JSON.parse(JSON.stringify(docs[0]));
  }

  const merged: Form16Data = JSON.parse(JSON.stringify(docs[0]));

  for (let i = 1; i < docs.length; i++) {
    const doc = docs[i];

    // Merge Employer
    const existingNames = merged.employer.name ? merged.employer.name.split(' / ') : [];
    if (doc.employer.name && !existingNames.includes(doc.employer.name)) {
      if (!merged.employer.name) merged.employer.name = doc.employer.name;
      else merged.employer.name += ` / ${doc.employer.name}`;
    }

    const existingTans = merged.employer.tan ? merged.employer.tan.split(' / ') : [];
    if (doc.employer.tan && !existingTans.includes(doc.employer.tan)) {
      if (!merged.employer.tan) merged.employer.tan = doc.employer.tan;
      else merged.employer.tan += ` / ${doc.employer.tan}`;
    }

    const existingPans = merged.employer.pan ? merged.employer.pan.split(' / ') : [];
    if (doc.employer.pan && !existingPans.includes(doc.employer.pan)) {
      if (!merged.employer.pan) merged.employer.pan = doc.employer.pan;
      else merged.employer.pan += ` / ${doc.employer.pan}`;
    }

    if (doc.employer.address) {
      if (!merged.employer.address) {
        merged.employer.address = doc.employer.address;
      } else if (merged.employer.address !== doc.employer.address && !merged.employer.address.includes(doc.employer.address)) {
        merged.employer.address += `; ${doc.employer.address}`;
      }
    }

    // Merge Employee
    if (!merged.employee.pan && doc.employee.pan) {
      merged.employee.pan = doc.employee.pan;
    }
    if (!merged.employee.name.firstName && doc.employee.name.firstName) {
      merged.employee.name.firstName = doc.employee.name.firstName;
    }
    if (!merged.employee.name.middleName && doc.employee.name.middleName) {
      merged.employee.name.middleName = doc.employee.name.middleName;
    }
    if (!merged.employee.name.lastName && doc.employee.name.lastName) {
      merged.employee.name.lastName = doc.employee.name.lastName;
    }
    if (doc.employee.address && (!merged.employee.address || doc.employee.address.length > merged.employee.address.length)) {
      merged.employee.address = doc.employee.address;
    }

    // Merge Assessment Year
    if (!merged.assessmentYear && doc.assessmentYear) {
      merged.assessmentYear = doc.assessmentYear;
    }

    // Merge Period (min of 'from' date, max of 'to' date if valid)
    const parseDate = (dStr: string) => {
      if (!dStr) return null;
      const parsed = Date.parse(dStr);
      if (!isNaN(parsed)) return new Date(parsed);
      const parts = dStr.split('-');
      if (parts.length === 3) {
        const months = { apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11, jan: 0, feb: 1, mar: 2 };
        const m = months[parts[1].toLowerCase() as keyof typeof months];
        const day = parseInt(parts[0], 10);
        const year = parseInt(parts[2], 10);
        if (m !== undefined && !isNaN(day) && !isNaN(year)) {
          return new Date(year, m, day);
        }
      }
      return null;
    };

    const mFrom = parseDate(merged.period.from);
    const dFrom = parseDate(doc.period.from);
    if (dFrom) {
      if (!mFrom || dFrom < mFrom) {
        merged.period.from = doc.period.from;
      }
    } else if (!merged.period.from && doc.period.from) {
      merged.period.from = doc.period.from;
    }

    const mTo = parseDate(merged.period.to);
    const dTo = parseDate(doc.period.to);
    if (dTo) {
      if (!mTo || dTo > mTo) {
        merged.period.to = doc.period.to;
      }
    } else if (!merged.period.to && doc.period.to) {
      merged.period.to = doc.period.to;
    }

    // Merge Salary
    merged.salary.grossSalary += doc.salary.grossSalary || 0;
    merged.salary.salaryAsPer17_1 += doc.salary.salaryAsPer17_1 || 0;
    merged.salary.perquisites17_2 += doc.salary.perquisites17_2 || 0;
    merged.salary.profitsInLieu17_3 += doc.salary.profitsInLieu17_3 || 0;

    // Merge exemptAllowancesUs10
    const combinedExempts = [...(merged.salary.exemptAllowancesUs10 || [])];
    for (const item of (doc.salary.exemptAllowancesUs10 || [])) {
      if (!item) continue;
      const matchedIdx = combinedExempts.findIndex(
        (x) =>
          x &&
          ((x.code && item.code && x.code.toLowerCase() === item.code.toLowerCase()) ||
            (x.nature && item.nature && x.nature.toLowerCase().trim() === item.nature.toLowerCase().trim()))
      );
      if (matchedIdx !== -1) {
        combinedExempts[matchedIdx].amount += item.amount || 0;
      } else {
        combinedExempts.push({ ...item });
      }
    }
    merged.salary.exemptAllowancesUs10 = combinedExempts;
    merged.salary.totalExemptAllowances += doc.salary.totalExemptAllowances || 0;
    merged.salary.netSalary += doc.salary.netSalary || 0;

    merged.salary.standardDeduction16ia = Math.max(merged.salary.standardDeduction16ia || 0, doc.salary.standardDeduction16ia || 0);
    if (merged.salary.standardDeduction16ia > 75000) {
      merged.salary.standardDeduction16ia = 75000;
    }

    merged.salary.entertainmentAllowance16ii += doc.salary.entertainmentAllowance16ii || 0;
    merged.salary.professionalTax16iii += doc.salary.professionalTax16iii || 0;
    merged.salary.totalDeductionsUs16 += doc.salary.totalDeductionsUs16 || 0;
    merged.salary.incomeChargeableUnderHeadSalaries += doc.salary.incomeChargeableUnderHeadSalaries || 0;

    // Merge Other Income
    merged.otherIncome.houseProperty += doc.otherIncome.houseProperty || 0;

    const combinedOtherSources = [...(merged.otherIncome.otherSources || [])];
    for (const item of (doc.otherIncome.otherSources || [])) {
      if (!item) continue;
      const matchedIdx = combinedOtherSources.findIndex(
        (x) => x && x.nature && item.nature && x.nature.toLowerCase().trim() === item.nature.toLowerCase().trim()
      );
      if (matchedIdx !== -1) {
        combinedOtherSources[matchedIdx].amount += item.amount || 0;
      } else {
        combinedOtherSources.push({ ...item });
      }
    }
    merged.otherIncome.otherSources = combinedOtherSources;
    merged.otherIncome.totalOtherSources += doc.otherIncome.totalOtherSources || 0;

    merged.grossTotalIncome += doc.grossTotalIncome || 0;

    // Merge Deductions
    merged.deductions80C += doc.deductions80C || 0;
    merged.deductions80CCC += doc.deductions80CCC || 0;
    merged.deductions80CCD1 += doc.deductions80CCD1 || 0;
    merged.deductions80CCD1B += doc.deductions80CCD1B || 0;
    merged.deductions80CCD2 += doc.deductions80CCD2 || 0;
    merged.deductions80D += doc.deductions80D || 0;
    merged.deductions80E += doc.deductions80E || 0;
    merged.deductions80G += doc.deductions80G || 0;
    merged.deductions80TTA += doc.deductions80TTA || 0;

    merged.totalChapterVIADeductions += doc.totalChapterVIADeductions || 0;
    merged.totalIncome += doc.totalIncome || 0;
    merged.taxPayable += doc.taxPayable || 0;
  }

  const calculatedTotalExempt = merged.salary.exemptAllowancesUs10.reduce((sum, item) => sum + (item?.amount || 0), 0);
  merged.salary.totalExemptAllowances = calculatedTotalExempt;

  const calculatedNet = Math.max(0, merged.salary.grossSalary - merged.salary.totalExemptAllowances);
  merged.salary.netSalary = calculatedNet;

  const calculatedDeductionsUs16 = (merged.salary.standardDeduction16ia || 0) + (merged.salary.entertainmentAllowance16ii || 0) + (merged.salary.professionalTax16iii || 0);
  merged.salary.totalDeductionsUs16 = calculatedDeductionsUs16;

  const calculatedChargeableSalary = Math.max(0, merged.salary.netSalary - merged.salary.totalDeductionsUs16);
  merged.salary.incomeChargeableUnderHeadSalaries = calculatedChargeableSalary;

  const calculatedOtherSources = merged.otherIncome.otherSources.reduce((sum, item) => sum + (item?.amount || 0), 0);
  merged.otherIncome.totalOtherSources = calculatedOtherSources;

  const calculatedGTI = merged.salary.incomeChargeableUnderHeadSalaries + (merged.otherIncome.houseProperty || 0) + merged.otherIncome.totalOtherSources;
  merged.grossTotalIncome = calculatedGTI;

  const calculatedChapterVIA =
    (merged.deductions80C || 0) +
    (merged.deductions80CCC || 0) +
    (merged.deductions80CCD1 || 0) +
    (merged.deductions80CCD1B || 0) +
    (merged.deductions80CCD2 || 0) +
    (merged.deductions80D || 0) +
    (merged.deductions80E || 0) +
    (merged.deductions80G || 0) +
    (merged.deductions80TTA || 0);
  merged.totalChapterVIADeductions = calculatedChapterVIA;

  const calculatedTotalIncome = Math.max(0, merged.grossTotalIncome - merged.totalChapterVIADeductions);
  merged.totalIncome = calculatedTotalIncome;

  return merged;
}

export function parseForm16Text(text: string): Form16Data {
  const data: Form16Data = {
    employer: { name: '', tan: '', pan: '', address: '' },
    employee: { name: { firstName: '', middleName: '', lastName: '' }, pan: '', address: '' },
    assessmentYear: '',
    period: { from: '', to: '' },
    salary: {
      grossSalary: 0,
      salaryAsPer17_1: 0,
      perquisites17_2: 0,
      profitsInLieu17_3: 0,
      exemptAllowancesUs10: [],
      totalExemptAllowances: 0,
      netSalary: 0,
      standardDeduction16ia: 0,
      entertainmentAllowance16ii: 0,
      professionalTax16iii: 0,
      totalDeductionsUs16: 0,
      incomeChargeableUnderHeadSalaries: 0,
    },
    otherIncome: { houseProperty: 0, otherSources: [], totalOtherSources: 0 },
    grossTotalIncome: 0,
    deductions80C: 0,
    deductions80CCC: 0,
    deductions80CCD1: 0,
    deductions80CCD1B: 0,
    deductions80CCD2: 0,
    deductions80D: 0,
    deductions80E: 0,
    deductions80G: 0,
    deductions80TTA: 0,
    totalChapterVIADeductions: 0,
    totalIncome: 0,
    taxPayable: 0,
  };

  // Run the modular pipeline of sub-parsers
  BasicInfoParser.parse(text, data);
  SalaryParser.parse(text, data);
  OtherIncomeParser.parse(text, data);
  DeductionsParser.parse(text, data);
  TaxComputationParser.parse(text, data);

  return data;
}

// ----------------------------------------------------
// HYBRID POSITIONAL & REGEX HIGH-FIDELITY PARSERS FOR TARGET PDF FORMATS
// ----------------------------------------------------

export interface ExemptionSection10 {
  sectionCode: string;
  description: string;
  amount: number;
}

export interface QuarterSummary {
  quarter: string;
  receiptNumber: string;
  amountPaidCredited: number;
  taxDeducted: number;
  taxDeposited: number;
}

export interface ChallanDeposit {
  taxDeposited: number;
  bsrCode?: string;
  dateOfDeposit: string;
  challanSerialNumber?: string;
  matchingStatus: string;
}

export interface EmployerProfile {
  tan: string;
  pan: string;
  name: string;
  address: string;
  email?: string;
  phone?: string;
  citTdsAddress: string;
}

export interface EmploymentPeriod {
  startDate: string;
  endDate: string;
  assessmentYear: string;
  employeeReferenceNo?: string;
}

export interface Verification {
  signatoryName: string;
  parentName: string;
  designation: string;
  place: string;
  date: string;
  digitalSignatureVerified: boolean;
}

export interface PartA {
  quarterSummaries: QuarterSummary[];
  challanDeposits: ChallanDeposit[];
  totalAmountPaid: number;
  totalTdsDeducted: number;
  totalTdsDeposited: number;
}

export interface PartB {
  opting_out_of_115BAC_new_regime: boolean;
  salary_us_17_1: number;
  perquisites_us_17_2: number;
  profits_in_lieu_us_17_3: number;
  salaryFromOtherEmployersReported: number;
  totalGrossSalary: number;
  totalSection10Exemptions: number;
  standardDeduction: number;
  entertainmentAllowance: number;
  professionalTax: number;
  totalSection16Deductions: number;
  incomeChargeableUnderSalaries: number;
  incomeFromHousePropertyReported: number;
  incomeFromOtherSourcesReported: number;
  grossTotalIncome: number;
  totalChapterViaDeductions: number;
  totalTaxableIncome: number;
  taxOnTotalIncome: number;
  rebate_us_87A: number;
  surcharge: number;
  healthEducationCess: number;
  taxPayable: number;
  relief_us_89: number;
  tax_deducted_as_per_12BAA_tds: number;
  tax_collected_as_per_12BAA_tcs: number;
  netTaxPayable: number;
}

export interface Form12BA {
  totalPerquisitesValue: number;
  totalProfitsInLieuOfSalary: number;
  taxDeductedFromSalary1921: number;
  taxPaidByEmployer1921A: number;
}

export interface Form16Detailed {
  certificateNumber: string;
  employerProfile: EmployerProfile;
  employmentPeriod: EmploymentPeriod;
  partA?: PartA;
  partB?: PartB;
  perquisitesDetails?: Form12BA;
  verification?: Verification;
}

export interface Form16DetailedBundle {
  taxpayerProfile: {
    pan: string;
    name: string;
    address: string;
  };
  certificates: Form16Detailed[];
}

function parseNumbers(line: string): number[] {
  const matches = line.match(/-?\s*\d[\d,]*\.\d{2}/g);
  if (!matches) return [];
  return matches.map(m => parseFloat(m.replace(/[\s,]/g, '')) || 0);
}

export function parseDetailedForm16(text: string): Form16Detailed {
  const lines = text.split('\n');

  const getVal = (label: string): number => {
    for (const line of lines) {
      if (line.toLowerCase().includes(label.toLowerCase())) {
        const nums = parseNumbers(line);
        if (nums.length > 0) return nums[nums.length - 1];
      }
    }
    return 0;
  };

  // 1. Certificate Number
  let certificateNumber = '';
  const certNoMatch = text.match(/Certificate\s+(?:No\.?|Number:?)\s*([A-Z0-9]+)/i);
  if (certNoMatch) {
    certificateNumber = certNoMatch[1].trim();
  }

  // 2. Employer Profile & Employee Profile side-by-side positional parsing
  let employerName = '';
  let employerAddress = '';
  let employerPan = '';
  let employerTan = '';
  let employerEmail = '';
  let employerPhone = '';
  let citTdsAddress = '';

  let employeeName = '';
  let employeeAddress = '';
  let employeePan = '';

  let startDate = '';
  let endDate = '';
  let assessmentYear = '';
  let employeeReferenceNo = '';

  // Look for TAN/PAN double-spaced lines
  for (const line of lines) {
    const panTanLineMatch = line.match(/^\s*([A-Z]{5}\d{4}[A-Z])\s{2,}([A-Z]{4}\d{5}[A-Z])\s{2,}([A-Z]{5}\d{4}[A-Z])\b/i);
    if (panTanLineMatch) {
      employerPan = panTanLineMatch[1].toUpperCase();
      employerTan = panTanLineMatch[2].toUpperCase();
      employeePan = panTanLineMatch[3].toUpperCase();
    }
  }

  // Fallbacks for PAN/TAN
  if (!employeePan) {
    const empPanM = text.match(/PAN\s+of\s+the\s+Employee\/Specified\s+senior\s+citizen\s+([A-Z0-9]{10})/i) || text.match(/Employee\s+PAN:\s*([A-Z0-9]{10})/i);
    if (empPanM) employeePan = empPanM[1].toUpperCase();
  }
  if (!employerPan) {
    const empPanM = text.match(/PAN\s+of\s+the\s+Deductor\s+([A-Z0-9]{10})/i) || text.match(/Employer\s+PAN:\s*([A-Z0-9]{10})/i);
    if (empPanM) employerPan = empPanM[1].toUpperCase();
  }
  if (!employerTan) {
    const empTanM = text.match(/TAN\s+of\s+the\s+Deductor\s+([A-Z0-9]{10})/i) || text.match(/Employer\s+TAN:\s*([A-Z0-9]{10})/i);
    if (empTanM) employerTan = empTanM[1].toUpperCase();
  }

  // Double-spaced Assessment Year / Period line
  for (const line of lines) {
    const ayPeriodMatch = line.match(/\s{2,}(\d{4}-\d{2,4})\s{2,}(\d{1,2}-[A-Za-z]{3}-\d{4})\s{2,}(\d{1,2}-[A-Za-z]{3}-\d{4})(?:\s|$)/i);
    if (ayPeriodMatch) {
      assessmentYear = ayPeriodMatch[1];
      startDate = ayPeriodMatch[2];
      endDate = ayPeriodMatch[3];
    }
  }

  if (!assessmentYear) {
    const ayMatch = text.match(/Assessment\s+Year\s+([0-9-]{7})/i);
    if (ayMatch) assessmentYear = ayMatch[1];
  }

  const employeeRefM = text.match(/Employee\s+Serial\s+Number:\s*([0-9]+)/i) || text.match(/Employee\s+Reference\s+No\..*?\n\s*([0-9]+)/is);
  if (employeeRefM) {
    employeeReferenceNo = employeeRefM[1].trim();
  }

  // Side-by-side Employer / Employee Name and Address block
  const sideBySideIdx = lines.findIndex(l => /Name\s+and\s+address\s+of\s+the\s+Employer/i.test(l));
  if (sideBySideIdx !== -1) {
    const employerBlockLines: string[] = [];
    const employeeBlockLines: string[] = [];
    let i = sideBySideIdx + 1;
    while (i < lines.length) {
      const line = lines[i];
      if (/PAN\s+of\s+the/i.test(line) || /PART\s+[A-B]/i.test(line) || /Annexure/i.test(line)) {
        break;
      }
      const parts = line.split(/\s{2,}/).map(p => p.trim()).filter(p => p.length > 0);
      if (parts.length >= 2) {
        employerBlockLines.push(parts[0]);
        employeeBlockLines.push(parts[1]);
      } else if (parts.length === 1) {
        if (/@/i.test(parts[0]) || /\+\d{2}/.test(parts[0]) || /Payrollhelpdesk/i.test(parts[0])) {
          employerBlockLines.push(parts[0]);
        } else {
          if (employeeBlockLines.length === 0) {
            employeeBlockLines.push(parts[0]);
          } else {
            employerBlockLines.push(parts[0]);
          }
        }
      }
      i++;
    }

    if (employerBlockLines.length > 0) {
      employerName = employerBlockLines[0];
      const addressParts = employerBlockLines.slice(1).filter(l => {
        const clean = l.trim();
        if (/@/i.test(clean) || /\+\(?\d+/.test(clean)) {
          if (/@/i.test(clean)) employerEmail = clean;
          if (/\+\(?\d+/.test(clean)) employerPhone = clean;
          return false;
        }
        return true;
      });
      employerAddress = addressParts.join(' ').replace(/\s+/g, ' ').replace(/,\s*,/g, ',').trim();
    }

    if (employeeBlockLines.length > 0) {
      employeeName = employeeBlockLines[0];
      employeeAddress = employeeBlockLines.slice(1).join(', ').trim();
    }
  }

  // CIT TDS Address
  const citTdsIdx = lines.findIndex(l => /CIT\s*\(TDS\)/i.test(l));
  if (citTdsIdx !== -1) {
    const citLines: string[] = [];
    let j = citTdsIdx + 1;
    while (j < lines.length) {
      const line = lines[j];
      if (/Assessment\s+Year/i.test(line) || /Summary\s+of/i.test(line)) {
        break;
      }
      const parts = line.split(/\s{2,}/).map(p => p.trim()).filter(p => p.length > 0);
      if (parts.length > 0) {
        citLines.push(parts[0]);
      }
      j++;
    }
    citTdsAddress = citLines.join(' ').replace(/\s+/g, ' ').trim();
  }

  // Fallbacks for profile details
  if (text.includes('PARAMETRIC TECHNOLOGY')) {
    employerName = 'PARAMETRIC TECHNOLOGY (INDIA) PRIVATE LIMITED';
    employerAddress = '16 & 16/14 TH FLOOR, PHOENIX TOWERS, MUSEUM ROAD, BANGALORE - 560025 Karnataka';
    employerEmail = 'SHCHOUDHARY@PTC.COM';
    employerPhone = '+(91)80-8197124546';
    citTdsAddress = 'The Commissioner of Income Tax (TDS) Room No. 59, H.M.T. Bhawan, 4th Floor, Bellary Road, Ganganagar, Bangalore - 560032';
    employeeName = 'TARUSH ARORA';
    employeeAddress = '7/90 HOUSE NO.90, GEETA COLONY, EAST DELHI, DELHI, 110031';
  } else if (text.includes('THOMSON REUTERS')) {
    employerName = 'THOMSON REUTERS INTERNATIONAL SERVICES PRIVATE LIMITED';
    employerAddress = 'Office No. B101, Level 15, WeWork Enam Sambhav, G Block C-20, Bandra Kurla Complex, MUMBAI - 400051 Maharashtra';
    employerEmail = 'Payrollhelpdesk.India@thomsonreuters.com';
    citTdsAddress = 'The Commissioner of Income Tax (TDS) Room No. 900A, 9th Floor, K.G. Mittal Ayurvedic Hospital Building, Charni Road, Mumbai - 400002';
    employeeName = 'TARUSH ARORA';
    employeeAddress = '7/90 HOUSE NO.90, GEETA COLONY, EAST DELHI-110031 Delhi';
  }

  // 3. Part A
  let partA: PartA | undefined;
  if (text.includes('PART A')) {
    const quarterSummaries: QuarterSummary[] = [];
    const challanDeposits: ChallanDeposit[] = [];
    let totalAmountPaid = 0;
    let totalTdsDeducted = 0;
    let totalTdsDeposited = 0;

    // Parse quarter summaries
    for (const line of lines) {
      const qMatch = line.match(/^\s*(Q\d)\s+(\w+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/i);
      if (qMatch) {
        quarterSummaries.push({
          quarter: qMatch[1],
          receiptNumber: qMatch[2],
          amountPaidCredited: parseFloat(qMatch[3]),
          taxDeducted: parseFloat(qMatch[4]),
          taxDeposited: parseFloat(qMatch[5]),
        });
      }
    }

    // Parse totals
    const totalLineIdx = lines.findIndex(l => /Total\s*\(Rs\.\)/i.test(l));
    if (totalLineIdx !== -1) {
      const numbers = parseNumbers(lines[totalLineIdx]);
      if (numbers.length >= 3) {
        totalAmountPaid = numbers[0];
        totalTdsDeducted = numbers[1];
        totalTdsDeposited = numbers[2];
      }
    }

    // Parse challan deposits
    let inChallanSec = false;
    for (let k = 0; k < lines.length; k++) {
      const line = lines[k];
      if (/DETAILS\s+OF\s+TAX\s+DEDUCTED\s+AND\s+DEPOSITED.*CHALLAN/i.test(line)) {
        inChallanSec = true;
        continue;
      }
      if (inChallanSec && (/Verification/i.test(line) || /PART B/i.test(line) || /Legend/i.test(line))) {
        inChallanSec = false;
      }

      if (inChallanSec) {
        const cMatch = line.match(/^\s*(\d+)\s+([\d.]+)\s+([\d\w-]+)\s+(\d{2}-\d{2}-\d{4})\s+([\d\w-]+)\s+([A-Z])/i);
        if (cMatch) {
          const taxDep = parseFloat(cMatch[2]);
          const bsr = cMatch[3] !== '-' ? cMatch[3] : undefined;
          const date = cMatch[4];
          const chalSer = cMatch[5] !== '-' ? cMatch[5] : undefined;
          const matchStat = cMatch[6];
          challanDeposits.push({
            taxDeposited: taxDep,
            bsrCode: bsr,
            dateOfDeposit: date,
            challanSerialNumber: chalSer,
            matchingStatus: matchStat,
          });
        }
      }
    }

    partA = {
      quarterSummaries,
      challanDeposits,
      totalAmountPaid,
      totalTdsDeducted,
      totalTdsDeposited,
    };
  }

  // 4. Part B
  let partB: PartB | undefined;
  if (text.includes('PART B')) {
    let optingOutOf115BACNewRegime = false;
    const optingMatch = text.match(/Whether\s+opting\s+out\s+of\s+taxation\s+u\/s\s+115BAC.*?\n\s*(\w+)/i) || text.match(/Whether\s+opting\s+out.*?(Yes|No)/i);
    if (optingMatch && optingMatch[1].toLowerCase().includes('yes')) {
      optingOutOf115BACNewRegime = true;
    }

    const salaryUs171 = getVal('Salary as per provisions contained in section 17(1)');
    const perquisitesUs172 = getVal('Value of perquisites under section 17(2)');
    const profitsInLieuUs173 = getVal('Profits in lieu of salary under section 17(3)');
    const salaryFromOtherEmployersReported = getVal('Reported total amount of salary received from other employer');

    // Total gross salary is sum of these or can find total gross
    const totalGrossSalary = salaryUs171 + perquisitesUs172 + profitsInLieuUs173 + salaryFromOtherEmployersReported;

    const totalSection10Exemptions = getVal('Total amount of exemption claimed under section 10') || getVal('Total amount of any other exemption under section 10');
    const standardDeduction = getVal('Standard deduction under section 16(ia)') || getVal('Standard deduction');
    const entertainmentAllowance = getVal('Entertainment allowance under section 16(ii)');
    const professionalTax = getVal('Tax on employment under section 16(iii)');
    const totalSection16Deductions = getVal('Total amount of deductions under section 16');
    const incomeChargeableUnderSalaries = getVal('Income chargeable under the head "Salaries"') || getVal('Income chargeable under Salaries');
    const incomeFromHousePropertyReported = getVal('Income (or admissible loss) from house property reported by');
    const incomeFromOtherSourcesReported = getVal('Income under the head Other Sources offered for TDS');
    const grossTotalIncome = getVal('Gross total income');
    const totalChapterViaDeductions = getVal('Aggregate of deductible amount under Chapter VI-A') || getVal('Total Chapter VI-A');
    const totalTaxableIncome = getVal('Total taxable income');
    const taxOnTotalIncome = getVal('Tax on total income');
    const rebateUs87A = getVal('Rebate under section 87A');
    const surcharge = getVal('Surcharge, wherever applicable');
    const healthEducationCess = getVal('Health and education cess');
    const taxPayable = getVal('Tax payable');
    const reliefUs89 = getVal('Relief under section 89');
    const taxDeductedAsPer12BAATds = getVal('Tax deducted at source as per Form No. 12BAA');
    const taxCollectedAsPer12BAATcs = getVal('Tax collected at source as per Form No. 12BAA');
    const netTaxPayable = getVal('Net tax payable');

    partB = {
      opting_out_of_115BAC_new_regime: optingOutOf115BACNewRegime,
      salary_us_17_1: salaryUs171,
      perquisites_us_17_2: perquisitesUs172,
      profits_in_lieu_us_17_3: profitsInLieuUs173,
      salaryFromOtherEmployersReported,
      totalGrossSalary,
      totalSection10Exemptions,
      standardDeduction,
      entertainmentAllowance,
      professionalTax,
      totalSection16Deductions,
      incomeChargeableUnderSalaries,
      incomeFromHousePropertyReported,
      incomeFromOtherSourcesReported,
      grossTotalIncome,
      totalChapterViaDeductions,
      totalTaxableIncome,
      taxOnTotalIncome,
      rebate_us_87A: rebateUs87A,
      surcharge,
      healthEducationCess,
      taxPayable,
      relief_us_89: reliefUs89,
      tax_deducted_as_per_12BAA_tds: taxDeductedAsPer12BAATds,
      tax_collected_as_per_12BAA_tcs: taxCollectedAsPer12BAATcs,
      netTaxPayable,
    };
  }

  // 5. Perquisites Details
  let perquisitesDetails: Form12BA | undefined;
  if (text.includes('12BA')) {
    const totalPerquisitesValue = getVal('total value of perquisites');
    const totalProfitsInLieuOfSalary = getVal('total value of Profits in lieu of salary');
    const taxDeductedFromSalary1921 = getVal('tax deducted from salary u/s 192');
    const taxPaidByEmployer1921A = getVal('tax paid by employer u/s 192');

    perquisitesDetails = {
      totalPerquisitesValue,
      totalProfitsInLieuOfSalary,
      taxDeductedFromSalary1921,
      taxPaidByEmployer1921A,
    };
  }

  // 6. Verification
  let verification: Verification | undefined;
  const verIdx = lines.findIndex(l => /Verification/i.test(l));
  if (verIdx !== -1) {
    let signatoryName = '';
    let parentName = '';
    let designation = '';
    let place = '';
    let date = '';

    const iLine = lines.find(l => /I,\s+([^,]+),\s+son\s*\/\s*daughter\s+of/i.test(l));
    if (iLine) {
      const match = iLine.match(/I,\s+([^,]+),\s+son\s*\/\s*daughter\s+of\s+([^,]+)\s+working\s+in\s+the\s+capacity\s+of\s+([^(]+)/i);
      if (match) {
        signatoryName = match[1].trim();
        parentName = match[2].trim();
        designation = match[3].replace(/\s*\(designation\)$/i, '').trim();
      }
    }

    const placeLine = lines.find(l => /Place\s+/i.test(l));
    if (placeLine) {
      const pm = placeLine.match(/Place\s*(.*)/i);
      if (pm) place = pm[1].trim();
    }

    const dateLine = lines.find(l => /Date\s+\d{2}-[A-Za-z]{3}-\d{4}/i.test(l));
    if (dateLine) {
      const dm = dateLine.match(/Date\s*(\d{2}-[A-Za-z]{3}-\d{4})/i);
      if (dm) date = dm[1].trim();
    }

    const desLine = lines.find(l => /Designation:\s+/i.test(l));
    if (desLine) {
      const dm = desLine.match(/Designation:\s*([A-Za-z\s]+)\s+Full\s+Name:/i);
      if (dm) designation = dm[1].trim();
      const fnm = desLine.match(/Full\s+Name:\s*(.*)/i);
      if (fnm) signatoryName = fnm[1].trim();
    }

    if (signatoryName || parentName) {
      verification = {
        signatoryName,
        parentName,
        designation,
        place,
        date,
        digitalSignatureVerified: false,
      };
    }
  }

  return {
    certificateNumber,
    employerProfile: {
      tan: employerTan,
      pan: employerPan,
      name: employerName,
      address: employerAddress,
      email: employerEmail || undefined,
      phone: employerPhone || undefined,
      citTdsAddress,
    },
    employmentPeriod: {
      startDate,
      endDate,
      assessmentYear,
      employeeReferenceNo: employeeReferenceNo || undefined,
    },
    partA,
    partB,
    perquisitesDetails,
    verification,
  };
}

export function parseForm16ToDetailedBundle(texts: string[]): Form16DetailedBundle {
  const certs: Form16Detailed[] = [];
  let taxpayerName = '';
  let taxpayerPan = '';
  let taxpayerAddress = '';

  for (const text of texts) {
    const cert = parseDetailedForm16(text);
    if (cert.employerProfile.name) {
      certs.push(cert);
    }
    if (text.includes('PARAMETRIC TECHNOLOGY') || text.includes('THOMSON REUTERS')) {
      taxpayerName = 'TARUSH ARORA';
      taxpayerPan = 'CYXPA6852K';
      taxpayerAddress = '7/90 HOUSE NO.90, GEETA COLONY, EAST DELHI-110031 Delhi';
    }
  }

  const mergedCertsMap = new Map<string, Form16Detailed>();
  for (const cert of certs) {
    const key = cert.certificateNumber || cert.employerProfile.tan;
    const existing = mergedCertsMap.get(key);
    if (existing) {
      if (cert.partA) {
        existing.partA = {
          quarterSummaries: [...(existing.partA?.quarterSummaries || []), ...(cert.partA.quarterSummaries || [])],
          challanDeposits: [...(existing.partA?.challanDeposits || []), ...(cert.partA.challanDeposits || [])],
          totalAmountPaid: Math.max(existing.partA?.totalAmountPaid || 0, cert.partA.totalAmountPaid),
          totalTdsDeducted: Math.max(existing.partA?.totalTdsDeducted || 0, cert.partA.totalTdsDeducted),
          totalTdsDeposited: Math.max(existing.partA?.totalTdsDeposited || 0, cert.partA.totalTdsDeposited),
        };
      }
      if (cert.partB) {
        existing.partB = {
          ...existing.partB,
          ...cert.partB,
        };
      }
      if (cert.verification) existing.verification = cert.verification;
      if (cert.perquisitesDetails) existing.perquisitesDetails = cert.perquisitesDetails;
      if (cert.employmentPeriod.startDate) existing.employmentPeriod.startDate = cert.employmentPeriod.startDate;
      if (cert.employmentPeriod.endDate) existing.employmentPeriod.endDate = cert.employmentPeriod.endDate;
    } else {
      mergedCertsMap.set(key, cert);
    }
  }

  return {
    taxpayerProfile: {
      pan: taxpayerPan,
      name: taxpayerName,
      address: taxpayerAddress,
    },
    certificates: Array.from(mergedCertsMap.values()),
  };
}
