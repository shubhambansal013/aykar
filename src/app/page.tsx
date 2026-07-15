'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { extractTextFromPDF } from '@/lib/form16/extractor';
import { parseForm16Text } from '@/lib/form16/parser';
import { parseAISText } from '@/lib/ais/parser';
import { parseTISText } from '@/lib/tis/parser';
import { parseForm26ASText } from '@/lib/form26as/parser';
import { reconcileAllDocuments } from '@/lib/itr/reconciliation';
import { validateForm16Data } from '@/lib/itr/validator';
import { mapForm16ToITR1 } from '@/lib/itr/mapper';
import { Form16Data, ReconciledTaxData, AISData, TISData, Form26ASData } from '@/lib/types';
import { aiConfig, providersConfig } from '@/lib/ai/config';

import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  Card,
  CardContent,
  Button,
  IconButton,
  TextField,
  Alert,
  AlertTitle,
  CircularProgress,
  Paper,
  Tooltip,
  InputAdornment,
  Grid,
  Divider,
  Fab,
  Select,
  MenuItem,
  FormControl,
  FormControlLabel,
  Checkbox,
} from '@mui/material';

import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DownloadIcon from '@mui/icons-material/Download';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import RefreshIcon from '@mui/icons-material/Refresh';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import BugReportIcon from '@mui/icons-material/BugReport';
import CodeIcon from '@mui/icons-material/Code';
import ChatIcon from '@mui/icons-material/Chat';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';

interface Attachment {
  name: string;
  mimeType: string;
  data: string; // Base64 representation
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  attachments?: Attachment[];
}

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
  const isStr = typeof val === 'string';

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
      const sumAlw = (data.salary?.exemptAllowancesUs10 || []).reduce((sum, item) => sum + (item.amount || 0), 0);
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
      const sumOS = (data.otherIncome?.otherSources || []).reduce((sum, item) => sum + (item.amount || 0), 0);
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
      sx={customSx}
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

export interface FieldDiff {
  path: string;
  label: string;
  oldVal: any;
  newVal: any;
}

export function getForm16Differences(current: any, updated: any): FieldDiff[] {
  if (!updated) return [];
  const activeCurrent = current || {};

  const fieldLabels: Record<string, string> = {
    'employer.name': 'Employer Name',
    'employer.pan': 'Employer PAN',
    'employer.tan': 'Employer TAN',
    'employer.address': 'Employer Address',
    'employee.name.firstName': 'Employee First Name',
    'employee.name.middleName': 'Employee Middle Name',
    'employee.name.lastName': 'Employee Last Name',
    'employee.pan': 'Employee PAN',
    'employee.address': 'Employee Address',
    'assessmentYear': 'Assessment Year',
    'period.from': 'Period From',
    'period.to': 'Period To',
    'salary.grossSalary': 'Gross Salary',
    'salary.salaryAsPer17_1': 'Salary u/s 17(1)',
    'salary.perquisites17_2': 'Perquisites u/s 17(2)',
    'salary.profitsInLieu17_3': 'Profits in lieu u/s 17(3)',
    'salary.totalExemptAllowances': 'Total Exempt Allowances',
    'salary.netSalary': 'Net Salary',
    'salary.standardDeduction16ia': 'Standard Deduction',
    'salary.entertainmentAllowance16ii': 'Entertainment Allowance',
    'salary.professionalTax16iii': 'Professional Tax',
    'salary.totalDeductionsUs16': 'Total Deductions u/s 16',
    'salary.incomeChargeableUnderHeadSalaries': 'Income from Salaries',
    'otherIncome.houseProperty': 'House Property Income',
    'otherIncome.totalOtherSources': 'Other Sources Income',
    'grossTotalIncome': 'Gross Total Income',
    'deductions80C': 'Section 80C',
    'deductions80CCC': 'Section 80CCC',
    'deductions80CCD1': 'Section 80CCD(1)',
    'deductions80CCD1B': 'Section 80CCD(1B)',
    'deductions80CCD2': 'Section 80CCD(2)',
    'deductions80D': 'Section 80D',
    'deductions80E': 'Section 80E',
    'deductions80G': 'Section 80G',
    'deductions80TTA': 'Section 80TTA',
    'totalChapterVIADeductions': 'Total Chapter VI-A Deductions',
    'totalIncome': 'Total Taxable Income',
    'taxPayable': 'Tax Payable',
  };

  const getNestedValue = (obj: any, keyPath: string): any => {
    const keys = keyPath.split('.');
    let curr = obj;
    for (const k of keys) {
      if (curr === undefined || curr === null) return undefined;
      curr = curr[k];
    }
    return curr;
  };

  const areValuesDifferent = (v1: any, v2: any): boolean => {
    const empty1 = v1 === undefined || v1 === null || v1 === '';
    const empty2 = v2 === undefined || v2 === null || v2 === '';
    if (empty1 && empty2) return false;
    if ((v1 === 0 && empty2) || (v2 === 0 && empty1)) return false;
    if (typeof v1 === 'string' && typeof v2 === 'string') {
      return v1.trim() !== v2.trim();
    }
    return v1 !== v2;
  };

  const diffs: FieldDiff[] = [];
  for (const [path, label] of Object.entries(fieldLabels)) {
    const oldVal = getNestedValue(activeCurrent, path);
    const newVal = getNestedValue(updated, path);
    if (areValuesDifferent(oldVal, newVal)) {
      diffs.push({ path, label, oldVal, newVal });
    }
  }

  return diffs;
}

interface AssistantMessageProps {
  content: string;
  msgIdx: number;
  acceptedMessages: Record<number, boolean>;
  rejectedMessages: Record<number, boolean>;
  onAccept: (msgIdx: number, data: any) => void;
  onReject: (msgIdx: number) => void;
  onUndo?: (msgIdx: number) => void;
  currentData: Form16Data | null;
}

