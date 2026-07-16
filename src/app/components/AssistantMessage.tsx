import React, { useMemo } from 'react';
import { Box, Card, CardContent, Typography, Alert, AlertTitle, Button } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { getForm16Differences } from './FormDifferences';
import { parseMarkdown } from './MarkdownUtils';
import { ensureForm16Data } from './FieldCues';

interface AssistantMessageProps {
  content: string;
  msgIdx: number;
  acceptedMessages: Record<number, boolean>;
  rejectedMessages: Record<number, boolean>;
  onAccept: (msgIdx: number, data: any) => void;
  onReject: (msgIdx: number) => void;
  onUndo?: (msgIdx: number) => void;
  currentData?: any;
}

export function AssistantMessage({
  content,
  msgIdx,
  acceptedMessages,
  rejectedMessages,
  onAccept,
  onReject,
  onUndo,
  currentData,
}: AssistantMessageProps) {
  const parsed = useMemo(() => {
    const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
    const match = content.match(jsonRegex);
    if (match) {
      try {
        const json = JSON.parse(match[1].trim());
        const textOutside = content.replace(jsonRegex, '').trim();
        return { json, textOutside };
      } catch (e) {
        // failed parsing
      }
    }
    return { json: null, textOutside: content };
  }, [content]);

  const isAccepted = acceptedMessages[msgIdx];
  const isRejected = rejectedMessages[msgIdx];

  const { json, textOutside } = parsed;
  const recommendations = json && Array.isArray(json.recommendations) ? json.recommendations : [];
  const updatedData = json ? json.updatedForm16Data : null;

  const diffs = useMemo(() => {
    return getForm16Differences(ensureForm16Data(currentData), updatedData);
  }, [currentData, updatedData]);

  const { profileDiffs, incomeDiffs } = useMemo(() => {
    const profile: any[] = [];
    const income: any[] = [];
    diffs.forEach(diff => {
      const p = diff.path;
      if (p.startsWith('employer') || p.startsWith('employee') || p.startsWith('assessmentYear') || p.startsWith('period')) {
        profile.push(diff);
      } else {
        income.push(diff);
      }
    });
    return { profileDiffs: profile, incomeDiffs: income };
  }, [diffs]);

  if (!parsed.json) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {parseMarkdown(content)}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {textOutside && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {parseMarkdown(textOutside)}
        </Box>
      )}

      {/* Recommendations Cards */}
      {recommendations.map((rec: any, rIdx: number) => {
        let severity: 'error' | 'warning' | 'info' | 'success' = 'info';
        if (rec.type === 'error') severity = 'error';
        else if (rec.type === 'warning') severity = 'warning';
        else if (rec.type === 'info') severity = 'info';

        return (
          <Alert key={rIdx} severity={severity} variant="outlined" sx={{ borderRadius: 1.5, py: 0.5 }}>
            <AlertTitle sx={{ fontWeight: 'bold', fontSize: '0.8rem', m: 0 }}>
              {rec.field ? `Field: ${rec.field}` : 'Recommendation'}
            </AlertTitle>
            <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 500 }}>
              {rec.message}
            </Typography>
            {rec.suggestion && (
              <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary', fontStyle: 'italic' }}>
                Suggestion: {rec.suggestion}
              </Typography>
            )}
          </Alert>
        );
      })}

      {/* Proposed Updated Data Action Card */}
      {updatedData && (diffs.length > 0 || isAccepted || isRejected) && (
        <Card variant="outlined" sx={{ bgcolor: 'action.hover', borderStyle: 'dashed' }}>
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
              <SmartToyIcon sx={{ fontSize: 16 }} /> AI Suggested Updates
            </Typography>
            <Typography variant="body2" sx={{ my: 1, fontSize: '0.775rem' }}>
              The AI assistant has detected discrepancies and proposed corrections to your tax details. Would you like to override your existing form details with these suggested corrections?
            </Typography>

            {/* List of differences */}
            <Box sx={{ mt: 1.5, mb: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', fontSize: '0.725rem' }}>
                Proposed Changes:
              </Typography>

              {profileDiffs.length > 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'primary.main', fontSize: '0.7rem', display: 'block', mb: 0.5 }}>
                    Profile Info (Name, Address)
                  </Typography>
                  {profileDiffs.map((diff, dIdx) => (
                    <Box key={dIdx} sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.5, pl: 1, borderLeft: '2px solid', borderColor: 'primary.light', py: 0.1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.725rem', mr: 0.5 }}>
                        {diff.label}:
                      </Typography>
                      <Typography variant="caption" sx={{ textDecoration: 'line-through', color: 'text.secondary', fontSize: '0.7rem' }}>
                        {diff.oldVal !== undefined && diff.oldVal !== null && diff.oldVal !== '' ? String(diff.oldVal) : '(empty)'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                        →
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 'bold', fontSize: '0.725rem' }}>
                        {diff.newVal !== undefined && diff.newVal !== null && diff.newVal !== '' ? String(diff.newVal) : '(empty)'}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}

              {incomeDiffs.length > 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'primary.main', fontSize: '0.7rem', display: 'block', mb: 0.5 }}>
                    Income Details (Gross Total, Other Sources)
                  </Typography>
                  {incomeDiffs.map((diff, dIdx) => (
                    <Box key={dIdx} sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.5, pl: 1, borderLeft: '2px solid', borderColor: 'primary.light', py: 0.1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.725rem', mr: 0.5 }}>
                        {diff.label}:
                      </Typography>
                      <Typography variant="caption" sx={{ textDecoration: 'line-through', color: 'text.secondary', fontSize: '0.7rem' }}>
                        {diff.oldVal !== undefined && diff.oldVal !== null && diff.oldVal !== '' ? String(diff.oldVal) : '(empty)'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                        →
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 'bold', fontSize: '0.725rem' }}>
                        {diff.newVal !== undefined && diff.newVal !== null && diff.newVal !== '' ? String(diff.newVal) : '(empty)'}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>

            {!isAccepted && !isRejected ? (
              <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  onClick={() => onAccept(msgIdx, updatedData)}
                >
                  Accept & Apply
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  onClick={() => onReject(msgIdx)}
                >
                  Reject
                </Button>
              </Box>
            ) : isAccepted ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, mt: 1.5 }}>
                <Alert severity="success" variant="filled" sx={{ py: 0.5, px: 1, borderRadius: 1, flexGrow: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 'bold' }}>Applied Successfully!</Typography>
                </Alert>
                <Button
                  size="small"
                  variant="outlined"
                  color="warning"
                  onClick={() => onUndo?.(msgIdx)}
                >
                  Undo
                </Button>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, mt: 1.5 }}>
                <Typography variant="caption" color="error" sx={{ fontWeight: 'bold' }}>
                  Updates Rejected
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  color="warning"
                  onClick={() => onUndo?.(msgIdx)}
                >
                  Undo
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
