import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { Form16Data, ReconciledTaxData } from '@/lib/proto/compatibilityProxy';
import { calculateOldRegime, calculateNewRegime, TaxRegimeDetails } from '@/lib/itr/taxEngine';
import SourceBadge, { SourceType } from './SourceBadge';

interface TaxComputationProps {
  data: ReconciledTaxData | null;
  selectedRegime: 'OLD' | 'NEW';
  onValueClick?: (label: string) => void;
}

function inr(amount: number): string {
  return `₹${(amount || 0).toLocaleString('en-IN')}`;
}

function LineRow({ label, value, operator, isTotal, isNegative, source, onClick }: {
  label: string;
  value: string;
  operator?: 'add' | 'subtract' | 'equals';
  isTotal?: boolean;
  isNegative?: boolean;
  source?: SourceType;
  onClick?: () => void;
}) {
  const Icon = operator === 'add' ? AddIcon : operator === 'subtract' ? RemoveIcon : null;
  const opColor = operator === 'add' ? 'success.main' : operator === 'subtract' ? 'error.main' : 'text.primary';
  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        py: 0.4,
        px: 1,
        bgcolor: isTotal ? 'action.selected' : 'transparent',
        borderRadius: 1,
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? { bgcolor: 'action.hover' } : undefined,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flex: 1 }}>
        {Icon && <Icon sx={{ fontSize: '1rem', color: opColor }} />}
        <Typography variant="body2" sx={{ fontWeight: isTotal ? 700 : 400 }}>
          {label}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: isTotal ? 700 : 500,
            fontFamily: 'monospace',
            whiteSpace: 'nowrap',
            color: isNegative ? 'error.main' : 'text.primary',
          }}
        >
          {value}
        </Typography>
        {source && <SourceBadge source={source} />}
      </Box>
    </Box>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      variant="subtitle2"
      sx={{
        fontWeight: 'bold',
        color: 'primary.main',
        borderBottom: 2,
        borderColor: 'primary.main',
        pb: 0.5,
        mb: 1,
        mt: 0.5,
      }}
    >
      {children}
    </Typography>
  );
}

export default function TaxComputation({ data, selectedRegime, onValueClick }: TaxComputationProps) {
  if (!data) return null;

  const mkClick = (label: string) => onValueClick ? () => onValueClick(label) : undefined;

  const regimeCalc: TaxRegimeDetails = selectedRegime === 'OLD'
    ? calculateOldRegime(data)
    : calculateNewRegime(data);

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

  const netResult = regimeCalc.totalTaxPayable > totalCredits
    ? inr(regimeCalc.totalTaxPayable - totalCredits)
    : inr(totalCredits - regimeCalc.totalTaxPayable);

  const isRefund = totalCredits > regimeCalc.totalTaxPayable;

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
            py: 1,
            px: 1.5,
            bgcolor: isRefund ? 'success.light' : 'warning.light',
            borderRadius: 1.5,
          }}
        >
          <Typography variant="body1" sx={{ fontWeight: 700 }}>
            {isRefund ? 'Refund Due' : 'Net Tax Payable'}
          </Typography>
          <Typography
            variant="body1"
            sx={{
              fontWeight: 700,
              fontFamily: 'monospace',
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
