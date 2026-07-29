import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Box, Typography, Paper, Tabs, Tab, TextField, InputAdornment, IconButton } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import DescriptionIcon from '@mui/icons-material/Description';
import ArticleIcon from '@mui/icons-material/Article';

interface DocumentViewerProps {
  mode: 'light' | 'dark';
  rawText: string;
  aisRawText: string;
  tisRawText: string;
  form26asRawText: string;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  activeTab?: number;
  onTabChange?: (newValue: number) => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      style={{ display: value === index ? 'flex' : 'none', flexDirection: 'column', flexGrow: 1, minHeight: 0 }}
      id={`doc-tabpanel-${index}`}
      aria-labelledby={`doc-tab-${index}`}
      {...other}
    >
      <Box sx={{ pt: 1, flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {children}
      </Box>
    </div>
  );
}

function HighlightedText({ text, query, mode }: { text: string; query: string; mode: 'light' | 'dark' }) {
  if (!query.trim()) {
    return (
      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '11px', fontFamily: 'monospace', lineHeight: 1.5 }}>
        {text}
      </pre>
    );
  }

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  return (
    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '11px', fontFamily: 'monospace', lineHeight: 1.5 }}>
      {parts.map((part, i) =>
        regex.test(part)
          ? <mark key={i} style={{ backgroundColor: mode === 'dark' ? '#fbbf24' : '#fef08a', color: mode === 'dark' ? '#1e293b' : 'inherit', borderRadius: 2, padding: '0 1px' }}>{part}</mark>
          : part
      )}
    </pre>
  );
}

function TextPanel({ text, query, mode, emptyMessage }: { text: string; query: string; mode: 'light' | 'dark'; emptyMessage: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentMatch, setCurrentMatch] = useState(0);
  const matchCountRef = useRef(0);

  const matchCount = useMemo(() => {
    if (!query.trim()) return 0;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');
    const matches = text.match(regex);
    return matches ? matches.length : 0;
  }, [text, query]);

  useEffect(() => {
    matchCountRef.current = matchCount;
    setCurrentMatch(0);
  }, [matchCount, query]);

  useEffect(() => {
    if (!query.trim() || !containerRef.current || matchCount === 0) return;
    const container = containerRef.current;
    const marks = container.querySelectorAll('mark');
    if (marks.length > 0) {
      const idx = Math.min(currentMatch, marks.length - 1);
      marks[idx]?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    }
  }, [currentMatch, query, matchCount]);

  const goToNextMatch = () => {
    if (matchCountRef.current === 0) return;
    setCurrentMatch(prev => (prev + 1) % matchCountRef.current);
  };

  const goToPrevMatch = () => {
    if (matchCountRef.current === 0) return;
    setCurrentMatch(prev => (prev - 1 + matchCountRef.current) % matchCountRef.current);
  };

  if (!text) {
    return (
      <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic', p: 2 }}>
        {emptyMessage}
      </Typography>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0 }}>
      {query.trim() && matchCount > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5, px: 0.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '0.7rem' }}>
            {matchCount} match{matchCount !== 1 ? 'es' : ''}
          </Typography>
          <IconButton size="small" onClick={goToPrevMatch} sx={{ p: 0.25 }}>
            <NavigateBeforeIcon sx={{ fontSize: 14 }} />
          </IconButton>
          <IconButton size="small" onClick={goToNextMatch} sx={{ p: 0.25 }}>
            <NavigateNextIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>
      )}
      <Paper
        variant="outlined"
        sx={{
          p: 1.5,
          bgcolor: mode === 'dark' ? 'grey.950' : 'grey.900',
          color: '#10b981',
          borderRadius: 1.5,
          flexGrow: 1,
          overflow: 'auto',
        }}
      >
        <Box ref={containerRef} sx={{ overflow: 'auto' }}>
          <HighlightedText text={text} query={query} mode={mode} />
        </Box>
      </Paper>
    </Box>
  );
}

export default function DocumentViewer({
  mode,
  rawText,
  aisRawText,
  tisRawText,
  form26asRawText,
  searchQuery = '',
  onSearchChange,
  activeTab,
  onTabChange,
}: DocumentViewerProps) {
  const [localTabValue, setLocalTabValue] = useState(0);
  const [localSearch, setLocalSearch] = useState('');

  const isControlled = activeTab !== undefined && onTabChange !== undefined;
  const tabValue = isControlled ? activeTab : localTabValue;

  const searchValue = onSearchChange !== undefined ? searchQuery : localSearch;

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    if (isControlled) {
      onTabChange(newValue);
    } else {
      setLocalTabValue(newValue);
    }
  };

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (onSearchChange) {
      onSearchChange(val);
    } else {
      setLocalSearch(val);
    }
  };

  const tabs = [
    { label: 'Form-16', text: rawText, emptyMsg: 'No Form-16 document uploaded.', icon: <DescriptionIcon sx={{ fontSize: 14 }} /> },
    { label: 'AIS', text: aisRawText, emptyMsg: 'No AIS document uploaded.', icon: <ArticleIcon sx={{ fontSize: 14 }} /> },
    { label: 'TIS', text: tisRawText, emptyMsg: 'No TIS document uploaded.', icon: <ArticleIcon sx={{ fontSize: 14 }} /> },
    { label: 'Form 26AS', text: form26asRawText, emptyMsg: 'No Form 26AS document uploaded.', icon: <ArticleIcon sx={{ fontSize: 14 }} /> },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', fontWeight: 'bold', fontSize: '0.85rem' }}>
        <DescriptionIcon sx={{ fontSize: 16 }} /> Document Viewer
      </Typography>

      <TextField
        fullWidth
        size="small"
        placeholder="Search document text..."
        value={searchValue}
        onChange={handleSearchInput}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              </InputAdornment>
            ),
          },
        }}
        sx={{ mb: 1, '& .MuiInputBase-root': { fontSize: '0.8rem' } }}
      />

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="document viewer tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          {tabs.map((t, i) => (
            <Tab
              key={i}
              label={t.label}
              icon={t.icon}
              iconPosition="start"
              id={`doc-tab-${i}`}
              aria-controls={`doc-tabpanel-${i}`}
              sx={{ minHeight: 36, py: 0.5, fontSize: '0.75rem', textTransform: 'none', fontWeight: 'bold' }}
            />
          ))}
        </Tabs>
      </Box>

      <Box sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {tabs.map((t, i) => (
          <CustomTabPanel key={i} value={tabValue} index={i}>
            <TextPanel text={t.text} query={searchValue} mode={mode} emptyMessage={t.emptyMsg} />
          </CustomTabPanel>
        ))}
      </Box>
    </Box>
  );
}
