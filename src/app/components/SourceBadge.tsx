import React from 'react';
import { Chip } from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import AssessmentIcon from '@mui/icons-material/Assessment';
import FunctionsIcon from '@mui/icons-material/Functions';
import EditIcon from '@mui/icons-material/Edit';

export type SourceType = 'Form16' | '26AS' | 'AIS' | 'TIS' | 'Derived' | 'Manual';

interface SourceBadgeProps {
  source: SourceType;
  size?: 'small' | 'medium';
}

const SOURCE_CONFIG: Record<SourceType, { label: string; color: 'default'; icon: React.ReactElement }> = {
  Form16: { label: 'Form-16', color: 'default', icon: <DescriptionIcon sx={{ fontSize: 12 }} /> },
  '26AS': { label: '26AS', color: 'default', icon: <AccountBalanceIcon sx={{ fontSize: 12 }} /> },
  AIS: { label: 'AIS', color: 'default', icon: <AnalyticsIcon sx={{ fontSize: 12 }} /> },
  TIS: { label: 'TIS', color: 'default', icon: <AssessmentIcon sx={{ fontSize: 12 }} /> },
  Derived: { label: 'Derived', color: 'default', icon: <FunctionsIcon sx={{ fontSize: 12 }} /> },
  Manual: { label: 'Manual', color: 'default', icon: <EditIcon sx={{ fontSize: 12 }} /> },
};

export default function SourceBadge({ source, size = 'small' }: SourceBadgeProps) {
  const config = SOURCE_CONFIG[source];
  return (
    <Chip
      icon={config.icon}
      label={config.label}
      size={size}
      color={config.color}
      variant="outlined"
      sx={{
        fontWeight: 600,
        fontSize: size === 'small' ? '0.65rem' : '0.75rem',
        height: size === 'small' ? 20 : 24,
        '& .MuiChip-icon': { ml: 0.5 },
      }}
    />
  );
}
