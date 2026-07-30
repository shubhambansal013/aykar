'use client';

import React from 'react';
import { Box, Typography, Tooltip } from '@mui/material';

interface SlabInfo {
  range: string;
  rate: number;
  taxableAmount: number;
  tax: number;
}

interface TaxSlabVisualProps {
  slabs: SlabInfo[];
  totalIncome: number;
  regime: 'OLD' | 'NEW';
}

function inr(amount: number): string {
  return `₹${(amount || 0).toLocaleString('en-IN')}`;
}

const NEW_COLORS = [
  'rgba(37, 99, 235, 0.08)',
  'rgba(37, 99, 235, 0.15)',
  'rgba(37, 99, 235, 0.22)',
  'rgba(37, 99, 235, 0.30)',
  'rgba(37, 99, 235, 0.38)',
  'rgba(37, 99, 235, 0.46)',
  'rgba(37, 99, 235, 0.55)',
];

const OLD_COLORS = [
  'rgba(37, 99, 235, 0.06)',
  'rgba(37, 99, 235, 0.12)',
  'rgba(37, 99, 235, 0.18)',
  'rgba(37, 99, 235, 0.25)',
];

export default function TaxSlabVisual({ slabs, totalIncome, regime }: TaxSlabVisualProps) {
  if (!slabs || slabs.length === 0 || totalIncome <= 0) return null;

  const colors = regime === 'NEW' ? NEW_COLORS : OLD_COLORS;

  const visibleSlabs = slabs.filter(s => s.taxableAmount > 0);
  if (visibleSlabs.length === 0) return null;

  return (
    <Box sx={{ mt: 2 }} data-testid="tax-slab-visual">
      <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 1.5 }}>
        Tax Slab Visual — {regime === 'NEW' ? 'New' : 'Old'} Regime
      </Typography>

      <Box sx={{ position: 'relative', mb: 1 }}>
        <Box sx={{ display: 'flex', height: 32, borderRadius: 1.5, overflow: 'hidden', bgcolor: 'action.hover' }}>
          {visibleSlabs.map((slab, i) => {
            const pct = (slab.taxableAmount / totalIncome) * 100;
            return (
              <Tooltip key={i} title={`${slab.range} @ ${slab.rate}% — ${inr(slab.taxableAmount)} taxed = ${inr(slab.tax)}`}>
                <Box sx={{
                  width: `${pct}%`,
                  bgcolor: colors[i] || colors[colors.length - 1],
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRight: i < visibleSlabs.length - 1 ? '1px solid rgba(255,255,255,0.6)' : 'none',
                  position: 'relative',
                }}>
                  {pct > 8 && (
                    <Typography variant="caption" sx={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      color: slab.rate === 0 ? 'text.secondary' : '#000',
                      lineHeight: 1,
                    }}>
                      {slab.rate}%
                    </Typography>
                  )}
                </Box>
              </Tooltip>
            );
          })}
        </Box>

        <Box sx={{
          position: 'absolute',
          top: -6,
          right: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
        }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.7rem' }}>
            {inr(totalIncome)}
          </Typography>
          <Box sx={{
            width: 0,
            height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderBottom: '7px solid',
            borderBottomColor: 'text.secondary',
          }} />
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {visibleSlabs.map((slab, i) => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.15 }}>
            <Box sx={{
              width: 12,
              height: 12,
              borderRadius: '2px',
              bgcolor: colors[i] || colors[colors.length - 1],
              flexShrink: 0,
            }} />
            <Typography variant="caption" sx={{ flex: 1, fontSize: '0.7rem', color: 'text.secondary' }}>
              {slab.range} @ {slab.rate}%
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.7rem', fontFamily: 'monospace' }}>
              {inr(slab.tax)}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
