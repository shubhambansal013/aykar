'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { extractTextFromPDF } from '@/lib/form16/extractor';
import { parseForm16Text, mergeForm16Data } from '@/lib/form16/parser';
import { parseAISText } from '@/lib/ais/parser';
import { parseTISText } from '@/lib/tis/parser';
import { parseForm26ASText } from '@/lib/form26as/parser';
import { reconcileAllDocuments } from '@/lib/itr/reconciliation';
import { validateForm16Data } from '@/lib/itr/validator';
import { mapToITR, shouldUseITR2 } from '@/lib/itr/mapper';
import { compareTaxRegimes, recalculateAllFormFields } from '@/lib/itr/taxEngine';
import { Form16Data, ReconciledTaxData, AISData, TISData, Form26ASData, createForm16Proxy, createAisProxy, createTisProxy, createForm26asProxy, createEngineProxy } from '@/lib/proto/compatibilityProxy';
import { aiConfig, providersConfig } from '@/lib/ai/config';

import { EngineReconciliationResult } from '@/generated/platform/engine';
import { Form16Bundle } from '@/generated/sources/form16';
import { AnnualInformationStatement } from '@/generated/sources/ais';
import { TaxpayerInformationSummary } from '@/generated/sources/tis';
import { Form26AS } from '@/generated/sources/form26as';

import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  IconButton,
  Alert,
  Tooltip,
  Fab,
  Dialog,
  Tabs,
  Tab,
  useMediaQuery,
} from '@mui/material';

import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import ChatIcon from '@mui/icons-material/Chat';
import CloseIcon from '@mui/icons-material/Close';

import DescriptionIcon from '@mui/icons-material/Description';

