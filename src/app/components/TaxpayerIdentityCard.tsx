import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Divider,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import { Form16Data } from '@/lib/proto/compatibilityProxy';

interface TaxpayerIdentityCardProps {
  data: Form16Data | null;
}

function fmt(val: string) {
  return val || '—';
}

export default function TaxpayerIdentityCard({ data }: TaxpayerIdentityCardProps) {
  if (!data) return null;

  const emp = data.employee;
  const name = [emp?.name?.firstName, emp?.name?.middleName, emp?.name?.lastName]
    .filter(Boolean)
    .join(' ');
  const pan = emp?.pan || '';
  const ay = data.assessmentYear || '';

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <PersonIcon fontSize="small" color="primary" />
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
            Taxpayer Identity
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
          <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 80 }}>
            Name:
          </Typography>
          <Typography variant="body2">{fmt(name)}</Typography>
          <Divider orientation="vertical" flexItem />
          <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 80 }}>
            PAN:
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{fmt(pan)}</Typography>
          <Divider orientation="vertical" flexItem />
          <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 80 }}>
            Assessment Year:
          </Typography>
          <Typography variant="body2">{fmt(ay)}</Typography>
          {ay && (
            <Chip
              label={ay}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 600, fontSize: '0.7rem' }}
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
