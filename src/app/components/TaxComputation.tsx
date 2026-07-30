import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Divider,
} from '@mui/material';
import { Form16Data, ReconciledTaxData } from '@/lib/proto/compatibilityProxy';
import { calculateOldRegime, calculateNewRegime, computeAllInterest, TaxRegimeDetails } from '@/lib/itr/taxEngine';
import { LineRow, SectionTitle } from './LineRow';

interface TaxComputationProps {
  data: ReconciledTaxData | null;
  selectedRegime: 'OLD' | 'NEW';
  onValueClick?: (label: string) => void;
}

function inr(amount: number): string {
  return `₹${(amount || 0).toLocaleString('en-IN')}`;
}

export default function TaxComputation({ data, selectedRegime, onValueClick }: TaxComputationProps) {
  if (!data) return null;

  const mkClick = (label: string) => onValueClick ? () => onValueClick(label) : undefined;

  const regimeCalc: TaxRegimeDetails = selectedRegime === 'OLD'
    ? calculateOldRegime(data)
    : calculateNewRegime(data);

  const interest = computeAllInterest(regimeCalc.totalTaxPayable, regimeCalc.totalIncome, data);

  const taxCredits = (data as ReconciledTaxData).taxCredits || {
    tdsSalary: 0,
    tdsOther: 0,
    tcs: 0,
    advanceTax: 0,
    selfAssessmentTax: 0,
  };

  const totalCredits = (taxCredits.tdsSalary || 0) +
    (taxCredits.tdsOther || 0) +
    (taxCredits.tcs || 0) +
    (taxCredits.advanceTax || 0) +
    (taxCredits.selfAssessmentTax || 0);

  const totalLiabilityWithInterest = regimeCalc.totalTaxPayable + interest.totalInterestPayable;
  const netResult = totalLiabilityWithInterest > totalCredits
    ? inr(totalLiabilityWithInterest - totalCredits)
    : inr(totalCredits - totalLiabilityWithInterest);

  const isRefund = totalCredits > totalLiabilityWithInterest;

  // Build slab detail string
  const slabSummary = regimeCalc.slabTaxBreakdown?.map(s =>
    `${s.range}: ${inr(s.tax)}`
  ).join(' | ');

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
            Tax Computation
          </Typography>
          <Chip
            label={`${selectedRegime} Regime`}
            size="small"
            color={selectedRegime === 'NEW' ? 'success' : 'warning'}
            variant="outlined"
            sx={{ fontWeight: 600, fontSize: '0.7rem' }}
          />
        </Box>

        {/* Section: Gross Total Income */}
        <SectionTitle>Income Summary</SectionTitle>
        <LineRow label="Gross Total Income" value={inr(regimeCalc.grossTotalIncome)} operator="add" source="Derived" onClick={mkClick('Gross Total Income')} />
        <LineRow label="Less: Chapter VI-A Deductions" value={inr(regimeCalc.chapterVIADeductions)} operator="subtract" source="Form16" onClick={mkClick('Chapter VI-A Deductions')} />
        <LineRow label="Total Income" value={inr(regimeCalc.totalIncome)} operator="equals" isTotal source="Derived" onClick={mkClick('Total Income')} />

        {/* Section: Tax on Normal Income */}
        <SectionTitle>Tax Liability</SectionTitle>
        <LineRow label="Tax on Normal Income (Slab Rate)" value={inr(regimeCalc.taxBeforeRebate - (regimeCalc.specialTaxBreakdown?.reduce((s, t) => s + t.tax, 0) || 0))} operator="add" source="Derived" onClick={mkClick('Tax on Normal Income')} />
        {regimeCalc.specialTaxBreakdown?.map((st, i) => (
          <LineRow key={i} label={`${st.name} @ ${st.rate}%`} value={inr(st.tax)} operator="add" source="Derived" onClick={mkClick(`${st.name}`)} />
        ))}
        {regimeCalc.rebate87A > 0 && (
          <LineRow label="Less: Rebate u/s 87A" value={inr(regimeCalc.rebate87A)} operator="subtract" source="Derived" onClick={mkClick('Rebate 87A')} />
        )}
        <LineRow label="Add: Health & Education Cess @ 4%" value={inr(regimeCalc.cess)} operator="add" source="Derived" onClick={mkClick('Cess')} />
        <LineRow label="Gross Tax Liability" value={inr(regimeCalc.totalTaxPayable)} operator="equals" isTotal source="Derived" onClick={mkClick('Gross Tax Liability')} />

        {/* Section: Interest u/s 234A/B/C */}
        <SectionTitle>Interest & Fees</SectionTitle>
        {interest.interest234A > 0 && (
          <LineRow label="Interest u/s 234A (Late Filing)" value={inr(interest.interest234A)} operator="add" source="Derived" onClick={mkClick('Interest 234A')} />
        )}
        {interest.interest234B > 0 && (
          <LineRow label="Interest u/s 234B (Late Payment of Advance Tax)" value={inr(interest.interest234B)} operator="add" source="Derived" onClick={mkClick('Interest 234B')} />
        )}
        {interest.interest234C > 0 && (
          <LineRow label="Interest u/s 234C (Deferment of Advance Tax)" value={inr(interest.interest234C)} operator="add" source="Derived" onClick={mkClick('Interest 234C')} />
        )}
        {interest.lateFilingFee234F > 0 && (
          <LineRow label="Late Filing Fee u/s 234F" value={inr(interest.lateFilingFee234F)} operator="add" source="Derived" onClick={mkClick('Late Filing Fee 234F')} />
        )}
        {interest.totalInterestPayable > 0 && (
          <LineRow label="Total Interest & Fees" value={inr(interest.totalInterestPayable)} operator="equals" isTotal source="Derived" onClick={mkClick('Total Interest & Fees')} />
        )}

        {/* Section: Tax Credits */}
        <SectionTitle>Prepaid Taxes & Credits</SectionTitle>
        {taxCredits.tdsSalary > 0 && (
          <LineRow label="TDS on Salary (u/s 192)" value={inr(taxCredits.tdsSalary)} operator="add" source="Form16" onClick={mkClick('TDS Salary')} />
        )}
        {taxCredits.tdsOther > 0 && (
          <LineRow label="TDS on Other Income" value={inr(taxCredits.tdsOther)} operator="add" source="Form16" onClick={mkClick('TDS Other')} />
        )}
        {taxCredits.tcs > 0 && (
          <LineRow label="TCS (Tax Collected)" value={inr(taxCredits.tcs)} operator="add" source="Form16" onClick={mkClick('TCS')} />
        )}
        {taxCredits.advanceTax > 0 && (
          <LineRow label="Advance Tax" value={inr(taxCredits.advanceTax)} operator="add" source="Form16" onClick={mkClick('Advance Tax')} />
        )}
        {taxCredits.selfAssessmentTax > 0 && (
          <LineRow label="Self-Assessment Tax" value={inr(taxCredits.selfAssessmentTax)} operator="add" source="Form16" onClick={mkClick('Self-Assessment Tax')} />
        )}
        <LineRow label="Total Prepaid Credits" value={inr(totalCredits)} operator="equals" isTotal source="Derived" onClick={mkClick('Total Prepaid Credits')} />

        <Divider sx={{ my: 1.5 }} />

        {/* Net Result */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            py: 2,
            px: 2,
            bgcolor: isRefund ? 'success.light' : 'warning.light',
            borderRadius: 1.5,
            borderTop: 3,
            borderColor: isRefund ? 'success.main' : 'warning.main',
          }}
        >
          <Typography variant="body1" sx={{ fontWeight: 700 }}>
            {isRefund ? 'Refund Due' : 'Net Tax Payable (incl. Interest)'}
          </Typography>
          <Typography
            variant="body1"
            sx={{
              fontWeight: 700,
              fontFamily: 'monospace',
              fontSize: '1.1rem',
              color: isRefund ? 'success.dark' : 'warning.dark',
            }}
          >
            {isRefund ? `-${netResult}` : netResult}
          </Typography>
        </Box>

        {slabSummary && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, px: 1 }}>
            Slab breakdown: {slabSummary}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