import TaxRegimeComparisonCard from '@/app/components/TaxRegimeComparisonCard';
import ComputationWorksheet from '@/app/components/ComputationWorksheet';
import ReconciliationTable from '@/app/components/ReconciliationTable';
import DocumentViewer from '@/app/components/DocumentViewer';
import ChatPanel from '@/app/components/ChatPanel';
import DocumentUpload from '@/app/components/DocumentUpload';

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
  // Document Files & Data State (holding defined Proto types)
  const [form16List, setForm16List] = useState<Array<{ file: File; rawText: string; data: Form16Bundle }>>([]);
  const file = form16List[0]?.file || null;
  const [extractedData, setExtractedData] = useState<EngineReconciliationResult | null>(null);
  const [selectedRegime, setSelectedRegime] = useState<'OLD' | 'NEW'>('NEW');
  const [expandedTrails, setExpandedTrails] = useState<Record<string, boolean>>({});

  // Baseline trackings for audit and status highlights
  const [originalParsedData, setOriginalParsedData] = useState<EngineReconciliationResult | null>(null);
  const [appliedAiSuggestions, setAppliedAiSuggestions] = useState<EngineReconciliationResult | null>(null);

  const [aisFile, setAisFile] = useState<File | null>(null);
  const [tisFile, setTisFile] = useState<File | null>(null);
  const [form26asFile, setForm26asFile] = useState<File | null>(null);

  const [aisData, setAisData] = useState<AnnualInformationStatement | null>(null);
  const [tisData, setTisData] = useState<TaxpayerInformationSummary | null>(null);
  const [form26asData, setForm26asData] = useState<Form26AS | null>(null);

  const [aisLoading, setAisLoading] = useState(false);
  const [tisLoading, setTisLoading] = useState(false);
  const [form26asLoading, setForm26asLoading] = useState(false);

  // Raw Extracted Text States
  const [rawText, setRawText] = useState<string>('');
  const [aisRawText, setAisRawText] = useState<string>('');
  const [tisRawText, setTisRawText] = useState<string>('');
  const [form26asRawText, setForm26asRawText] = useState<string>('');

  // Filing and determination dates for interest computation (derived from Form16 verification dates)
  const [filingDate, setFilingDate] = useState<string>('');
  const [determinationDate, setDeterminationDate] = useState<string>('');

  // Validation, Loading & Theme States
  const [errors, setErrors] = useState<string[]>([]);
  const [showUploadArea, setShowUploadArea] = useState(true);
  const [warningsExpanded, setWarningsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'light' | 'dark'>('light');


  // AI Chat States
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachingFile, setAttachingFile] = useState(false);
  const [selectedModel, setSelectedModel] = useState(aiConfig.modelName);
  const [sendOnlyRawData, setSendOnlyRawData] = useState<boolean>(false);

  // AI Proposal States
  const [acceptedMessages, setAcceptedMessages] = useState<Record<number, boolean>>({});
  const [rejectedMessages, setRejectedMessages] = useState<Record<number, boolean>>({});
  const [proposalBackups, setProposalBackups] = useState<Record<number, EngineReconciliationResult | null>>({});

  // Chat / Split-Screen Resizing & Tab States
  const [rightPanelTab, setRightPanelTab] = useState<'chat' | 'inspect'>('chat');
  const [docTab, setDocTab] = useState<number>(0);
  const [chatWidth, setChatWidth] = useState(600);
  const [mobileDocOpen, setMobileDocOpen] = useState(false);

  const isMobile = useMediaQuery('(max-width: 767px)');

  // Cross-highlighting: when user clicks a computation value, search for it in document viewer
  const [highlightText, setHighlightText] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Initialize Color Mode from System Preference
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setMode(prefersDark ? 'dark' : 'light');
    }
  }, []);

  // Initialize Chat Width from LocalStorage (defaults to 50% width)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedWidth = localStorage.getItem('ai_chat_width');
      if (savedWidth) {
        const parsed = parseInt(savedWidth, 10);
        if (parsed >= 280 && parsed < window.innerWidth * 0.95) {
          setChatWidth(parsed);
          return;
        }
      }
      setChatWidth(Math.round(window.innerWidth * 0.5));
    }
  }, []);

  // Persist Chat Width when drag completes
  useEffect(() => {
    if (!isDragging && chatWidth !== 600) {
      localStorage.setItem('ai_chat_width', chatWidth.toString());
    }
  }, [isDragging, chatWidth]);

  // Handle Drag Resizing of Chat Panel
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 280 && newWidth < window.innerWidth * 0.8) {
        setChatWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Gemini Models Memo
  const geminiModels = useMemo(() => {
    const geminiProvider = providersConfig.find(p => p.provider === 'gemini');
    return geminiProvider ? geminiProvider.models : [];
  }, []);

  // Derived Domain Object for computation
  const extractedDataDomain = useMemo(() => {
    return extractedData ? createEngineProxy(extractedData) : null;
  }, [extractedData]);

  const hasUploadedDocs = form16List.length > 0 || !!aisFile || !!tisFile || !!form26asFile;
  const isUploadCollapsed = !showUploadArea;
  const readyDocsCount = (form16List.length > 0 ? 1 : 0) + (aisFile ? 1 : 0) + (tisFile ? 1 : 0) + (form26asFile ? 1 : 0);

  // MUI Theme Memo
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: mode === 'dark' ? '#38bdf8' : '#0284c7',
          },
          secondary: {
            main: mode === 'dark' ? '#94a3b8' : '#475569',
          },
          background: {
            default: mode === 'dark' ? '#0f172a' : '#f8fafc',
            paper: mode === 'dark' ? '#1e293b' : '#ffffff',
          },
        },
        typography: {
          fontFamily: 'var(--font-geist-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          h6: {
            fontSize: '1.05rem',
            fontWeight: 600,
            letterSpacing: '-0.01em',
          },
          subtitle1: {
            fontSize: '0.9rem',
            fontWeight: 600,
          },
          body1: {
            fontSize: '0.875rem',
          },
          body2: {
            fontSize: '0.8rem',
          },
          button: {
            textTransform: 'none',
            fontWeight: 500,
          }
        },
        components: {
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: '6px',
                padding: '6px 14px',
                fontSize: '0.8rem',
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                borderRadius: '8px',
                boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                border: mode === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0',
              },
            },
          },
          MuiTextField: {
            defaultProps: {
              size: 'small',
            },
          },
        },
      }),
    [mode]
  );

  // Auto-Scroll chat
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

  // Helper: Deep copy state and update nested path value
  const updateNestedValue = (path: string, val: any) => {
    setExtractedData((prev) => {
      if (!prev) return prev;
      const domain = createEngineProxy(prev);
      const next = JSON.parse(JSON.stringify(domain));
      const parts = path.split('.');
      let current = next;
      for (let i = 0; i < parts.length - 1; i++) {
        if (current[parts[i]] === undefined || current[parts[i]] === null) {
          current[parts[i]] = {};
        }
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = val;

      // Auto-recalculate dependents using the recalculateAllFormFields tool
      const updated = recalculateAllFormFields(next, selectedRegime, path);
      const proxy = createEngineProxy(updated);
      return (proxy as any).__bundle || proxy;
    });
  };

  // Helper: Sanitize AI suggested object with default structure
  const sanitizeForm16Data = (data: any): Form16Data => {
    const defaultData: Form16Data = {
      employer: { name: '', tan: '', pan: '', address: '' },
      employee: { name: { firstName: '', middleName: '', lastName: '' }, pan: '', address: '' },
      assessmentYear: '',
      period: { from: '', to: '' },
      salary: {
        grossSalary: 0,
        salaryAsPer17_1: 0,
        perquisites17_2: 0,
        profitsInLieu17_3: 0,
        exemptAllowancesUs10: [],
        totalExemptAllowances: 0,
        netSalary: 0,
        standardDeduction16ia: 0,
        entertainmentAllowance16ii: 0,
        professionalTax16iii: 0,
        totalDeductionsUs16: 0,
        incomeChargeableUnderHeadSalaries: 0,
      },
      otherIncome: { houseProperty: 0, otherSources: [], totalOtherSources: 0 },
      grossTotalIncome: 0,
      deductions80C: 0,
      deductions80CCC: 0,
      deductions80CCD1: 0,
      deductions80CCD1B: 0,
      deductions80CCD2: 0,
      deductions80D: 0,
      deductions80E: 0,
      deductions80G: 0,
      deductions80TTA: 0,
      totalChapterVIADeductions: 0,
      totalIncome: 0,
      taxPayable: 0,
      totalTdsDeducted: 0,
      totalTdsDeposited: 0,
      netTaxPayable: 0,
    };

    if (!data) return defaultData;

    return {
      ...defaultData,
      ...data,
      employer: {
        ...defaultData.employer,
        ...(data.employer || {}),
      },
      employee: {
        ...defaultData.employee,
        ...(data.employee || {}),
        name: {
          ...defaultData.employee.name,
          ...((data.employee && data.employee.name) || {}),
        },
      },
      period: {
        ...defaultData.period,
        ...(data.period || {}),
      },
      salary: {
        ...defaultData.salary,
        ...(data.salary || {}),
        exemptAllowancesUs10: Array.isArray(data.salary?.exemptAllowancesUs10)
          ? data.salary.exemptAllowancesUs10.map((item: any) => ({
              code: item?.code || '',
              nature: item?.nature || '',
              amount: item?.amount || 0,
            }))
          : [],
      },
      otherIncome: {
        ...defaultData.otherIncome,
        ...(data.otherIncome || {}),
        otherSources: Array.isArray(data.otherIncome?.otherSources)
          ? data.otherIncome.otherSources.map((item: any) => ({
              nature: item?.nature || '',
              amount: item?.amount || 0,
            }))
          : [],
      },
    };
  };

  // Chat Actions
  const handleAcceptProposal = (msgIdx: number, updatedData: any) => {
    if (extractedData) {
      setProposalBackups((prev) => ({ ...prev, [msgIdx]: EngineReconciliationResult.fromPartial(extractedData) }));
    }
    setAcceptedMessages((prev) => ({ ...prev, [msgIdx]: true }));
    const sanitized = sanitizeForm16Data(updatedData);
    // Recalculate everything for safety
    const recalculated = recalculateAllFormFields(sanitized, selectedRegime);

    // Merge in existing extra engine result fields if present (such as aisData, tisData, etc.) so we don't lose them
    const mergedRecalculated = {
      ...recalculated,
      aisData: extractedData?.aisData,
      tisData: extractedData?.tisData,
      form26asData: extractedData?.form26asData,
      taxCredits: extractedData?.taxCredits,
      discrepancies: extractedData?.discrepancies,
      detectedIncomeSources: extractedData?.detectedIncomeSources,
    };

    const proxy = createEngineProxy(mergedRecalculated);
    const protoData = (proxy as any).__bundle || proxy;
    setExtractedData(protoData);
    setAppliedAiSuggestions(protoData);
    setErrors(validateForm16Data(createEngineProxy(protoData)));
  };

  const handleRejectProposal = (msgIdx: number) => {
    setRejectedMessages((prev) => ({ ...prev, [msgIdx]: true }));
  };

  const handleUndoProposal = (msgIdx: number) => {
    if (acceptedMessages[msgIdx]) {
      const backup = proposalBackups[msgIdx];
      if (backup) {
        setExtractedData(EngineReconciliationResult.fromPartial(backup));
        setAppliedAiSuggestions(null);
        setErrors(validateForm16Data(createEngineProxy(backup)));
      }
    }
    setAcceptedMessages((prev) => {
      const next = { ...prev };
      delete next[msgIdx];
      return next;
    });
    setRejectedMessages((prev) => {
      const next = { ...prev };
      delete next[msgIdx];
      return next;
    });
    setProposalBackups((prev) => {
      const next = { ...prev };
      delete next[msgIdx];
      return next;
    });
  };

  // Re-reconcile the current Form-16 list with optional new documents
  const reRunReconciliation = (
    currentForm16s: Array<{ file: File; rawText: string; data: Form16Bundle }> = form16List,
    currentAis: AnnualInformationStatement | null = aisData,
    currentTis: TaxpayerInformationSummary | null = tisData,
    current26as: Form26AS | null = form26asData,
    currentAisRaw: string = aisRawText,
    currentTisRaw: string = tisRawText,
    current26asRaw: string = form26asRawText
  ) => {
    if (currentForm16s.length === 0) {
      setExtractedData(null);
      setOriginalParsedData(null);
      setRawText('');
      setErrors([]);
      return;
    }

    const mergedRawText = currentForm16s.map(item => item.rawText).join('\n\n');
    setRawText(mergedRawText);

    // Extract latest verification date from all Form16 certificates as filing date
    let latestDate: Date | null = null;
    let assYear = '';
    for (const item of currentForm16s) {
      const certs = item.data.certificates || [];
      for (const cert of certs) {
        if (cert.employmentPeriod?.assessmentYear) {
          assYear = cert.employmentPeriod.assessmentYear;
        }
        if (cert.verification?.date) {
          const parsed = new Date(cert.verification.date);
          if (!isNaN(parsed.getTime()) && (!latestDate || parsed > latestDate)) {
            latestDate = parsed;
          }
        }
      }
    }
    const fDate = latestDate ? latestDate.toISOString().split('T')[0] : '';
    setFilingDate(fDate);
    // Default determination date: Dec 31 of the assessment year
    const ayStart = parseInt(assYear.split('-')[0], 10) || 2026;
    const dDate = `${ayStart}-12-31`;
    setDeterminationDate(dDate);

    const domainForm16s = currentForm16s.map(item => createForm16Proxy(item.data));
    const mergedData = mergeForm16Data(domainForm16s);

    const reconciled = reconcileAllDocuments(
      mergedData,
      currentAis ? createAisProxy(currentAis) : undefined,
      currentTis ? createTisProxy(currentTis) : undefined,
      current26as ? createForm26asProxy(current26as) : undefined
    );

    const comparison = compareTaxRegimes(reconciled, fDate || undefined, dDate);
    const activeRegime = comparison.optimalRegime;
    setSelectedRegime(activeRegime);

    const recalculated = recalculateAllFormFields(reconciled, activeRegime);
    const proxy = createEngineProxy(recalculated);
    const protoResult = (proxy as any).__bundle || proxy;

    setExtractedData(protoResult);
    setOriginalParsedData(EngineReconciliationResult.fromPartial(protoResult));
    setErrors(validateForm16Data(createEngineProxy(protoResult)));
  };

  const handleRemoveForm16 = (index: number) => {
    const newList = form16List.filter((_, i) => i !== index);
    setForm16List(newList);
    reRunReconciliation(newList);
  };

  // Upload Handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;
    setLoading(true);

    try {
      const newList = [...form16List];
      for (let i = 0; i < selectedFiles.length; i++) {
        const selectedFile = selectedFiles[i];
        const arrayBuffer = await selectedFile.arrayBuffer();
        const text = await extractTextFromPDF(arrayBuffer);
        const parsed = parseForm16Text(text);
        const protoBundle = (parsed as any).__bundle || parsed;
        newList.push({ file: selectedFile, rawText: text, data: protoBundle });
      }

      setForm16List(newList);
      reRunReconciliation(newList, aisData, tisData, form26asData, aisRawText, tisRawText, form26asRawText);
    } catch (err) {
      console.error('Error processing PDF:', err);
      alert('Failed to process PDF. Please try again.');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const handleAISUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setAisFile(selectedFile);
    setAisLoading(true);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const text = await extractTextFromPDF(arrayBuffer);
      setAisRawText(text);
      const parsed = parseAISText(text);
      const protoAis = (parsed as any).__bundle || parsed;
      setAisData(protoAis);
      reRunReconciliation(form16List, protoAis, tisData, form26asData, text, tisRawText, form26asRawText);
    } catch (err) {
      console.error('Error processing AIS PDF:', err);
      alert('Failed to process AIS PDF.');
    } finally {
      setAisLoading(false);
      e.target.value = '';
    }
  };

  const handleTISUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setTisFile(selectedFile);
    setTisLoading(true);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const text = await extractTextFromPDF(arrayBuffer);
      setTisRawText(text);
      const parsed = parseTISText(text);
      const protoTis = (parsed as any).__bundle || parsed;
      setTisData(protoTis);
      reRunReconciliation(form16List, aisData, protoTis, form26asData, aisRawText, text, form26asRawText);
    } catch (err) {
      console.error('Error processing TIS PDF:', err);
      alert('Failed to process TIS PDF.');
    } finally {
      setTisLoading(false);
      e.target.value = '';
    }
  };

  const handleForm26ASUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setForm26asFile(selectedFile);
    setForm26asLoading(true);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const text = await extractTextFromPDF(arrayBuffer);
      setForm26asRawText(text);
      const parsed = parseForm26ASText(text);
      const proto26as = (parsed as any).__bundle || parsed;
      setForm26asData(proto26as);
      reRunReconciliation(form16List, aisData, tisData, proto26as, aisRawText, tisRawText, text);
    } catch (err) {
      console.error('Error processing Form 26AS PDF:', err);
      alert('Failed to process Form 26AS PDF.');
    } finally {
      setForm26asLoading(false);
      e.target.value = '';
    }
  };

  // Send Chat Message
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
      const domainData = extractedData ? createEngineProxy(extractedData) : null;
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: updatedMessages,
          itrData: sendOnlyRawData ? null : domainData,
          itrJson: sendOnlyRawData ? null : (domainData ? mapToITR(domainData, selectedRegime, form16List) : null),
          rawText: rawText,
          aisRawText: aisRawText,
          tisRawText: tisRawText,
          form26asRawText: form26asRawText,
          isReview: isReviewRequest,
          model: selectedModel,
        }),
      });

      if (!response.ok) {
        throw new Error('AI Chat encountered an error. Please try again.');
      }

      const reply = (await response.json()) as Message;
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

  // Helper functions for reading files
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsText(file);
    });
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.substring(result.indexOf(',') + 1);
        resolve(base64);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  // Chat Attachments Handler
  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setAttachingFile(true);
    try {
      const mimeType = selectedFile.type;
      let base64Data = '';
      let finalMimeType = mimeType || 'application/octet-stream';

      if (mimeType === 'application/pdf') {
        const arrayBuffer = await selectedFile.arrayBuffer();
        try {
          const pdfText = await extractTextFromPDF(arrayBuffer);
          base64Data = btoa(unescape(encodeURIComponent(pdfText)));
          finalMimeType = 'text/plain';
        } catch {
          base64Data = await readFileAsBase64(selectedFile);
        }
      } else if (mimeType && (mimeType.startsWith('text/') || mimeType === 'application/json' || selectedFile.name.endsWith('.csv'))) {
        try {
          const text = await readFileAsText(selectedFile);
          base64Data = btoa(unescape(encodeURIComponent(text)));
          finalMimeType = 'text/plain';
        } catch {
          base64Data = await readFileAsBase64(selectedFile);
        }
      } else {
        base64Data = await readFileAsBase64(selectedFile);
      }

      const newAttachment: Attachment = {
        name: selectedFile.name,
        mimeType: finalMimeType,
        data: base64Data,
      };

      setAttachments((prev) => [...prev, newAttachment]);
    } catch (err) {
      console.error('Attachment error:', err);
      alert('Failed to attach file.');
    } finally {
      setAttachingFile(false);
      e.target.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveAis = () => {
    setAisFile(null);
    setAisData(null);
    setAisRawText('');
    reRunReconciliation(form16List, null, tisData, form26asData, '', tisRawText, form26asRawText);
  };

  const handleRemoveTis = () => {
    setTisFile(null);
    setTisData(null);
    setTisRawText('');
    reRunReconciliation(form16List, aisData, null, form26asData, aisRawText, '', form26asRawText);
  };

  const handleRemoveForm26as = () => {
    setForm26asFile(null);
    setForm26asData(null);
    setForm26asRawText('');
    reRunReconciliation(form16List, aisData, tisData, null, aisRawText, tisRawText, '');
  };

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleValueClick = (label: string) => {
    setHighlightText(label);
    setRightPanelTab('inspect');
    if (isMobile) {
      setMobileDocOpen(true);
    } else {
      setChatOpen(true);
    }
  };

  const openRightPanel = (tab: 'chat' | 'inspect', docIndex?: number) => {
    setRightPanelTab(tab);
    if (docIndex !== undefined) setDocTab(docIndex);
    if (isMobile) {
      setMobileDocOpen(true);
    } else {
      setChatOpen(true);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default', overflow: 'hidden' }}>
        {/* Top Navbar */}
        <AppBar position="static" color="inherit" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider', zIndex: (theme) => theme.zIndex.drawer + 1 }}>
          <Toolbar variant="dense">
            <ReceiptLongIcon color="primary" sx={{ mr: 1.5, display: { xs: 'none', sm: 'block' } }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
              ITR Assist
            </Typography>
            {isMobile && (
              <Tooltip title="View Documents & Chat">
                <IconButton
                  onClick={() => {
                    setMobileDocOpen(true);
                    setRightPanelTab('inspect');
                  }}
                  color="inherit"
                  aria-label="view documents"
                >
                  <DescriptionIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title={`Toggle ${mode === 'light' ? 'Dark' : 'Light'} Mode`}>
              <IconButton onClick={() => setMode((prev) => (prev === 'light' ? 'dark' : 'light'))} color="inherit" aria-label="toggle color mode">
                {mode === 'light' ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>

        {/* Main Layout Area */}
        <Box sx={{ display: 'flex', flexGrow: 1, minHeight: 0, width: '100%', overflow: 'hidden', position: 'relative' }}>

          {/* Left Panel: Main App */}
          <Box sx={{
            flexGrow: 1,
            minWidth: 0,
            overflowY: 'auto',
            height: '100%',
            display: { xs: 'block', md: 'block' }
          }}>
            <Container maxWidth="md" sx={{ py: 3 }}>
              <DocumentUpload
                form16List={form16List}
                aisFile={aisFile}
                tisFile={tisFile}
                form26asFile={form26asFile}
                aisLoading={aisLoading}
                tisLoading={tisLoading}
                form26asLoading={form26asLoading}
                loading={loading}
                isUploadCollapsed={isUploadCollapsed}
                showUploadArea={showUploadArea}
                mode={mode}
                readyDocsCount={readyDocsCount}
                onFileUpload={handleFileUpload}
                onAISUpload={handleAISUpload}
                onTISUpload={handleTISUpload}
                onForm26ASUpload={handleForm26ASUpload}
                onToggleShowUploadArea={() => setShowUploadArea(true)}
                onCollapseUpload={() => setShowUploadArea(false)}
                onRemoveForm16={handleRemoveForm16}
                onOpenRightPanel={openRightPanel}
              />

              {extractedData && (
                <>
                  <ComputationWorksheet
                    data={extractedDataDomain}
                    form16List={form16List}
                    selectedRegime={selectedRegime}
                    itrFormType={extractedDataDomain && shouldUseITR2(extractedDataDomain, form16List.length) ? 'ITR-2' : 'ITR-1'}
                    onAiReview={() => handleSendMessage(true)}
                    onValueClick={handleValueClick}
                  />

                  {/* Tax Regime Comparison Card */}
                  <TaxRegimeComparisonCard
                    extractedData={extractedData}
                    selectedRegime={selectedRegime}
                    mode={mode}
                    onSelectRegime={(regime) => {
                      setSelectedRegime(regime);
                      setExtractedData((prev) => {
                        if (!prev) return null;
                        const recalculated = recalculateAllFormFields(createEngineProxy(prev), regime);
                        return (recalculated as any).__bundle || recalculated;
                      });
                    }}
                  />

                  <ReconciliationTable data={extractedDataDomain} />

                  {/* Validation warnings */}
                  {errors.length > 0 && (
                    <Alert
                      severity="warning"
                      variant="outlined"
                      sx={{
                        mb: 2.5,
                        borderRadius: 1.5,
                        py: 1,
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                        '&:hover': { bgcolor: 'action.hover' }
                      }}
                      onClick={() => setWarningsExpanded(!warningsExpanded)}
                      data-testid="validation-warnings-box"
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          ⚠️ Validation Warnings: {errors.length} Found
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 'bold', textDecoration: 'underline', ml: 2 }}>
                          {warningsExpanded ? 'Click to Collapse' : 'Click to Expand'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: warningsExpanded ? 'block' : 'none', mt: 1.5, pl: 2 }} onClick={(e: any) => e.stopPropagation()}>
                        <ul style={{ margin: 0, paddingLeft: '1rem' }}>
                          {errors.map((err, i) => (
                            <li key={i}>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>{err}</Typography>
                            </li>
                          ))}
                        </ul>
                      </Box>
                    </Alert>
                  )}
                </>
              )}
            </Container>
          </Box>

          {/* Draggable Resizer */}
          {chatOpen && (
            <Box
              onMouseDown={startResize}
              data-testid="resizer"
              sx={{
                width: '4px',
                cursor: 'col-resize',
                bgcolor: isDragging ? 'primary.main' : 'divider',
                transition: 'background-color 0.2s, width 0.2s',
                '&:hover': { bgcolor: 'primary.main', width: '6px' },
                height: '100%',
                zIndex: 10,
                display: { xs: 'none', md: 'block' }
              }}
            />
          )}

          {/* Right Panel: Split-screen Information Panel */}
          <Box sx={{
            width: chatOpen ? { md: `${chatWidth}px` } : { md: '0px' },
            minWidth: chatOpen ? { md: `${chatWidth}px` } : { md: '0px' },
            overflow: 'hidden',
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            borderLeft: chatOpen ? '1px solid' : 'none',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            transition: isDragging ? 'none' : 'width 0.3s ease-in-out, min-width 0.3s ease-in-out',
            height: '100%',
            zIndex: 5,
          }}>
            {/* Header with Switcher Tabs */}
            <Box sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Tabs
                  value={rightPanelTab}
                  onChange={(e: React.SyntheticEvent, v: 'chat' | 'inspect') => setRightPanelTab(v)}
                  aria-label="right panel tabs"
                  sx={{
                    minHeight: 0,
                    '& .MuiTab-root': {
                      minHeight: 0,
                      py: 0.75,
                      px: 1.5,
                      fontSize: '0.8rem',
                      textTransform: 'none',
                      fontWeight: 'bold',
                    }
                  }}
                >
                  <Tab label="AI Chat" value="chat" data-testid="right-panel-tab-chat" />
                  <Tab label="Inspect Documents" value="inspect" data-testid="right-panel-tab-inspect" />
                </Tabs>
                <IconButton onClick={() => setChatOpen(false)} color="inherit" size="small" aria-label="close right panel">
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            {/* View 1: AI Chat */}
            <Box sx={{
              display: rightPanelTab === 'chat' ? 'flex' : 'none',
              flexDirection: 'column',
              flexGrow: 1,
              minHeight: 0,
            }}>
              <ChatPanel
                variant="desktop"
                messages={messages}
                chatLoading={chatLoading}
                inputMessage={inputMessage}
                onInputChange={(val) => setInputMessage(val)}
                onSend={() => handleSendMessage(false)}
                onAttachmentUpload={handleAttachmentUpload}
                form16List={form16List}
                aisFile={aisFile}
                tisFile={tisFile}
                form26asFile={form26asFile}
                attachments={attachments}
                extractedData={extractedData}
                sendOnlyRawData={sendOnlyRawData}
                selectedModel={selectedModel}
                geminiModels={geminiModels}
                onModelChange={(model) => setSelectedModel(model)}
                onRemoveForm16={handleRemoveForm16}
                onRemoveAis={handleRemoveAis}
                onRemoveTis={handleRemoveTis}
                onRemoveForm26as={handleRemoveForm26as}
                onRemoveAttachment={removeAttachment}
                onOpenRightPanel={openRightPanel}
                messagesEndRef={messagesEndRef}
                acceptedMessages={acceptedMessages}
                rejectedMessages={rejectedMessages}
                handleAcceptProposal={handleAcceptProposal}
                handleRejectProposal={handleRejectProposal}
                handleUndoProposal={handleUndoProposal}
                mode={mode}
                attachingFile={attachingFile}
                onSendOnlyRawDataChange={(val) => setSendOnlyRawData(val)}
              />
            </Box>

            {/* View 2: Document Inspection / Split-screen Verification */}
            <Box sx={{
              display: rightPanelTab === 'inspect' ? 'block' : 'none',
              flexGrow: 1,
              p: 2.5,
              overflowY: 'auto',
              bgcolor: mode === 'dark' ? 'rgba(15, 23, 42, 0.1)' : '#f8fafc',
            }}>
              <DocumentViewer
                mode={mode}
                rawText={rawText}
                aisRawText={aisRawText}
                tisRawText={tisRawText}
                form26asRawText={form26asRawText}
                searchQuery={highlightText}
                onSearchChange={setHighlightText}
                activeTab={docTab}
                onTabChange={setDocTab}
              />
            </Box>
          </Box>
        </Box>

        {/* Mobile Dialog for Document Viewer & Chat */}
        <Dialog
          fullScreen
          open={isMobile && mobileDocOpen}
          onClose={() => setMobileDocOpen(false)}
          data-testid="mobile-doc-dialog"
        >
          <AppBar position="static" color="inherit" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
            <Toolbar variant="dense">
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <Tabs
                  value={rightPanelTab}
                  onChange={(e: React.SyntheticEvent, v: 'chat' | 'inspect') => setRightPanelTab(v)}
                  aria-label="mobile panel tabs"
                  sx={{
                    minHeight: 0,
                    flex: 1,
                    '& .MuiTab-root': {
                      minHeight: 0,
                      py: 0.75,
                      px: 1.5,
                      fontSize: '0.8rem',
                      textTransform: 'none',
                      fontWeight: 'bold',
                    }
                  }}
                >
                  <Tab label="AI Chat" value="chat" data-testid="mobile-tab-chat" />
                  <Tab label="Documents" value="inspect" data-testid="mobile-tab-inspect" />
                </Tabs>
                <IconButton onClick={() => setMobileDocOpen(false)} color="inherit" size="small" aria-label="close mobile dialog">
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            </Toolbar>
          </AppBar>

          <Box sx={{ display: rightPanelTab === 'chat' ? 'flex' : 'none', flexDirection: 'column', flexGrow: 1, minHeight: 0 }}>
            <ChatPanel
              variant="mobile"
              messages={messages}
              chatLoading={chatLoading}
              inputMessage={inputMessage}
              onInputChange={(val) => setInputMessage(val)}
              onSend={() => handleSendMessage(false)}
              onAttachmentUpload={handleAttachmentUpload}
              form16List={form16List}
              aisFile={aisFile}
              tisFile={tisFile}
              form26asFile={form26asFile}
              attachments={attachments}
              extractedData={extractedData}
              sendOnlyRawData={sendOnlyRawData}
              selectedModel={selectedModel}
              geminiModels={geminiModels}
              onModelChange={(model) => setSelectedModel(model)}
              onRemoveForm16={handleRemoveForm16}
              onRemoveAis={handleRemoveAis}
              onRemoveTis={handleRemoveTis}
              onRemoveForm26as={handleRemoveForm26as}
              onRemoveAttachment={removeAttachment}
              onOpenRightPanel={openRightPanel}
              messagesEndRef={messagesEndRef}
              acceptedMessages={acceptedMessages}
              rejectedMessages={rejectedMessages}
              handleAcceptProposal={handleAcceptProposal}
              handleRejectProposal={handleRejectProposal}
              handleUndoProposal={handleUndoProposal}
              mode={mode}
            />
          </Box>

          {/* Document Viewer in Mobile */}
          <Box sx={{
            display: rightPanelTab === 'inspect' ? 'block' : 'none',
            flexGrow: 1,
            p: 2.5,
            overflowY: 'auto',
            bgcolor: mode === 'dark' ? 'rgba(15, 23, 42, 0.1)' : '#f8fafc',
          }}>
            <DocumentViewer
              mode={mode}
              rawText={rawText}
              aisRawText={aisRawText}
              tisRawText={tisRawText}
              form26asRawText={form26asRawText}
              searchQuery={highlightText}
              onSearchChange={setHighlightText}
              activeTab={docTab}
              onTabChange={setDocTab}
            />
          </Box>
        </Dialog>

        {/* Floating AI Chat Button */}
        {!chatOpen && (
          <Fab color="primary" aria-label="open ai chat window" sx={{ position: 'fixed', bottom: 24, right: 24, boxShadow: 3 }} onClick={() => openRightPanel('chat')}>
            <ChatIcon />
          </Fab>
        )}
      </Box>
    </ThemeProvider>
  );
}
