import React from 'react';
import { render, screen } from '@testing-library/react';
import { expect, test, describe } from 'vitest';
import { renderInlineMarkdown, parseMarkdown } from './MarkdownUtils';

describe('MarkdownUtils Unit Tests', () => {
  test('renderInlineMarkdown handles plain text', () => {
    render(<>{renderInlineMarkdown('Hello World')}</>);
    expect(screen.getByText('Hello World')).toBeDefined();
  });

  test('renderInlineMarkdown handles bold, italic, code, and links', () => {
    const text = 'This is **bold** and *italic* and `code` and a [link](https://test.com).';
    render(<>{renderInlineMarkdown(text)}</>);
    expect(screen.getByText('bold')).toBeDefined();
    expect(screen.getByText('italic')).toBeDefined();
    expect(screen.getByText('code')).toBeDefined();

    const link = screen.getByText('link') as HTMLAnchorElement;
    expect(link).toBeDefined();
    expect(link.href).toBe('https://test.com/');
  });

  test('parseMarkdown handles headers, blockquotes, lists, and horizontal rules', () => {
    const markdown = `# Header 1\n## Header 2\n> Blockquote\n* Item 1\n1. First ordered\n---\nNormal text.`;
    render(<>{parseMarkdown(markdown)}</>);
    expect(screen.getByText('Header 1')).toBeDefined();
    expect(screen.getByText('Header 2')).toBeDefined();
    expect(screen.getByText('Blockquote')).toBeDefined();
    expect(screen.getByText('Item 1')).toBeDefined();
    expect(screen.getByText('First ordered')).toBeDefined();
    expect(screen.getByText('Normal text.')).toBeDefined();
  });

  test('parseMarkdown handles code blocks', () => {
    const markdown = '```json\n{"key": "value"}\n```';
    render(<>{parseMarkdown(markdown)}</>);
    expect(screen.getByText(/json/i)).toBeDefined();
    expect(screen.getByText('{"key": "value"}')).toBeDefined();
  });
});
