import React from 'react';
import { Paper } from '@mui/material';

interface SectionHeaderBadgeProps {
  count: number;
  mode: 'light' | 'dark';
}

export default function SectionHeaderBadge({ count, mode }: SectionHeaderBadgeProps) {
  if (count === 0) return null;
  return (
    <Paper
      variant="outlined"
      sx={{
        px: 1,
        py: 0.25,
        borderRadius: 1,
        bgcolor: mode === 'dark' ? 'rgba(56, 189, 248, 0.1)' : 'rgba(2, 132, 199, 0.1)',
        color: mode === 'dark' ? '#38bdf8' : '#0284c7',
        fontWeight: 'bold',
        fontSize: '0.725rem',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        border: 'none',
        verticalAlign: 'middle',
        ml: 1.5,
      }}
      data-testid="verified-badge"
    >
      ✓ {count} fields auto-verified
    </Paper>
  );
}
