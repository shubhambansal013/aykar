import React from 'react';
import { Card, CardContent, Box, Typography, Paper, Grid, Checkbox, Divider } from '@mui/material';
import { compareTaxRegimes } from '@/lib/itr/taxEngine';
import { Form16Data } from '@/lib/types';
import { ensureForm16Data } from './FieldCues';

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

        <Typography variant="body2" color="textSecondary" sx={{ mb: 2, display: 'block', fontWeight: 500 }}>
          {recommendation}
        </Typography>

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
              opacity: selectedRegime === 'OLD' ? 1 : 0.6,
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
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="textSecondary">Gross Total Income:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>₹{comparison.oldRegime.grossTotalIncome.toLocaleString('en-IN')}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="textSecondary">Deductions (Chapter VI-A):</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>₹{comparison.oldRegime.chapterVIADeductions.toLocaleString('en-IN')}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="textSecondary">Net Taxable Income:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>₹{comparison.oldRegime.totalIncome.toLocaleString('en-IN')}</Typography>
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
              opacity: selectedRegime === 'NEW' ? 1 : 0.6,
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
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="textSecondary">Gross Total Income:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>₹{comparison.newRegime.grossTotalIncome.toLocaleString('en-IN')}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="textSecondary">Deductions (80CCD(2)):</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>₹{comparison.newRegime.chapterVIADeductions.toLocaleString('en-IN')}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="textSecondary">Net Taxable Income:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>₹{comparison.newRegime.totalIncome.toLocaleString('en-IN')}</Typography>
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
            </Paper>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
