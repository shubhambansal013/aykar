import React from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Paper,
  Grid,
  Checkbox,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { compareTaxRegimes } from '@/lib/itr/taxEngine';
import { ensureForm16Data } from './FieldCues';

function TaxComputationBreakdown({ regime }: { regime: any }) {
  if (!regime.slabTaxBreakdown || regime.slabTaxBreakdown.length === 0) return null;

  return (
    <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px dashed', borderColor: 'divider' }}>
      <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'primary.main', display: 'block', mb: 1 }}>
        Step-by-Step Tax Computation Worksheet:
      </Typography>

      {/* Slab-wise details */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 1 }}>
        {regime.slabTaxBreakdown.map((slab: any, i: number) => (
          <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pl: 1 }}>
            <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.725rem' }}>
              Tax on {slab.range} @ {slab.rate}%:
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.725rem' }}>
              ₹{slab.tax.toLocaleString('en-IN')}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Special Rate Capital Gains details */}
      {regime.specialTaxBreakdown && regime.specialTaxBreakdown.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 1, borderTop: '1px dotted', borderColor: 'divider', pt: 1 }}>
          {regime.specialTaxBreakdown.map((spec: any, i: number) => (
            <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pl: 1 }}>
              <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.725rem' }}>
                {spec.name} @ {spec.rate}%:
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.725rem' }}>
                ₹{spec.tax.toLocaleString('en-IN')}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      {/* Total Tax and Surcharges / Rebates */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mt: 1, pt: 1, borderTop: '1px dotted', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 'bold' }}>Total Tax before Rebate:</Typography>
          <Typography variant="caption" sx={{ fontWeight: 'bold' }}>₹{regime.taxBeforeRebate.toLocaleString('en-IN')}</Typography>
        </Box>

        {regime.rebate87A > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 500 }}>
              Less: Rebate u/s 87A {regime.marginalRelief87A > 0 ? '(with Marginal Relief)' : ''}:
            </Typography>
            <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 600 }}>
              -₹{regime.rebate87A.toLocaleString('en-IN')}
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="caption" color="textSecondary">Add: Education Cess @ 4.00%:</Typography>
          <Typography variant="caption" sx={{ fontWeight: 600 }}>₹{regime.cess.toLocaleString('en-IN')}</Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', bgcolor: 'action.hover', p: 0.5, borderRadius: 0.5, mt: 0.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'primary.main' }}>Net Tax Liability:</Typography>
          <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'primary.main' }}>₹{regime.totalTaxPayable.toLocaleString('en-IN')}</Typography>
        </Box>
      </Box>
    </Box>
  );
}

interface TaxRegimeComparisonCardProps {
  extractedData: any;
  selectedRegime: 'OLD' | 'NEW';
  mode: 'light' | 'dark';
  onSelectRegime: (regime: 'OLD' | 'NEW') => void;
}

