import React from 'react';
import { Box, Button, Paper, Typography } from '@mui/material';
import { Form16Data, ReconciledTaxData } from '@/lib/proto/compatibilityProxy';
import { ensureForm16Data } from './FieldCues';

interface SectionAuditTrailProps {
  section: 'salary' | 'other' | 'deductions' | 'summary';
  extractedData: any;
  mode: 'light' | 'dark';
  selectedRegime: 'OLD' | 'NEW';
  isExpanded: boolean;
  onToggle: () => void;
}

export default function SectionAuditTrail({
  section,
  extractedData,
  mode,
  selectedRegime,
  isExpanded,
  onToggle,
}: SectionAuditTrailProps) {
  const domainData = ensureForm16Data(extractedData);
  if (!domainData) return null;

  const recon = domainData as ReconciledTaxData;
  const salary = recon.salary || {};
  const otherIncome = recon.otherIncome || {};
  const tdsSalary = recon.taxCredits?.tdsSalary || 0;
  const tdsOther = recon.taxCredits?.tdsOther || 0;
  const tcs = recon.taxCredits?.tcs || 0;
  const advanceTax = recon.taxCredits?.advanceTax || 0;
  const selfAssessmentTax = recon.taxCredits?.selfAssessmentTax || 0;

  const totalTaxesPaid = advanceTax + tdsSalary + tdsOther + tcs + selfAssessmentTax;
  const taxPayable = domainData.taxPayable || 0;
  const balanceTaxPayable = Math.max(0, taxPayable - totalTaxesPaid);
  const refundDue = Math.max(0, totalTaxesPaid - taxPayable);

  let innerContent = null;

  if (section === 'salary') {
    innerContent = (
      <Paper variant="outlined" sx={{ p: 2, mt: 1, mb: 1, bgcolor: mode === 'dark' ? 'rgba(56, 189, 248, 0.02)' : 'rgba(2, 132, 199, 0.02)', borderColor: 'primary.light' }}>
        <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5, color: 'primary.main' }}>
          SALARY AUDIT TRAIL & BREAKDOWN:
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Typography variant="caption" sx={{ display: 'block' }}>
            • <strong>Gross Salary:</strong> ₹{salary.grossSalary?.toLocaleString('en-IN')} [Source: <strong>Form-16 Part B / 17(1) + 17(2) + 17(3)</strong>]
          </Typography>
          <Typography variant="caption" sx={{ display: 'block' }}>
            • <strong>Exempt Allowances:</strong> ₹{salary.totalExemptAllowances?.toLocaleString('en-IN')} [Source: <strong>Form-16 Section 10 Exemptions</strong>] {selectedRegime === 'NEW' ? '(Zeroed-out under NEW regime)' : ''}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block' }}>
            • <strong>Net Salary:</strong> Gross (₹{salary.grossSalary?.toLocaleString('en-IN')}) - Exemptions (₹{salary.totalExemptAllowances?.toLocaleString('en-IN')}) = <strong>₹{salary.netSalary?.toLocaleString('en-IN')}</strong>
          </Typography>
          <Typography variant="caption" sx={{ display: 'block' }}>
            • <strong>Deductions u/s 16:</strong> ₹{salary.totalDeductionsUs16?.toLocaleString('en-IN')} [Standard Deduction: ₹{salary.standardDeduction16ia?.toLocaleString('en-IN')} + Entertainment: ₹{salary.entertainmentAllowance16ii?.toLocaleString('en-IN')} + PTax: ₹{salary.professionalTax16iii?.toLocaleString('en-IN')}]
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', fontWeight: 'bold' }}>
            • <strong>Final Chargeable Salary:</strong> Net Salary (₹{salary.netSalary?.toLocaleString('en-IN')}) - Deductions u/s 16 (₹{salary.totalDeductionsUs16?.toLocaleString('en-IN')}) = <strong>₹{salary.incomeChargeableUnderHeadSalaries?.toLocaleString('en-IN')}</strong>
          </Typography>
        </Box>
      </Paper>
    );
  } else if (section === 'other') {
    innerContent = (
      <Paper variant="outlined" sx={{ p: 2, mt: 1, mb: 1, bgcolor: mode === 'dark' ? 'rgba(56, 189, 248, 0.02)' : 'rgba(2, 132, 199, 0.02)', borderColor: 'primary.light' }}>
        <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5, color: 'primary.main' }}>
          OTHER INCOME AUDIT TRAIL & BREAKDOWN:
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Typography variant="caption" sx={{ display: 'block' }}>
            • <strong>House Property Income:</strong> ₹{otherIncome.houseProperty?.toLocaleString('en-IN')} [Source: <strong>Form-16 Interest on Home Loan</strong>] {selectedRegime === 'NEW' ? '(Blocked under NEW regime unless positive/let-out)' : ''}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block' }}>
            • <strong>Other Sources:</strong> ₹{otherIncome.totalOtherSources?.toLocaleString('en-IN')} [Source: <strong>AIS / TIS Interest / Dividends</strong>]
          </Typography>
          <Box sx={{ pl: 2, display: 'flex', flexDirection: 'column' }}>
            {(otherIncome.otherSources || []).map((os, idx) => (
              <Typography key={idx} variant="caption" color="textSecondary">
                - {os.nature}: ₹{os.amount?.toLocaleString('en-IN')}
              </Typography>
            ))}
          </Box>
          <Typography variant="caption" sx={{ display: 'block', fontWeight: 'bold' }}>
            • <strong>Total HP & Other Income:</strong> HP (₹{otherIncome.houseProperty?.toLocaleString('en-IN')}) + Other Sources (₹{otherIncome.totalOtherSources?.toLocaleString('en-IN')}) = <strong>₹{( (otherIncome.houseProperty || 0) + (otherIncome.totalOtherSources || 0) ).toLocaleString('en-IN')}</strong>
          </Typography>
        </Box>
      </Paper>
    );
  } else if (section === 'deductions') {
    innerContent = (
      <Paper variant="outlined" sx={{ p: 2, mt: 1, mb: 1, bgcolor: mode === 'dark' ? 'rgba(56, 189, 248, 0.02)' : 'rgba(2, 132, 199, 0.02)', borderColor: 'primary.light' }}>
        <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5, color: 'primary.main' }}>
          CHAPTER VI-A DEDUCTIONS AUDIT TRAIL:
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Typography variant="caption" sx={{ display: 'block' }}>
            • <strong>Deductions Breakdowns:</strong> 80C: ₹{domainData.deductions80C?.toLocaleString('en-IN')} | 80CCC: ₹{domainData.deductions80CCC?.toLocaleString('en-IN')} | 80CCD(1B): ₹{domainData.deductions80CCD1B?.toLocaleString('en-IN')} | 80CCD(2) Employer: ₹{domainData.deductions80CCD2?.toLocaleString('en-IN')} | 80D Medical: ₹{domainData.deductions80D?.toLocaleString('en-IN')} | 80TTA Interest: ₹{domainData.deductions80TTA?.toLocaleString('en-IN')}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block' }}>
            • <strong>Sum of Invested Deductions:</strong> <strong>₹{domainData.totalChapterVIADeductions?.toLocaleString('en-IN')}</strong> [Source: <strong>Form-16 Section 80C/80D Declarations</strong>]
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', fontWeight: 'bold' }}>
            • <strong>Allowed Deductions:</strong> {selectedRegime === 'NEW' ? `₹${(domainData.deductions80CCD2 || 0).toLocaleString('en-IN')} (Only 80CCD(2) is permitted under New Regime)` : `₹${domainData.totalChapterVIADeductions?.toLocaleString('en-IN')} (All permitted under Old Regime)`}
          </Typography>
        </Box>
      </Paper>
    );
  } else if (section === 'summary') {
    innerContent = (
      <Paper variant="outlined" sx={{ p: 2, mt: 1, mb: 1, bgcolor: mode === 'dark' ? 'rgba(56, 189, 248, 0.02)' : 'rgba(2, 132, 199, 0.02)', borderColor: 'primary.light' }}>
        <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5, color: 'primary.main' }}>
          TAX COMPUTATION & REFUND BREAKDOWN:
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Typography variant="caption" sx={{ display: 'block' }}>
            • <strong>Gross Total Income (GTI):</strong> Salaries (₹{salary.incomeChargeableUnderHeadSalaries?.toLocaleString('en-IN')}) + HP (₹{otherIncome.houseProperty?.toLocaleString('en-IN')}) + Other Sources (₹{otherIncome.totalOtherSources?.toLocaleString('en-IN')}){((domainData as any).shortTermCapitalGains > 0 || (domainData as any).longTermCapitalGains112A > 0) ? ` + Capital Gains (₹${(((domainData as any).shortTermCapitalGains || 0) + ((domainData as any).longTermCapitalGains112A || 0)).toLocaleString('en-IN')})` : ''} = <strong>₹{domainData.grossTotalIncome?.toLocaleString('en-IN')}</strong>
          </Typography>
          <Typography variant="caption" sx={{ display: 'block' }}>
            • <strong>Total Taxable Income:</strong> GTI (₹{domainData.grossTotalIncome?.toLocaleString('en-IN')}) - Deductions Allowed (₹{(selectedRegime === 'NEW' ? (domainData.deductions80CCD2 || 0) : (domainData.totalChapterVIADeductions || 0)).toLocaleString('en-IN')}) = <strong>₹{domainData.totalIncome?.toLocaleString('en-IN')}</strong>
          </Typography>
          <Typography variant="caption" sx={{ display: 'block' }}>
            • <strong>Calculated Tax Liability:</strong> <strong>₹{taxPayable?.toLocaleString('en-IN')}</strong> (includes slab taxes, cess, and rebates)
          </Typography>
          <Typography variant="caption" sx={{ display: 'block' }}>
            • <strong>Total Taxes Paid & Credits:</strong> TDS (₹{(tdsSalary + tdsOther).toLocaleString('en-IN')} [Source: <strong>Form-16/26AS/AIS</strong>]) + TCS (₹{tcs.toLocaleString('en-IN')} [Source: <strong>26AS</strong>]) + Advance Tax (₹{advanceTax.toLocaleString('en-IN')} [Source: <strong>26AS Challan</strong>]) + Self-Assessment Tax (₹{selfAssessmentTax.toLocaleString('en-IN')} [Source: <strong>26AS Challan</strong>]) = <strong>₹{totalTaxesPaid.toLocaleString('en-IN')}</strong>
          </Typography>
          {refundDue > 0 ? (
            <Typography variant="caption" sx={{ display: 'block', fontWeight: 'bold', color: 'success.main', mt: 0.5 }}>
              • <strong>Refund Due Calculation:</strong> Total Taxes Paid (₹{totalTaxesPaid.toLocaleString('en-IN')}) - Calculated Tax Liability (₹{taxPayable.toLocaleString('en-IN')}) = <strong>₹{refundDue.toLocaleString('en-IN')} (Eligible for Refund)</strong>
            </Typography>
          ) : (
            <Typography variant="caption" sx={{ display: 'block', fontWeight: 'bold', color: 'error.main', mt: 0.5 }}>
              • <strong>Balance Tax Payable Calculation:</strong> Calculated Tax Liability (₹{taxPayable.toLocaleString('en-IN')}) - Total Taxes Paid (₹{totalTaxesPaid.toLocaleString('en-IN')}) = <strong>₹{balanceTaxPayable.toLocaleString('en-IN')} (Payable)</strong>
            </Typography>
          )}
        </Box>
      </Paper>
    );
  }

  return (
    <Box sx={{ mt: 1.5, mb: 1 }}>
      <Button
        size="small"
        variant="text"
        onClick={onToggle}
        sx={{
          fontSize: '0.725rem',
          color: 'primary.main',
          p: 0,
          minWidth: 0,
          textTransform: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          fontWeight: 600,
          '&:hover': { background: 'none', textDecoration: 'underline' }
        }}
        data-testid={`toggle-audit-${section}`}
      >
        {isExpanded ? 'Hide Calculation Breakdown ▴' : 'View Calculation Breakdown ▾'}
      </Button>
      {isExpanded && innerContent}
    </Box>
  );
}
