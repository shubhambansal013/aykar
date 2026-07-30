# Phase 1: Foundation — Extract Shared Components

## Objective

Extract duplicated UI patterns into shared components so that Phase 2 and
Phase 3 can work with clean imports rather than copy-pasted code. This phase
is pure extraction — no behavioral changes, no layout changes, no color
changes. Every new component must have tests.

## Dependencies

- None (this is the foundational phase).

## Responsibilities

What this phase owns:

1. **LineRow + SectionTitle** — Currently duplicated verbatim in
   `IncomeDetails.tsx` (lines 26-72 and 74-91) and `TaxComputation.tsx`
   (lines 26-74 and 76-93). Extract into a single `LineRow` component
   in `src/app/components/LineRow.tsx`. Both files import from it.

2. **ChatPanel** — The chat UI appears twice in `page.tsx`:
   - Desktop: lines 1491-1751 (the right-panel chat when `rightPanelTab === 'chat'`)
   - Mobile dialog: lines 1813-1911 (the dialog chat when `rightPanelTab === 'chat'`)
   These are ~90% identical. Extract into a single `ChatPanel` component
   that accepts the mobile/desktop context as props.

3. **DocumentUpload** — The upload grid (4 boxes for Form-16/AIS/TIS/26AS,
   lines 1013-1138) plus the compact upload status bar (lines 873-1011) are
   a self-contained feature. Extract into `src/app/components/DocumentUpload.tsx`.
   The component handles file state via callbacks (onUpload, onRemove).

4. **Tests** — Every new component gets a test file alongside it.

What this phase does **not** touch:
- No layout changes to page.tsx beyond replacing code blocks with component imports
- No color or style changes to any component
- No changes to IncomeDetails, TaxComputation, or any existing component's behavior
- No changes to the upload logic itself (handlers stay in page.tsx)
- No removal of the Taxpayer Summary Card or any section reordering

## Todos

### 1a. Create LineRow component
- [ ] Read both `IncomeDetails.tsx` and `TaxComputation.tsx` to confirm the
      exact shared code
- [ ] Create `src/app/components/LineRow.tsx` exporting:
  - `LineRow` component (takes: label, value, operator?, isTotal?, isNegative?,
    source?, onClick?)
  - `SectionTitle` component (takes: children)
- [ ] Both components should use the **current** styling (colors, spacing) as-is
      — no visual changes in this phase
- [ ] Update `IncomeDetails.tsx` to import `LineRow`/`SectionTitle` from the new
      file, delete its local copies
- [ ] Update `TaxComputation.tsx` to import `LineRow`/`SectionTitle` from the new
      file, delete its local copies
- [ ] Create `src/app/components/LineRow.test.tsx` with tests:
  - renders label and value
  - shows add icon when operator is 'add'
  - shows subtract icon when operator is 'subtract'
  - no icon when operator is 'equals' or undefined
  - applies total styling when isTotal is true
  - applies isNegative color
  - renders source badge when source prop provided
  - SectionTitle renders children with correct styling

### 1b. Create ChatPanel component
- [ ] Read page.tsx lines 1491-1751 (desktop chat) and lines 1813-1911 (mobile
      dialog chat) to identify the common pattern
- [ ] Create `src/app/components/ChatPanel.tsx` that accepts:
  ```
  {
    messages: Message[];
    chatLoading: boolean;
    inputMessage: string;
    onInputChange: (val: string) => void;
    onSend: () => void;
    onAttachmentUpload: (file: File) => void;
    variant: 'desktop' | 'mobile';
    // plus all the context badge props:
    form16List, aisFile, tisFile, form26asFile, attachments,
    extractedData, sendOnlyRawData, selectedModel, geminiModels,
    onModelChange, onRemoveForm16, onRemoveAis, onRemoveTis,
    onRemoveForm26as, onRemoveAttachment, onOpenRightPanel,
    onClose, messagesEndRef, handleAcceptProposal,
    handleRejectProposal, handleUndoProposal, acceptedMessages,
    rejectedMessages
  }
  ```
- [ ] Replace the desktop chat block in page.tsx with `<ChatPanel variant="desktop" ... />`
- [ ] Replace the mobile dialog chat block in page.tsx with `<ChatPanel variant="mobile" ... />`
- [ ] Create `src/app/components/ChatPanel.test.tsx` with tests:
  - renders empty state when no messages
  - renders user and assistant messages
  - shows loading indicator when chatLoading is true
  - input field reflects inputMessage value

### 1c. Create DocumentUpload component
- [ ] Read page.tsx lines 843-1138 (the upload area: compact status bar + upload grid)
- [ ] Identify which state/handlers are needed as props vs internal
- [ ] Create `src/app/components/DocumentUpload.tsx` that accepts:
  ```
  {
    form16List, aisFile, tisFile, form26asFile,
    aisLoading, tisLoading, form26asLoading, loading,
    showUploadArea, isUploadCollapsed,
    onToggleShowUploadArea: () => void;
    onFileUpload: (files: FileList) => void;
    onAISUpload: (file: File) => void;
    onTISUpload: (file: File) => void;
    onForm26ASUpload: (file: File) => void;
    onRemoveForm16: (idx: number) => void;
    onOpenRightPanel: (tab: 'chat' | 'inspect', docIdx: number) => void;
  }
  ```
- [ ] Replace the upload block in page.tsx with `<DocumentUpload ... />`
- [ ] Create `src/app/components/DocumentUpload.test.tsx` with tests:
  - renders upload grid with 4 document slots
  - shows compact status bar when isUploadCollapsed is true
  - shows file names after upload
  - calls onFileUpload when form-16 file is selected

### 1d. Verify
- [ ] `npm run test` — all existing tests pass, new tests pass
- [ ] `npm run build` — no build errors
- [ ] Manual check: app loads, documents upload, chat works

## Acceptance criteria

- All existing tests still pass (including IncomeDetails, TaxComputation tests)
- New LineRow.test.tsx, ChatPanel.test.tsx, DocumentUpload.test.tsx pass
- `npm run build` passes
- page.tsx is reduced by ~400 lines (3 blocks extracted)
- No visual or behavioral changes to the running app
