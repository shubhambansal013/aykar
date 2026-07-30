import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Divider,
  Paper,
} from '@mui/material';
import { Form16Data, ReconciledTaxData, createForm16Proxy } from '@/lib/proto/compatibilityProxy';
import { Form16Bundle } from '@/generated/sources/form16';
import { LineRow, SectionTitle } from './LineRow';

interface IncomeDetailsProps {
  data: ReconciledTaxData | null;
  form16List: Array<{ file: File; rawText: string; data: Form16Bundle }>;
  onValueClick?: (label: string) => void;
}

function inr(amount: number): string {
  return `₹${(amount || 0).toLocaleString('en-IN')}`;
}

function EmployerRow({ employer, salary }: { employer: any; salary: any }) {
  const grossSalary = salary?.grossSalary || 0;
  const standardDeduction = salary?.standardDeduction16ia || 0;
  const incomeFromSalary = salary?.incomeChargeableUnderHeadSalaries || 0;

  return (
    <Paper variant="outlined" sx={{ p: 1.5, mb: 1, bgcolor: 'action.hover', borderRadius: 1.5 }}>
      <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>
        {employer?.name || 'Employer'}
        {employer?.tan && <span style={{ fontFamily: 'monospace', marginLeft: 8, color: 'text.secondary' }}>(TAN: {employer.tan})</span>}
      </Typography>
      <LineRow label="Gross Salary" value={inr(grossSalary)} operator="add" />
      <LineRow label="Less: Standard Deduction" value={inr(standardDeduction)} operator="subtract" />
      <LineRow label="Income from Salary" value={inr(incomeFromSalary)} operator="equals" isTotal />
    </Paper>
  );
}

export default function IncomeDetails({ data, form16List, onValueClick }: IncomeDetailsProps) {
  if (!data) return null;

  const salary = data.salary;
  const otherIncome = data.otherIncome;
  const grossSalary = salary?.grossSalary || 0;
  const standardDeduction = salary?.standardDeduction16ia || 0;
  const incomeFromSalary = salary?.incomeChargeableUnderHeadSalaries || 0;
  const stcg = (data as ReconciledTaxData).shortTermCapitalGains || 0;
  const ltcg = (data as ReconciledTaxData).longTermCapitalGains112A || 0;
  const houseProperty = otherIncome?.houseProperty || 0;
  const otherSources = otherIncome?.totalOtherSources || 0;
  const grossTotalIncome = data.grossTotalIncome || 0;

  const hasCapitalGains = stcg > 0 || ltcg > 0;
  const hasOtherIncome = houseProperty > 0 || otherSources > 0;

  const mkClick = (label: string) => onValueClick ? () => onValueClick(label) : undefined;

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
            Income Details
          </Typography>
        </Box>

        {/* Salary & Employer Section */}
        <SectionTitle>Salary & Employer</SectionTitle>

        {/* Multi-employer breakdown */}
        {form16List.length > 1 ? (
          form16List.map((item, idx) => {
            const p = createForm16Proxy(item.data);
            return (
              <EmployerRow
                key={idx}
                employer={p.employer}
                salary={p.salary}
              />
            );
          })
        ) : (
          <Typography variant="caption" sx={{ display: 'block', mb: 0.5, px: 1, fontWeight: 500, color: 'text.secondary' }}>
            Employer: {data.employer?.name || 'N/A'}
            {data.employer?.tan && <span style={{ fontFamily: 'monospace', marginLeft: 8 }}>(TAN: {data.employer?.tan})</span>}
          </Typography>
        )}

        {/* Consolidated salary lines */}
        <LineRow label="Gross Salary" value={inr(grossSalary)} operator="add" source="Form16" onClick={mkClick('Gross Salary')} />
        <LineRow label="Less: Standard Deduction" value={inr(standardDeduction)} operator="subtract" source="Form16" onClick={mkClick('Standard Deduction')} />
        <LineRow label="Less: Professional Tax / Entertainment Allowance" value={inr((salary?.totalDeductionsUs16 || 0) - standardDeduction)} operator="subtract" source="Form16" onClick={mkClick('Professional Tax')} />
        <LineRow label="Income chargeable under Salaries" value={inr(incomeFromSalary)} operator="equals" isTotal source="Derived" onClick={mkClick('Income from Salary')} />

        {/* Other Incomes */}
        <SectionTitle>Other Incomes</SectionTitle>
        {hasCapitalGains && (
          <>
            {stcg > 0 && <LineRow label="Short Term Capital Gains" value={inr(stcg)} operator="add" source="Derived" onClick={mkClick('Short Term Capital Gains')} />}
            {ltcg > 0 && <LineRow label="Long Term Capital Gains u/s 112A" value={inr(ltcg)} operator="add" source="Derived" onClick={mkClick('Long Term Capital Gains')} />}
          </>
        )}
        {houseProperty !== 0 && (
          <LineRow label="Income from House Property" value={inr(houseProperty)} operator={houseProperty > 0 ? 'add' : 'subtract'} source="Form16" onClick={mkClick('House Property')} />
        )}
        {otherSources > 0 && (
          <LineRow label="Income from Other Sources" value={inr(otherSources)} operator="add" source="Derived" onClick={mkClick('Other Sources')} />
        )}
        {!hasOtherIncome && !hasCapitalGains && (
          <Typography variant="body2" color="text.secondary" sx={{ px: 1, py: 0.5 }}>
            No other income reported
          </Typography>
        )}

        <Divider sx={{ my: 1 }} />

        {/* Gross Total Income */}
        <LineRow label="Gross Total Income" value={inr(grossTotalIncome)} operator="equals" isTotal source="Derived" onClick={mkClick('Gross Total Income')} />
      </CardContent>
    </Card>
  );
}
