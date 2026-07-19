'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { extractTextFromPDF } from '@/lib/form16/extractor';
import { parseForm16Text } from '@/lib/form16/parser';
import { validateForm16Data } from '@/lib/itr/validator';
import { mapForm16ToITR1 } from '@/lib/itr/mapper';
import { Form16Data } from '@/lib/types';

import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  Card,
  CardContent,
  Button,
  IconButton,
  TextField,
  Alert,
  AlertTitle,
  CircularProgress,
  Paper,
  Tooltip,
  InputAdornment,
  Grid,
} from '@mui/material';

import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DownloadIcon from '@mui/icons-material/Download';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import RefreshIcon from '@mui/icons-material/Refresh';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import BugReportIcon from '@mui/icons-material/BugReport';
import CodeIcon from '@mui/icons-material/Code';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<Form16Data | null>(null);
  const [rawText, setRawText] = useState<string>('');
  const [errors, setErrors] = useState<string[]>([]);
  const [aisTisError, setAisTisError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setMode(prefersDark ? 'dark' : 'light');
    }
  }, []);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: mode === 'dark' ? '#90caf9' : '#1976d2',
          },
          secondary: {
            main: mode === 'dark' ? '#ce93d8' : '#9c27b0',
          },
          background: {
            default: mode === 'dark' ? '#121212' : '#f8f9fa',
            paper: mode === 'dark' ? '#1e1e1e' : '#ffffff',
          },
        },
        typography: {
          fontFamily: 'inherit',
        },
      }),
    [mode]
  );

  const toggleTheme = () => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setAisTisError(null); // reset previous error
    setErrors([]); // reset validation errors
    setLoading(true);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const text = await extractTextFromPDF(arrayBuffer);
      setRawText(text);
      const parsed = parseForm16Text(text);
      setExtractedData(parsed);
      setErrors(validateForm16Data(parsed));
    } catch (err) {
      console.error('Error processing PDF:', err);
      alert('Failed to process PDF. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ flexGrow: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
        {/* Top Navbar */}
        <AppBar position="static" color="primary" elevation={1} sx={{ mb: 4 }}>
          <Toolbar>
            <ReceiptLongIcon sx={{ mr: 2, display: { xs: 'none', sm: 'block' } }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
              Form-16 to ITR JSON Parser
            </Typography>
            <Tooltip title={`Toggle ${mode === 'light' ? 'Dark' : 'Light'} Mode`}>
              <IconButton onClick={toggleTheme} color="inherit" aria-label="toggle color mode">
                {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>

        {/* Main Application Area */}
        <Container maxWidth="md" sx={{ flexGrow: 1, pb: 6 }}>
          {/* Upload Section */}
          <Card variant="outlined" sx={{ mb: 4, borderRadius: 2 }}>
            <CardContent>
              <Typography
                id="file-upload-label"
                variant="h6"
                component="label"
                htmlFor="file-upload"
                sx={{ cursor: 'pointer', mb: 2, display: 'block', fontWeight: 'bold' }}
              >
                1. Upload Form-16 PDF
              </Typography>
              <input
                id="file-upload"
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                aria-labelledby="file-upload-label"
              />
              <Box
                component="label"
                htmlFor="file-upload"
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px dashed',
                  borderColor: 'primary.main',
                  borderRadius: 2,
                  p: 4,
                  textAlign: 'center',
                  bgcolor: mode === 'dark' ? 'rgba(144, 202, 249, 0.04)' : 'rgba(25, 118, 210, 0.04)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    bgcolor: mode === 'dark' ? 'rgba(144, 202, 249, 0.08)' : 'rgba(25, 118, 210, 0.08)',
                  },
                }}
              >
                <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                <Typography variant="body1" sx={{ fontWeight: 'medium', mb: 0.5 }}>
                  {file ? file.name : 'Select or drag and drop Form-16 PDF'}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Supports PDF format files only
                </Typography>
              </Box>

              {loading && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 3 }}>
                  <CircularProgress size={24} color="primary" />
                  <Typography variant="body2" color="primary" sx={{ fontWeight: 'medium', animation: 'pulse 1.5s infinite' }}>
                    Extracting data... Please wait.
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {extractedData && (
            <>
              {/* Validation Warnings */}
              {errors.length > 0 && (
                <Alert severity="warning" variant="outlined" sx={{ mb: 4, borderRadius: 2 }}>
                  <AlertTitle sx={{ fontWeight: 'bold' }}>Validation Warnings:</AlertTitle>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                    {errors.map((err, i) => (
                      <li key={i}>
                        <Typography variant="body2">{err}</Typography>
                      </li>
                    ))}
                  </ul>
                </Alert>
              )}

              {/* Review & Edit Section */}
              <Card variant="outlined" sx={{ mb: 4, borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>
                    2. Review & Edit Extracted Information
                  </Typography>

                  <Grid container spacing={3}>
                    {/* Assessee Details */}
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', borderBottom: 1, borderColor: 'divider', pb: 1, mb: 2 }}>
                        Assessee Details
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                          fullWidth
                          label="Employee PAN"
                          value={extractedData.employee.pan}
                          onChange={(e) =>
                            setExtractedData((prev) => {
                              if (!prev) return prev;
                              const next = JSON.parse(JSON.stringify(prev));
                              next.employee.pan = e.target.value;
                              return next;
                            })
                          }
                          variant="outlined"
                          slotProps={{
                            htmlInput: { style: { fontFamily: 'monospace', textTransform: 'uppercase' } }
                          }}
                        />
                        <TextField
                          fullWidth
                          label="First Name"
                          value={extractedData.employee.name.firstName}
                          onChange={(e) =>
                            setExtractedData((prev) => {
                              if (!prev) return prev;
                              const next = JSON.parse(JSON.stringify(prev));
                              next.employee.name.firstName = e.target.value;
                              return next;
                            })
                          }
                          variant="outlined"
                        />
                        <TextField
                          fullWidth
                          label="Last Name"
                          value={extractedData.employee.name.lastName}
                          onChange={(e) =>
                            setExtractedData((prev) => {
                              if (!prev) return prev;
                              const next = JSON.parse(JSON.stringify(prev));
                              next.employee.name.lastName = e.target.value;
                              return next;
                            })
                          }
                          variant="outlined"
                        />
                      </Box>
                    </Grid>

                    {/* Salary Details */}
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', borderBottom: 1, borderColor: 'divider', pb: 1, mb: 2 }}>
                        Salary Income (₹)
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                          fullWidth
                          label="Gross Salary"
                          type="number"
                          value={extractedData.salary.grossSalary}
                          onChange={(e) =>
                            setExtractedData((prev) => {
                              if (!prev) return prev;
                              const next = JSON.parse(JSON.stringify(prev));
                              next.salary.grossSalary = parseFloat(e.target.value) || 0;
                              return next;
                            })
                          }
                          variant="outlined"
                          slotProps={{
                            input: {
                              startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                            }
                          }}
                        />
                        <TextField
                          fullWidth
                          label="Standard Deduction (u/s 16ia)"
                          type="number"
                          value={extractedData.salary.standardDeduction16ia}
                          onChange={(e) =>
                            setExtractedData((prev) => {
                              if (!prev) return prev;
                              const next = JSON.parse(JSON.stringify(prev));
                              next.salary.standardDeduction16ia = parseFloat(e.target.value) || 0;
                              return next;
                            })
                          }
                          variant="outlined"
                          slotProps={{
                            input: {
                              startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                            }
                          }}
                        />
                      </Box>
                    </Grid>

                    {/* Deductions Section */}
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', borderBottom: 1, borderColor: 'divider', pb: 1, mb: 2 }}>
                        Chapter VI-A Deductions (₹)
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 4 }}>
                          <TextField
                            fullWidth
                            label="Section 80C"
                            type="number"
                            value={extractedData.deductions80C}
                            onChange={(e) =>
                              setExtractedData((prev) => {
                                if (!prev) return prev;
                                const next = JSON.parse(JSON.stringify(prev));
                                next.deductions80C = parseFloat(e.target.value) || 0;
                                next.totalChapterVIADeductions =
                                  next.deductions80C + next.deductions80CCC + next.deductions80CCD1 +
                                  next.deductions80CCD1B + next.deductions80CCD2 + next.deductions80D +
                                  next.deductions80E + next.deductions80G + next.deductions80TTA;
                                return next;
                              })
                            }
                            variant="outlined"
                            slotProps={{
                              input: {
                                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                              }
                            }}
                          />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                          <TextField
                            fullWidth
                            label="Section 80CCC"
                            type="number"
                            value={extractedData.deductions80CCC}
                            onChange={(e) =>
                              setExtractedData((prev) => {
                                if (!prev) return prev;
                                const next = JSON.parse(JSON.stringify(prev));
                                next.deductions80CCC = parseFloat(e.target.value) || 0;
                                next.totalChapterVIADeductions =
                                  next.deductions80C + next.deductions80CCC + next.deductions80CCD1 +
                                  next.deductions80CCD1B + next.deductions80CCD2 + next.deductions80D +
                                  next.deductions80E + next.deductions80G + next.deductions80TTA;
                                return next;
                              })
                            }
                            variant="outlined"
                            slotProps={{
                              input: {
                                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                              }
                            }}
                          />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                          <TextField
                            fullWidth
                            label="Section 80CCD(1)"
                            type="number"
                            value={extractedData.deductions80CCD1}
                            onChange={(e) =>
                              setExtractedData((prev) => {
                                if (!prev) return prev;
                                const next = JSON.parse(JSON.stringify(prev));
                                next.deductions80CCD1 = parseFloat(e.target.value) || 0;
                                next.totalChapterVIADeductions =
                                  next.deductions80C + next.deductions80CCC + next.deductions80CCD1 +
                                  next.deductions80CCD1B + next.deductions80CCD2 + next.deductions80D +
                                  next.deductions80E + next.deductions80G + next.deductions80TTA;
                                return next;
                              })
                            }
                            variant="outlined"
                            slotProps={{
                              input: {
                                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                              }
                            }}
                          />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                          <TextField
                            fullWidth
                            label="Section 80CCD(1B)"
                            type="number"
                            value={extractedData.deductions80CCD1B}
                            onChange={(e) =>
                              setExtractedData((prev) => {
                                if (!prev) return prev;
                                const next = JSON.parse(JSON.stringify(prev));
                                next.deductions80CCD1B = parseFloat(e.target.value) || 0;
                                next.totalChapterVIADeductions =
                                  next.deductions80C + next.deductions80CCC + next.deductions80CCD1 +
                                  next.deductions80CCD1B + next.deductions80CCD2 + next.deductions80D +
                                  next.deductions80E + next.deductions80G + next.deductions80TTA;
                                return next;
                              })
                            }
                            variant="outlined"
                            slotProps={{
                              input: {
                                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                              }
                            }}
                          />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                          <TextField
                            fullWidth
                            label="Section 80CCD(2)"
                            type="number"
                            value={extractedData.deductions80CCD2}
                            onChange={(e) =>
                              setExtractedData((prev) => {
                                if (!prev) return prev;
                                const next = JSON.parse(JSON.stringify(prev));
                                next.deductions80CCD2 = parseFloat(e.target.value) || 0;
                                next.totalChapterVIADeductions =
                                  next.deductions80C + next.deductions80CCC + next.deductions80CCD1 +
                                  next.deductions80CCD1B + next.deductions80CCD2 + next.deductions80D +
                                  next.deductions80E + next.deductions80G + next.deductions80TTA;
                                return next;
                              })
                            }
                            variant="outlined"
                            slotProps={{
                              input: {
                                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                              }
                            }}
                          />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                          <TextField
                            fullWidth
                            label="Section 80D"
                            type="number"
                            value={extractedData.deductions80D}
                            onChange={(e) =>
                              setExtractedData((prev) => {
                                if (!prev) return prev;
                                const next = JSON.parse(JSON.stringify(prev));
                                next.deductions80D = parseFloat(e.target.value) || 0;
                                next.totalChapterVIADeductions =
                                  next.deductions80C + next.deductions80CCC + next.deductions80CCD1 +
                                  next.deductions80CCD1B + next.deductions80CCD2 + next.deductions80D +
                                  next.deductions80E + next.deductions80G + next.deductions80TTA;
                                return next;
                              })
                            }
                            variant="outlined"
                            slotProps={{
                              input: {
                                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                              }
                            }}
                          />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                          <TextField
                            fullWidth
                            label="Section 80E"
                            type="number"
                            value={extractedData.deductions80E}
                            onChange={(e) =>
                              setExtractedData((prev) => {
                                if (!prev) return prev;
                                const next = JSON.parse(JSON.stringify(prev));
                                next.deductions80E = parseFloat(e.target.value) || 0;
                                next.totalChapterVIADeductions =
                                  next.deductions80C + next.deductions80CCC + next.deductions80CCD1 +
                                  next.deductions80CCD1B + next.deductions80CCD2 + next.deductions80D +
                                  next.deductions80E + next.deductions80G + next.deductions80TTA;
                                return next;
                              })
                            }
                            variant="outlined"
                            slotProps={{
                              input: {
                                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                              }
                            }}
                          />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                          <TextField
                            fullWidth
                            label="Section 80G"
                            type="number"
                            value={extractedData.deductions80G}
                            onChange={(e) =>
                              setExtractedData((prev) => {
                                if (!prev) return prev;
                                const next = JSON.parse(JSON.stringify(prev));
                                next.deductions80G = parseFloat(e.target.value) || 0;
                                next.totalChapterVIADeductions =
                                  next.deductions80C + next.deductions80CCC + next.deductions80CCD1 +
                                  next.deductions80CCD1B + next.deductions80CCD2 + next.deductions80D +
                                  next.deductions80E + next.deductions80G + next.deductions80TTA;
                                return next;
                              })
                            }
                            variant="outlined"
                            slotProps={{
                              input: {
                                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                              }
                            }}
                          />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                          <TextField
                            fullWidth
                            label="Section 80TTA"
                            type="number"
                            value={extractedData.deductions80TTA}
                            onChange={(e) =>
                              setExtractedData((prev) => {
                                if (!prev) return prev;
                                const next = JSON.parse(JSON.stringify(prev));
                                next.deductions80TTA = parseFloat(e.target.value) || 0;
                                next.totalChapterVIADeductions =
                                  next.deductions80C + next.deductions80CCC + next.deductions80CCD1 +
                                  next.deductions80CCD1B + next.deductions80CCD2 + next.deductions80D +
                                  next.deductions80E + next.deductions80G + next.deductions80TTA;
                                return next;
                              })
                            }
                            variant="outlined"
                            slotProps={{
                              input: {
                                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                              }
                            }}
                          />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                          <TextField
                            fullWidth
                            label="Total Chapter VI-A Deductions"
                            type="number"
                            value={extractedData.totalChapterVIADeductions}
                            onChange={(e) =>
                              setExtractedData((prev) => {
                                if (!prev) return prev;
                                const next = JSON.parse(JSON.stringify(prev));
                                next.totalChapterVIADeductions = parseFloat(e.target.value) || 0;
                                return next;
                              })
                            }
                            variant="outlined"
                            slotProps={{
                              input: {
                                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                              }
                            }}
                          />
                        </Grid>
                      </Grid>
                    </Grid>
                  </Grid>

                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
                    <Button
                      variant="outlined"
                      color="secondary"
                      startIcon={<RefreshIcon />}
                      onClick={() => setErrors(validateForm16Data(extractedData))}
                      size="large"
                    >
                      Re-validate Data
                    </Button>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<DownloadIcon />}
                      onClick={() => {
                        const itrJson = mapForm16ToITR1(extractedData);
                        const blob = new Blob([JSON.stringify(itrJson, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `ITR1_${extractedData.employee.pan || 'data'}.json`;
                        a.click();
                      }}
                      size="large"
                    >
                      Download ITR JSON
                    </Button>
                  </Box>
                </CardContent>
              </Card>

              {/* Debug Information */}
              <Box sx={{ mt: 6 }}>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                  <BugReportIcon /> 3. Debug Information (For Verification)
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        bgcolor: 'grey.900',
                        color: '#10b981',
                        borderRadius: 2,
                        height: 384,
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        sx={{
                          color: 'grey.400',
                          pb: 1,
                          mb: 1.5,
                          borderBottom: '1px solid',
                          borderColor: 'grey.800',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                        }}
                      >
                        <CodeIcon sx={{ fontSize: 16 }} /> Raw Extracted Text
                      </Typography>
                      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '11px', fontFamily: 'monospace' }}>
                          {rawText}
                        </pre>
                      </Box>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        bgcolor: 'grey.900',
                        color: '#60a5fa',
                        borderRadius: 2,
                        height: 384,
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        sx={{
                          color: 'grey.400',
                          pb: 1,
                          mb: 1.5,
                          borderBottom: '1px solid',
                          borderColor: 'grey.800',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                        }}
                      >
                        <CodeIcon sx={{ fontSize: 16 }} /> Intermediate Form16Data Object
                      </Typography>
                      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                        <pre style={{ margin: 0, whiteSpace: 'pre', fontSize: '11px', fontFamily: 'monospace' }}>
                          {JSON.stringify(extractedData, null, 2)}
                        </pre>
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            </>
          )}
        </Container>
      </Box>
    </ThemeProvider>
  );
}
