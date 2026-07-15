'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { extractTextFromPDF } from '@/lib/form16/extractor';
import { parseForm16Text } from '@/lib/form16/parser';
import { validateForm16Data } from '@/lib/itr/validator';
import { mapForm16ToITR1 } from '@/lib/itr/mapper';
import { Form16Data } from '@/lib/types';
import { aiConfig } from '@/lib/ai/config';

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
  Drawer,
  Divider,
  List,
  ListItem,
  ListItemText,
  Fab,
} from '@mui/material';

import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DownloadIcon from '@mui/icons-material/Download';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import RefreshIcon from '@mui/icons-material/Refresh';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import BugReportIcon from '@mui/icons-material/BugReport';
import CodeIcon from '@mui/icons-material/Code';
import ChatIcon from '@mui/icons-material/Chat';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DeleteIcon from '@mui/icons-material/Delete';

interface Attachment {
  name: string;
  mimeType: string;
  data: string; // Base64 representation
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  attachments?: Attachment[];
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<Form16Data | null>(null);
  const [rawText, setRawText] = useState<string>('');
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'light' | 'dark'>('light');

  // AI Chat States
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachingFile, setAttachingFile] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

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

  // Scroll to bottom in Chat Window
  const scrollToBottom = () => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (chatOpen) {
      scrollToBottom();
    }
  }, [messages, chatOpen]);

  // Handle Send Chat message
  const handleSendMessage = async (isReviewRequest = false) => {
    if (!inputMessage.trim() && attachments.length === 0 && !isReviewRequest) return;

    let userMessageContent = inputMessage;
    if (isReviewRequest) {
      userMessageContent = aiConfig.reviewPrompt;
    }

    const newUserMessage: Message = {
      role: 'user',
      content: userMessageContent,
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    };

    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setInputMessage('');
    setAttachments([]);
    setChatLoading(true);
    setChatOpen(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: updatedMessages,
          itrData: extractedData,
          rawText: rawText,
          isReview: isReviewRequest,
        }),
      });

      if (!response.ok) {
        throw new Error('AI Chat encountered an error. Please try again.');
      }

      const reply = await response.json();
      setMessages((prev) => [...prev, reply]);
    } catch (err: any) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Error: ${err?.message || 'Something went wrong while talking to the AI.'}`,
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // Trigger AI Review using the pre-configured prompt
  const handleAIReview = () => {
    handleSendMessage(true);
  };

  // Handle adding custom attachments
  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setAttachingFile(true);
    try {
      const mimeType = selectedFile.type;

      // If PDF, we can use existing extractor to fetch text first, or send standard pdf
      let base64Data = '';
      if (mimeType === 'application/pdf') {
        const arrayBuffer = await selectedFile.arrayBuffer();
        try {
          const pdfText = await extractTextFromPDF(arrayBuffer);
          base64Data = btoa(unescape(encodeURIComponent(pdfText)));
        } catch {
          // Fallback to reading file normally
          base64Data = await readFileAsBase64(selectedFile);
        }
      } else {
        base64Data = await readFileAsBase64(selectedFile);
      }

      const newAttachment: Attachment = {
        name: selectedFile.name,
        mimeType: mimeType || 'application/octet-stream',
        data: base64Data,
      };

      setAttachments((prev) => [...prev, newAttachment]);
    } catch (err) {
      console.error('Attachment error:', err);
      alert('Failed to attach file.');
    } finally {
      setAttachingFile(false);
    }
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // strip data url prefix
        const base64 = result.substring(result.indexOf(',') + 1);
        resolve(base64);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
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
            <Tooltip title="Ask AI / Chat">
              <IconButton onClick={() => setChatOpen(true)} color="inherit" aria-label="open ai chat">
                <ChatIcon />
              </IconButton>
            </Tooltip>
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
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', m: 0 }}>
                      2. Review & Edit Extracted Information
                    </Typography>
                    {/* AI Review Button */}
                    <Button
                      variant="contained"
                      color="secondary"
                      startIcon={<SmartToyIcon />}
                      onClick={handleAIReview}
                      sx={{ fontWeight: 'bold' }}
                    >
                      AI Review
                    </Button>
                  </Box>

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

        {/* AI Chat Right Drawer */}
        <Drawer
          anchor="right"
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          slotProps={{
            backdrop: { style: { backgroundColor: 'transparent' } },
            paper: {
              sx: {
                width: { xs: '100%', sm: 450 },
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: 8,
              },
            }
          }}
        >
          {/* Drawer Header */}
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'primary.main', color: 'primary.contrastText' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SmartToyIcon />
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>AI Tax Assistant</Typography>
            </Box>
            <IconButton onClick={() => setChatOpen(false)} color="inherit" aria-label="close chat">
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Drawer Messages list */}
          <Box sx={{ flexGrow: 1, p: 2, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2, bgcolor: 'background.default' }}>
            {messages.length === 0 && (
              <Box sx={{ textAlign: 'center', my: 'auto', px: 3, color: 'text.secondary' }}>
                <SmartToyIcon sx={{ fontSize: 48, mb: 1.5, opacity: 0.7 }} />
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>Ask me anything about your taxes!</Typography>
                <Typography variant="body2">
                  I have full context of your Form-16 / ITR details. You can ask for recommendations on tax savings, double check standard deductions, or upload additional P&L reports.
                </Typography>
              </Box>
            )}

            {messages.map((msg, idx) => (
              <Box
                key={idx}
                sx={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.5,
                }}
              >
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: msg.role === 'user' ? 'primary.main' : 'background.paper',
                    color: msg.role === 'user' ? 'primary.contrastText' : 'text.primary',
                    borderColor: msg.role === 'user' ? 'primary.main' : 'divider',
                  }}
                >
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '0.875rem' }}>
                    {msg.content}
                  </pre>
                  {msg.attachments && msg.attachments.length > 0 && (
                    <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid rgba(255,255,255,0.2)', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Typography variant="caption" sx={{ fontWeight: 'bold' }}>Attached Documents:</Typography>
                      {msg.attachments.map((att, attIdx) => (
                        <Typography key={attIdx} variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, opacity: 0.9 }}>
                          <AttachFileIcon sx={{ fontSize: 12 }} /> {att.name}
                        </Typography>
                      ))}
                    </Box>
                  )}
                </Paper>
                <Typography variant="caption" color="textSecondary" sx={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', px: 0.5 }}>
                  {msg.role === 'user' ? 'You' : 'AI Assistant'}
                </Typography>
              </Box>
            ))}

            {chatLoading && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, alignSelf: 'flex-start' }}>
                <CircularProgress size={16} />
                <Typography variant="caption" color="textSecondary">AI is generating response...</Typography>
              </Box>
            )}
            <div ref={messagesEndRef} />
          </Box>

          <Divider />

          {/* Drawer Actions / Attachments / Inputs */}
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5, bgcolor: 'background.paper' }}>
            {/* Displaying selected attachments */}
            {attachments.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {attachments.map((att, idx) => (
                  <Paper
                    key={idx}
                    variant="outlined"
                    sx={{
                      pl: 1,
                      pr: 0.5,
                      py: 0.5,
                      borderRadius: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      bgcolor: 'action.hover',
                    }}
                  >
                    <AttachFileIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                    <Typography variant="caption" sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {att.name}
                    </Typography>
                    <IconButton size="small" onClick={() => removeAttachment(idx)} aria-label="remove attachment">
                      <DeleteIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Paper>
                ))}
              </Box>
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {/* Attachment Button */}
              <input
                id="chat-attachment-upload"
                type="file"
                onChange={handleAttachmentUpload}
                style={{ display: 'none' }}
              />
              <Tooltip title="Attach supplementary document (PDF, Text, or Image)">
                <span>
                  <IconButton
                    component="label"
                    htmlFor="chat-attachment-upload"
                    color="primary"
                    disabled={attachingFile}
                    aria-label="attach document"
                  >
                    {attachingFile ? <CircularProgress size={24} /> : <AttachFileIcon />}
                  </IconButton>
                </span>
              </Tooltip>

              <TextField
                fullWidth
                size="small"
                placeholder="Ask your tax question..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSendMessage(false);
                  }
                }}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => handleSendMessage(false)}
                          color="primary"
                          disabled={chatLoading || (!inputMessage.trim() && attachments.length === 0)}
                          aria-label="send message"
                        >
                          <SendIcon />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }
                }}
              />
            </Box>
          </Box>
        </Drawer>

        {/* Floating Action Chat Button */}
        <Fab
          color="primary"
          aria-label="open ai chat window"
          sx={{ position: 'fixed', bottom: 24, right: 24 }}
          onClick={() => setChatOpen(true)}
        >
          <ChatIcon />
        </Fab>
      </Box>
    </ThemeProvider>
  );
}
