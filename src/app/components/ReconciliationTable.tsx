'use client';

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Collapse,
  IconButton,
  Paper,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import VerifiedIcon from '@mui/icons-material/Verified';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorIcon from '@mui/icons-material/Error';
import { ReconciledTaxData } from '@/lib/proto/compatibilityProxy';

interface ReconciliationTableProps {
  data: ReconciledTaxData | null;
}

interface SourceValues {
  form16: number | null;
  ais: number | null;
  tis: number | null;
  form26as: number | null;
}

interface ReconciliationRow {
  field: string;
  fieldKey: string;
  values: SourceValues;
}

function inr(amount: number | null): string {
  if (amount === null || amount === undefined) return '—';
  return `₹${amount.toLocaleString('en-IN')}`;
}

function getStatus(values: SourceValues): { status: 'match' | 'partial' | 'mismatch'; label: string } {
  const nonNull = Object.values(values).filter(v => v !== null && v !== undefined) as number[];
  if (nonNull.length === 0) return { status: 'partial', label: '⚠ No Data' };
  if (nonNull.length === 1) return { status: 'partial', label: '⚠ Single Source' };

  const unique = new Set(nonNull);
  if (unique.size === 1) {
    const hasMissing = Object.values(values).some(v => v === null || v === undefined);
    return hasMissing ? { status: 'partial', label: '⚠ Partial' } : { status: 'match', label: '✓ Match' };
  }
  return { status: 'mismatch', label: '✗ Mismatch' };
}

const STATUS_STYLE = {
  match: { bgcolor: 'action.hover', color: 'text.secondary', icon: <VerifiedIcon sx={{ fontSize: 16 }} /> },
  partial: { bgcolor: 'action.hover', color: 'text.secondary', icon: <WarningAmberIcon sx={{ fontSize: 16 }} /> },
  mismatch: { bgcolor: 'action.hover', color: 'text.secondary', icon: <ErrorIcon sx={{ fontSize: 16 }} /> },
} as const;

function DiffDetail({ values }: { values: SourceValues }) {
  const entries = [
    { source: 'Form-16', value: values.form16 },
    { source: '26AS', value: values.form26as },
    { source: 'AIS', value: values.ais },
    { source: 'TIS', value: values.tis },
  ].filter(e => e.value !== null && e.value !== undefined);

  return (
    <Box sx={{ px: 2, py: 1 }}>
      <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>Source Breakdown:</Typography>
      {entries.map(e => (
        <Box key={e.source} sx={{ display: 'flex', justifyContent: 'space-between', px: 1, py: 0.25 }}>
          <Typography variant="caption" sx={{ fontWeight: 500 }}>{e.source}:</Typography>
          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{inr(e.value)}</Typography>
        </Box>
      ))}
    </Box>
  );
}

export default function ReconciliationTable({ data }: ReconciliationTableProps) {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  if (!data) return null;

  const ais = data.aisData;
  const tis = data.tisData;
  const form26as = data.form26asData;

  const tds26as = (form26as?.tdsSalary || []).reduce((s, d) => s + (d.amount || 0), 0);
  const tdsAis = (ais?.tdsDetails || []).reduce((s, d) => s + (d.amount || 0), 0);

  const rows: ReconciliationRow[] = [
    {
      field: 'Gross Salary',
      fieldKey: 'grossSalary',
      values: {
        form16: data.salary?.grossSalary ?? null,
        ais: null,
        tis: tis?.salaryDerived ?? null,
        form26as: null,
      },
    },
    {
      field: 'TDS u/s 192',
      fieldKey: 'tds192',
      values: {
        form16: data.totalTdsDeducted ?? null,
        ais: tdsAis > 0 ? tdsAis : null,
        tis: null,
        form26as: tds26as > 0 ? tds26as : null,
      },
    },
    {
      field: 'Interest (Savings)',
      fieldKey: 'interestSavings',
      values: {
        form16: null,
        ais: ais?.interestSavings ?? null,
        tis: tis?.interestSavings ?? null,
        form26as: null,
      },
    },
    {
      field: 'Interest (Deposit)',
      fieldKey: 'interestDeposit',
      values: {
        form16: null,
        ais: ais?.interestDeposit ?? null,
        tis: tis?.interestDeposit ?? null,
        form26as: null,
      },
    },
    {
      field: 'Dividend Income',
      fieldKey: 'dividendIncome',
      values: {
        form16: null,
        ais: ais?.dividendIncome ?? null,
        tis: tis?.dividendIncome ?? null,
        form26as: null,
      },
    },
    {
      field: 'Short Term Capital Gains',
      fieldKey: 'stcg',
      values: {
        form16: data.shortTermCapitalGains ?? null,
        ais: ais?.shortTermCapitalGains ?? null,
        tis: null,
        form26as: null,
      },
    },
    {
      field: 'Long Term Capital Gains u/s 112A',
      fieldKey: 'ltcg',
      values: {
        form16: data.longTermCapitalGains112A ?? null,
        ais: ais?.longTermCapitalGains112A ?? null,
        tis: null,
        form26as: null,
      },
    },
  ];

  const hasAnyData = rows.some(r => Object.values(r.values).some(v => v !== null && v !== undefined));

  if (!hasAnyData) return null;

  return (
    <Card variant="outlined" sx={{ mb: 2 }} data-testid="reconciliation-table">
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1.5 }}>
          Cross-Source Verification
        </Typography>
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>Field</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>Form-16</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>26AS</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>AIS</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>TIS</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>Status</TableCell>
                <TableCell sx={{ width: 32 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => {
                const { status, label } = getStatus(row.values);
                const isMismatch = status === 'mismatch';
                const isExpanded = !!expandedRows[row.fieldKey];

                return (
                  <React.Fragment key={row.fieldKey}>
                    <TableRow
                      sx={{
                        bgcolor: 'inherit',
                        borderLeft: isMismatch ? '3px solid' : 'none',
                        borderColor: isMismatch ? 'text.secondary' : 'none',
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                      data-testid={`recon-row-${row.fieldKey}`}
                    >
                      <TableCell sx={{ fontWeight: 500, fontSize: '0.75rem' }}>{row.field}</TableCell>
                      <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{inr(row.values.form16)}</TableCell>
                      <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{inr(row.values.form26as)}</TableCell>
                      <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{inr(row.values.ais)}</TableCell>
                      <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{inr(row.values.tis)}</TableCell>
                      <TableCell align="center">
                        <Chip
                          icon={STATUS_STYLE[status].icon}
                          label={label}
                          size="small"
                          sx={{
                            fontWeight: 600,
                            fontSize: '0.65rem',
                            bgcolor: STATUS_STYLE[status].bgcolor,
                            color: STATUS_STYLE[status].color,
                            minWidth: 72,
                          }}
                          variant="outlined"
                          data-testid={`recon-status-${row.fieldKey}`}
                        />
                      </TableCell>
                      <TableCell>
                        {isMismatch && (
                          <IconButton
                            size="small"
                            onClick={() => setExpandedRows(prev => ({ ...prev, [row.fieldKey]: !prev[row.fieldKey] }))}
                            sx={{ p: 0.25 }}
                            data-testid={`recon-expand-${row.fieldKey}`}
                          >
                            {isExpanded ? <ExpandLessIcon sx={{ fontSize: 16 }} /> : <ExpandMoreIcon sx={{ fontSize: 16 }} />}
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                    {isMismatch && (
                      <TableRow>
                        <TableCell sx={{ py: 0, borderBottom: isExpanded ? undefined : 'none' }} colSpan={7}>
                          <Collapse in={isExpanded}>
                            <DiffDetail values={row.values} />
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}
