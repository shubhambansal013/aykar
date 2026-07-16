import React from 'react';
import { Form16Data } from '@/lib/types';
import { TextField, Tooltip, InputAdornment } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';

export interface FieldCue {
  status: 'success' | 'warning' | 'error' | 'none';
  message: string;
}

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const TAN_REGEX = /^[A-Z]{4}[0-9]{5}[A-Z]$/;

export function getFieldCue(path: string, data: Form16Data | null): FieldCue {
  if (!data) {
    return { status: 'none', message: 'No data' };
  }

  const parts = path.split('.');

  // Helper to get nested value
  const getValue = (obj: any, keys: string[]): any => {
    let current = obj;
    for (const key of keys) {
      if (current === undefined || current === null) return undefined;
      current = current[key];
    }
    return current;
  };

  const val = getValue(data, parts);

  // General check for emptyness/negatives
  const isNum = typeof val === 'number';

  switch (path) {
    // Employer Details
    case 'employer.name':
      if (!val || val.trim() === '') {
        return { status: 'warning', message: 'Employer name is missing.' };
      }
      return { status: 'success', message: 'Employer name is verified.' };
    case 'employer.pan':
      if (!val || val.trim() === '') {
        return { status: 'warning', message: 'Employer PAN is missing.' };
      }
      if (!PAN_REGEX.test(val.trim().toUpperCase())) {
        return { status: 'error', message: 'Invalid Employer PAN format (Expected format: ABCDE1234F).' };
      }
      return { status: 'success', message: 'Employer PAN format is valid.' };
    case 'employer.tan':
      if (!val || val.trim() === '') {
        return { status: 'warning', message: 'Employer TAN is missing.' };
      }
      if (!TAN_REGEX.test(val.trim().toUpperCase())) {
        return { status: 'error', message: 'Invalid Employer TAN format (Expected format: ABCD12345E).' };
      }
      return { status: 'success', message: 'Employer TAN format is valid.' };
    case 'employer.address':
      if (!val || val.trim() === '') {
        return { status: 'warning', message: 'Employer address is missing.' };
      }
      return { status: 'success', message: 'Employer address is verified.' };

    // Employee Details
    case 'employee.name.firstName':
      if (!val || val.trim() === '') {
        return { status: 'error', message: 'Employee First Name is required.' };
      }
      return { status: 'success', message: 'Employee First Name is verified.' };
    case 'employee.name.middleName':
      return { status: 'none', message: '' };
    case 'employee.name.lastName':
      if (!val || val.trim() === '') {
        return { status: 'error', message: 'Employee Last Name is required.' };
      }
      return { status: 'success', message: 'Employee Last Name is verified.' };
    case 'employee.pan':
      if (!val || val.trim() === '') {
        return { status: 'error', message: 'Employee PAN is required.' };
      }
      if (!PAN_REGEX.test(val.trim().toUpperCase())) {
        return { status: 'error', message: 'Invalid Employee PAN format (Expected format: ABCDE1234F).' };
      }
      return { status: 'success', message: 'Employee PAN format is valid.' };
    case 'employee.address':
      if (!val || val.trim() === '') {
        return { status: 'warning', message: 'Employee address is missing.' };
      }
      return { status: 'success', message: 'Employee address is verified.' };

    // General Assessment details
    case 'assessmentYear':
      if (!val || val.trim() === '') {
        return { status: 'warning', message: 'Assessment Year is missing.' };
      }
      if (!/^\d{4}-\d{2}$/.test(val.trim()) && !/^\d{4}-\d{4}$/.test(val.trim())) {
        return { status: 'warning', message: 'Expected Assessment Year format (e.g. 2026-27 or 2025-2026).' };
      }
      return { status: 'success', message: 'Assessment Year format is valid.' };
    case 'period.from':
      if (!val || val.trim() === '') {
        return { status: 'warning', message: 'Period From date is missing.' };
      }
      return { status: 'success', message: 'Period From is verified.' };
    case 'period.to':
      if (!val || val.trim() === '') {
        return { status: 'warning', message: 'Period To date is missing.' };
      }
      return { status: 'success', message: 'Period To is verified.' };

    // Salary Details
    case 'salary.grossSalary': {
      const calcGross = (data.salary?.salaryAsPer17_1 || 0) + (data.salary?.perquisites17_2 || 0) + (data.salary?.profitsInLieu17_3 || 0);
      if (Math.abs((val || 0) - calcGross) > 1) {
        return { status: 'error', message: `Gross Salary (₹${val}) must equal standard components sum 17(1) + 17(2) + 17(3) = ₹${calcGross}.` };
      }
      return { status: 'success', message: 'Gross Salary matches components sum.' };
    }
    case 'salary.salaryAsPer17_1':
      if (val < 0) return { status: 'error', message: 'Value cannot be negative.' };
      return { status: 'none', message: '' };
    case 'salary.perquisites17_2':
      if (val < 0) return { status: 'error', message: 'Value cannot be negative.' };
      return { status: 'none', message: '' };
    case 'salary.profitsInLieu17_3':
      if (val < 0) return { status: 'error', message: 'Value cannot be negative.' };
      return { status: 'none', message: '' };
    case 'salary.totalExemptAllowances': {
      const sumAlw = (data.salary?.exemptAllowancesUs10 || []).reduce((sum, item) => sum + (item?.amount || 0), 0);
      if (Math.abs((val || 0) - sumAlw) > 1) {
        return { status: 'warning', message: `Total Exempt Allowances (₹${val}) does not match sum of individual allowances (₹${sumAlw}).` };
      }
      return { status: 'success', message: 'Total Exempt Allowances is verified.' };
    }
    case 'salary.netSalary': {
      const calcNet = (data.salary?.grossSalary || 0) - (data.salary?.totalExemptAllowances || 0);
      if (Math.abs((val || 0) - calcNet) > 1) {
        return { status: 'error', message: `Net Salary (₹${val}) must equal Gross Salary (₹${data.salary?.grossSalary || 0}) minus Exempt Allowances (₹${data.salary?.totalExemptAllowances || 0}) = ₹${calcNet}.` };
      }
      return { status: 'success', message: 'Net Salary calculation is consistent.' };
    }
    case 'salary.standardDeduction16ia':
      if (val < 0) return { status: 'error', message: 'Value cannot be negative.' };
      if (val > 75000) {
        return { status: 'error', message: 'Standard deduction (u/s 16ia) cannot exceed ₹75,000 for AY 2026-27.' };
      }
      return { status: 'success', message: 'Standard deduction value is within limits.' };
    case 'salary.entertainmentAllowance16ii':
      if (val < 0) return { status: 'error', message: 'Value cannot be negative.' };
      return { status: 'none', message: '' };
    case 'salary.professionalTax16iii':
      if (val < 0) return { status: 'error', message: 'Value cannot be negative.' };
      return { status: 'none', message: '' };
    case 'salary.totalDeductionsUs16': {
      const calcDeductions = (data.salary?.standardDeduction16ia || 0) + (data.salary?.entertainmentAllowance16ii || 0) + (data.salary?.professionalTax16iii || 0);
      if (Math.abs((val || 0) - calcDeductions) > 1) {
        return { status: 'error', message: `Total deductions u/s 16 (₹${val}) must equal sum of SD (u/s 16ia) + EA (16ii) + PT (16iii) = ₹${calcDeductions}.` };
      }
      return { status: 'success', message: 'Total deductions u/s 16 are consistent.' };
    }
    case 'salary.incomeChargeableUnderHeadSalaries': {
      const calcChargeable = (data.salary?.netSalary || 0) - (data.salary?.totalDeductionsUs16 || 0);
      if (Math.abs((val || 0) - calcChargeable) > 1) {
        return { status: 'error', message: `Income chargeable under head Salaries (₹${val}) must equal Net Salary (₹${data.salary?.netSalary || 0}) minus Total Deductions u/s 16 (₹${data.salary?.totalDeductionsUs16 || 0}) = ₹${calcChargeable}.` };
      }
      return { status: 'success', message: 'Income Chargeable under head Salaries calculation is consistent.' };
    }

    // Other Income
    case 'otherIncome.houseProperty':
      if (val < 0) return { status: 'error', message: 'Value cannot be negative.' };
      return { status: 'none', message: '' };
    case 'otherIncome.totalOtherSources': {
      const sumOS = (data.otherIncome?.otherSources || []).reduce((sum, item) => sum + (item?.amount || 0), 0);
      if (Math.abs((val || 0) - sumOS) > 1) {
        return { status: 'warning', message: `Total other sources (₹${val}) does not match individual item sum (₹${sumOS}).` };
      }
      return { status: 'success', message: 'Verified.' };
    }

    // Gross Total Income
    case 'grossTotalIncome': {
      const calcGTI = (data.salary?.incomeChargeableUnderHeadSalaries || 0) + (data.otherIncome?.houseProperty || 0) + (data.otherIncome?.totalOtherSources || 0);
      if (Math.abs((val || 0) - calcGTI) > 1) {
        return { status: 'error', message: `Gross Total Income (₹${val}) must equal Salaries (₹${data.salary?.incomeChargeableUnderHeadSalaries || 0}) + HP (₹${data.otherIncome?.houseProperty || 0}) + Other Sources (₹${data.otherIncome?.totalOtherSources || 0}) = ₹${calcGTI}.` };
      }
      return { status: 'success', message: 'Gross Total Income calculation is consistent.' };
    }

    // Chapter VI-A Deductions
    case 'deductions80C':
      if (val < 0) return { status: 'error', message: 'Value cannot be negative.' };
      if (val > 150000) {
        return { status: 'error', message: 'Section 80C deduction cannot exceed ₹1,50,000.' };
      }
      return { status: 'success', message: 'Section 80C is within limits.' };
    case 'deductions80CCC':
      if (val < 0) return { status: 'error', message: 'Value cannot be negative.' };
      return { status: 'none', message: '' };
    case 'deductions80CCD1':
      if (val < 0) return { status: 'error', message: 'Value cannot be negative.' };
      return { status: 'none', message: '' };
    case 'deductions80CCD1B':
      if (val < 0) return { status: 'error', message: 'Value cannot be negative.' };
      if (val > 50000) {
        return { status: 'error', message: 'Section 80CCD(1B) deduction cannot exceed ₹50,000.' };
      }
      return { status: 'success', message: 'Section 80CCD(1B) is within limits.' };
    case 'deductions80CCD2':
      if (val < 0) return { status: 'error', message: 'Value cannot be negative.' };
      return { status: 'none', message: '' };
    case 'deductions80D':
      if (val < 0) return { status: 'error', message: 'Value cannot be negative.' };
      return { status: 'none', message: '' };
    case 'deductions80E':
      if (val < 0) return { status: 'error', message: 'Value cannot be negative.' };
      return { status: 'none', message: '' };
    case 'deductions80G':
      if (val < 0) return { status: 'error', message: 'Value cannot be negative.' };
      return { status: 'none', message: '' };
    case 'deductions80TTA':
      if (val < 0) return { status: 'error', message: 'Value cannot be negative.' };
      if (val > 10000) {
        return { status: 'error', message: 'Section 80TTA deduction cannot exceed ₹10,000.' };
      }
      return { status: 'success', message: 'Section 80TTA is within limits.' };
    case 'totalChapterVIADeductions': {
      const calcDeductionsSum =
        (data.deductions80C || 0) +
        (data.deductions80CCC || 0) +
        (data.deductions80CCD1 || 0) +
        (data.deductions80CCD1B || 0) +
        (data.deductions80CCD2 || 0) +
        (data.deductions80D || 0) +
        (data.deductions80E || 0) +
        (data.deductions80G || 0) +
        (data.deductions80TTA || 0);
      if (Math.abs((val || 0) - calcDeductionsSum) > 1) {
        return { status: 'error', message: `Total Chapter VI-A Deductions (₹${val}) must equal sum of individual sections (80C, 80D, etc.) = ₹${calcDeductionsSum}.` };
      }
      return { status: 'success', message: 'Total Chapter VI-A Deductions matches individual items.' };
    }

    // Tax Summary
    case 'totalIncome': {
      const calcTI = Math.max(0, (data.grossTotalIncome || 0) - (data.totalChapterVIADeductions || 0));
      if (Math.abs((val || 0) - calcTI) > 1) {
        return { status: 'error', message: `Total Income (₹${val}) must equal Gross Total Income minus Chapter VI-A Deductions = ₹${calcTI}.` };
      }
      return { status: 'success', message: 'Total Income matches calculation.' };
    }
    case 'taxPayable':
      if (val < 0) return { status: 'error', message: 'Value cannot be negative.' };
      return { status: 'none', message: '' };

    case 'taxCredits.tdsSalary': {
      const form16Tds = data.taxPayable;
      if (val < 0) return { status: 'error', message: 'Value cannot be negative.' };
      if (form16Tds > 0 && val !== form16Tds) {
        return { status: 'warning', message: `TDS on Salary (₹${val}) does not match Form-16 TDS (₹${form16Tds}).` };
      }
      return { status: 'success', message: 'TDS on Salary is verified.' };
    }
    case 'taxCredits.tdsOther':
      if (val < 0) return { status: 'error', message: 'Value cannot be negative.' };
      return { status: 'none', message: '' };
    case 'taxCredits.tcs':
      if (val < 0) return { status: 'error', message: 'Value cannot be negative.' };
      return { status: 'none', message: '' };
    case 'taxCredits.advanceTax':
      if (val < 0) return { status: 'error', message: 'Value cannot be negative.' };
      return { status: 'none', message: '' };
    case 'taxCredits.selfAssessmentTax':
      if (val < 0) return { status: 'error', message: 'Value cannot be negative.' };
      return { status: 'none', message: '' };

    default:
      if (isNum && val < 0) {
        return { status: 'error', message: 'Value cannot be negative.' };
      }
      return { status: 'none', message: '' };
  }
}

