import React from 'react';
import { Box, Button, Paper, Typography } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { Form16Data, ReconciledTaxData } from '@/lib/proto/compatibilityProxy';
import { Form16Bundle } from '@/generated/sources/form16';
import TaxpayerIdentityCard from './TaxpayerIdentityCard';
import IncomeDetails from './IncomeDetails';
import TaxComputation from './TaxComputation';

interface ComputationWorksheetProps {
  data: ReconciledTaxData | null;
  form16List: Array<{ file: File; rawText: string; data: Form16Bundle }>;
  selectedRegime: 'OLD' | 'NEW';
  itrFormType?: 'ITR-1' | 'ITR-2';
  onAiReview?: () => void;
  onValueClick?: (label: string) => void;
}

export default function ComputationWorksheet({ data, form16List, selectedRegime, itrFormType, onAiReview, onValueClick }: ComputationWorksheetProps) {
  if (!data) return null;

  return (
    <Box data-testid="computation-worksheet">
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, mb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {itrFormType && (
            <Paper
              variant="outlined"
              sx={{
                px: 1,
                py: 0.25,
                borderRadius: 1.5,
                bgcolor: 'primary.light',
                color: 'primary.dark',
                borderColor: 'primary.light',
                display: 'inline-flex',
                alignItems: 'center'
              }}
              data-testid="selected-itr-form-badge"
            >
              <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>
                Form: {itrFormType}
              </Typography>
            </Paper>
          )}
        </Box>
        {onAiReview && (
          <Button
            variant="contained"
            color="secondary"
            startIcon={<SmartToyIcon fontSize="small" />}
            onClick={onAiReview}
            size="small"
          >
            AI Review
          </Button>
        )}
      </Box>
      <TaxpayerIdentityCard data={data} />
      <IncomeDetails data={data} form16List={form16List} onValueClick={onValueClick} />
      <TaxComputation data={data} selectedRegime={selectedRegime} onValueClick={onValueClick} />
    </Box>
  );
}