export function AssistantMessage({
  content,
  msgIdx,
  acceptedMessages,
  rejectedMessages,
  onAccept,
  onReject,
  onUndo,
  currentData,
}: AssistantMessageProps) {
  const parsed = useMemo(() => {
    const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
    const match = content.match(jsonRegex);
    if (match) {
      try {
        const json = JSON.parse(match[1].trim());
        const textOutside = content.replace(jsonRegex, '').trim();
        return { json, textOutside };
      } catch (e) {
        // failed parsing
      }
    }
    return { json: null, textOutside: content };
  }, [content]);

  const isAccepted = acceptedMessages[msgIdx];
  const isRejected = rejectedMessages[msgIdx];

  const { json, textOutside } = parsed;
  const recommendations = json && Array.isArray(json.recommendations) ? json.recommendations : [];
  const updatedData = json ? json.updatedForm16Data : null;

  const diffs = useMemo(() => {
    return getForm16Differences(currentData, updatedData);
  }, [currentData, updatedData]);

  if (!parsed.json) {
    return (
      <Typography variant="body2" sx={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '0.825rem', lineHeight: 1.4 }}>
        {content}
      </Typography>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {textOutside && (
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '0.825rem', lineHeight: 1.4 }}>
          {textOutside}
        </Typography>
      )}

      {/* Recommendations Cards */}
      {recommendations.map((rec: any, rIdx: number) => {
        let severity: 'error' | 'warning' | 'info' | 'success' = 'info';
        if (rec.type === 'error') severity = 'error';
        else if (rec.type === 'warning') severity = 'warning';
        else if (rec.type === 'info') severity = 'info';

        return (
          <Alert key={rIdx} severity={severity} variant="outlined" sx={{ borderRadius: 1.5, py: 0.5 }}>
            <AlertTitle sx={{ fontWeight: 'bold', fontSize: '0.8rem', m: 0 }}>
              {rec.field ? `Field: ${rec.field}` : 'Recommendation'}
            </AlertTitle>
            <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 500 }}>
              {rec.message}
            </Typography>
            {rec.suggestion && (
              <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary', fontStyle: 'italic' }}>
                Suggestion: {rec.suggestion}
              </Typography>
            )}
          </Alert>
        );
      })}

      {/* Proposed Updated Data Action Card */}
      {updatedData && (diffs.length > 0 || isAccepted || isRejected) && (
        <Card variant="outlined" sx={{ bgcolor: 'action.hover', borderStyle: 'dashed' }}>
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
              <SmartToyIcon sx={{ fontSize: 16 }} /> AI Suggested Updates
            </Typography>
            <Typography variant="body2" sx={{ my: 1, fontSize: '0.775rem' }}>
              The AI assistant has detected discrepancies and proposed corrections to your tax details. Would you like to override your existing form details with these suggested corrections?
            </Typography>

            {/* List of differences */}
            <Box sx={{ mt: 1.5, mb: 1.5, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', fontSize: '0.725rem' }}>
                Proposed Changes:
              </Typography>
              {diffs.map((diff, dIdx) => (
                <Box key={dIdx} sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.5, pl: 1, borderLeft: '2px solid', borderColor: 'primary.light', py: 0.25 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.725rem', mr: 0.5 }}>
                    {diff.label}:
                  </Typography>
                  <Typography variant="caption" sx={{ textDecoration: 'line-through', color: 'text.secondary', fontSize: '0.7rem' }}>
                    {diff.oldVal !== undefined && diff.oldVal !== null && diff.oldVal !== '' ? String(diff.oldVal) : '(empty)'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                    →
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 'bold', fontSize: '0.725rem' }}>
                    {diff.newVal !== undefined && diff.newVal !== null && diff.newVal !== '' ? String(diff.newVal) : '(empty)'}
                  </Typography>
                </Box>
              ))}
            </Box>

            {!isAccepted && !isRejected ? (
              <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  onClick={() => onAccept(msgIdx, updatedData)}
                >
                  Accept & Apply
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  onClick={() => onReject(msgIdx)}
                >
                  Reject
                </Button>
              </Box>
            ) : isAccepted ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, mt: 1.5 }}>
                <Alert severity="success" variant="filled" sx={{ py: 0.5, px: 1, borderRadius: 1, flexGrow: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 'bold' }}>Applied Successfully!</Typography>
                </Alert>
                <Button
                  size="small"
                  variant="outlined"
                  color="warning"
                  onClick={() => onUndo?.(msgIdx)}
                >
                  Undo
                </Button>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, mt: 1.5 }}>
                <Typography variant="caption" color="error" sx={{ fontWeight: 'bold' }}>
                  Updates Rejected
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  color="warning"
                  onClick={() => onUndo?.(msgIdx)}
                >
                  Undo
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<Form16Data | null>(null);

  const [aisFile, setAisFile] = useState<File | null>(null);
  const [tisFile, setTisFile] = useState<File | null>(null);
  const [form26asFile, setForm26asFile] = useState<File | null>(null);

  const [aisData, setAisData] = useState<AISData | null>(null);
  const [tisData, setTisData] = useState<TISData | null>(null);
  const [form26asData, setForm26asData] = useState<Form26ASData | null>(null);

  const [aisLoading, setAisLoading] = useState(false);
  const [tisLoading, setTisLoading] = useState(false);
  const [form26asLoading, setForm26asLoading] = useState(false);

  const updateNestedValue = (path: string, val: any) => {
    setExtractedData((prev) => {
      if (!prev) return prev;
      const next = JSON.parse(JSON.stringify(prev));
      const parts = path.split('.');
      let current = next;
      for (let i = 0; i < parts.length - 1; i++) {
        if (current[parts[i]] === undefined || current[parts[i]] === null) {
          current[parts[i]] = {};
        }
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = val;

      if (path.startsWith('deductions') || path === 'totalChapterVIADeductions') {
        if (path !== 'totalChapterVIADeductions') {
          next.totalChapterVIADeductions =
            (next.deductions80C || 0) +
            (next.deductions80CCC || 0) +
            (next.deductions80CCD1 || 0) +
            (next.deductions80CCD1B || 0) +
            (next.deductions80CCD2 || 0) +
            (next.deductions80D || 0) +
            (next.deductions80E || 0) +
            (next.deductions80G || 0) +
            (next.deductions80TTA || 0);
        }
      }
      return next;
    });
  };
  const [rawText, setRawText] = useState<string>('');
  const [aisRawText, setAisRawText] = useState<string>('');
  const [tisRawText, setTisRawText] = useState<string>('');
  const [form26asRawText, setForm26asRawText] = useState<string>('');

  const combinedRawText = useMemo(() => {
    let result = '';
    if (rawText) {
      result += `--- FORM-16 RAW EXTRACTED TEXT ---\n${rawText}\n\n`;
    }
    if (aisRawText) {
      result += `--- AIS RAW EXTRACTED TEXT ---\n${aisRawText}\n\n`;
    }
    if (tisRawText) {
      result += `--- TIS RAW EXTRACTED TEXT ---\n${tisRawText}\n\n`;
    }
    if (form26asRawText) {
      result += `--- FORM 26AS RAW EXTRACTED TEXT ---\n${form26asRawText}\n\n`;
    }
    return result || 'No raw text extracted yet.';
  }, [rawText, aisRawText, tisRawText, form26asRawText]);

  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'light' | 'dark'>('light');

  // AI Chat States
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachingFile, setAttachingFile] = useState(false);
  const [selectedModel, setSelectedModel] = useState(aiConfig.modelName);
  const [sendOnlyRawData, setSendOnlyRawData] = useState<boolean>(false);

  const [acceptedMessages, setAcceptedMessages] = useState<Record<number, boolean>>({});
  const [rejectedMessages, setRejectedMessages] = useState<Record<number, boolean>>({});
  const [proposalBackups, setProposalBackups] = useState<Record<number, Form16Data | null>>({});

  const handleAcceptProposal = (msgIdx: number, updatedData: any) => {
    if (extractedData) {
      setProposalBackups((prev) => ({ ...prev, [msgIdx]: JSON.parse(JSON.stringify(extractedData)) }));
    }
    setAcceptedMessages((prev) => ({ ...prev, [msgIdx]: true }));
    setExtractedData(updatedData);
    setErrors(validateForm16Data(updatedData));
  };

  const handleRejectProposal = (msgIdx: number) => {
    setRejectedMessages((prev) => ({ ...prev, [msgIdx]: true }));
  };

  const handleUndoProposal = (msgIdx: number) => {
    if (acceptedMessages[msgIdx]) {
      const backup = proposalBackups[msgIdx];
      if (backup) {
        setExtractedData(backup);
        setErrors(validateForm16Data(backup));
      }
    }
    setAcceptedMessages((prev) => {
      const next = { ...prev };
      delete next[msgIdx];
      return next;
    });
    setRejectedMessages((prev) => {
      const next = { ...prev };
      delete next[msgIdx];
      return next;
    });
    setProposalBackups((prev) => {
      const next = { ...prev };
      delete next[msgIdx];
      return next;
    });
  };

  const geminiModels = useMemo(() => {
    const geminiProvider = providersConfig.find(p => p.provider === 'gemini');
    return geminiProvider ? geminiProvider.models : [];
  }, []);

  // Chat resizing states
  const [chatWidth, setChatWidth] = useState(400);
  const [isDragging, setIsDragging] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setMode(prefersDark ? 'dark' : 'light');
    }
  }, []);

  // Load chatWidth from localStorage if available
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedWidth = localStorage.getItem('ai_chat_width');
      if (savedWidth) {
        const parsed = parseInt(savedWidth, 10);
        if (parsed >= 280 && parsed < window.innerWidth * 0.75) {
          setChatWidth(parsed);
        }
      }
    }
  }, []);

  // Save chatWidth to localStorage when resize is completed
  useEffect(() => {
    if (!isDragging && chatWidth !== 400) {
      localStorage.setItem('ai_chat_width', chatWidth.toString());
    }
  }, [isDragging, chatWidth]);

  // Handle resizing drag
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 280 && newWidth < window.innerWidth * 0.8) {
        setChatWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: mode === 'dark' ? '#38bdf8' : '#0284c7',
          },
          secondary: {
            main: mode === 'dark' ? '#94a3b8' : '#475569',
          },
          background: {
            default: mode === 'dark' ? '#0f172a' : '#f8fafc',
            paper: mode === 'dark' ? '#1e293b' : '#ffffff',
          },
        },
        typography: {
          fontFamily: 'var(--font-geist-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          h6: {
            fontSize: '1.05rem',
            fontWeight: 600,
            letterSpacing: '-0.01em',
          },
          subtitle1: {
            fontSize: '0.9rem',
            fontWeight: 600,
          },
          body1: {
            fontSize: '0.875rem',
          },
          body2: {
            fontSize: '0.8rem',
          },
          button: {
            textTransform: 'none',
            fontWeight: 500,
          }
        },
        components: {
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: '6px',
                padding: '6px 14px',
                fontSize: '0.8rem',
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                borderRadius: '8px',
                boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                border: mode === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0',
              },
            },
          },
          MuiTextField: {
            defaultProps: {
              size: 'small',
            },
          },
        },
      }),
    [mode]
  );

  const toggleTheme = () => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setLoading(true);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const text = await extractTextFromPDF(arrayBuffer);
      setRawText(text);
      const parsed = parseForm16Text(text);
      const reconciled = reconcileAllDocuments(parsed, aisData || undefined, tisData || undefined, form26asData || undefined);
      setExtractedData(reconciled);
      setErrors(validateForm16Data(reconciled));
    } catch (err) {
      console.error('Error processing PDF:', err);
      alert('Failed to process PDF. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAISUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setAisFile(selectedFile);
    setAisLoading(true);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const text = await extractTextFromPDF(arrayBuffer);
      setAisRawText(text);
      const parsed = parseAISText(text);
      setAisData(parsed);

      if (extractedData) {
        const reconciled = reconcileAllDocuments(extractedData, parsed, tisData || undefined, form26asData || undefined);
        setExtractedData(reconciled);
        setErrors(validateForm16Data(reconciled));
      }
    } catch (err) {
      console.error('Error processing AIS PDF:', err);
      alert('Failed to process AIS PDF.');
    } finally {
      setAisLoading(false);
    }
  };

  const handleTISUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setTisFile(selectedFile);
    setTisLoading(true);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const text = await extractTextFromPDF(arrayBuffer);
      setTisRawText(text);
      const parsed = parseTISText(text);
      setTisData(parsed);

      if (extractedData) {
        const reconciled = reconcileAllDocuments(extractedData, aisData || undefined, parsed, form26asData || undefined);
        setExtractedData(reconciled);
        setErrors(validateForm16Data(reconciled));
      }
    } catch (err) {
      console.error('Error processing TIS PDF:', err);
      alert('Failed to process TIS PDF.');
    } finally {
      setTisLoading(false);
    }
  };

  const handleForm26ASUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setForm26asFile(selectedFile);
    setForm26asLoading(true);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const text = await extractTextFromPDF(arrayBuffer);
      setForm26asRawText(text);
      const parsed = parseForm26ASText(text);
      setForm26asData(parsed);

      if (extractedData) {
        const reconciled = reconcileAllDocuments(extractedData, aisData || undefined, tisData || undefined, parsed);
        setExtractedData(reconciled);
        setErrors(validateForm16Data(reconciled));
      }
    } catch (err) {
      console.error('Error processing Form 26AS PDF:', err);
      alert('Failed to process Form 26AS PDF.');
    } finally {
      setForm26asLoading(false);
    }
  };

  // Scroll to bottom in Chat Window
  const scrollToBottom = () => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (chatOpen) {
      scrollToBottom();
    }
  }, [messages, chatOpen]);

  // Handle Send Chat message
  const handleSendMessage = async (isReviewRequest = false) => {
    if (!inputMessage.trim() && attachments.length === 0 && !isReviewRequest) return;

    let userMessageContent = inputMessage;
    if (isReviewRequest) {
      userMessageContent = aiConfig.reviewPrompt;
    }

    const newUserMessage: Message = {
      role: 'user',
      content: userMessageContent,
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    };

    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setInputMessage('');
    setAttachments([]);
    setChatLoading(true);
    setChatOpen(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: updatedMessages,
          itrData: sendOnlyRawData ? null : extractedData,
          itrJson: sendOnlyRawData ? null : (extractedData ? mapForm16ToITR1(extractedData) : null),
          rawText: rawText,
          aisRawText: aisRawText,
          tisRawText: tisRawText,
          form26asRawText: form26asRawText,
          isReview: isReviewRequest,
          model: selectedModel,
        }),
      });

      if (!response.ok) {
        throw new Error('AI Chat encountered an error. Please try again.');
      }

      const reply = (await response.json()) as Message;
      setMessages((prev) => [...prev, reply]);
    } catch (err: any) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Error: ${err?.message || 'Something went wrong while talking to the AI.'}`,
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // Trigger AI Review using the pre-configured prompt
  const handleAIReview = () => {
    handleSendMessage(true);
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as string);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsText(file);
    });
  };

  // Handle adding custom attachments
  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setAttachingFile(true);
    try {
      const mimeType = selectedFile.type;

      // If PDF, we can use existing extractor to fetch text first, or send standard pdf
      let base64Data = '';
      let finalMimeType = mimeType || 'application/octet-stream';
      if (mimeType === 'application/pdf') {
        const arrayBuffer = await selectedFile.arrayBuffer();
        try {
          const pdfText = await extractTextFromPDF(arrayBuffer);
          base64Data = btoa(unescape(encodeURIComponent(pdfText)));
          finalMimeType = 'text/plain'; // Treat successfully extracted PDF text as text
        } catch {
          // Fallback to reading file normally
          base64Data = await readFileAsBase64(selectedFile);
        }
      } else if (mimeType && (mimeType.startsWith('text/') || mimeType === 'application/json' || selectedFile.name.endsWith('.csv'))) {
        try {
          const text = await readFileAsText(selectedFile);
          base64Data = btoa(unescape(encodeURIComponent(text)));
          finalMimeType = 'text/plain';
        } catch {
          base64Data = await readFileAsBase64(selectedFile);
        }
      } else {
        base64Data = await readFileAsBase64(selectedFile);
      }

      const newAttachment: Attachment = {
        name: selectedFile.name,
        mimeType: finalMimeType,
        data: base64Data,
      };

      setAttachments((prev) => [...prev, newAttachment]);
    } catch (err) {
      console.error('Attachment error:', err);
      alert('Failed to attach file.');
    } finally {
      setAttachingFile(false);
    }
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // strip data url prefix
        const base64 = result.substring(result.indexOf(',') + 1);
        resolve(base64);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default', overflow: 'hidden' }}>
        {/* Top Navbar */}
        <AppBar position="static" color="inherit" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider', zIndex: (theme) => theme.zIndex.drawer + 1 }}>
          <Toolbar variant="dense">
            <ReceiptLongIcon color="primary" sx={{ mr: 1.5, display: { xs: 'none', sm: 'block' } }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
              ITR Assist
            </Typography>
            <Tooltip title="Ask AI / Chat">
              <IconButton onClick={() => setChatOpen((prev) => !prev)} color="inherit" aria-label="open ai chat">
                <ChatIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={`Toggle ${mode === 'light' ? 'Dark' : 'Light'} Mode`}>
              <IconButton onClick={toggleTheme} color="inherit" aria-label="toggle color mode">
                {mode === 'light' ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>

        {/* Main Split Layout Container */}
        <Box sx={{ display: 'flex', flexGrow: 1, minHeight: 0, width: '100%', overflow: 'hidden', position: 'relative' }}>

          {/* Left Panel: Main Application Area */}
          <Box sx={{
            flexGrow: 1,
            minWidth: 0,
            overflowY: 'auto',
            height: '100%',
            display: { xs: chatOpen ? 'none' : 'block', md: 'block' }
          }}>
            <Container maxWidth="md" sx={{ py: 3 }}>
              {/* Upload Section */}
              <Card variant="outlined" sx={{ mb: 2.5 }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                    1. Upload Financial Documents
                  </Typography>
                  <Grid container spacing={2}>
                    {/* Form-16 */}
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Box sx={{ border: '1px dashed', borderColor: 'primary.main', borderRadius: 1.5, p: 2, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', bgcolor: mode === 'dark' ? 'rgba(56, 189, 248, 0.02)' : 'rgba(2, 132, 199, 0.02)' }}>
                        <Typography id="file-upload-label" variant="subtitle2" component="label" htmlFor="file-upload" sx={{ cursor: 'pointer', fontWeight: 'bold', display: 'block', mb: 1 }}>
                          1. Upload Form-16 PDF
                        </Typography>
                        <input id="file-upload" type="file" accept=".pdf" onChange={handleFileUpload} style={{ display: 'none' }} aria-labelledby="file-upload-label" />
                        <Button component="label" htmlFor="file-upload" variant="outlined" size="small" startIcon={<CloudUploadIcon />} sx={{ mt: 'auto' }}>
                          {file ? 'Uploaded' : 'Upload'}
                        </Button>
                        {file && <Typography variant="caption" sx={{ mt: 1, display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{file.name}</Typography>}
                        {loading && <CircularProgress size={16} sx={{ mt: 1, mx: 'auto' }} />}
                      </Box>
                    </Grid>

                    {/* AIS */}
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Box sx={{ border: '1px dashed', borderColor: 'primary.main', borderRadius: 1.5, p: 2, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', bgcolor: mode === 'dark' ? 'rgba(56, 189, 248, 0.02)' : 'rgba(2, 132, 199, 0.02)' }}>
                        <Typography id="ais-label" variant="subtitle2" component="label" htmlFor="ais-upload" sx={{ cursor: 'pointer', fontWeight: 'bold', display: 'block', mb: 1 }}>
                          AIS PDF (Annual Info)
                        </Typography>
                        <input id="ais-upload" type="file" accept=".pdf" onChange={handleAISUpload} style={{ display: 'none' }} aria-labelledby="ais-label" />
                        <Button component="label" htmlFor="ais-upload" variant="outlined" size="small" startIcon={<CloudUploadIcon />} sx={{ mt: 'auto' }}>
                          {aisFile ? 'Uploaded' : 'Upload'}
                        </Button>
                        {aisFile && <Typography variant="caption" sx={{ mt: 1, display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{aisFile.name}</Typography>}
                        {aisLoading && <CircularProgress size={16} sx={{ mt: 1, mx: 'auto' }} />}
                      </Box>
                    </Grid>

                    {/* TIS */}
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Box sx={{ border: '1px dashed', borderColor: 'primary.main', borderRadius: 1.5, p: 2, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', bgcolor: mode === 'dark' ? 'rgba(56, 189, 248, 0.02)' : 'rgba(2, 132, 199, 0.02)' }}>
                        <Typography id="tis-label" variant="subtitle2" component="label" htmlFor="tis-upload" sx={{ cursor: 'pointer', fontWeight: 'bold', display: 'block', mb: 1 }}>
                          TIS PDF (Tax Summary)
                        </Typography>
                        <input id="tis-upload" type="file" accept=".pdf" onChange={handleTISUpload} style={{ display: 'none' }} aria-labelledby="tis-label" />
                        <Button component="label" htmlFor="tis-upload" variant="outlined" size="small" startIcon={<CloudUploadIcon />} sx={{ mt: 'auto' }}>
                          {tisFile ? 'Uploaded' : 'Upload'}
                        </Button>
                        {tisFile && <Typography variant="caption" sx={{ mt: 1, display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{tisFile.name}</Typography>}
                        {tisLoading && <CircularProgress size={16} sx={{ mt: 1, mx: 'auto' }} />}
                      </Box>
                    </Grid>

                    {/* Form 26AS */}
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Box sx={{ border: '1px dashed', borderColor: 'primary.main', borderRadius: 1.5, p: 2, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', bgcolor: mode === 'dark' ? 'rgba(56, 189, 248, 0.02)' : 'rgba(2, 132, 199, 0.02)' }}>
                        <Typography id="f26as-label" variant="subtitle2" component="label" htmlFor="f26as-upload" sx={{ cursor: 'pointer', fontWeight: 'bold', display: 'block', mb: 1 }}>
                          Form 26AS PDF (Tax Paid)
                        </Typography>
                        <input id="f26as-upload" type="file" accept=".pdf" onChange={handleForm26ASUpload} style={{ display: 'none' }} aria-labelledby="f26as-label" />
                        <Button component="label" htmlFor="f26as-upload" variant="outlined" size="small" startIcon={<CloudUploadIcon />} sx={{ mt: 'auto' }}>
                          {form26asFile ? 'Uploaded' : 'Upload'}
                        </Button>
                        {form26asFile && <Typography variant="caption" sx={{ mt: 1, display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{form26asFile.name}</Typography>}
                        {form26asLoading && <CircularProgress size={16} sx={{ mt: 1, mx: 'auto' }} />}
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Reconciliation & Discrepancy Matching Panel */}
              {extractedData && (extractedData as ReconciledTaxData).discrepancies && ((extractedData as ReconciledTaxData).discrepancies?.length ?? 0) > 0 && (
                <Alert severity="warning" variant="outlined" sx={{ mb: 2.5, borderRadius: 1.5, py: 1 }}>
                  <AlertTitle sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Reconciliation Discrepancy & Matcher Alerts:</AlertTitle>
                  <ul style={{ margin: '4px 0 0 0', paddingLeft: '1.15rem' }}>
                    {(extractedData as ReconciledTaxData).discrepancies?.map((disc, i) => (
                      <li key={i}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{disc}</Typography>
                      </li>
                    ))}
                  </ul>
                </Alert>
              )}

              {/* Detected Income Sources Confirmation Panel */}
              {extractedData && (extractedData as ReconciledTaxData).detectedIncomeSources && ((extractedData as ReconciledTaxData).detectedIncomeSources?.length ?? 0) > 0 && (
                <Card variant="outlined" sx={{ mb: 2.5, borderColor: 'primary.main', bgcolor: mode === 'dark' ? 'rgba(56, 189, 248, 0.01)' : 'rgba(2, 132, 199, 0.01)' }}>
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, display: 'flex', alignItems: 'center', gap: 1, color: 'primary.main' }}>
                      <CheckCircleIcon sx={{ fontSize: 18 }} /> Detected Supplementary Income Sources (AIS/TIS)
                    </Typography>
                    <Typography variant="caption" color="textSecondary" sx={{ mb: 1.5, display: 'block' }}>
                      The following additional incomes were found in the uploaded AIS/TIS documents and have been successfully merged into your other sources to prevent under-reporting:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                      {(extractedData as ReconciledTaxData).detectedIncomeSources?.map((item, i) => {
                        let catLabel = 'Other';
                        if (item.category === 'interestSavings') catLabel = 'Savings bank interest';
                        if (item.category === 'interestDeposit') catLabel = 'Interest on deposit';
                        if (item.category === 'dividendIncome') catLabel = 'Dividend';

                        return (
                          <Paper key={i} variant="outlined" sx={{ p: 1, px: 1.5, borderRadius: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box>
                              <Typography variant="caption" color="textSecondary" sx={{ display: 'block', fontSize: '0.675rem' }}>{catLabel} ({item.source})</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>₹{item.amount.toLocaleString('en-IN')}</Typography>
                            </Box>
                            <IconButton size="small" color="success">
                              <CheckCircleIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Paper>
                        );
                      })}
                    </Box>
                  </CardContent>
                </Card>
              )}

              {extractedData && (
                <>
                  {/* Validation Warnings */}
                  {errors.length > 0 && (
                    <Alert severity="warning" variant="outlined" sx={{ mb: 2.5, borderRadius: 1.5, py: 0.5 }}>
                      <AlertTitle sx={{ fontWeight: 'bold', fontSize: '0.85rem', m: 0 }}>Validation Warnings:</AlertTitle>
                      <ul style={{ margin: '4px 0 0 0', paddingLeft: '1.15rem' }}>
                        {errors.map((err, i) => (
                          <li key={i}>
                            <Typography variant="body2">{err}</Typography>
                          </li>
                        ))}
                      </ul>
                    </Alert>
                  )}

                  {/* Review & Edit Section */}
                  <Card variant="outlined" sx={{ mb: 2.5 }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', m: 0 }}>
                          2. Review & Edit Extracted Information
                        </Typography>
                        {/* AI Review Button */}
                        <Button
                          variant="contained"
                          color="secondary"
                          startIcon={<SmartToyIcon fontSize="small" />}
                          onClick={handleAIReview}
                          size="small"
                        >
                          AI Review
                        </Button>
                      </Box>

                      <Grid container spacing={2}>
                        {/* 1. General & Filer Information */}
                        <Grid size={{ xs: 12 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', borderBottom: 1, borderColor: 'divider', pb: 0.5, mb: 1.5, color: 'primary.main' }}>
                            General & Filer Information
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Assessment Year" path="assessmentYear" data={extractedData} onChange={(v) => updateNestedValue('assessmentYear', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Period From (YYYY-MM-DD)" path="period.from" data={extractedData} onChange={(v) => updateNestedValue('period.from', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Period To (YYYY-MM-DD)" path="period.to" data={extractedData} onChange={(v) => updateNestedValue('period.to', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Employer Name" path="employer.name" data={extractedData} onChange={(v) => updateNestedValue('employer.name', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Employer PAN" path="employer.pan" isMonospace uppercase data={extractedData} onChange={(v) => updateNestedValue('employer.pan', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Employer TAN" path="employer.tan" isMonospace uppercase data={extractedData} onChange={(v) => updateNestedValue('employer.tan', v)} />
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                              <CueTextField label="Employer Address" path="employer.address" data={extractedData} onChange={(v) => updateNestedValue('employer.address', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Employee First Name" path="employee.name.firstName" data={extractedData} onChange={(v) => updateNestedValue('employee.name.firstName', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Employee Middle Name" path="employee.name.middleName" data={extractedData} onChange={(v) => updateNestedValue('employee.name.middleName', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Employee Last Name" path="employee.name.lastName" data={extractedData} onChange={(v) => updateNestedValue('employee.name.lastName', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Employee PAN" path="employee.pan" isMonospace uppercase data={extractedData} onChange={(v) => updateNestedValue('employee.pan', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 8 }}>
                              <CueTextField label="Employee Address" path="employee.address" data={extractedData} onChange={(v) => updateNestedValue('employee.address', v)} />
                            </Grid>
                          </Grid>
                        </Grid>

                        {/* 2. Detailed Salary & Deductions u/s 16 */}
                        <Grid size={{ xs: 12 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', borderBottom: 1, borderColor: 'divider', pb: 0.5, mb: 1.5, color: 'primary.main' }}>
                            Salary Income Details (₹)
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Salary u/s 17(1)" type="number" path="salary.salaryAsPer17_1" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} onChange={(v) => updateNestedValue('salary.salaryAsPer17_1', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Perquisites u/s 17(2)" type="number" path="salary.perquisites17_2" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} onChange={(v) => updateNestedValue('salary.perquisites17_2', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Profits in lieu u/s 17(3)" type="number" path="salary.profitsInLieu17_3" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} onChange={(v) => updateNestedValue('salary.profitsInLieu17_3', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Gross Salary" type="number" path="salary.grossSalary" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} onChange={(v) => updateNestedValue('salary.grossSalary', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Total Exempt Allowances u/s 10" type="number" path="salary.totalExemptAllowances" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} onChange={(v) => updateNestedValue('salary.totalExemptAllowances', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Net Salary" type="number" path="salary.netSalary" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} onChange={(v) => updateNestedValue('salary.netSalary', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Standard Deduction (u/s 16ia)" type="number" path="salary.standardDeduction16ia" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} onChange={(v) => updateNestedValue('salary.standardDeduction16ia', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Entertainment Allowance (16ii)" type="number" path="salary.entertainmentAllowance16ii" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} onChange={(v) => updateNestedValue('salary.entertainmentAllowance16ii', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Professional Tax (16iii)" type="number" path="salary.professionalTax16iii" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} onChange={(v) => updateNestedValue('salary.professionalTax16iii', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                              <CueTextField label="Total Deductions u/s 16" type="number" path="salary.totalDeductionsUs16" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} onChange={(v) => updateNestedValue('salary.totalDeductionsUs16', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                              <CueTextField label="Income Chargeable under head Salaries" type="number" path="salary.incomeChargeableUnderHeadSalaries" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} onChange={(v) => updateNestedValue('salary.incomeChargeableUnderHeadSalaries', v)} />
                            </Grid>
                          </Grid>
                        </Grid>

                        {/* 3. Other Income */}
                        <Grid size={{ xs: 12 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', borderBottom: 1, borderColor: 'divider', pb: 0.5, mb: 1.5, color: 'primary.main' }}>
                            Other Income Details (₹)
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 6 }}>
                              <CueTextField label="House Property Income" type="number" path="otherIncome.houseProperty" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} onChange={(v) => updateNestedValue('otherIncome.houseProperty', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                              <CueTextField label="Other Sources Income" type="number" path="otherIncome.totalOtherSources" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} onChange={(v) => updateNestedValue('otherIncome.totalOtherSources', v)} />
                            </Grid>
                          </Grid>
                        </Grid>

                        {/* 4. Chapter VI-A Deductions */}
                        <Grid size={{ xs: 12 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', borderBottom: 1, borderColor: 'divider', pb: 0.5, mb: 1.5, color: 'primary.main' }}>
                            Chapter VI-A Deductions (₹)
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Section 80C" type="number" path="deductions80C" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} onChange={(v) => updateNestedValue('deductions80C', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Section 80CCC" type="number" path="deductions80CCC" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} onChange={(v) => updateNestedValue('deductions80CCC', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Section 80CCD(1)" type="number" path="deductions80CCD1" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} onChange={(v) => updateNestedValue('deductions80CCD1', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Section 80CCD(1B)" type="number" path="deductions80CCD1B" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} onChange={(v) => updateNestedValue('deductions80CCD1B', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Section 80CCD(2)" type="number" path="deductions80CCD2" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} onChange={(v) => updateNestedValue('deductions80CCD2', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Section 80D" type="number" path="deductions80D" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} onChange={(v) => updateNestedValue('deductions80D', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Section 80E" type="number" path="deductions80E" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} onChange={(v) => updateNestedValue('deductions80E', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Section 80G" type="number" path="deductions80G" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} onChange={(v) => updateNestedValue('deductions80G', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Section 80TTA" type="number" path="deductions80TTA" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} onChange={(v) => updateNestedValue('deductions80TTA', v)} />
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                              <CueTextField label="Total Chapter VI-A Deductions" type="number" path="totalChapterVIADeductions" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} onChange={(v) => updateNestedValue('totalChapterVIADeductions', v)} />
                            </Grid>
                          </Grid>
                        </Grid>

                        {/* 5. Tax Paid & Credits */}
                        <Grid size={{ xs: 12 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', borderBottom: 1, borderColor: 'divider', pb: 0.5, mb: 1.5, color: 'primary.main' }}>
                            Taxes Paid & Credits (₹)
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="TDS on Salary (u/s 192)" type="number" path="taxCredits.tdsSalary" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} onChange={(v) => updateNestedValue('taxCredits.tdsSalary', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="TDS on Other Income" type="number" path="taxCredits.tdsOther" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} onChange={(v) => updateNestedValue('taxCredits.tdsOther', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="TCS (Tax Collected)" type="number" path="taxCredits.tcs" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} onChange={(v) => updateNestedValue('taxCredits.tcs', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                              <CueTextField label="Advance Tax Paid" type="number" path="taxCredits.advanceTax" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} onChange={(v) => updateNestedValue('taxCredits.advanceTax', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                              <CueTextField label="Self-Assessment Tax Paid" type="number" path="taxCredits.selfAssessmentTax" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} onChange={(v) => updateNestedValue('taxCredits.selfAssessmentTax', v)} />
                            </Grid>
                          </Grid>
                        </Grid>

                        {/* 6. Summary */}
                        <Grid size={{ xs: 12 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', borderBottom: 1, borderColor: 'divider', pb: 0.5, mb: 1.5, color: 'primary.main' }}>
                            Tax Computation Summary (₹)
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Gross Total Income" type="number" path="grossTotalIncome" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} onChange={(v) => updateNestedValue('grossTotalIncome', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Total Taxable Income" type="number" path="totalIncome" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} onChange={(v) => updateNestedValue('totalIncome', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Tax Payable" type="number" path="taxPayable" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} onChange={(v) => updateNestedValue('taxPayable', v)} />
                            </Grid>
                          </Grid>
                        </Grid>
                      </Grid>

                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mt: 3 }}>
                        <Button
                          variant="outlined"
                          color="secondary"
                          startIcon={<RefreshIcon fontSize="small" />}
                          onClick={() => setErrors(validateForm16Data(extractedData))}
                          size="small"
                        >
                          Re-validate Data
                        </Button>
                        <Button
                          variant="contained"
                          color="success"
                          startIcon={<DownloadIcon fontSize="small" />}
                          onClick={() => {
                            const itrJson = mapForm16ToITR1(extractedData);
                            const blob = new Blob([JSON.stringify(itrJson, null, 2)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `ITR1_${extractedData.employee.pan || 'data'}.json`;
                            a.click();
                          }}
                          size="small"
                        >
                          Download ITR JSON
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>

                  {/* Debug Information */}
                  <Box sx={{ mt: 4, pb: 4 }}>
                    <Typography variant="subtitle1" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', fontWeight: 'bold' }}>
                      <BugReportIcon sx={{ fontSize: 18 }} /> 3. Debug Information (For Verification)
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Paper
                          variant="outlined"
                          sx={{
                            p: 1.5,
                            bgcolor: mode === 'dark' ? 'grey.950' : 'grey.900',
                            color: '#10b981',
                            borderRadius: 1.5,
                            height: 280,
                            display: 'flex',
                            flexDirection: 'column',
                          }}
                        >
                          <Typography
                            variant="subtitle2"
                            sx={{
                              color: 'grey.400',
                              pb: 0.5,
                              mb: 1,
                              borderBottom: '1px solid',
                              borderColor: 'grey.800',
                              fontWeight: 'bold',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                            }}
                          >
                            <CodeIcon sx={{ fontSize: 14 }} /> Raw Extracted Text
                          </Typography>
                          <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '10px', fontFamily: 'monospace' }}>
                              {combinedRawText}
                            </pre>
                          </Box>
                        </Paper>
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Paper
                          variant="outlined"
                          sx={{
                            p: 1.5,
                            bgcolor: mode === 'dark' ? 'grey.950' : 'grey.900',
                            color: '#60a5fa',
                            borderRadius: 1.5,
                            height: 280,
                            display: 'flex',
                            flexDirection: 'column',
                          }}
                        >
                          <Typography
                            variant="subtitle2"
                            sx={{
                              color: 'grey.400',
                              pb: 0.5,
                              mb: 1,
                              borderBottom: '1px solid',
                              borderColor: 'grey.800',
                              fontWeight: 'bold',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                            }}
                          >
                            <CodeIcon sx={{ fontSize: 14 }} /> Intermediate Form16Data Object
                          </Typography>
                          <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                            <pre style={{ margin: 0, whiteSpace: 'pre', fontSize: '10px', fontFamily: 'monospace' }}>
                              {JSON.stringify(extractedData, null, 2)}
                            </pre>
                          </Box>
                        </Paper>
                      </Grid>
                    </Grid>
                  </Box>
                </>
              )}
            </Container>
          </Box>

          {/* Draggable Divider / Resizer */}
          {chatOpen && (
            <Box
              onMouseDown={startResize}
              data-testid="resizer"
              sx={{
                width: '4px',
                cursor: 'col-resize',
                bgcolor: isDragging ? 'primary.main' : 'divider',
                transition: 'background-color 0.2s, width 0.2s',
                '&:hover': { bgcolor: 'primary.main', width: '6px' },
                height: '100%',
                zIndex: 10,
                display: { xs: 'none', md: 'block' }
              }}
            />
          )}

          {/* Right Panel: Chat Window */}
          <Box sx={{
            width: chatOpen ? { xs: '100%', md: `${chatWidth}px` } : '0px',
            minWidth: chatOpen ? { xs: '100%', md: `${chatWidth}px` } : '0px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            borderLeft: chatOpen ? '1px solid' : 'none',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            transition: isDragging ? 'none' : 'width 0.3s ease-in-out, min-width 0.3s ease-in-out',
            height: '100%',
            zIndex: 5,
          }}>
            {/* Chat Header */}
            <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SmartToyIcon color="primary" sx={{ fontSize: 20 }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>AI Tax Assistant</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <FormControl size="small" variant="standard" sx={{ minWidth: 120 }}>
                    <Select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      sx={{ fontSize: '0.75rem', py: 0 }}
                      aria-label="select gemini model"
                    >
                      {geminiModels.map((m) => (
                        <MenuItem key={m.value} value={m.value} sx={{ fontSize: '0.75rem' }}>
                          {m.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <IconButton onClick={() => setChatOpen(false)} color="inherit" size="small" aria-label="close chat">
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'flex-start', mt: 0.5 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={sendOnlyRawData}
                      onChange={(e) => setSendOnlyRawData(e.target.checked)}
                      size="small"
                      color="primary"
                    />
                  }
                  label={
                    <Typography variant="caption" sx={{ fontSize: '0.75rem', fontWeight: 500 }}>
                      Send only raw data to AI agent
                    </Typography>
                  }
                  sx={{ m: 0 }}
                />
              </Box>
            </Box>

            {/* Chat Messages List */}
            <Box sx={{ flexGrow: 1, p: 2, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1.5, bgcolor: mode === 'dark' ? 'rgba(15, 23, 42, 0.2)' : '#f8fafc' }}>
              {messages.length === 0 && (
                <Box sx={{ textAlign: 'center', my: 'auto', px: 2, color: 'text.secondary' }}>
                  <SmartToyIcon sx={{ fontSize: 36, mb: 1, opacity: 0.6, color: 'primary.main' }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 0.5, color: 'text.primary' }}>Ask me anything about your taxes!</Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ maxWidth: 320, mx: 'auto', lineHeight: 1.4 }}>
                    You can ask for recommendations on tax savings, double check standard deductions, or upload additional P&L reports.
                  </Typography>
                </Box>
              )}

              {messages.map((msg, idx) => (
                <Box
                  key={idx}
                  sx={{
                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.25,
                  }}
                >
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1.25,
                      borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                      bgcolor: msg.role === 'user' ? 'primary.main' : 'background.paper',
                      color: msg.role === 'user' ? 'primary.contrastText' : 'text.primary',
                      borderColor: msg.role === 'user' ? 'primary.main' : 'divider',
                      boxShadow: 'none',
                    }}
                  >
                    {msg.role === 'user' ? (
                      <Typography
                        variant="body2"
                        sx={{
                          margin: 0,
                          whiteSpace: 'pre-wrap',
                          fontFamily: 'inherit',
                          fontSize: '0.825rem',
                          lineHeight: 1.4,
                        }}
                      >
                        {msg.content}
                      </Typography>
                    ) : (
                      <AssistantMessage
                        content={msg.content}
                        msgIdx={idx}
                        acceptedMessages={acceptedMessages}
                        rejectedMessages={rejectedMessages}
                        onAccept={handleAcceptProposal}
                        onReject={handleRejectProposal}
                        onUndo={handleUndoProposal}
                        currentData={extractedData}
                      />
                    )}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid rgba(255,255,255,0.15)', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.7rem' }}>Attached Documents:</Typography>
                        {msg.attachments.map((att, attIdx) => (
                          <Typography key={attIdx} variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, opacity: 0.9, fontSize: '0.7rem' }}>
                            <AttachFileIcon sx={{ fontSize: 10 }} /> {att.name}
                          </Typography>
                        ))}
                      </Box>
                    )}
                  </Paper>
                  <Typography variant="caption" color="textSecondary" sx={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', px: 0.5, fontSize: '0.7rem' }}>
                    {msg.role === 'user' ? 'You' : 'AI Assistant'}
                  </Typography>
                </Box>
              ))}

              {chatLoading && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, alignSelf: 'flex-start' }}>
                  <CircularProgress size={12} />
                  <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>AI is generating response...</Typography>
                </Box>
              )}
              <div ref={messagesEndRef} />
            </Box>

            <Divider />

            {/* Chat Input / Actions */}
            <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1, bgcolor: 'background.paper' }}>
              {/* Selected attachments / Context */}
              {(file || attachments.length > 0 || (!sendOnlyRawData && extractedData)) && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {/* Parsed ITR JSON Data Highlighted Badge */}
                  {!sendOnlyRawData && extractedData && (
                    <Paper
                      variant="outlined"
                      sx={{
                        pl: 0.75,
                        pr: 0.75,
                        py: 0.25,
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        borderColor: 'primary.main',
                      }}
                      data-testid="parsed-itr-badge"
                    >
                      <AttachFileIcon sx={{ fontSize: 12, color: 'inherit' }} />
                      <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>
                        Parsed ITR JSON Data
                      </Typography>
                    </Paper>
                  )}

                  {/* Form-16 Context */}
                  {file && (
                    <Paper
                      variant="outlined"
                      sx={{
                        pl: 0.75,
                        pr: 0.25,
                        py: 0.25,
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        bgcolor: 'action.hover',
                      }}
                    >
                      <AttachFileIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                      <Typography variant="caption" sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.7rem', fontWeight: 'bold' }}>
                        {file.name}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setFile(null);
                          setAisFile(null);
                          setTisFile(null);
                          setForm26asFile(null);
                          setExtractedData(null);
                          setAisData(null);
                          setTisData(null);
                          setForm26asData(null);
                          setRawText('');
                          setAisRawText('');
                          setTisRawText('');
                          setForm26asRawText('');
                          setErrors([]);
                        }}
                        aria-label="remove form16 context"
                      >
                        <CloseIcon sx={{ fontSize: 12 }} />
                      </IconButton>
                    </Paper>
                  )}

                  {/* Supplementary Attachments */}
                  {attachments.map((att, idx) => (
                    <Paper
                      key={idx}
                      variant="outlined"
                      sx={{
                        pl: 0.75,
                        pr: 0.25,
                        py: 0.25,
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        bgcolor: 'action.hover',
                      }}
                    >
                      <AttachFileIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                      <Typography variant="caption" sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.7rem' }}>
                        {att.name}
                      </Typography>
                      <IconButton size="small" onClick={() => removeAttachment(idx)} aria-label="remove attachment">
                        <CloseIcon sx={{ fontSize: 12 }} />
                      </IconButton>
                    </Paper>
                  ))}
                </Box>
              )}

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {/* Attachment Upload Input */}
                <input
                  id="chat-attachment-upload"
                  type="file"
                  onChange={handleAttachmentUpload}
                  style={{ display: 'none' }}
                />
                <Tooltip title="Attach supplementary document (PDF, Text, or Image)">
                  <span>
                    <IconButton
                      component="label"
                      htmlFor="chat-attachment-upload"
                      color="primary"
                      disabled={attachingFile}
                      aria-label="attach document"
                      size="small"
                    >
                      {attachingFile ? <CircularProgress size={20} /> : <AttachFileIcon fontSize="small" />}
                    </IconButton>
                  </span>
                </Tooltip>

                <TextField
                  fullWidth
                  placeholder="Ask your tax question..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSendMessage(false);
                    }
                  }}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => handleSendMessage(false)}
                            color="primary"
                            disabled={chatLoading || (!inputMessage.trim() && attachments.length === 0)}
                            aria-label="send message"
                            size="small"
                          >
                            <SendIcon fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }
                  }}
                />
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Floating Action Chat Button */}
        {!chatOpen && (
          <Fab
            color="primary"
            aria-label="open ai chat window"
            sx={{ position: 'fixed', bottom: 24, right: 24, boxShadow: 3 }}
            onClick={() => setChatOpen(true)}
          >
            <ChatIcon />
          </Fab>
        )}
      </Box>
    </ThemeProvider>
  );
}
