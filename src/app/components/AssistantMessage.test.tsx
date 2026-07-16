import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { expect, test, vi, describe } from 'vitest';
import { AssistantMessage } from './AssistantMessage';

describe('AssistantMessage Unit Tests', () => {
  test('renders raw text if no JSON code block is present', () => {
    render(
      <AssistantMessage
        content="Hello, I am your tax assistant."
        msgIdx={1}
        acceptedMessages={{}}
        rejectedMessages={{}}
        onAccept={vi.fn()}
        onReject={vi.fn()}
        currentData={null}
      />
    );
    expect(screen.getByText('Hello, I am your tax assistant.')).toBeDefined();
  });

  test('renders recommendations and proposal card correctly with Accept action', () => {
    const onAcceptSpy = vi.fn();
    const onRejectSpy = vi.fn();

    const content = `Some intro text here.
\`\`\`json
{
  "recommendations": [
    { "type": "error", "field": "salary.grossSalary", "message": "Gross salary is wrong.", "suggestion": "Fix standard deduction" },
    { "type": "warning", "field": "deductions80C", "message": "Exceeded 80C limit.", "suggestion": "Keep to 1.5L" },
    { "type": "info", "field": "deductions80D", "message": "Good investment.", "suggestion": "Claim it" },
    { "type": "other", "field": "", "message": "No type spec.", "suggestion": "" }
  ],
  "updatedForm16Data": {
    "employee": { "pan": "ABCDE1234F" }
  }
}
\`\`\`
Some outro text.`;

    render(
      <AssistantMessage
        content={content}
        msgIdx={1}
        acceptedMessages={{}}
        rejectedMessages={{}}
        onAccept={onAcceptSpy}
        onReject={onRejectSpy}
        currentData={null}
      />
    );

    // Text outside should be rendered
    expect(screen.getByText(/Some intro text here/)).toBeDefined();

    // Recommendations rendered as alerts
    expect(screen.getByText('Field: salary.grossSalary')).toBeDefined();
    expect(screen.getByText('Gross salary is wrong.')).toBeDefined();
    expect(screen.getByText('Suggestion: Fix standard deduction')).toBeDefined();

    expect(screen.getByText('Field: deductions80C')).toBeDefined();
    expect(screen.getByText('Exceeded 80C limit.')).toBeDefined();

    // AI suggestions proposal card is visible
    expect(screen.getByText('AI Suggested Updates')).toBeDefined();

    const acceptBtn = screen.getByText('Accept & Apply');
    fireEvent.click(acceptBtn);
    expect(onAcceptSpy).toHaveBeenCalledWith(1, { employee: { pan: 'ABCDE1234F' } });
  });

  test('calls onReject when Reject button is clicked', () => {
    const onRejectSpy = vi.fn();
    const content = `\`\`\`json
{
  "updatedForm16Data": { "employee": { "pan": "ABCDE1234F" } }
}
\`\`\``;

    render(
      <AssistantMessage
        content={content}
        msgIdx={2}
        acceptedMessages={{}}
        rejectedMessages={{}}
        onAccept={vi.fn()}
        onReject={onRejectSpy}
        currentData={null}
      />
    );

    const rejectBtn = screen.getByText('Reject');
    fireEvent.click(rejectBtn);
    expect(onRejectSpy).toHaveBeenCalledWith(2);
  });

  test('displays accepted status correctly', () => {
    const content = `\`\`\`json
{
  "updatedForm16Data": { "employee": { "pan": "ABCDE1234F" } }
}
\`\`\``;

    render(
      <AssistantMessage
        content={content}
        msgIdx={3}
        acceptedMessages={{ 3: true }}
        rejectedMessages={{}}
        onAccept={vi.fn()}
        onReject={vi.fn()}
        currentData={null}
      />
    );

    expect(screen.getByText('Applied Successfully!')).toBeDefined();
    expect(screen.queryByText('Accept & Apply')).toBeNull();
  });

  test('displays rejected status correctly', () => {
    const content = `\`\`\`json
{
  "updatedForm16Data": { "employee": { "pan": "ABCDE1234F" } }
}
\`\`\``;

    render(
      <AssistantMessage
        content={content}
        msgIdx={4}
        acceptedMessages={{}}
        rejectedMessages={{ 4: true }}
        onAccept={vi.fn()}
        onReject={vi.fn()}
        currentData={null}
      />
    );

    expect(screen.getByText('Updates Rejected')).toBeDefined();
    expect(screen.queryByText('Accept & Apply')).toBeNull();
  });

  test('handles malformed JSON inside code block gracefully', () => {
    const malformedContent = `Some conversational intro.
\`\`\`json
{
  "recommendations": [
    { "type": "error"
  ]
}
\`\`\``;

    render(
      <AssistantMessage
        content={malformedContent}
        msgIdx={5}
        acceptedMessages={{}}
        rejectedMessages={{}}
        onAccept={vi.fn()}
        onReject={vi.fn()}
        currentData={null}
      />
    );

    // It should fallback to rendering raw content
    expect(screen.getByText(/Some conversational intro/)).toBeDefined();
  });

  test('correctly renders markdown elements using parseMarkdown and renderInlineMarkdown', () => {
    const markdownContent = `# Header 1\n## Header 2\n* Bullet item\n1. Ordered item\n> Blockquote text\nSome **bold** and *italic* and \`inline code\` and a [link](https://example.com) here.`;

    render(
      <AssistantMessage
        content={markdownContent}
        msgIdx={10}
        acceptedMessages={{}}
        rejectedMessages={{}}
        onAccept={vi.fn()}
        onReject={vi.fn()}
        currentData={null}
      />
    );

    // Verify headers
    expect(screen.getByText('Header 1')).toBeDefined();
    expect(screen.getByText('Header 2')).toBeDefined();

    // Verify list items
    expect(screen.getByText('Bullet item')).toBeDefined();
    expect(screen.getByText('Ordered item')).toBeDefined();

    // Verify blockquote
    expect(screen.getByText('Blockquote text')).toBeDefined();

    // Verify inline markdown content exists
    expect(screen.getByText('bold')).toBeDefined();
    expect(screen.getByText('italic')).toBeDefined();
    expect(screen.getByText('inline code')).toBeDefined();
    expect(screen.getByText('link')).toBeDefined();
    expect((screen.getByText('link') as HTMLAnchorElement).href).toBe('https://example.com/');
  });
});
