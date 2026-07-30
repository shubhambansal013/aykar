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

export function SectionTitle({ children }: { children: React.ReactNode }) {
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
