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
  Divider,
  Fab,
  Select,
  MenuItem,
  FormControl,
  FormControlLabel,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  Tabs,
  Tab,
} from '@mui/material';

import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DownloadIcon from '@mui/icons-material/Download';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import RefreshIcon from '@mui/icons-material/Refresh';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import ChatIcon from '@mui/icons-material/Chat';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CodeIcon from '@mui/icons-material/Code';

import { CueTextField, getSectionVerifiedCount } from '@/app/components/FieldCues';
import { AssistantMessage } from '@/app/components/AssistantMessage';
import SectionHeaderBadge from '@/app/components/SectionHeaderBadge';
import SectionAuditTrail from '@/app/components/SectionAuditTrail';
import TaxRegimeComparisonCard from '@/app/components/TaxRegimeComparisonCard';
import DebugInfoSection from '@/app/components/DebugInfoSection';

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

  // Validation, Loading & Theme States
  const [errors, setErrors] = useState<string[]>([]);
  const [aisTisError, setAisTisError] = useState<string | null>(null);
  const [showUploadArea, setShowUploadArea] = useState(false);
  const [warningsExpanded, setWarningsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  // Function to check if the text is from AIS/TIS and contains capital gains
  const checkForAisTisCapitalGains = (text: string): string | null => {
    const lowerText = text.toLowerCase();
    
    // Check for AIS/TIS indicators
    const aisTisIndicators = [
      'annual information statement',
      'taxpayer information summary',
      'form 26as',
      'ais',
      'tis'
    ];
    
    const isAisTis = aisTisIndicators.some(indicator => lowerText.includes(indicator));
    
    if (!isAisTis) {
      return null;
    }
    
    // Check for capital gains indicators
    const capitalGainsIndicators = [
      'capital gains',
      'short term capital gain',
      'long term capital gain',
      'stcg',
      'ltcg',
      'sale of property',
      'sale of shares',
      'sale of securities',
      'transfer of immovable property',
      'transfer of mutual fund',
      'income from capital gains'
    ];
    
    const hasCapitalGains = capitalGainsIndicators.some(indicator => lowerText.includes(indicator));
    
    if (hasCapitalGains) {
      return 'This return requires ITR-2 (for capital gains income), which is not yet supported. Please consult a tax professional or use the appropriate ITR form.';
    }
    
    return null;
  };


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
  const [debugTab, setDebugTab] = useState<number>(0);
  const [chatWidth, setChatWidth] = useState(600);
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

  // Combined Raw Text Memo
  const combinedRawText = useMemo(() => {
    let result = '';
    if (rawText) {
      result += `--- FORM-16 RAW EXTRACTED TEXT ---\n${rawText}\n\n`;
    }
    if (aisRawText) {
      result += `--- AIS RAW EXTRACTED TEXT ---\n${aisRawText}\n\n`;
    }
    if (tisRawText) {
      result += `--- TIS RAW EXTRACTED TEXT ---\n${tisRawText}\n\n`;
    }
    if (form26asRawText) {
      result += `--- FORM 26AS RAW EXTRACTED TEXT ---\n${form26asRawText}\n\n`;
    }
    return result || 'No raw text extracted yet.';
  }, [rawText, aisRawText, tisRawText, form26asRawText]);

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
  const isUploadCollapsed = hasUploadedDocs && !showUploadArea;
  const readyDocsCount = (form16List.length > 0 ? 1 : 0) + (aisFile ? 1 : 0) + (tisFile ? 1 : 0) + (form26asFile ? 1 : 0);

  const salaryDiscrepancies = useMemo(() => {
    if (!extractedDataDomain) return [];
    const disc = extractedDataDomain.discrepancies || [];
    return disc.filter(d => d.toLowerCase().includes('salary') || d.toLowerCase().includes('income discrepancy'));
  }, [extractedDataDomain]);

  const tdsDiscrepancies = useMemo(() => {
    if (!extractedDataDomain) return [];
    const disc = extractedDataDomain.discrepancies || [];
    return disc.filter(d => d.toLowerCase().includes('tds') || d.toLowerCase().includes('tan'));
  }, [extractedDataDomain]);

  const otherDiscrepancies = useMemo(() => {
    if (!extractedDataDomain) return [];
    const disc = extractedDataDomain.discrepancies || [];
    return disc.filter(d => !d.toLowerCase().includes('salary') && !d.toLowerCase().includes('income discrepancy') && !d.toLowerCase().includes('tds') && !d.toLowerCase().includes('tan'));
  }, [extractedDataDomain]);

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
    // Check all active files for capital gains
    let cgError: string | null = null;
    for (const item of currentForm16s) {
      const err = checkForAisTisCapitalGains(item.rawText);
      if (err) { cgError = err; break; }
    }
    if (!cgError && currentAisRaw) {
      const err = checkForAisTisCapitalGains(currentAisRaw);
      if (err) cgError = err;
    }
    if (!cgError && currentTisRaw) {
      const err = checkForAisTisCapitalGains(currentTisRaw);
      if (err) cgError = err;
    }
    if (!cgError && current26asRaw) {
      const err = checkForAisTisCapitalGains(current26asRaw);
      if (err) cgError = err;
    }
    setAisTisError(cgError);

    if (currentForm16s.length === 0) {
      setExtractedData(null);
      setOriginalParsedData(null);
      setRawText('');
      setErrors([]);
      return;
    }

    const mergedRawText = currentForm16s.map(item => item.rawText).join('\n\n');
    setRawText(mergedRawText);

    const domainForm16s = currentForm16s.map(item => createForm16Proxy(item.data));
    const mergedData = mergeForm16Data(domainForm16s);

    const reconciled = reconcileAllDocuments(
      mergedData,
      currentAis ? createAisProxy(currentAis) : undefined,
      currentTis ? createTisProxy(currentTis) : undefined,
      current26as ? createForm26asProxy(current26as) : undefined
    );

    const comparison = compareTaxRegimes(reconciled);
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

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
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
            <Tooltip title="Ask AI / Chat">
              <IconButton onClick={() => setChatOpen((prev) => !prev)} color="inherit" aria-label="open ai chat">
                <ChatIcon fontSize="small" />
              </IconButton>
            </Tooltip>
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
            display: { xs: chatOpen ? 'none' : 'block', md: 'block' }
          }}>
            <Container maxWidth="md" sx={{ py: 3 }}>
              {/* Compact Upload Status Bar */}
              {isUploadCollapsed && (
                <Paper variant="outlined" sx={{ p: 1.5, mb: 2.5, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, bgcolor: mode === 'dark' ? 'rgba(46, 125, 50, 0.05)' : 'rgba(46, 125, 50, 0.02)', borderColor: 'success.light' }} data-testid="compact-upload-status">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                    <CheckCircleIcon color="success" sx={{ fontSize: 20 }} />
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      Compact Upload Status: {readyDocsCount}/4 Docs Ready
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                      {form16List.length > 0 && (
                        <Paper
                          variant="outlined"
                          onClick={() => {
                            setChatOpen(true);
                            setRightPanelTab('inspect');
                            setDebugTab(1);
                          }}
                          sx={{
                            cursor: 'pointer',
                            px: 1,
                            py: 0.25,
                            borderRadius: 1.5,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            bgcolor: 'success.light',
                            color: 'success.dark',
                            borderColor: 'success.light',
                            '&:hover': { opacity: 0.8 }
                          }}
                          data-testid="compact-form16-badge-inspect"
                        >
                          <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>
                            Form-16 ({form16List.length}) 🔍
                          </Typography>
                        </Paper>
                      )}
                      {aisFile && (
                        <Paper
                          variant="outlined"
                          onClick={() => {
                            setChatOpen(true);
                            setRightPanelTab('inspect');
                            setDebugTab(2);
                          }}
                          sx={{
                            cursor: 'pointer',
                            px: 1,
                            py: 0.25,
                            borderRadius: 1.5,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            bgcolor: 'success.light',
                            color: 'success.dark',
                            borderColor: 'success.light',
                            '&:hover': { opacity: 0.8 }
                          }}
                          data-testid="compact-ais-badge-inspect"
                        >
                          <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>
                            AIS 🔍
                          </Typography>
                        </Paper>
                      )}
                      {tisFile && (
                        <Paper
                          variant="outlined"
                          onClick={() => {
                            setChatOpen(true);
                            setRightPanelTab('inspect');
                            setDebugTab(3);
                          }}
                          sx={{
                            cursor: 'pointer',
                            px: 1,
                            py: 0.25,
                            borderRadius: 1.5,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            bgcolor: 'success.light',
                            color: 'success.dark',
                            borderColor: 'success.light',
                            '&:hover': { opacity: 0.8 }
                          }}
                          data-testid="compact-tis-badge-inspect"
                        >
                          <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>
                            TIS 🔍
                          </Typography>
                        </Paper>
                      )}
                      {form26asFile && (
                        <Paper
                          variant="outlined"
                          onClick={() => {
                            setChatOpen(true);
                            setRightPanelTab('inspect');
                            setDebugTab(4);
                          }}
                          sx={{
                            cursor: 'pointer',
                            px: 1,
                            py: 0.25,
                            borderRadius: 1.5,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            bgcolor: 'success.light',
                            color: 'success.dark',
                            borderColor: 'success.light',
                            '&:hover': { opacity: 0.8 }
                          }}
                          data-testid="compact-form26as-badge-inspect"
                        >
                          <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>
                            Form 26AS 🔍
                          </Typography>
                        </Paper>
                      )}
                    </Box>
                  </Box>
                  <Button
                    variant="outlined"
                    color="primary"
                    size="small"
                    onClick={() => setShowUploadArea(true)}
                    data-testid="manage-files-btn"
                    sx={{ textTransform: 'none', fontWeight: 'bold' }}
                  >
                    Manage Files
                  </Button>
                </Paper>
              )}

              {/* Large Document Upload Card */}
              <Box sx={{ display: isUploadCollapsed ? 'none' : 'block' }}>
                <Card variant="outlined" sx={{ mb: 2.5 }}>
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                      <Typography variant="h6" sx={{ m: 0, fontWeight: 'bold' }}>
                        1. Upload Financial Documents
                      </Typography>
                      {hasUploadedDocs && (
                        <Button
                          variant="text"
                          color="primary"
                          size="small"
                          onClick={() => setShowUploadArea(false)}
                          sx={{ textTransform: 'none', fontWeight: 'bold' }}
                          data-testid="collapse-upload-btn"
                        >
                          Collapse
                        </Button>
                      )}
                    </Box>
                    <Grid container spacing={2}>
                      {/* Form-16 */}
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Box sx={{ border: '1px dashed', borderColor: 'primary.main', borderRadius: 1.5, p: 2, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', bgcolor: mode === 'dark' ? 'rgba(56, 189, 248, 0.02)' : 'rgba(2, 132, 199, 0.02)' }}>
                          <Typography id="file-upload-label" variant="subtitle2" component="label" htmlFor="file-upload" sx={{ cursor: 'pointer', fontWeight: 'bold', display: 'block', mb: 1 }}>
                            1. Upload Form-16 PDF
                          </Typography>
                          <input id="file-upload" type="file" accept=".pdf" multiple onChange={handleFileUpload} style={{ display: 'none' }} aria-labelledby="file-upload-label" />
                          <Button component="label" htmlFor="file-upload" variant="outlined" size="small" startIcon={<CloudUploadIcon />} sx={{ mt: 'auto' }}>
                            {form16List.length > 0 ? `${form16List.length} Uploaded` : 'Upload'}
                          </Button>
                          {form16List.length > 0 && (
                            <>
                              <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5, textAlign: 'left', width: '100%' }}>
                                {form16List.map((item, idx) => (
                                  <Box key={idx} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'action.hover', p: 0.5, px: 1, borderRadius: 1, gap: 1 }}>
                                    <Typography variant="caption" sx={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', flexGrow: 1, fontSize: '0.7rem' }}>
                                      {item.file.name}
                                    </Typography>
                                    <IconButton size="small" onClick={(evt) => { evt.preventDefault(); handleRemoveForm16(idx); }} aria-label={`delete form16 file ${idx}`} sx={{ p: 0.25 }}>
                                      <CloseIcon sx={{ fontSize: 12 }} />
                                    </IconButton>
                                  </Box>
                                ))}
                              </Box>
                              <Button
                                variant="text"
                                size="small"
                                onClick={() => {
                                  setChatOpen(true);
                                  setRightPanelTab('inspect');
                                  setDebugTab(1);
                                }}
                                sx={{ mt: 1, textTransform: 'none', fontSize: '0.75rem', py: 0 }}
                                data-testid="view-extracted-form16-btn"
                              >
                                View Extracted Data
                              </Button>
                            </>
                          )}
                          {loading && <CircularProgress size={16} sx={{ mt: 1, mx: 'auto' }} />}
                        </Box>
                      </Grid>

                      {/* AIS */}
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Box sx={{ border: '1px dashed', borderColor: 'primary.main', borderRadius: 1.5, p: 2, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', bgcolor: mode === 'dark' ? 'rgba(56, 189, 248, 0.02)' : 'rgba(2, 132, 199, 0.02)' }}>
                          <Typography id="ais-label" variant="subtitle2" component="label" htmlFor="ais-upload" sx={{ cursor: 'pointer', fontWeight: 'bold', display: 'block', mb: 1 }}>
                            AIS PDF (Annual Info)
                          </Typography>
                          <input id="ais-upload" type="file" accept=".pdf" onChange={handleAISUpload} style={{ display: 'none' }} aria-labelledby="ais-label" />
                          <Button component="label" htmlFor="ais-upload" variant="outlined" size="small" startIcon={<CloudUploadIcon />} sx={{ mt: 'auto' }}>
                            {aisFile ? 'Uploaded' : 'Upload'}
                          </Button>
                          {aisFile && (
                            <>
                              <Typography variant="caption" sx={{ mt: 1, display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{aisFile.name}</Typography>
                              <Button
                                variant="text"
                                size="small"
                                onClick={() => {
                                  setChatOpen(true);
                                  setRightPanelTab('inspect');
                                  setDebugTab(2);
                                }}
                                sx={{ mt: 1, textTransform: 'none', fontSize: '0.75rem', py: 0 }}
                                data-testid="view-extracted-ais-btn"
                              >
                                View Extracted Data
                              </Button>
                            </>
                          )}
                          {aisLoading && <CircularProgress size={16} sx={{ mt: 1, mx: 'auto' }} />}
                        </Box>
                      </Grid>

                      {/* TIS */}
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Box sx={{ border: '1px dashed', borderColor: 'primary.main', borderRadius: 1.5, p: 2, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', bgcolor: mode === 'dark' ? 'rgba(56, 189, 248, 0.02)' : 'rgba(2, 132, 199, 0.02)' }}>
                          <Typography id="tis-label" variant="subtitle2" component="label" htmlFor="tis-upload" sx={{ cursor: 'pointer', fontWeight: 'bold', display: 'block', mb: 1 }}>
                            TIS PDF (Tax Summary)
                          </Typography>
                          <input id="tis-upload" type="file" accept=".pdf" onChange={handleTISUpload} style={{ display: 'none' }} aria-labelledby="tis-label" />
                          <Button component="label" htmlFor="tis-upload" variant="outlined" size="small" startIcon={<CloudUploadIcon />} sx={{ mt: 'auto' }}>
                            {tisFile ? 'Uploaded' : 'Upload'}
                          </Button>
                          {tisFile && (
                            <>
                              <Typography variant="caption" sx={{ mt: 1, display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{tisFile.name}</Typography>
                              <Button
                                variant="text"
                                size="small"
                                onClick={() => {
                                  setChatOpen(true);
                                  setRightPanelTab('inspect');
                                  setDebugTab(3);
                                }}
                                sx={{ mt: 1, textTransform: 'none', fontSize: '0.75rem', py: 0 }}
                                data-testid="view-extracted-tis-btn"
                              >
                                View Extracted Data
                              </Button>
                            </>
                          )}
                          {tisLoading && <CircularProgress size={16} sx={{ mt: 1, mx: 'auto' }} />}
                        </Box>
                      </Grid>

                      {/* Form 26AS */}
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Box sx={{ border: '1px dashed', borderColor: 'primary.main', borderRadius: 1.5, p: 2, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', bgcolor: mode === 'dark' ? 'rgba(56, 189, 248, 0.02)' : 'rgba(2, 132, 199, 0.02)' }}>
                          <Typography id="f26as-label" variant="subtitle2" component="label" htmlFor="f26as-upload" sx={{ cursor: 'pointer', fontWeight: 'bold', display: 'block', mb: 1 }}>
                            Form 26AS PDF (Tax Paid)
                          </Typography>
                          <input id="f26as-upload" type="file" accept=".pdf" onChange={handleForm26ASUpload} style={{ display: 'none' }} aria-labelledby="f26as-label" />
                          <Button component="label" htmlFor="f26as-upload" variant="outlined" size="small" startIcon={<CloudUploadIcon />} sx={{ mt: 'auto' }}>
                            {form26asFile ? 'Uploaded' : 'Upload'}
                          </Button>
                          {form26asFile && (
                            <>
                              <Typography variant="caption" sx={{ mt: 1, display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{form26asFile.name}</Typography>
                              <Button
                                variant="text"
                                size="small"
                                onClick={() => {
                                  setChatOpen(true);
                                  setRightPanelTab('inspect');
                                  setDebugTab(4);
                                }}
                                sx={{ mt: 1, textTransform: 'none', fontSize: '0.75rem', py: 0 }}
                                data-testid="view-extracted-form26as-btn"
                              >
                                View Extracted Data
                              </Button>
                            </>
                          )}
                          {form26asLoading && <CircularProgress size={16} sx={{ mt: 1, mx: 'auto' }} />}
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Box>

              {aisTisError && (
                <Alert severity="error" variant="outlined" sx={{ mb: 4, borderRadius: 2 }} data-testid="ais-tis-error-alert">
                  <AlertTitle sx={{ fontWeight: 'bold' }}>Incompatible Document</AlertTitle>
                  {aisTisError}
                </Alert>
              )}

              {/* Miscellaneous/Other Reconciliation Alerts */}
              {extractedData && !aisTisError && otherDiscrepancies.length > 0 && (
                <Alert severity="warning" variant="outlined" sx={{ mb: 2.5, borderRadius: 1.5, py: 1 }}>
                  <AlertTitle sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Reconciliation Discrepancy & Matcher Alerts:</AlertTitle>
                  <ul style={{ margin: '4px 0 0 0', paddingLeft: '1.15rem' }}>
                    {otherDiscrepancies.map((disc, i) => (
                      <li key={i}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{disc}</Typography>
                      </li>
                    ))}
                  </ul>
                </Alert>
              )}

              {/* Supplementary Income */}
              {extractedDataDomain && !aisTisError && extractedDataDomain.detectedIncomeSources && (extractedDataDomain.detectedIncomeSources?.length ?? 0) > 0 && (
                <Card variant="outlined" sx={{ mb: 2.5, borderColor: 'primary.main', bgcolor: mode === 'dark' ? 'rgba(56, 189, 248, 0.01)' : 'rgba(2, 132, 199, 0.01)' }}>
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, display: 'flex', alignItems: 'center', gap: 1, color: 'primary.main' }}>
                      <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} /> Detected Supplementary Income Sources (AIS/TIS)
                    </Typography>
                    <Typography variant="caption" color="textSecondary" sx={{ mb: 1.5, display: 'block' }}>
                      The following additional incomes were found in the uploaded AIS/TIS documents and have been successfully merged into your other sources to prevent under-reporting:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                      {extractedDataDomain.detectedIncomeSources?.map((item, i) => {
                        let catLabel = 'Other';
                        if (item.category === 'interestSavings') catLabel = 'Savings bank interest';
                        if (item.category === 'interestDeposit') catLabel = 'Interest on deposit';
                        if (item.category === 'dividendIncome') catLabel = 'Dividend';

                        return (
                          <Paper key={i} variant="outlined" sx={{ p: 1, px: 1.5, borderRadius: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box>
                              <Typography variant="caption" color="textSecondary" sx={{ display: 'block', fontSize: '0.675rem' }}>{catLabel} ({item.source})</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>₹{item.amount.toLocaleString('en-IN')}</Typography>
                            </Box>
                            <IconButton size="small" color="success">
                              <CheckCircleIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Paper>
                        );
                      })}
                    </Box>
                  </CardContent>
                </Card>
              )}

              {/* Tax Regime Comparison Card */}
              {extractedData && !aisTisError && (
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
              )}

              {extractedData && !aisTisError && (
                <>
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

                  {/* Review / Edit Form */}
                  <Card variant="outlined" sx={{ mb: 2.5 }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                          <Typography variant="h6" sx={{ fontWeight: 'bold', m: 0 }}>
                            2. Review & Edit Extracted Information
                          </Typography>
                          <Paper
                            variant="outlined"
                            sx={{
                              px: 1,
                              py: 0.25,
                              borderRadius: 1.5,
                              bgcolor: 'primary.light',
                              color: 'primary.dark',
                              borderColor: 'primary.light',
                              display: 'inline-flex',
                              alignItems: 'center'
                            }}
                            data-testid="selected-itr-form-badge"
                          >
                            <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>
                              Form: {extractedDataDomain && shouldUseITR2(extractedDataDomain, form16List.length) ? 'ITR-2' : 'ITR-1'}
                            </Typography>
                          </Paper>
                        </Box>
                        <Button
                          variant="contained"
                          color="secondary"
                          startIcon={<SmartToyIcon fontSize="small" />}
                          onClick={() => handleSendMessage(true)}
                          size="small"
                        >
                          AI Review
                        </Button>
                      </Box>

                      <Grid container spacing={2}>
                        {/* 1. General & Filer Information */}
                        <Grid size={{ xs: 12 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', borderBottom: 1, borderColor: 'divider', pb: 0.5, mb: 1.5, color: 'primary.main', display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                            General & Filer Information
                            <SectionHeaderBadge count={getSectionVerifiedCount('general', extractedData)} mode={mode} />
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Assessment Year" path="assessmentYear" data={extractedData} originalData={originalParsedData} appliedAiSuggestions={appliedAiSuggestions} onChange={(v) => updateNestedValue('assessmentYear', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Period From (YYYY-MM-DD)" path="period.from" data={extractedData} originalData={originalParsedData} appliedAiSuggestions={appliedAiSuggestions} onChange={(v) => updateNestedValue('period.from', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Period To (YYYY-MM-DD)" path="period.to" data={extractedData} originalData={originalParsedData} appliedAiSuggestions={appliedAiSuggestions} onChange={(v) => updateNestedValue('period.to', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Employer Name" path="employer.name" data={extractedData} originalData={originalParsedData} appliedAiSuggestions={appliedAiSuggestions} onChange={(v) => updateNestedValue('employer.name', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Employer PAN" path="employer.pan" isMonospace uppercase data={extractedData} originalData={originalParsedData} appliedAiSuggestions={appliedAiSuggestions} onChange={(v) => updateNestedValue('employer.pan', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Employer TAN" path="employer.tan" isMonospace uppercase data={extractedData} originalData={originalParsedData} appliedAiSuggestions={appliedAiSuggestions} onChange={(v) => updateNestedValue('employer.tan', v)} />
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                              <CueTextField label="Employer Address" path="employer.address" data={extractedData} originalData={originalParsedData} appliedAiSuggestions={appliedAiSuggestions} onChange={(v) => updateNestedValue('employer.address', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Employee First Name" path="employee.name.firstName" data={extractedData} originalData={originalParsedData} appliedAiSuggestions={appliedAiSuggestions} onChange={(v) => updateNestedValue('employee.name.firstName', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Employee Middle Name" path="employee.name.middleName" data={extractedData} originalData={originalParsedData} appliedAiSuggestions={appliedAiSuggestions} onChange={(v) => updateNestedValue('employee.name.middleName', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Employee Last Name" path="employee.name.lastName" data={extractedData} originalData={originalParsedData} appliedAiSuggestions={appliedAiSuggestions} onChange={(v) => updateNestedValue('employee.name.lastName', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Employee PAN" path="employee.pan" isMonospace uppercase data={extractedData} originalData={originalParsedData} appliedAiSuggestions={appliedAiSuggestions} onChange={(v) => updateNestedValue('employee.pan', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 8 }}>
                              <CueTextField label="Employee Address" path="employee.address" data={extractedData} originalData={originalParsedData} appliedAiSuggestions={appliedAiSuggestions} onChange={(v) => updateNestedValue('employee.address', v)} />
                            </Grid>
                          </Grid>
                        </Grid>

                        {/* 2. Detailed Salary & Deductions u/s 16 */}
                        <Grid size={{ xs: 12 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', borderBottom: 1, borderColor: 'divider', pb: 0.5, mb: 1.5, color: 'primary.main', display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                            Salary Income Details (₹)
                            <SectionHeaderBadge count={getSectionVerifiedCount('salary', extractedData)} mode={mode} />
                          </Typography>
                          {salaryDiscrepancies.length > 0 && (
                            <Alert severity="warning" variant="outlined" sx={{ mb: 2, borderRadius: 1.5, py: 0.5 }}>
                              <AlertTitle sx={{ fontWeight: 'bold', fontSize: '0.8rem', m: 0 }}>Section Discrepancy Alert:</AlertTitle>
                              <ul style={{ margin: '4px 0 0 0', paddingLeft: '1.15rem' }}>
                                {salaryDiscrepancies.map((disc, i) => (
                                  <li key={i}>
                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{disc}</Typography>
                                  </li>
                                ))}
                              </ul>
                            </Alert>
                          )}
                          <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Salary u/s 17(1)" type="number" path="salary.salaryAsPer17_1" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} originalData={originalParsedData} appliedAiSuggestions={appliedAiSuggestions} onChange={(v) => updateNestedValue('salary.salaryAsPer17_1', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Perquisites u/s 17(2)" type="number" path="salary.perquisites17_2" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} originalData={originalParsedData} appliedAiSuggestions={appliedAiSuggestions} onChange={(v) => updateNestedValue('salary.perquisites17_2', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Profits in lieu u/s 17(3)" type="number" path="salary.profitsInLieu17_3" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} originalData={originalParsedData} appliedAiSuggestions={appliedAiSuggestions} onChange={(v) => updateNestedValue('salary.profitsInLieu17_3', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Gross Salary" type="number" path="salary.grossSalary" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} originalData={originalParsedData} appliedAiSuggestions={appliedAiSuggestions} onChange={(v) => updateNestedValue('salary.grossSalary', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Total Exempt Allowances u/s 10" type="number" path="salary.totalExemptAllowances" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} originalData={originalParsedData} appliedAiSuggestions={appliedAiSuggestions} onChange={(v) => updateNestedValue('salary.totalExemptAllowances', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Net Salary" type="number" path="salary.netSalary" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} originalData={originalParsedData} appliedAiSuggestions={appliedAiSuggestions} onChange={(v) => updateNestedValue('salary.netSalary', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Standard Deduction (u/s 16ia)" type="number" path="salary.standardDeduction16ia" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} originalData={originalParsedData} appliedAiSuggestions={appliedAiSuggestions} onChange={(v) => updateNestedValue('salary.standardDeduction16ia', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Entertainment Allowance (16ii)" type="number" path="salary.entertainmentAllowance16ii" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} originalData={originalParsedData} appliedAiSuggestions={appliedAiSuggestions} onChange={(v) => updateNestedValue('salary.entertainmentAllowance16ii', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Professional Tax (16iii)" type="number" path="salary.professionalTax16iii" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} originalData={originalParsedData} appliedAiSuggestions={appliedAiSuggestions} onChange={(v) => updateNestedValue('salary.professionalTax16iii', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                              <CueTextField label="Total Deductions u/s 16" type="number" path="salary.totalDeductionsUs16" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} originalData={originalParsedData} appliedAiSuggestions={appliedAiSuggestions} onChange={(v) => updateNestedValue('salary.totalDeductionsUs16', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                              <CueTextField label="Income Chargeable under head Salaries" type="number" path="salary.incomeChargeableUnderHeadSalaries" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} originalData={originalParsedData} appliedAiSuggestions={appliedAiSuggestions} onChange={(v) => updateNestedValue('salary.incomeChargeableUnderHeadSalaries', v)} />
                            </Grid>
                          </Grid>
                          <SectionAuditTrail
                            section="salary"
                            extractedData={extractedData}
                            mode={mode}
                            selectedRegime={selectedRegime}
                            isExpanded={!!expandedTrails['salary']}
                            onToggle={() => setExpandedTrails((prev) => ({ ...prev, salary: !prev['salary'] }))}
                          />
                        </Grid>

                        {/* 3. Other Income */}
                        <Grid size={{ xs: 12 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', borderBottom: 1, borderColor: 'divider', pb: 0.5, mb: 1.5, color: 'primary.main', display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                            Other Income Details (₹)
                            <SectionHeaderBadge count={getSectionVerifiedCount('other', extractedData)} mode={mode} />
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 6 }}>
                              <CueTextField label="House Property Income" type="number" path="otherIncome.houseProperty" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} originalData={originalParsedData} appliedAiSuggestions={appliedAiSuggestions} onChange={(v) => updateNestedValue('otherIncome.houseProperty', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                              <CueTextField label="Other Sources Income" type="number" path="otherIncome.totalOtherSources" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} originalData={originalParsedData} appliedAiSuggestions={appliedAiSuggestions} onChange={(v) => updateNestedValue('otherIncome.totalOtherSources', v)} />
                            </Grid>
                          </Grid>
                          <SectionAuditTrail
                            section="other"
                            extractedData={extractedData}
                            mode={mode}
                            selectedRegime={selectedRegime}
                            isExpanded={!!expandedTrails['other']}
                            onToggle={() => setExpandedTrails((prev) => ({ ...prev, other: !prev['other'] }))}
                          />
                        </Grid>

                        {/* 4. Chapter VI-A Deductions */}
                        <Grid size={{ xs: 12 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', borderBottom: 1, borderColor: 'divider', pb: 0.5, mb: 1.5, color: 'primary.main', display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                            Chapter VI-A Deductions (₹)
                            <SectionHeaderBadge count={getSectionVerifiedCount('deductions', extractedData)} mode={mode} />
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Section 80C" type="number" path="deductions80C" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} originalData={originalParsedData} appliedAiSuggestions={appliedAiSuggestions} onChange={(v) => updateNestedValue('deductions80C', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Section 80CCC" type="number" path="deductions80CCC" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} originalData={originalParsedData} appliedAiSuggestions={appliedAiSuggestions} onChange={(v) => updateNestedValue('deductions80CCC', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Section 80CCD(1)" type="number" path="deductions80CCD1" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} originalData={originalParsedData} appliedAiSuggestions={appliedAiSuggestions} onChange={(v) => updateNestedValue('deductions80CCD1', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Section 80CCD(1B)" type="number" path="deductions80CCD1B" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} originalData={originalParsedData} appliedAiSuggestions={appliedAiSuggestions} onChange={(v) => updateNestedValue('deductions80CCD1B', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Section 80CCD(2)" type="number" path="deductions80CCD2" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} originalData={originalParsedData} appliedAiSuggestions={appliedAiSuggestions} onChange={(v) => updateNestedValue('deductions80CCD2', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Section 80D" type="number" path="deductions80D" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} originalData={originalParsedData} appliedAiSuggestions={appliedAiSuggestions} onChange={(v) => updateNestedValue('deductions80D', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Section 80E" type="number" path="deductions80E" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} originalData={originalParsedData} appliedAiSuggestions={appliedAiSuggestions} onChange={(v) => updateNestedValue('deductions80E', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Section 80G" type="number" path="deductions80G" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} originalData={originalParsedData} appliedAiSuggestions={appliedAiSuggestions} onChange={(v) => updateNestedValue('deductions80G', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Section 80TTA" type="number" path="deductions80TTA" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} originalData={originalParsedData} appliedAiSuggestions={appliedAiSuggestions} onChange={(v) => updateNestedValue('deductions80TTA', v)} />
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                              <CueTextField label="Total Chapter VI-A Deductions" type="number" path="totalChapterVIADeductions" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} originalData={originalParsedData} appliedAiSuggestions={appliedAiSuggestions} onChange={(v) => updateNestedValue('totalChapterVIADeductions', v)} />
                            </Grid>
                          </Grid>
                          <SectionAuditTrail
                            section="deductions"
                            extractedData={extractedData}
                            mode={mode}
                            selectedRegime={selectedRegime}
                            isExpanded={!!expandedTrails['deductions']}
                            onToggle={() => setExpandedTrails((prev) => ({ ...prev, deductions: !prev['deductions'] }))}
                          />
                        </Grid>

                        {/* 5. Tax Paid & Credits */}
                        <Grid size={{ xs: 12 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', borderBottom: 1, borderColor: 'divider', pb: 0.5, mb: 1.5, color: 'primary.main', display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                            Taxes Paid & Credits (₹)
                            <SectionHeaderBadge count={getSectionVerifiedCount('taxCredits', extractedData)} mode={mode} />
                          </Typography>
                          {tdsDiscrepancies.length > 0 && (
                            <Alert severity="warning" variant="outlined" sx={{ mb: 2, borderRadius: 1.5, py: 0.5 }}>
                              <AlertTitle sx={{ fontWeight: 'bold', fontSize: '0.8rem', m: 0 }}>Section Discrepancy Alert:</AlertTitle>
                              <ul style={{ margin: '4px 0 0 0', paddingLeft: '1.15rem' }}>
                                {tdsDiscrepancies.map((disc, i) => (
                                  <li key={i}>
                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{disc}</Typography>
                                  </li>
                                ))}
                              </ul>
                            </Alert>
                          )}
                          <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="TDS on Salary (u/s 192)" type="number" path="taxCredits.tdsSalary" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} originalData={originalParsedData} appliedAiSuggestions={appliedAiSuggestions} onChange={(v) => updateNestedValue('taxCredits.tdsSalary', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="TDS on Other Income" type="number" path="taxCredits.tdsOther" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} originalData={originalParsedData} appliedAiSuggestions={appliedAiSuggestions} onChange={(v) => updateNestedValue('taxCredits.tdsOther', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="TCS (Tax Collected)" type="number" path="taxCredits.tcs" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} originalData={originalParsedData} appliedAiSuggestions={appliedAiSuggestions} onChange={(v) => updateNestedValue('taxCredits.tcs', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                              <CueTextField label="Advance Tax Paid" type="number" path="taxCredits.advanceTax" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} originalData={originalParsedData} appliedAiSuggestions={appliedAiSuggestions} onChange={(v) => updateNestedValue('taxCredits.advanceTax', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                              <CueTextField label="Self-Assessment Tax Paid" type="number" path="taxCredits.selfAssessmentTax" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} originalData={originalParsedData} appliedAiSuggestions={appliedAiSuggestions} onChange={(v) => updateNestedValue('taxCredits.selfAssessmentTax', v)} />
                            </Grid>
                          </Grid>
                        </Grid>

                        {/* 6. Summary */}
                        <Grid size={{ xs: 12 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', borderBottom: 1, borderColor: 'divider', pb: 0.5, mb: 1.5, color: 'primary.main', display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                            Tax Computation Summary (₹)
                            <SectionHeaderBadge count={getSectionVerifiedCount('summary', extractedData)} mode={mode} />
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Gross Total Income" type="number" path="grossTotalIncome" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} originalData={originalParsedData} appliedAiSuggestions={appliedAiSuggestions} onChange={(v) => updateNestedValue('grossTotalIncome', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Total Taxable Income" type="number" path="totalIncome" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} originalData={originalParsedData} appliedAiSuggestions={appliedAiSuggestions} onChange={(v) => updateNestedValue('totalIncome', v)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CueTextField label="Tax Payable" type="number" path="taxPayable" startAdornment={<InputAdornment position="start">₹</InputAdornment>} data={extractedData} originalData={originalParsedData} appliedAiSuggestions={appliedAiSuggestions} onChange={(v) => updateNestedValue('taxPayable', v)} />
                            </Grid>
                          </Grid>
                          <SectionAuditTrail
                            section="summary"
                            extractedData={extractedData}
                            mode={mode}
                            selectedRegime={selectedRegime}
                            isExpanded={!!expandedTrails['summary']}
                            onToggle={() => setExpandedTrails((prev) => ({ ...prev, summary: !prev['summary'] }))}
                          />
                        </Grid>
                      </Grid>

                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mt: 3, flexWrap: 'wrap' }}>
                        <Button
                          variant="outlined"
                          color="info"
                          startIcon={<CodeIcon fontSize="small" />}
                          onClick={() => {
                            setChatOpen(true);
                            setRightPanelTab('inspect');
                            setDebugTab(0);
                          }}
                          size="small"
                          data-testid="inspect-form-data-btn-left"
                        >
                          Inspect Form Data
                        </Button>
                        <Button
                          variant="outlined"
                          color="secondary"
                          startIcon={<RefreshIcon fontSize="small" />}
                          onClick={() => {
                            if (extractedDataDomain) {
                              setErrors(validateForm16Data(extractedDataDomain));
                            }
                          }}
                          size="small"
                        >
                          Re-validate Data
                        </Button>
                        <Button
                          variant="contained"
                          color="success"
                          startIcon={<DownloadIcon fontSize="small" />}
                          onClick={() => {
                            if (extractedDataDomain) {
                              const isItr2 = shouldUseITR2(extractedDataDomain, form16List.length);
                              const itrJson = mapToITR(extractedDataDomain, selectedRegime, form16List);
                              const blob = new Blob([JSON.stringify(itrJson, null, 2)], { type: 'application/json' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `${isItr2 ? 'ITR2' : 'ITR1'}_${extractedDataDomain.employee.pan || 'data'}_${selectedRegime}.json`;
                              a.click();
                            }
                          }}
                          size="small"
                          data-testid="download-itr-button"
                        >
                          Download ITR JSON
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>

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
            width: chatOpen ? { xs: '100%', md: `${chatWidth}px` } : '0px',
            minWidth: chatOpen ? { xs: '100%', md: `${chatWidth}px` } : '0px',
            overflow: 'hidden',
            display: 'flex',
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
              {/* Chat Sub-Header (Model Selector & Send only raw data checkbox) */}
              <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SmartToyIcon color="primary" sx={{ fontSize: 18 }} />
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Chat Options</Typography>
                  </Box>
                  <FormControl size="small" variant="standard" sx={{ minWidth: 120 }}>
                    <Select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      sx={{ fontSize: '0.75rem', py: 0 }}
                      aria-label="select gemini model"
                    >
                      {geminiModels.map((m) => (
                        <MenuItem key={m.value} value={m.value} sx={{ fontSize: '0.75rem' }}>
                          {m.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={sendOnlyRawData}
                      onChange={(e) => setSendOnlyRawData(e.target.checked)}
                      size="small"
                      color="primary"
                    />
                  }
                  label={
                    <Typography variant="caption" sx={{ fontSize: '0.75rem', fontWeight: 500 }}>
                      Send only raw data to AI agent
                    </Typography>
                  }
                  sx={{ m: 0 }}
                />
              </Box>

              {/* Chat Messages */}
              <Box sx={{ flexGrow: 1, p: 2, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1.5, bgcolor: mode === 'dark' ? 'rgba(15, 23, 42, 0.2)' : '#f8fafc' }}>
                {messages.length === 0 && (
                  <Box sx={{ textAlign: 'center', my: 'auto', px: 2, color: 'text.secondary' }}>
                    <SmartToyIcon sx={{ fontSize: 36, mb: 1, opacity: 0.6, color: 'primary.main' }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 0.5, color: 'text.primary' }}>Ask me anything about your taxes!</Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ maxWidth: 320, mx: 'auto', lineHeight: 1.4 }}>
                      You can ask for recommendations on tax savings, double check standard deductions, or upload additional P&L reports.
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
                      gap: 0.25,
                    }}
                  >
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 1.25,
                        borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                        bgcolor: msg.role === 'user' ? 'primary.main' : 'background.paper',
                        color: msg.role === 'user' ? 'primary.contrastText' : 'text.primary',
                        borderColor: msg.role === 'user' ? 'primary.main' : 'divider',
                        boxShadow: 'none',
                      }}
                    >
                      {msg.role === 'user' ? (
                        <Typography variant="body2" sx={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '0.825rem', lineHeight: 1.4 }}>
                          {msg.content}
                        </Typography>
                      ) : (
                        <AssistantMessage
                          content={msg.content}
                          msgIdx={idx}
                          acceptedMessages={acceptedMessages}
                          rejectedMessages={rejectedMessages}
                          onAccept={handleAcceptProposal}
                          onReject={handleRejectProposal}
                          onUndo={handleUndoProposal}
                          currentData={extractedData}
                        />
                      )}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid rgba(255,255,255,0.15)', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.7rem' }}>Attached Documents:</Typography>
                          {msg.attachments.map((att, attIdx) => (
                            <Typography key={attIdx} variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, opacity: 0.9, fontSize: '0.7rem' }}>
                              <AttachFileIcon sx={{ fontSize: 10 }} /> {att.name}
                            </Typography>
                          ))}
                        </Box>
                      )}
                    </Paper>
                    <Typography variant="caption" color="textSecondary" sx={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', px: 0.5, fontSize: '0.7rem' }}>
                      {msg.role === 'user' ? 'You' : 'AI Assistant'}
                    </Typography>
                  </Box>
                ))}

                {chatLoading && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, alignSelf: 'flex-start' }}>
                    <CircularProgress size={12} />
                    <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>AI is generating response...</Typography>
                  </Box>
                )}
                <div ref={messagesEndRef} />
              </Box>

              <Divider />

              {/* Chat Input */}
              <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1, bgcolor: 'background.paper' }}>
                {/* Badges for Selected Context Files */}
                {(file || aisFile || tisFile || form26asFile || attachments.length > 0 || (!sendOnlyRawData && extractedData)) && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                    {/* Parsed Data Button */}
                    {!sendOnlyRawData && extractedData && (
                      <Button
                        variant="outlined"
                        color="primary"
                        size="small"
                        startIcon={<CodeIcon sx={{ fontSize: 12 }} />}
                        onClick={() => {
                          setChatOpen(true);
                          setRightPanelTab('inspect');
                          setDebugTab(0);
                        }}
                        data-testid="parsed-itr-badge"
                        sx={{
                          textTransform: 'none',
                          fontSize: '0.7rem',
                          py: 0.25,
                          px: 1,
                          borderRadius: 1,
                          minHeight: 0,
                          height: 24,
                          fontWeight: 'bold',
                        }}
                      >
                        Inspect Form Data
                      </Button>
                    )}

                    {/* Form-16 Context */}
                    {form16List.map((item, idx) => (
                      <Paper key={idx} variant="outlined" sx={{ pl: 0.75, pr: 0.25, py: 0.25, borderRadius: 1, display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: 'action.hover' }} data-testid={idx === 0 ? "form16-badge" : `form16-badge-${idx}`}>
                        <AttachFileIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                        <Typography variant="caption" sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.7rem', fontWeight: 'bold' }}>
                          {item.file.name}
                        </Typography>
                        <IconButton size="small" onClick={() => handleRemoveForm16(idx)} aria-label={idx === 0 ? "remove form16 context" : `remove form16 context ${idx}`}>
                          <CloseIcon sx={{ fontSize: 12 }} />
                        </IconButton>
                      </Paper>
                    ))}

                    {/* AIS Context */}
                    {aisFile && (
                      <Paper variant="outlined" sx={{ pl: 0.75, pr: 0.25, py: 0.25, borderRadius: 1, display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: 'action.hover' }} data-testid="ais-badge">
                        <AttachFileIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                        <Typography variant="caption" sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.7rem', fontWeight: 'bold' }}>
                          {aisFile.name}
                        </Typography>
                        <IconButton size="small" onClick={() => { setAisFile(null); setAisData(null); setAisRawText(''); reRunReconciliation(form16List, null, tisData, form26asData, '', tisRawText, form26asRawText); }} aria-label="remove ais context">
                          <CloseIcon sx={{ fontSize: 12 }} />
                        </IconButton>
                      </Paper>
                    )}

                    {/* TIS Context */}
                    {tisFile && (
                      <Paper variant="outlined" sx={{ pl: 0.75, pr: 0.25, py: 0.25, borderRadius: 1, display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: 'action.hover' }} data-testid="tis-badge">
                        <AttachFileIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                        <Typography variant="caption" sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.7rem', fontWeight: 'bold' }}>
                          {tisFile.name}
                        </Typography>
                        <IconButton size="small" onClick={() => { setTisFile(null); setTisData(null); setTisRawText(''); reRunReconciliation(form16List, aisData, null, form26asData, aisRawText, '', form26asRawText); }} aria-label="remove tis context">
                          <CloseIcon sx={{ fontSize: 12 }} />
                        </IconButton>
                      </Paper>
                    )}

                    {/* Form 26AS Context */}
                    {form26asFile && (
                      <Paper variant="outlined" sx={{ pl: 0.75, pr: 0.25, py: 0.25, borderRadius: 1, display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: 'action.hover' }} data-testid="form26as-badge">
                        <AttachFileIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                        <Typography variant="caption" sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.7rem', fontWeight: 'bold' }}>
                          {form26asFile.name}
                        </Typography>
                        <IconButton size="small" onClick={() => { setForm26asFile(null); setForm26asData(null); setForm26asRawText(''); reRunReconciliation(form16List, aisData, tisData, null, aisRawText, tisRawText, ''); }} aria-label="remove form26as context">
                          <CloseIcon sx={{ fontSize: 12 }} />
                        </IconButton>
                      </Paper>
                    )}

                    {/* Supplementary Attachments */}
                    {attachments.map((att, idx) => (
                      <Paper key={idx} variant="outlined" sx={{ pl: 0.75, pr: 0.25, py: 0.25, borderRadius: 1, display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: 'action.hover' }}>
                        <AttachFileIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                        <Typography variant="caption" sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.7rem' }}>
                          {att.name}
                        </Typography>
                        <IconButton size="small" onClick={() => removeAttachment(idx)} aria-label="remove attachment">
                          <CloseIcon sx={{ fontSize: 12 }} />
                        </IconButton>
                      </Paper>
                    ))}
                  </Box>
                )}

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <input id="chat-attachment-upload" type="file" onChange={handleAttachmentUpload} style={{ display: 'none' }} />
                  <Tooltip title="Attach supplementary document (PDF, Text, or Image)">
                    <span>
                      <IconButton component="label" htmlFor="chat-attachment-upload" color="primary" disabled={attachingFile} aria-label="attach document" size="small">
                        {attachingFile ? <CircularProgress size={20} /> : <AttachFileIcon fontSize="small" />}
                      </IconButton>
                    </span>
                  </Tooltip>

                  <TextField
                    fullWidth
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
                              size="small"
                            >
                              <SendIcon fontSize="small" />
                            </IconButton>
                          </InputAdornment>
                        ),
                      }
                    }}
                  />
                </Box>
              </Box>
            </Box>

            {/* View 2: Document Inspection / Split-screen Verification */}
            <Box sx={{
              display: rightPanelTab === 'inspect' ? 'block' : 'none',
              flexGrow: 1,
              p: 2.5,
              overflowY: 'auto',
              bgcolor: mode === 'dark' ? 'rgba(15, 23, 42, 0.1)' : '#f8fafc',
            }}>
              <DebugInfoSection
                mode={mode}
                combinedRawText={combinedRawText}
                extractedData={extractedData}
                form16List={form16List}
                aisData={aisData}
                tisData={tisData}
                form26asData={form26asData}
                activeTab={debugTab}
                onTabChange={setDebugTab}
              />
            </Box>
          </Box>
        </Box>

        {/* Floating AI Chat Button */}
        {!chatOpen && (
          <Fab color="primary" aria-label="open ai chat window" sx={{ position: 'fixed', bottom: 24, right: 24, boxShadow: 3 }} onClick={() => setChatOpen(true)}>
            <ChatIcon />
          </Fab>
        )}
      </Box>
    </ThemeProvider>
  );
}
