import React, { RefObject } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  IconButton,
  Tooltip,
  FormControl,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Divider,
  InputAdornment,
  Button,
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CodeIcon from '@mui/icons-material/Code';
import CloseIcon from '@mui/icons-material/Close';
import { AssistantMessage } from './AssistantMessage';

interface Attachment {
  name: string;
  mimeType: string;
  data: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  attachments?: Attachment[];
}

interface BadgeFile {
  file: File;
  rawText: string;
  data: any;
}

interface ChatPanelProps {
  messages: Message[];
  chatLoading: boolean;
  inputMessage: string;
  onInputChange: (val: string) => void;
  onSend: () => void;
  onAttachmentUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  variant: 'desktop' | 'mobile';
  form16List: BadgeFile[];
  aisFile: File | null;
  tisFile: File | null;
  form26asFile: File | null;
  attachments: Attachment[];
  extractedData: any;
  sendOnlyRawData: boolean;
  selectedModel: string;
  geminiModels: Array<{ value: string; label: string }>;
  onModelChange: (model: string) => void;
  onRemoveForm16: (idx: number) => void;
  onRemoveAis: () => void;
  onRemoveTis: () => void;
  onRemoveForm26as: () => void;
  onRemoveAttachment: (idx: number) => void;
  onOpenRightPanel: (tab: 'chat' | 'inspect', docIdx?: number) => void;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  acceptedMessages: Record<number, boolean>;
  rejectedMessages: Record<number, boolean>;
  handleAcceptProposal: (msgIdx: number, updatedData: any) => void;
  handleRejectProposal: (msgIdx: number) => void;
  handleUndoProposal: (msgIdx: number) => void;
  mode: 'light' | 'dark';
  attachingFile?: boolean;
  onSendOnlyRawDataChange?: (val: boolean) => void;
}

