import React from 'react';
import { Box, Typography, Grid, Paper } from '@mui/material';
import BugReportIcon from '@mui/icons-material/BugReport';
import CodeIcon from '@mui/icons-material/Code';

interface DebugInfoSectionProps {
  mode: 'light' | 'dark';
  combinedRawText: string;
  extractedData: any;
}

export default function DebugInfoSection({
  mode,
  combinedRawText,
  extractedData,
}: DebugInfoSectionProps) {
  return (
    <Box sx={{ mt: 4, pb: 4 }}>
      <Typography variant="subtitle1" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', fontWeight: 'bold' }}>
        <BugReportIcon sx={{ fontSize: 18 }} /> 3. Debug Information (For Verification)
      </Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 1.5, bgcolor: mode === 'dark' ? 'grey.950' : 'grey.900', color: '#10b981', borderRadius: 1.5, height: 280, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="subtitle2" sx={{ color: 'grey.400', pb: 0.5, mb: 1, borderBottom: '1px solid', borderColor: 'grey.800', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
              <CodeIcon sx={{ fontSize: 14 }} /> Raw Extracted Text
            </Typography>
            <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '10px', fontFamily: 'monospace' }}>
                {combinedRawText}
              </pre>
            </Box>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 1.5, bgcolor: mode === 'dark' ? 'grey.950' : 'grey.900', color: '#60a5fa', borderRadius: 1.5, height: 280, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="subtitle2" sx={{ color: 'grey.400', pb: 0.5, mb: 1, borderBottom: '1px solid', borderColor: 'grey.800', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
              <CodeIcon sx={{ fontSize: 14 }} /> Intermediate Form16Data Object
            </Typography>
            <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
              <pre style={{ margin: 0, whiteSpace: 'pre', fontSize: '10px', fontFamily: 'monospace' }}>
                {JSON.stringify(extractedData, null, 2)}
              </pre>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
