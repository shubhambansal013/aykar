import React from 'react';
import { Box, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import SourceBadge, { SourceType } from './SourceBadge';

export function LineRow({ label, value, operator, isTotal, isNegative, source, onClick }: {
  label: string;
  value: string;
  operator?: 'add' | 'subtract' | 'equals';
  isTotal?: boolean;
  isNegative?: boolean;
  source?: SourceType;
  onClick?: () => void;
}) {
  const Icon = operator === 'add' ? AddIcon : operator === 'subtract' ? RemoveIcon : null;
  const opColor = 'text.secondary';
  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'grid',
        gridTemplateColumns: '1fr auto auto',
        gap: 1,
        alignItems: 'center',
        py: 0.4,
        px: 1,
        bgcolor: isTotal ? 'action.selected' : 'transparent',
        borderRadius: 1,
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? { bgcolor: 'action.hover' } : undefined,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        {Icon && <Icon sx={{ fontSize: '1rem', color: opColor }} />}
        <Typography variant="body2" sx={{ fontWeight: isTotal ? 700 : 400 }}>
          {label}
        </Typography>
      </Box>
      <Typography
        variant="body2"
        sx={{
          fontWeight: isTotal ? 700 : 500,
          fontFamily: 'monospace',
          whiteSpace: 'nowrap',
          justifySelf: 'end',
          color: isNegative ? 'error.main' : 'text.primary',
        }}
      >
        {value}
      </Typography>
      {source && <SourceBadge source={source} />}
    </Box>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      variant="subtitle2"
      sx={{
        fontWeight: 'bold',
        borderBottom: 1,
        borderColor: 'divider',
        pb: 0.5,
        mb: 1,
        mt: 0.5,
      }}
    >
      {children}
    </Typography>
  );
}