export default function ChatPanel({
  messages,
  chatLoading,
  inputMessage,
  onInputChange,
  onSend,
  onAttachmentUpload,
  variant,
  form16List,
  aisFile,
  tisFile,
  form26asFile,
  attachments,
  extractedData,
  sendOnlyRawData,
  selectedModel,
  geminiModels,
  onModelChange,
  onRemoveForm16,
  onRemoveAis,
  onRemoveTis,
  onRemoveForm26as,
  onRemoveAttachment,
  onOpenRightPanel,
  messagesEndRef,
  acceptedMessages,
  rejectedMessages,
  handleAcceptProposal,
  handleRejectProposal,
  handleUndoProposal,
  mode,
  attachingFile = false,
  onSendOnlyRawDataChange,
}: ChatPanelProps) {
  const isDesktop = variant === 'desktop';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0 }}>
      {isDesktop ? (
        <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SmartToyIcon color="primary" sx={{ fontSize: 18 }} />
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Chat Options</Typography>
            </Box>
            <FormControl size="small" variant="standard" sx={{ minWidth: 120 }}>
              <Select
                value={selectedModel}
                onChange={(e) => onModelChange(e.target.value)}
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
          {onSendOnlyRawDataChange && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={sendOnlyRawData}
                  onChange={(e) => onSendOnlyRawDataChange(e.target.checked)}
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
          )}
        </Box>
      ) : (
        <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
          <SmartToyIcon color="primary" sx={{ fontSize: 18 }} />
          <Typography variant="body2" sx={{ fontWeight: 'bold', flex: 1 }}>Chat</Typography>
          <FormControl size="small" variant="standard" sx={{ minWidth: 120 }}>
            <Select
              value={selectedModel}
              onChange={(e) => onModelChange(e.target.value)}
              sx={{ fontSize: '0.75rem', py: 0 }}
              aria-label="select gemini model"
            >
              {geminiModels.map((m) => (
                <MenuItem key={m.value} value={m.value} sx={{ fontSize: '0.75rem' }}>{m.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

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

      <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1, bgcolor: 'background.paper' }}>
        {isDesktop && (
          <>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {!sendOnlyRawData && extractedData && (
                <Button
                  variant="outlined"
                  color="primary"
                  size="small"
                  startIcon={<CodeIcon sx={{ fontSize: 12 }} />}
                  onClick={() => onOpenRightPanel('inspect', 0)}
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

              {form16List.map((item, idx) => (
                <Paper key={idx} variant="outlined" sx={{ pl: 0.75, pr: 0.25, py: 0.25, borderRadius: 1, display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: 'action.hover' }} data-testid={idx === 0 ? 'form16-badge' : `form16-badge-${idx}`}>
                  <AttachFileIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                  <Typography variant="caption" sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.7rem', fontWeight: 'bold' }}>
                    {item.file.name}
                  </Typography>
                  <IconButton size="small" onClick={() => onRemoveForm16(idx)} aria-label={idx === 0 ? 'remove form16 context' : `remove form16 context ${idx}`}>
                    <CloseIcon sx={{ fontSize: 12 }} />
                  </IconButton>
                </Paper>
              ))}

              {aisFile && (
                <Paper variant="outlined" sx={{ pl: 0.75, pr: 0.25, py: 0.25, borderRadius: 1, display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: 'action.hover' }} data-testid="ais-badge">
                  <AttachFileIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                  <Typography variant="caption" sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.7rem', fontWeight: 'bold' }}>
                    {aisFile.name}
                  </Typography>
                  <IconButton size="small" onClick={onRemoveAis} aria-label="remove ais context">
                    <CloseIcon sx={{ fontSize: 12 }} />
                  </IconButton>
                </Paper>
              )}

              {tisFile && (
                <Paper variant="outlined" sx={{ pl: 0.75, pr: 0.25, py: 0.25, borderRadius: 1, display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: 'action.hover' }} data-testid="tis-badge">
                  <AttachFileIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                  <Typography variant="caption" sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.7rem', fontWeight: 'bold' }}>
                    {tisFile.name}
                  </Typography>
                  <IconButton size="small" onClick={onRemoveTis} aria-label="remove tis context">
                    <CloseIcon sx={{ fontSize: 12 }} />
                  </IconButton>
                </Paper>
              )}

              {form26asFile && (
                <Paper variant="outlined" sx={{ pl: 0.75, pr: 0.25, py: 0.25, borderRadius: 1, display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: 'action.hover' }} data-testid="form26as-badge">
                  <AttachFileIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                  <Typography variant="caption" sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.7rem', fontWeight: 'bold' }}>
                    {form26asFile.name}
                  </Typography>
                  <IconButton size="small" onClick={onRemoveForm26as} aria-label="remove form26as context">
                    <CloseIcon sx={{ fontSize: 12 }} />
                  </IconButton>
                </Paper>
              )}

              {attachments.map((att, idx) => (
                <Paper key={idx} variant="outlined" sx={{ pl: 0.75, pr: 0.25, py: 0.25, borderRadius: 1, display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: 'action.hover' }}>
                  <AttachFileIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                  <Typography variant="caption" sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.7rem' }}>
                    {att.name}
                  </Typography>
                  <IconButton size="small" onClick={() => onRemoveAttachment(idx)} aria-label="remove attachment">
                    <CloseIcon sx={{ fontSize: 12 }} />
                  </IconButton>
                </Paper>
              ))}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <input id="chat-attachment-upload" type="file" onChange={onAttachmentUpload} style={{ display: 'none' }} />
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
                onChange={(e) => onInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onSend();
                  }
                }}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={onSend}
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
          </>
        )}

        {!isDesktop && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              fullWidth
              placeholder="Ask your tax question..."
              value={inputMessage}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSend();
              }}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={onSend} color="primary" disabled={chatLoading || (!inputMessage.trim() && attachments.length === 0)} aria-label="send message" size="small">
                        <SendIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }
              }}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
}
