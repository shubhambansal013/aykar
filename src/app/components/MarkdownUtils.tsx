import React from 'react';
import { Box, Typography, Divider, Paper } from '@mui/material';

export function renderInlineMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remainingText = text;
  let keyIdx = 0;

  while (remainingText.length > 0) {
    const boldIdx = remainingText.indexOf('**');
    const italicIdx = remainingText.indexOf('*');
    const codeIdx = remainingText.indexOf('`');
    const linkIdx = remainingText.indexOf('[');

    const indices = [
      { type: 'bold', index: boldIdx },
      { type: 'italic', index: italicIdx },
      { type: 'code', index: codeIdx },
      { type: 'link', index: linkIdx },
    ].filter(x => x.index !== -1);

    if (indices.length === 0) {
      parts.push(<React.Fragment key={`text-${keyIdx++}`}>{remainingText}</React.Fragment>);
      break;
    }

    indices.sort((a, b) => a.index - b.index);
    const first = indices[0];

    if (first.index > 0) {
      parts.push(<React.Fragment key={`text-${keyIdx++}`}>{remainingText.slice(0, first.index)}</React.Fragment>);
      remainingText = remainingText.slice(first.index);
    }

    if (first.type === 'bold') {
      const nextBold = remainingText.indexOf('**', 2);
      if (nextBold !== -1) {
        const content = remainingText.slice(2, nextBold);
        parts.push(<strong key={`bold-${keyIdx++}`} style={{ fontWeight: 'bold' }}>{content}</strong>);
        remainingText = remainingText.slice(nextBold + 2);
      } else {
        parts.push(<React.Fragment key={`text-${keyIdx++}`}>**</React.Fragment>);
        remainingText = remainingText.slice(2);
      }
    } else if (first.type === 'italic') {
      const nextItalic = remainingText.indexOf('*', 1);
      if (nextItalic !== -1) {
        const content = remainingText.slice(1, nextItalic);
        parts.push(<em key={`italic-${keyIdx++}`} style={{ fontStyle: 'italic' }}>{content}</em>);
        remainingText = remainingText.slice(nextItalic + 1);
      } else {
        parts.push(<React.Fragment key={`text-${keyIdx++}`}>*</React.Fragment>);
        remainingText = remainingText.slice(1);
      }
    } else if (first.type === 'code') {
      const nextCode = remainingText.indexOf('`', 1);
      if (nextCode !== -1) {
        const content = remainingText.slice(1, nextCode);
        parts.push(
          <code
            key={`code-${keyIdx++}`}
            style={{
              fontFamily: 'monospace',
              backgroundColor: 'rgba(128, 128, 128, 0.15)',
              padding: '2px 4px',
              borderRadius: '3px',
              fontSize: '0.75rem',
            }}
          >
            {content}
          </code>
        );
        remainingText = remainingText.slice(nextCode + 1);
      } else {
        parts.push(<React.Fragment key={`text-${keyIdx++}`}>`</React.Fragment>);
        remainingText = remainingText.slice(1);
      }
    } else if (first.type === 'link') {
      const closeBracket = remainingText.indexOf(']');
      if (closeBracket !== -1) {
        const openParen = remainingText.indexOf('(', closeBracket);
        const closeParen = remainingText.indexOf(')', closeBracket);
        if (openParen === closeBracket + 1 && closeParen !== -1) {
          const label = remainingText.slice(1, closeBracket);
          const url = remainingText.slice(openParen + 1, closeParen);
          parts.push(
            <a
              key={`link-${keyIdx++}`}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#0284c7', textDecoration: 'underline' }}
            >
              {label}
            </a>
          );
          remainingText = remainingText.slice(closeParen + 1);
          continue;
        }
      }
      parts.push(<React.Fragment key={`text-${keyIdx++}`}>[</React.Fragment>);
      remainingText = remainingText.slice(1);
    }
  }

  return <>{parts}</>;
}

export function parseMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  let inCodeBlock = false;
  let codeBlockLanguage = '';
  let codeBlockLines: string[] = [];

  let currentList: { type: 'bullet' | 'ordered'; items: string[] } | null = null;

  const flushList = (key: string) => {
    if (!currentList) return;
    if (currentList.type === 'bullet') {
      elements.push(
        <Box component="ul" key={key} sx={{ pl: 2.5, my: 1, display: 'flex', flexDirection: 'column', gap: 0.5, listStyleType: 'disc' }}>
          {currentList.items.map((item, idx) => (
            <Box component="li" key={idx} sx={{ fontSize: '0.825rem', lineHeight: 1.4 }}>
              {renderInlineMarkdown(item)}
            </Box>
          ))}
        </Box>
      );
    } else {
      elements.push(
        <Box component="ol" key={key} sx={{ pl: 2.5, my: 1, display: 'flex', flexDirection: 'column', gap: 0.5, listStyleType: 'decimal' }}>
          {currentList.items.map((item, idx) => (
            <Box component="li" key={idx} sx={{ fontSize: '0.825rem', lineHeight: 1.4 }}>
              {renderInlineMarkdown(item)}
            </Box>
          ))}
        </Box>
      );
    }
    currentList = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        const codeText = codeBlockLines.join('\n');
        elements.push(
          <Paper
            variant="outlined"
            key={`code-${i}`}
            sx={{
              p: 1.25,
              my: 1,
              bgcolor: 'grey.950',
              color: '#38bdf8',
              borderRadius: 1.5,
              overflowX: 'auto',
              border: '1px solid',
              borderColor: 'grey.800',
            }}
          >
            {codeBlockLanguage && (
              <Box sx={{ fontSize: '10px', color: 'grey.500', pb: 0.5, borderBottom: '1px solid', borderColor: 'grey.900', mb: 1, fontFamily: 'monospace', textTransform: 'uppercase', fontWeight: 'bold' }}>
                {codeBlockLanguage}
              </Box>
            )}
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '11px', fontFamily: 'monospace' }}>
              <code>{codeText}</code>
            </pre>
          </Paper>
        );
        inCodeBlock = false;
        codeBlockLines = [];
        codeBlockLanguage = '';
      } else {
        inCodeBlock = true;
        codeBlockLanguage = line.trim().slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    const bulletMatch = line.match(/^(\s*)[*+-]\s+(.*)$/);
    const orderedMatch = line.match(/^(\s*)\d+\.\s+(.*)$/);

    if (bulletMatch) {
      if (currentList && currentList.type !== 'bullet') {
        flushList(`list-flush-${i}`);
      }
      if (!currentList) {
        currentList = { type: 'bullet', items: [] };
      }
      currentList.items.push(bulletMatch[2]);
      continue;
    } else if (orderedMatch) {
      if (currentList && currentList.type !== 'ordered') {
        flushList(`list-flush-${i}`);
      }
      if (!currentList) {
        currentList = { type: 'ordered', items: [] };
      }
      currentList.items.push(orderedMatch[2]);
      continue;
    } else {
      if (currentList) {
        flushList(`list-flush-${i}`);
      }
    }

    const headerMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const text = headerMatch[2];
      let fontSize = '1rem';
      let mt = 1.5;
      let mb = 0.5;

      if (level === 1) {
        fontSize = '1.15rem';
        mt = 2;
      } else if (level === 2) {
        fontSize = '1.05rem';
        mt = 1.75;
      } else if (level === 3) {
        fontSize = '0.95rem';
        mt = 1.5;
      } else {
        fontSize = '0.875rem';
        mt = 1.25;
      }

      elements.push(
        <Typography
          key={`header-${i}`}
          sx={{
            fontSize,
            fontWeight: 'bold',
            mt,
            mb,
            lineHeight: 1.2,
            borderBottom: level <= 2 ? '1px solid' : 'none',
            borderColor: 'divider',
            pb: level <= 2 ? 0.5 : 0,
            color: 'primary.main',
          }}
        >
          {renderInlineMarkdown(text)}
        </Typography>
      );
      continue;
    }

    if (line.startsWith('>')) {
      const text = line.slice(1).trim();
      elements.push(
        <Box
          key={`blockquote-${i}`}
          sx={{
            pl: 1.5,
            borderLeft: '3px solid',
            borderColor: 'primary.light',
            my: 1,
            color: 'text.secondary',
            fontStyle: 'italic',
          }}
        >
          <Typography variant="body2" sx={{ fontSize: '0.825rem', lineHeight: 1.4 }}>
            {renderInlineMarkdown(text)}
          </Typography>
        </Box>
      );
      continue;
    }

    if (line.trim() === '---' || line.trim() === '***') {
      elements.push(<Divider key={`hr-${i}`} sx={{ my: 1.5 }} />);
      continue;
    }

    if (line.trim() !== '') {
      elements.push(
        <Typography
          key={`p-${i}`}
          variant="body2"
          sx={{
            my: 0.75,
            fontSize: '0.825rem',
            lineHeight: 1.45,
            whiteSpace: 'pre-wrap',
          }}
        >
          {renderInlineMarkdown(line)}
        </Typography>
      );
    }
  }

  if (currentList) {
    flushList(`list-flush-end`);
  }

  return elements;
}
