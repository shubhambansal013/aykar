import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  CircularProgress,
  Paper,
  Grid,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface BadgeFile {
  file: File;
  rawText: string;
  data: any;
}

interface DocumentUploadProps {
  form16List: BadgeFile[];
  aisFile: File | null;
  tisFile: File | null;
  form26asFile: File | null;
  aisLoading: boolean;
  tisLoading: boolean;
  form26asLoading: boolean;
  loading: boolean;
  isUploadCollapsed: boolean;
  showUploadArea: boolean;
  mode: 'light' | 'dark';
  readyDocsCount: number;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAISUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTISUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onForm26ASUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleShowUploadArea: () => void;
  onCollapseUpload: () => void;
  onRemoveForm16: (idx: number) => void;
  onOpenRightPanel: (tab: 'chat' | 'inspect', docIdx: number) => void;
}

export default function DocumentUpload({
  form16List,
  aisFile,
  tisFile,
  form26asFile,
  aisLoading,
  tisLoading,
  form26asLoading,
  loading,
  isUploadCollapsed,
  mode,
  readyDocsCount,
  onFileUpload,
  onAISUpload,
  onTISUpload,
  onForm26ASUpload,
  onToggleShowUploadArea,
  onCollapseUpload,
  onRemoveForm16,
  onOpenRightPanel,
}: DocumentUploadProps) {
  const hasUploadedDocs = form16List.length > 0 || !!aisFile || !!tisFile || !!form26asFile;

  return (
    <>
      {isUploadCollapsed && (
        <Paper variant="outlined" sx={{ p: 1.5, mb: 2, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, bgcolor: mode === 'dark' ? 'rgba(46, 125, 50, 0.05)' : 'rgba(46, 125, 50, 0.02)', borderColor: 'success.light' }} data-testid="compact-upload-status">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <CheckCircleIcon color="success" sx={{ fontSize: 20 }} />
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              Compact Upload Status: {readyDocsCount}/4 Docs Ready
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
              {form16List.length > 0 && (
                <Paper
                  variant="outlined"
                  onClick={() => onOpenRightPanel('inspect', 0)}
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
                  onClick={() => onOpenRightPanel('inspect', 1)}
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
                  onClick={() => onOpenRightPanel('inspect', 2)}
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
                  onClick={() => onOpenRightPanel('inspect', 3)}
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
            onClick={onToggleShowUploadArea}
            data-testid="manage-files-btn"
            sx={{ textTransform: 'none', fontWeight: 'bold' }}
          >
            Manage Files
          </Button>
        </Paper>
      )}

      <Box sx={{ display: isUploadCollapsed ? 'none' : 'block' }}>
        <Card variant="outlined" sx={{ mb: 2 }}>
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
                  onClick={onCollapseUpload}
                  sx={{ textTransform: 'none', fontWeight: 'bold' }}
                  data-testid="collapse-upload-btn"
                >
                  Collapse
                </Button>
              )}
            </Box>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Box sx={{ border: '1px dashed', borderColor: 'primary.main', borderRadius: 1.5, p: 2, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', bgcolor: mode === 'dark' ? 'rgba(56, 189, 248, 0.02)' : 'rgba(2, 132, 199, 0.02)' }}>
                  <Typography id="file-upload-label" variant="subtitle2" component="label" htmlFor="file-upload" sx={{ cursor: 'pointer', fontWeight: 'bold', display: 'block', mb: 1 }}>
                    1. Upload Form-16 PDF
                  </Typography>
                  <input id="file-upload" type="file" accept=".pdf" multiple onChange={onFileUpload} style={{ display: 'none' }} aria-labelledby="file-upload-label" />
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
                            <IconButton size="small" onClick={(evt) => { evt.preventDefault(); onRemoveForm16(idx); }} aria-label={`delete form16 file ${idx}`} sx={{ p: 0.25 }}>
                              <CloseIcon sx={{ fontSize: 12 }} />
                            </IconButton>
                          </Box>
                        ))}
                      </Box>
                      <Button
                        variant="text"
                        size="small"
                        onClick={() => onOpenRightPanel('inspect', 0)}
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

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Box sx={{ border: '1px dashed', borderColor: 'primary.main', borderRadius: 1.5, p: 2, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', bgcolor: mode === 'dark' ? 'rgba(56, 189, 248, 0.02)' : 'rgba(2, 132, 199, 0.02)' }}>
                  <Typography id="ais-label" variant="subtitle2" component="label" htmlFor="ais-upload" sx={{ cursor: 'pointer', fontWeight: 'bold', display: 'block', mb: 1 }}>
                    AIS PDF (Annual Info)
                  </Typography>
                  <input id="ais-upload" type="file" accept=".pdf" onChange={onAISUpload} style={{ display: 'none' }} aria-labelledby="ais-label" />
                  <Button component="label" htmlFor="ais-upload" variant="outlined" size="small" startIcon={<CloudUploadIcon />} sx={{ mt: 'auto' }}>
                    {aisFile ? 'Uploaded' : 'Upload'}
                  </Button>
                  {aisFile && (
                    <>
                      <Typography variant="caption" sx={{ mt: 1, display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{aisFile.name}</Typography>
                      <Button
                        variant="text"
                        size="small"
                        onClick={() => onOpenRightPanel('inspect', 1)}
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

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Box sx={{ border: '1px dashed', borderColor: 'primary.main', borderRadius: 1.5, p: 2, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', bgcolor: mode === 'dark' ? 'rgba(56, 189, 248, 0.02)' : 'rgba(2, 132, 199, 0.02)' }}>
                  <Typography id="tis-label" variant="subtitle2" component="label" htmlFor="tis-upload" sx={{ cursor: 'pointer', fontWeight: 'bold', display: 'block', mb: 1 }}>
                    TIS PDF (Tax Summary)
                  </Typography>
                  <input id="tis-upload" type="file" accept=".pdf" onChange={onTISUpload} style={{ display: 'none' }} aria-labelledby="tis-label" />
                  <Button component="label" htmlFor="tis-upload" variant="outlined" size="small" startIcon={<CloudUploadIcon />} sx={{ mt: 'auto' }}>
                    {tisFile ? 'Uploaded' : 'Upload'}
                  </Button>
                  {tisFile && (
                    <>
                      <Typography variant="caption" sx={{ mt: 1, display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{tisFile.name}</Typography>
                      <Button
                        variant="text"
                        size="small"
                        onClick={() => onOpenRightPanel('inspect', 2)}
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

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Box sx={{ border: '1px dashed', borderColor: 'primary.main', borderRadius: 1.5, p: 2, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', bgcolor: mode === 'dark' ? 'rgba(56, 189, 248, 0.02)' : 'rgba(2, 132, 199, 0.02)' }}>
                  <Typography id="f26as-label" variant="subtitle2" component="label" htmlFor="f26as-upload" sx={{ cursor: 'pointer', fontWeight: 'bold', display: 'block', mb: 1 }}>
                    Form 26AS PDF (Tax Paid)
                  </Typography>
                  <input id="f26as-upload" type="file" accept=".pdf" onChange={onForm26ASUpload} style={{ display: 'none' }} aria-labelledby="f26as-label" />
                  <Button component="label" htmlFor="f26as-upload" variant="outlined" size="small" startIcon={<CloudUploadIcon />} sx={{ mt: 'auto' }}>
                    {form26asFile ? 'Uploaded' : 'Upload'}
                  </Button>
                  {form26asFile && (
                    <>
                      <Typography variant="caption" sx={{ mt: 1, display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{form26asFile.name}</Typography>
                      <Button
                        variant="text"
                        size="small"
                        onClick={() => onOpenRightPanel('inspect', 3)}
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
    </>
  );
}