export default function TaxRegimeComparisonCard({
  extractedData,
  selectedRegime,
  mode,
  onSelectRegime,
}: TaxRegimeComparisonCardProps) {
  const domainData = ensureForm16Data(extractedData);
  if (!domainData) return null;

  const comparison = compareTaxRegimes(domainData);
  const savings = Math.abs(comparison.oldRegime.totalTaxPayable - comparison.newRegime.totalTaxPayable);
  const optimalText = comparison.optimalRegime === 'OLD' ? 'Old Tax Regime' : 'New Tax Regime';
  const recommendation = savings > 0
    ? `Based on your data, the ${optimalText} is the most tax-efficient choice, saving you ₹${savings.toLocaleString('en-IN')}.`
    : `Both regimes result in the exact same tax liability. You can choose either.`;

  return (
    <Card variant="outlined" sx={{ mb: 2.5, borderColor: 'primary.main', borderWidth: 2 }} data-testid="tax-comparison-card">
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', m: 0 }}>
            Tax Regime Comparison & Selection
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Paper variant="outlined" sx={{
              px: 1.5,
              py: 0.5,
              borderRadius: 1.5,
              bgcolor: 'success.main',
              color: 'success.contrastText',
              fontWeight: 'bold',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              border: 'none'
            }} data-testid="efficiency-badge">
              {comparison.optimalRegime === 'NEW' ? 'New Regime Optimal' : 'Old Regime Optimal'}
            </Paper>
          </Box>
        </Box>

        {/* Primary Recommendation Banner */}
        <Box sx={{
          p: 2,
          mb: 2.5,
          borderRadius: 1.5,
          bgcolor: comparison.optimalRegime === 'NEW' ? 'success.dark' : 'success.main',
          color: 'success.contrastText',
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
          boxShadow: 1
        }} data-testid="recommendation-banner">
          <Typography variant="subtitle1" sx={{ fontWeight: 'extrabold', letterSpacing: 0.5, m: 0, fontSize: '0.95rem' }}>
            RECOMMENDATION: {comparison.optimalRegime === 'NEW' ? 'NEW REGIME OPTIMAL' : 'OLD REGIME OPTIMAL'} {savings > 0 ? `(Saves ₹${savings.toLocaleString('en-IN')})` : ''}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.95, fontWeight: 500, fontSize: '0.8rem' }}>
            {recommendation}
          </Typography>
        </Box>

        <Grid container spacing={2}>
          {/* Old Regime Summary */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Paper variant="outlined" sx={{
              p: 2,
              borderRadius: 1.5,
              borderColor: selectedRegime === 'OLD' ? 'primary.main' : (comparison.optimalRegime === 'OLD' ? 'success.light' : 'divider'),
              borderWidth: selectedRegime === 'OLD' ? 2 : (comparison.optimalRegime === 'OLD' ? 1.5 : 1),
              bgcolor: selectedRegime === 'OLD'
                ? (mode === 'dark' ? 'rgba(56, 189, 248, 0.05)' : 'rgba(2, 132, 199, 0.05)')
                : (comparison.optimalRegime === 'OLD'
                    ? (mode === 'dark' ? 'rgba(46, 125, 50, 0.05)' : 'rgba(46, 125, 50, 0.03)')
                    : 'background.paper'
                  ),
              cursor: 'pointer',
              opacity: selectedRegime === 'OLD' ? 1 : 0.8,
              transition: 'opacity 0.2s, border-color 0.2s',
            }} onClick={() => onSelectRegime('OLD')} data-testid="select-old-regime">
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Old Tax Regime</Typography>
                  {comparison.optimalRegime === 'OLD' && (
                    <Paper variant="outlined" sx={{
                      px: 1,
                      py: 0.1,
                      borderRadius: 1,
                      bgcolor: 'success.main',
                      color: 'success.contrastText',
                      fontWeight: 'bold',
                      fontSize: '0.65rem',
                      border: 'none',
                    }}>
                      Optimal
                    </Paper>
                  )}
                </Box>
                <Checkbox checked={selectedRegime === 'OLD'} readOnly size="small" />
              </Box>

              {/* Core Numbers */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="textSecondary">Gross Income:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>₹{comparison.oldRegime.grossTotalIncome.toLocaleString('en-IN')}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="textSecondary">Total Deductions:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>₹{comparison.oldRegime.chapterVIADeductions.toLocaleString('en-IN')}</Typography>
                </Box>
                <Divider sx={{ my: 0.5 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Total Tax Payable:</Typography>
                  <Typography variant="body1" color={comparison.optimalRegime === 'OLD' ? 'success.main' : 'text.primary'} sx={{ fontWeight: 'bold' }}>
                    ₹{comparison.oldRegime.totalTaxPayable.toLocaleString('en-IN')}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="textSecondary">Refund Due:</Typography>
                  <Typography variant="body2" color="success.main" sx={{ fontWeight: 'bold' }}>
                    ₹{comparison.oldRegime.refundDue.toLocaleString('en-IN')}
                  </Typography>
                </Box>
              </Box>

              {/* Collapsible Breakdown */}
              <Accordion
                sx={{
                  mt: 2,
                  boxShadow: 'none',
                  bgcolor: 'transparent',
                  backgroundImage: 'none',
                  '&::before': { display: 'none' },
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  '&.Mui-expanded': { m: '16px 0 0 0' }
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon fontSize="small" />}
                  sx={{ minHeight: 32, '& .MuiAccordionSummary-content': { my: 0.5 } }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    View Detailed Breakdown
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 1.5, pt: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="textSecondary">Gross Salary:</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>₹{comparison.oldRegime.grossSalary.toLocaleString('en-IN')}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="textSecondary">Exempt Allowances (HRA etc):</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>₹{comparison.oldRegime.totalExemptAllowances.toLocaleString('en-IN')}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="textSecondary">Net Salary:</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>₹{comparison.oldRegime.netSalary.toLocaleString('en-IN')}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="textSecondary">Standard Deduction:</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>₹{comparison.oldRegime.standardDeduction.toLocaleString('en-IN')}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="textSecondary">Other Deductions u/s 16:</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>₹{comparison.oldRegime.otherDeductionsUs16.toLocaleString('en-IN')}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="textSecondary">Income from Salaries:</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>₹{comparison.oldRegime.incomeFromSalaries.toLocaleString('en-IN')}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="textSecondary">House Property Income:</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>₹{comparison.oldRegime.housePropertyIncome.toLocaleString('en-IN')}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="textSecondary">Other Sources Income:</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>₹{comparison.oldRegime.otherSourcesIncome.toLocaleString('en-IN')}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="textSecondary">Net Taxable Income:</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>₹{comparison.oldRegime.totalIncome.toLocaleString('en-IN')}</Typography>
                  </Box>
                  <Divider sx={{ my: 0.25 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="textSecondary">Tax Before Rebate:</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>₹{comparison.oldRegime.taxBeforeRebate.toLocaleString('en-IN')}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="textSecondary">Rebate u/s 87A:</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>₹{comparison.oldRegime.rebate87A.toLocaleString('en-IN')}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="textSecondary">Cess:</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>₹{comparison.oldRegime.cess.toLocaleString('en-IN')}</Typography>
                  </Box>
                  <TaxComputationBreakdown regime={comparison.oldRegime} />
                </AccordionDetails>
              </Accordion>
            </Paper>
          </Grid>

          {/* New Regime Summary */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Paper variant="outlined" sx={{
              p: 2,
              borderRadius: 1.5,
              borderColor: selectedRegime === 'NEW' ? 'primary.main' : (comparison.optimalRegime === 'NEW' ? 'success.light' : 'divider'),
              borderWidth: selectedRegime === 'NEW' ? 2 : (comparison.optimalRegime === 'NEW' ? 1.5 : 1),
              bgcolor: selectedRegime === 'NEW'
                ? (mode === 'dark' ? 'rgba(56, 189, 248, 0.05)' : 'rgba(2, 132, 199, 0.05)')
                : (comparison.optimalRegime === 'NEW'
                    ? (mode === 'dark' ? 'rgba(46, 125, 50, 0.05)' : 'rgba(46, 125, 50, 0.03)')
                    : 'background.paper'
                  ),
              cursor: 'pointer',
              opacity: selectedRegime === 'NEW' ? 1 : 0.8,
              transition: 'opacity 0.2s, border-color 0.2s',
            }} onClick={() => onSelectRegime('NEW')} data-testid="select-new-regime">
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>New Tax Regime</Typography>
                  {comparison.optimalRegime === 'NEW' && (
                    <Paper variant="outlined" sx={{
                      px: 1,
                      py: 0.1,
                      borderRadius: 1,
                      bgcolor: 'success.main',
                      color: 'success.contrastText',
                      fontWeight: 'bold',
                      fontSize: '0.65rem',
                      border: 'none',
                    }}>
                      Optimal
                    </Paper>
                  )}
                </Box>
                <Checkbox checked={selectedRegime === 'NEW'} readOnly size="small" />
              </Box>

              {/* Core Numbers */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="textSecondary">Gross Income:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>₹{comparison.newRegime.grossTotalIncome.toLocaleString('en-IN')}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="textSecondary">Total Deductions:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>₹{comparison.newRegime.chapterVIADeductions.toLocaleString('en-IN')}</Typography>
                </Box>
                <Divider sx={{ my: 0.5 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Total Tax Payable:</Typography>
                  <Typography variant="body1" color={comparison.optimalRegime === 'NEW' ? 'success.main' : 'text.primary'} sx={{ fontWeight: 'bold' }}>
                    ₹{comparison.newRegime.totalTaxPayable.toLocaleString('en-IN')}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="textSecondary">Refund Due:</Typography>
                  <Typography variant="body2" color="success.main" sx={{ fontWeight: 'bold' }}>
                    ₹{comparison.newRegime.refundDue.toLocaleString('en-IN')}
                  </Typography>
                </Box>
              </Box>

              {/* Collapsible Breakdown */}
              <Accordion
                sx={{
                  mt: 2,
                  boxShadow: 'none',
                  bgcolor: 'transparent',
                  backgroundImage: 'none',
                  '&::before': { display: 'none' },
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  '&.Mui-expanded': { m: '16px 0 0 0' }
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon fontSize="small" />}
                  sx={{ minHeight: 32, '& .MuiAccordionSummary-content': { my: 0.5 } }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    View Detailed Breakdown
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 1.5, pt: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="textSecondary">Gross Salary:</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>₹{comparison.newRegime.grossSalary.toLocaleString('en-IN')}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="textSecondary">Standard Deduction:</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>₹{comparison.newRegime.standardDeduction.toLocaleString('en-IN')}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="textSecondary">Income from Salaries:</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>₹{comparison.newRegime.incomeFromSalaries.toLocaleString('en-IN')}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="textSecondary">House Property Income:</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>₹{comparison.newRegime.housePropertyIncome.toLocaleString('en-IN')}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="textSecondary">Other Sources Income:</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>₹{comparison.newRegime.otherSourcesIncome.toLocaleString('en-IN')}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="textSecondary">Net Taxable Income:</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>₹{comparison.newRegime.totalIncome.toLocaleString('en-IN')}</Typography>
                  </Box>
                  <Divider sx={{ my: 0.25 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="textSecondary">Tax Before Rebate:</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>₹{comparison.newRegime.taxBeforeRebate.toLocaleString('en-IN')}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="textSecondary">Rebate u/s 87A:</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>₹{comparison.newRegime.rebate87A.toLocaleString('en-IN')}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="textSecondary">Cess:</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>₹{comparison.newRegime.cess.toLocaleString('en-IN')}</Typography>
                  </Box>
                  <TaxComputationBreakdown regime={comparison.newRegime} />
                </AccordionDetails>
              </Accordion>
            </Paper>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}