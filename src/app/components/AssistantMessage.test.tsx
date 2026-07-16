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
    { "type": "error", "field": "salary.grossSalary", "message": "Gross salary is wrong.", "suggestion": "Fix standard deduction" }
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

    expect(screen.getByText(/Some intro text here/)).toBeDefined();
    expect(screen.getByText('Field: salary.grossSalary')).toBeDefined();
    expect(screen.getByText('Gross salary is wrong.')).toBeDefined();

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
});
