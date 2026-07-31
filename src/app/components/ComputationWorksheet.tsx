import React from 'react';
import {
  Box, Button, Paper, Typography, Accordion, AccordionSummary, AccordionDetails, CircularProgress, Chip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonIcon from '@mui/icons-material/Person';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CalculateIcon from '@mui/icons-material/Calculate';
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
  chatLoading?: boolean;
  reviewCompleted?: boolean;
  reviewDataVersion?: number;
  dataVersion?: number;
  onAiReview?: () => void;
  onValueClick?: (label: string) => void;
}

function CollapsibleSection({ title, icon, defaultExpanded, children }: {
  title: string;
  icon: React.ReactNode;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Accordion
      defaultExpanded={defaultExpanded}
      disableGutters
      elevation={0}
      sx={{
        mb: 1.5,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '8px !important',
        '&::before': { display: 'none' },
        '&.Mui-expanded': { m: 0, mb: 1.5 },
        overflow: 'hidden',
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 40, '& .MuiAccordionSummary-content': { alignItems: 'center', gap: 1 } }}>
        {icon}
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{title}</Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ p: 0, pt: 0 }}>
        {children}
      </AccordionDetails>
    </Accordion>
  );
}

export default function ComputationWorksheet({ data, form16List, selectedRegime, itrFormType, chatLoading, reviewCompleted, reviewDataVersion, dataVersion, onAiReview, onValueClick }: ComputationWorksheetProps) {
  if (!data) return null;

  const header = (
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
        reviewCompleted && dataVersion !== undefined && reviewDataVersion !== undefined && dataVersion === reviewDataVersion ? (
          <Chip
            icon={<CheckCircleIcon fontSize="small" />}
            label="✓ Reviewed"
            color="success"
            size="small"
            variant="outlined"
            data-testid="review-completed-badge"
          />
        ) : reviewCompleted && dataVersion !== undefined && reviewDataVersion !== undefined && dataVersion > reviewDataVersion ? (
          <Button
            variant="contained"
            color="warning"
            startIcon={<SmartToyIcon fontSize="small" />}
            onClick={onAiReview}
            size="small"
            disabled={chatLoading}
            data-testid="re-review-button"
          >
            {chatLoading ? 'Reviewing…' : 'Re-review'}
          </Button>
        ) : (
          <Button
            variant="contained"
            color="secondary"
            startIcon={chatLoading ? <CircularProgress size={16} color="inherit" /> : <SmartToyIcon fontSize="small" />}
            onClick={onAiReview}
            size="small"
            disabled={chatLoading}
          >
            {chatLoading ? 'Reviewing…' : 'AI Review'}
          </Button>
        )
      )}
    </Box>
  );

  const sections = (
    <>
      <CollapsibleSection title="Taxpayer Identity" icon={<PersonIcon fontSize="small" color="primary" />} defaultExpanded={false}>
        <TaxpayerIdentityCard data={data} />
      </CollapsibleSection>
      <CollapsibleSection title="Income Details" icon={<AccountBalanceIcon fontSize="small" color="primary" />} defaultExpanded>
        <IncomeDetails data={data} form16List={form16List} onValueClick={onValueClick} />
      </CollapsibleSection>
      <CollapsibleSection title="Tax Computation" icon={<CalculateIcon fontSize="small" color="primary" />} defaultExpanded>
        <TaxComputation data={data} selectedRegime={selectedRegime} onValueClick={onValueClick} />
      </CollapsibleSection>
    </>
  );

  return (
    <Box data-testid="computation-worksheet">
      {header}
      {sections}
    </Box>
  );
}
