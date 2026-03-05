import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  signal,
  inject,
  forwardRef,
  OnDestroy,
  AfterViewChecked
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { TooltipModule } from 'primeng/tooltip';
import { MarkdownRenderService } from '../../services/markdown-render.service';

export type MarkdownEditorMode = 'split' | 'editor' | 'preview';

interface ToolbarButton {
  icon: string;
  label: string;
  tooltip: string;
  action: () => void;
  separator?: boolean;
}

@Component({
  selector: 'app-markdown-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, TooltipModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MarkdownEditorComponent),
      multi: true
    }
  ],
  template: `
    <div class="markdown-editor" [class.split-mode]="mode() === 'split'" [class.editor-only]="mode() === 'editor'" [class.preview-only]="mode() === 'preview'">
      <!-- Toolbar -->
      @if (showToolbar) {
        <div class="editor-toolbar">
          @for (btn of toolbarButtons; track btn.label) {
            @if (btn.separator) {
              <div class="toolbar-divider"></div>
            } @else {
              <button
                type="button"
                class="toolbar-btn"
                (click)="btn.action()"
                [pTooltip]="btn.tooltip"
                tooltipPosition="top"
              >
                @if (btn.icon.startsWith('pi')) {
                  <i [class]="btn.icon"></i>
                } @else {
                  <span class="btn-text">{{ btn.icon }}</span>
                }
              </button>
            }
          }

          <div class="toolbar-spacer"></div>

          <!-- View Mode Toggle -->
          <div class="view-toggle">
            <button
              type="button"
              class="toolbar-btn"
              [class.active]="mode() === 'editor'"
              (click)="setMode('editor')"
              pTooltip="Editor Only"
              tooltipPosition="top"
            >
              <i class="pi pi-pencil"></i>
            </button>
            <button
              type="button"
              class="toolbar-btn"
              [class.active]="mode() === 'split'"
              (click)="setMode('split')"
              pTooltip="Split View"
              tooltipPosition="top"
            >
              <i class="pi pi-columns"></i>
            </button>
            <button
              type="button"
              class="toolbar-btn"
              [class.active]="mode() === 'preview'"
              (click)="setMode('preview')"
              pTooltip="Preview Only"
              tooltipPosition="top"
            >
              <i class="pi pi-eye"></i>
            </button>
          </div>
        </div>
      }

      <!-- Content Area -->
      <div class="editor-content" [style.height]="height">
        <!-- Editor Pane -->
        @if (mode() !== 'preview') {
          <div class="editor-pane">
            @if (mode() === 'split') {
              <div class="pane-header">
                <i class="pi pi-pencil"></i>
                <span>Editor</span>
              </div>
            }
            <textarea
              #textareaRef
              class="markdown-input"
              [ngModel]="value"
              (ngModelChange)="onValueChange($event)"
              (keydown)="handleKeydown($event)"
              [placeholder]="placeholder"
              spellcheck="false"
            ></textarea>
          </div>
        }

        <!-- Divider -->
        @if (mode() === 'split') {
          <div class="pane-divider"></div>
        }

        <!-- Preview Pane -->
        @if (mode() !== 'editor') {
          <div class="preview-pane">
            @if (mode() === 'split') {
              <div class="pane-header">
                <i class="pi pi-eye"></i>
                <span>Preview</span>
              </div>
            }
            <div
              #previewRef
              class="markdown-preview markdown-rendered"
              [innerHTML]="renderedHtml()"
              (click)="handlePreviewClick($event)"
            ></div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .markdown-editor {
      display: flex;
      flex-direction: column;
      border: 1px solid var(--surface-border);
      border-radius: 8px;
      overflow: hidden;
      background: var(--surface-card);
    }

    .editor-toolbar {
      display: flex;
      align-items: center;
      gap: 2px;
      padding: 8px 12px;
      background: var(--surface-ground);
      border-bottom: 1px solid var(--surface-border);
      flex-wrap: wrap;
    }

    .toolbar-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 32px;
      height: 32px;
      padding: 0 8px;
      background: transparent;
      border: none;
      border-radius: 6px;
      color: var(--text-color-secondary);
      cursor: pointer;
      transition: all 0.15s ease;
      font-size: 0.875rem;

      &:hover {
        background: var(--surface-hover);
        color: var(--text-color);
      }

      &:active {
        transform: scale(0.95);
      }

      &.active {
        background: var(--primary-color);
        color: white;
      }

      .btn-text {
        font-weight: 600;
        font-size: 0.8125rem;
      }

      i {
        font-size: 0.875rem;
      }
    }

    .toolbar-divider {
      width: 1px;
      height: 20px;
      background: var(--surface-border);
      margin: 0 6px;
    }

    .toolbar-spacer {
      flex: 1;
    }

    .view-toggle {
      display: flex;
      gap: 2px;
      padding: 2px;
      background: var(--surface-100);
      border-radius: 6px;
    }

    .editor-content {
      display: flex;
      flex: 1;
      min-height: 200px;
    }

    .editor-pane,
    .preview-pane {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      overflow: hidden;
    }

    .pane-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: var(--surface-ground);
      border-bottom: 1px solid var(--surface-border);
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--text-color-secondary);

      i {
        font-size: 0.875rem;
      }
    }

    .pane-divider {
      width: 1px;
      background: var(--surface-border);
    }

    .markdown-input {
      flex: 1;
      width: 100%;
      padding: 16px;
      background: var(--surface-card);
      border: none;
      color: var(--text-color);
      font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
      font-size: 0.875rem;
      line-height: 1.7;
      resize: none;
      outline: none;
      overflow-y: auto;

      &::placeholder {
        color: var(--text-color-secondary);
      }
    }

    .markdown-preview {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      background: var(--surface-card);
    }

    /* Mode variations */
    .editor-only .editor-pane,
    .preview-only .preview-pane {
      flex: 1;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .split-mode .editor-content {
        flex-direction: column;
      }

      .split-mode .editor-pane,
      .split-mode .preview-pane {
        flex: none;
        height: 50%;
      }

      .split-mode .pane-divider {
        width: 100%;
        height: 1px;
      }
    }

    :host {
      display: block;
    }

    :host(.ng-invalid.ng-touched) .markdown-editor {
      border-color: var(--red-500);
    }
  `]
})
export class MarkdownEditorComponent implements ControlValueAccessor, OnDestroy, AfterViewChecked {
  @ViewChild('textareaRef') textareaRef!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('previewRef') previewRef!: ElementRef<HTMLDivElement>;