interface CueTextFieldProps {
  label: string;
  path: string;
  type?: 'text' | 'number';
  isMonospace?: boolean;
  uppercase?: boolean;
  startAdornment?: React.ReactNode;
  data: Form16Data;
  onChange: (value: any) => void;
  originalData?: Form16Data | null;
  appliedAiSuggestions?: Form16Data | null;
}

export function CueTextField({
  label,
  path,
  type = 'text',
  isMonospace = false,
  uppercase = false,
  startAdornment,
  data,
  onChange,
  originalData = null,
  appliedAiSuggestions = null,
}: CueTextFieldProps) {
  const getNestedValue = (obj: any, keyPath: string): any => {
    const keys = keyPath.split('.');
    let current = obj;
    for (const key of keys) {
      if (current === undefined || current === null) return '';
      current = current[key];
    }
    return current ?? '';
  };

  const val = getNestedValue(data, path);
  const cue = getFieldCue(path, data);

  const isNone = cue.status === 'none';

  // Compare values to determine state modification indicators
  const originalVal = originalData ? getNestedValue(originalData, path) : undefined;
  const aiSuggestedVal = appliedAiSuggestions ? getNestedValue(appliedAiSuggestions, path) : undefined;

  let modificationLabel = '';
  let modificationColor = 'text.secondary';

  const emptyOrZero = (v: any) => v === undefined || v === null || v === '' || v === 0;

  if (aiSuggestedVal !== undefined && val === aiSuggestedVal && val !== originalVal) {
    modificationLabel = 'Applied from AI recommendation';
    modificationColor = 'success.main';
  } else if (originalVal !== undefined && val !== originalVal) {
    if (aiSuggestedVal !== undefined && val !== aiSuggestedVal) {
      modificationLabel = 'Modified after AI suggestion';
      modificationColor = 'warning.main';
    } else {
      modificationLabel = 'Manually edited';
      modificationColor = 'info.main';
    }
  }

  let color = '#2e7d32'; // success (green)
  let Icon = CheckCircleIcon;
  if (cue.status === 'warning') {
    color = '#ed6c02'; // warning (orange)
    Icon = WarningIcon;
  } else if (cue.status === 'error') {
    color = '#d32f2f'; // error (red)
    Icon = ErrorIcon;
  }

  const customSx: any = isNone
    ? {}
    : {
        '& .MuiOutlinedInput-root': {
          '& fieldset': { borderColor: `${color} !important` },
          '&:hover fieldset': { borderColor: `${color} !important` },
          '&.Mui-focused fieldset': { borderColor: `${color} !important` },
        },
        '& .MuiInputLabel-root': {
          color: `${color} !important`,
        },
      };

  const helperText = modificationLabel ? (
    <span style={{ fontSize: '0.675rem', fontWeight: 600 }}>
      {modificationLabel}
    </span>
  ) : undefined;

  const inputComponent = (
    <TextField
      fullWidth
      label={label}
      type={type}
      value={val}
      onChange={(e) => {
        let v: any = e.target.value;
        if (type === 'number') {
          v = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
        }
        onChange(v);
      }}
      variant="outlined"
      sx={{
        ...customSx,
        '& .MuiFormHelperText-root': {
          color: `${modificationColor} !important`,
          mx: 0.5,
          mt: 0.25,
        }
      }}
      helperText={helperText}
      slotProps={{
        input: {
          startAdornment: startAdornment,
          endAdornment: !isNone ? (
            <InputAdornment position="end" sx={{ color: color }}>
              <Icon sx={{ fontSize: 18 }} />
            </InputAdornment>
          ) : undefined,
          style: {
            fontFamily: isMonospace ? 'monospace' : 'inherit',
            textTransform: uppercase ? 'uppercase' : 'none',
          },
        },
      }}
    />
  );

  if (!isNone && cue.message) {
    return (
      <Tooltip title={cue.message} arrow>
        {inputComponent}
      </Tooltip>
    );
  }

  return inputComponent;
}
