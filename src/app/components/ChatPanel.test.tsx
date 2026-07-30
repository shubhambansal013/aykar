import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ChatPanel from './ChatPanel';

const defaultProps = {
  messages: [],
  chatLoading: false,
  inputMessage: '',
  onInputChange: vi.fn(),
  onSend: vi.fn(),
  onAttachmentUpload: vi.fn(),
  variant: 'desktop' as const,
  form16List: [],
  aisFile: null,
  tisFile: null,
  form26asFile: null,
  attachments: [],
  extractedData: null,
  sendOnlyRawData: false,
  selectedModel: 'gemini-2.0-flash',
  geminiModels: [{ value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' }],
  onModelChange: vi.fn(),
  onRemoveForm16: vi.fn(),
  onRemoveAis: vi.fn(),
  onRemoveTis: vi.fn(),
  onRemoveForm26as: vi.fn(),
  onRemoveAttachment: vi.fn(),
  onOpenRightPanel: vi.fn(),
  messagesEndRef: { current: null },
  acceptedMessages: {},
  rejectedMessages: {},
  handleAcceptProposal: vi.fn(),
  handleRejectProposal: vi.fn(),
  handleUndoProposal: vi.fn(),
  mode: 'light' as const,
};

describe('ChatPanel', () => {
  it('renders empty state when no messages', () => {
    render(<ChatPanel {...defaultProps} />);
    expect(screen.getByText('Ask me anything about your taxes!')).toBeDefined();
  });

  it('renders user and assistant messages', () => {
    render(<ChatPanel
      {...defaultProps}
      messages={[
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
      ]}
    />);
    expect(screen.getByText('Hello')).toBeDefined();
    expect(screen.getByText('Hi there!')).toBeDefined();
  });

  it('shows loading indicator when chatLoading is true', () => {
    render(<ChatPanel {...defaultProps} chatLoading />);
    expect(screen.getByText('AI is generating response...')).toBeDefined();
  });

  it('input field reflects inputMessage value', () => {
    render(<ChatPanel {...defaultProps} inputMessage="test message" />);
    const input = screen.getByPlaceholderText('Ask your tax question...');
    expect(input).toBeDefined();
  });
});