  @Input() placeholder = 'Write your markdown here...';
  @Input() height = '400px';
  @Input() showToolbar = true;
  @Input() initialMode: MarkdownEditorMode = 'split';

  @Output() valueChange = new EventEmitter<string>();
  @Output() modeChange = new EventEmitter<MarkdownEditorMode>();

  private markdownService = inject(MarkdownRenderService);
  private sanitizer = inject(DomSanitizer);
  private tabSwitchingInitialized = false;

  value = '';
  renderedHtml = signal<SafeHtml>('');
  mode = signal<MarkdownEditorMode>('split');

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  toolbarButtons: ToolbarButton[] = [
    { icon: 'H', label: 'heading', tooltip: 'Heading (Ctrl+H)', action: () => this.insertHeading() },
    { icon: 'pi pi-bold', label: 'bold', tooltip: 'Bold (Ctrl+B)', action: () => this.insertBold() },
    { icon: 'pi pi-italic', label: 'italic', tooltip: 'Italic (Ctrl+I)', action: () => this.insertItalic() },
    { icon: '', label: 'sep1', tooltip: '', action: () => {}, separator: true },
    { icon: 'pi pi-code', label: 'code', tooltip: 'Inline Code', action: () => this.insertInlineCode() },
    { icon: '{ }', label: 'codeblock', tooltip: 'Code Block', action: () => this.insertCodeBlock() },
    { icon: 'pi pi-objects-column', label: 'multitab', tooltip: 'Multi-Tab Code', action: () => this.insertMultiTabCode() },
    { icon: '', label: 'sep2', tooltip: '', action: () => {}, separator: true },
    { icon: 'pi pi-list', label: 'ol', tooltip: 'Ordered List', action: () => this.insertOrderedList() },
    { icon: 'pi pi-minus', label: 'ul', tooltip: 'Bullet List', action: () => this.insertUnorderedList() },
    { icon: 'pi pi-comment', label: 'quote', tooltip: 'Blockquote', action: () => this.insertBlockquote() },
    { icon: '', label: 'sep3', tooltip: '', action: () => {}, separator: true },
    { icon: 'pi pi-link', label: 'link', tooltip: 'Link (Ctrl+K)', action: () => this.insertLink() },
    { icon: '∑', label: 'math', tooltip: 'Math Expression', action: () => this.insertMath() },
    { icon: '—', label: 'hr', tooltip: 'Horizontal Rule', action: () => this.insertHorizontalRule() },
  ];

