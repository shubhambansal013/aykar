import React, { useState } from 'react';
import { Box, Typography, Paper, Tabs, Tab } from '@mui/material';
import BugReportIcon from '@mui/icons-material/BugReport';
import CodeIcon from '@mui/icons-material/Code';

interface DebugInfoSectionProps {
  mode: 'light' | 'dark';
  combinedRawText: string;
  extractedData: any;
  form16List?: Array<{ file: any; rawText: string; data: any }>;
  aisData?: any;
  tisData?: any;
  form26asData?: any;
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
      style={{ display: value === index ? 'block' : 'none' }}
      id={`debug-tabpanel-${index}`}
      aria-labelledby={`debug-tab-${index}`}
      {...other}
    >
      <Box sx={{ pt: 2 }}>
        {children}
      </Box>
    </div>
  );
}

export default function DebugInfoSection({
  mode,
  combinedRawText,
  extractedData,
  form16List = [],
  aisData = null,
  tisData = null,
  form26asData = null,
  activeTab,
  onTabChange,
}: DebugInfoSectionProps) {
  const [localTabValue, setLocalTabValue] = useState(0);

  const isControlled = activeTab !== undefined && onTabChange !== undefined;
  const tabValue = isControlled ? activeTab : localTabValue;

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    if (isControlled) {
      onTabChange(newValue);
    } else {
      setLocalTabValue(newValue);
    }
  };

  const renderJsonBlock = (data: any, emptyMessage: string, color: string) => {
    if (!data) {
      return (
        <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic', p: 2 }}>
          {emptyMessage}
        </Typography>
      );
    }

    return (
      <Paper
        variant="outlined"
        sx={{
          p: 1.5,
          bgcolor: mode === 'dark' ? 'grey.950' : 'grey.900',
          color: color,
          borderRadius: 1.5,
          maxHeight: 450,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          <pre style={{ margin: 0, whiteSpace: 'pre', fontSize: '11px', fontFamily: 'monospace' }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </Box>
      </Paper>
    );
  };

  return (
    <Box sx={{ mt: 1, pb: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', fontWeight: 'bold' }}>
        <BugReportIcon sx={{ fontSize: 18 }} /> Debug Information & Raw Extracted Documents
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="debug document tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Reconciled Data" id="debug-tab-0" aria-controls="debug-tabpanel-0" />
          <Tab label="Form-16 Data" id="debug-tab-1" aria-controls="debug-tabpanel-1" />
          <Tab label="AIS Data" id="debug-tab-2" aria-controls="debug-tabpanel-2" />
          <Tab label="TIS Data" id="debug-tab-3" aria-controls="debug-tabpanel-3" />
          <Tab label="Form 26AS Data" id="debug-tab-4" aria-controls="debug-tabpanel-4" />
          <Tab label="Raw PDF Text" id="debug-tab-5" aria-controls="debug-tabpanel-5" />
        </Tabs>
      </Box>

      {/* Reconciled Data Panel */}
      <CustomTabPanel value={tabValue} index={0}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
            <CodeIcon sx={{ fontSize: 14 }} /> Engine Reconciliation Result (Protobuf)
          </Typography>
          {renderJsonBlock(extractedData, 'No reconciled engine data available.', '#60a5fa')}
        </Box>
      </CustomTabPanel>

      {/* Form-16 Data Panel */}
      <CustomTabPanel value={tabValue} index={1}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {form16List.length === 0 ? (
            <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic', p: 2 }}>
              No Form-16 certificates uploaded.
            </Typography>
          ) : (
            form16List.map((item, idx) => (
              <Box key={idx} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                  Certificate #{idx + 1}: {item.file?.name || 'Form-16 PDF'}
                </Typography>
                {renderJsonBlock(item.data, 'No parsed data for this certificate.', '#f472b6')}
              </Box>
            ))
          )}
        </Box>
      </CustomTabPanel>

      {/* AIS Data Panel */}
      <CustomTabPanel value={tabValue} index={2}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
            <CodeIcon sx={{ fontSize: 14 }} /> Annual Information Statement (AIS) Proto
          </Typography>
          {renderJsonBlock(aisData, 'No AIS document uploaded yet.', '#fbbf24')}
        </Box>
      </CustomTabPanel>

      {/* TIS Data Panel */}
      <CustomTabPanel value={tabValue} index={3}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
            <CodeIcon sx={{ fontSize: 14 }} /> Taxpayer Information Summary (TIS) Proto
          </Typography>
          {renderJsonBlock(tisData, 'No TIS document uploaded yet.', '#34d399')}
        </Box>
      </CustomTabPanel>

      {/* Form 26AS Data Panel */}
      <CustomTabPanel value={tabValue} index={4}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
            <CodeIcon sx={{ fontSize: 14 }} /> Form 26AS Tax Credit Proto
          </Typography>
          {renderJsonBlock(form26asData, 'No Form 26AS document uploaded yet.', '#a78bfa')}
        </Box>
      </CustomTabPanel>

      {/* Raw Extracted Text Panel */}
      <CustomTabPanel value={tabValue} index={5}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
            <CodeIcon sx={{ fontSize: 14 }} /> All Raw Extracted PDF Text
          </Typography>
          <Paper
            variant="outlined"
            sx={{
              p: 1.5,
              bgcolor: mode === 'dark' ? 'grey.950' : 'grey.900',
              color: '#10b981',
              borderRadius: 1.5,
              maxHeight: 450,
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '11px', fontFamily: 'monospace' }}>
                {combinedRawText || 'No raw text extracted yet.'}
              </pre>
            </Box>
          </Paper>
        </Box>
      </CustomTabPanel>
    </Box>
  );
}