  constructor() {
    this.mode.set(this.initialMode);
  }

  ngAfterViewChecked(): void {
    if (!this.tabSwitchingInitialized && this.previewRef?.nativeElement) {
      const tabBlocks = this.previewRef.nativeElement.querySelectorAll('.multi-tab-code-block');
      if (tabBlocks.length > 0) {
        this.tabSwitchingInitialized = true;
      }
    }
  }

  ngOnDestroy(): void {}

  // ControlValueAccessor
  writeValue(value: string): void {
    this.value = value || '';
    this.renderMarkdown();
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  onValueChange(newValue: string): void {
    this.value = newValue;
    this.onChange(newValue);
    this.valueChange.emit(newValue);
    this.tabSwitchingInitialized = false;
    this.renderMarkdown();
  }

  setMode(newMode: MarkdownEditorMode): void {
    this.mode.set(newMode);
    this.modeChange.emit(newMode);
    if (newMode !== 'editor') {
      this.renderMarkdown();
    }
  }

  renderMarkdown(): void {
    const html = this.markdownService.renderToString(this.value);
    this.renderedHtml.set(this.sanitizer.bypassSecurityTrustHtml(html));
  }

  handlePreviewClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    if (target.classList.contains('code-tab-btn') || target.closest('.code-tab-btn')) {
      const btn = target.classList.contains('code-tab-btn') ? target : target.closest('.code-tab-btn') as HTMLElement;
      const blockId = btn.dataset['blockId'];
      const tabIndex = parseInt(btn.dataset['tabIndex'] || '0', 10);

      if (blockId) {
        this.switchTab(blockId, tabIndex);
      }
    }

    if (target.classList.contains('code-copy-btn') || target.closest('.code-copy-btn')) {
      const btn = target.classList.contains('code-copy-btn') ? target : target.closest('.code-copy-btn') as HTMLElement;
      const blockId = btn.dataset['blockId'] || btn.closest('[data-block-id]')?.getAttribute('data-block-id');

      if (blockId) {
        this.copyCode(blockId);
      }
    }
  }

  private switchTab(blockId: string, tabIndex: number): void {
    const preview = this.previewRef?.nativeElement;
    if (!preview) return;

    const block = preview.querySelector(`[data-block-id="${blockId}"]`);
    if (!block) return;

    block.querySelectorAll('.code-tab-btn').forEach((btn, idx) => {
      btn.classList.toggle('active', idx === tabIndex);
    });

    block.querySelectorAll('.code-tab-panel').forEach((panel, idx) => {
      panel.classList.toggle('active', idx === tabIndex);
    });
  }

  private copyCode(blockId: string): void {
    const preview = this.previewRef?.nativeElement;
    if (!preview) return;

    const block = preview.querySelector(`[data-block-id="${blockId}"]`);
    if (!block) return;

    const activePanel = block.querySelector('.code-tab-panel.active code');
    if (activePanel) {
      const code = activePanel.textContent || '';
      navigator.clipboard.writeText(code);
    }
  }

  handleKeydown(event: KeyboardEvent): void {
    const textarea = this.textareaRef?.nativeElement;
    if (!textarea) return;

    if (event.key === 'Enter' && !event.shiftKey) {
      const handled = this.handleEnterInList(event);
      if (handled) return;
    }

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const ctrlKey = isMac ? event.metaKey : event.ctrlKey;

    if (!ctrlKey) return;

    switch (event.key.toLowerCase()) {
      case 'b':
        event.preventDefault();
        this.insertBold();
        break;
      case 'i':
        event.preventDefault();
        this.insertItalic();
        break;
      case 'k':
        event.preventDefault();
        this.insertLink();
        break;
      case 'h':
        event.preventDefault();
        this.insertHeading();
        break;
    }
  }

  private handleEnterInList(event: KeyboardEvent): boolean {
    const textarea = this.textareaRef?.nativeElement;
    if (!textarea) return false;

    const cursorPos = textarea.selectionStart;
    const text = this.value;

    const lineStart = text.lastIndexOf('\n', cursorPos - 1) + 1;
    const currentLine = text.substring(lineStart, cursorPos);

    const orderedMatch = currentLine.match(/^(\d+)\.\s(.*)$/);
    if (orderedMatch) {
      const num = parseInt(orderedMatch[1], 10);
      const content = orderedMatch[2];

      if (content.trim() === '') {
        event.preventDefault();
        const newText = text.substring(0, lineStart) + '\n' + text.substring(cursorPos);
        this.updateValue(newText, lineStart + 1);
        return true;
      }

      event.preventDefault();
      const newItem = '\n' + (num + 1) + '. ';
      this.insertAtCursor(newItem);
      return true;
    }

    const unorderedMatch = currentLine.match(/^([-*+])\s(.*)$/);
    if (unorderedMatch) {
      const marker = unorderedMatch[1];
      const content = unorderedMatch[2];

      if (content.trim() === '') {
        event.preventDefault();
        const newText = text.substring(0, lineStart) + '\n' + text.substring(cursorPos);
        this.updateValue(newText, lineStart + 1);
        return true;
      }

      event.preventDefault();
      const newItem = '\n' + marker + ' ';
      this.insertAtCursor(newItem);
      return true;
    }

    return false;
  }

  private updateValue(newText: string, cursorPos: number): void {
    this.value = newText;
    this.onChange(newText);
    this.valueChange.emit(newText);
    this.tabSwitchingInitialized = false;
    this.renderMarkdown();

    setTimeout(() => {
      const textarea = this.textareaRef?.nativeElement;
      if (textarea) {
        textarea.setSelectionRange(cursorPos, cursorPos);
        textarea.focus();
      }
    }, 0);
  }

  private insertAtCursor(text: string): void {
    const textarea = this.textareaRef?.nativeElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const newContent = this.value.substring(0, start) + text + this.value.substring(end);
    this.updateValue(newContent, start + text.length);
  }

  private wrapSelection(before: string, after: string): void {
    const textarea = this.textareaRef?.nativeElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = this.value.substring(start, end) || 'text';

    const newContent = this.value.substring(0, start) + before + selected + after + this.value.substring(end);
    this.value = newContent;
    this.onChange(newContent);
    this.valueChange.emit(newContent);
    this.tabSwitchingInitialized = false;
    this.renderMarkdown();

    setTimeout(() => {
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
      textarea.focus();
    }, 0);
  }

  insertHeading(): void {
    const textarea = this.textareaRef?.nativeElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const lineStart = this.value.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = this.value.indexOf('\n', start);
    const currentLine = this.value.substring(lineStart, lineEnd === -1 ? this.value.length : lineEnd);

    const headingMatch = currentLine.match(/^(#{1,6})\s/);
    let newLine: string;

    if (headingMatch) {
      const level = headingMatch[1].length;
      if (level < 6) {
        newLine = '#'.repeat(level + 1) + ' ' + currentLine.substring(headingMatch[0].length);
      } else {
        newLine = currentLine.substring(headingMatch[0].length);
      }
    } else {
      newLine = '## ' + currentLine;
    }

    const newContent = this.value.substring(0, lineStart) + newLine + this.value.substring(lineStart + currentLine.length);
    this.updateValue(newContent, lineStart + newLine.length);
  }

  insertBold(): void {
    this.wrapSelection('**', '**');
  }

  insertItalic(): void {
    this.wrapSelection('*', '*');
  }

  insertInlineCode(): void {
    this.wrapSelection('`', '`');
  }

  insertCodeBlock(): void {
    this.insertAtCursor('\n```javascript\n// Your code here\n```\n');
  }

  insertMultiTabCode(): void {
    const template = `
\`\`\`javascript []
// JavaScript
function example() {
  console.log("Hello!");
}
\`\`\`
\`\`\`python []
# Python
def example():
    print("Hello!")
\`\`\`
\`\`\`java []
// Java
public void example() {
    System.out.println("Hello!");
}
\`\`\`
`;
    this.insertAtCursor(template);
  }

  insertOrderedList(): void {
    this.insertAtCursor('\n1. ');
  }

  insertUnorderedList(): void {
    this.insertAtCursor('\n- ');
  }

  insertBlockquote(): void {
    this.insertAtCursor('\n> ');
  }

  insertLink(): void {
    this.wrapSelection('[', '](url)');
  }

  insertMath(): void {
    this.insertAtCursor('\n$$\nE = mc^2\n$$\n');
  }

  insertHorizontalRule(): void {
    this.insertAtCursor('\n\n---\n\n');
  }
}
