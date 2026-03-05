import { Component, signal, inject, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { TooltipModule } from 'primeng/tooltip';
import { MonacoEditorComponent } from '../../../shared/components/monaco-editor/monaco-editor.component';
import { MarkdownRenderService } from '../../../shared/services/markdown-render.service';

@Component({
  selector: 'app-markdown-render-demo',
  standalone: true,
  imports: [CommonModule, FormsModule, TooltipModule, MonacoEditorComponent],
  template: `
    <div class="demo-page">
      <div class="demo-header">
        <h1><i class="pi pi-file-edit"></i> Markdown Editor</h1>
        <p>Monaco Editor with live preview, toolbar, and multi-tab code blocks</p>
      </div>

      <div class="editor-layout">
        <!-- Editor Pane -->
        <div class="editor-pane">
          <div class="pane-header">
            <div class="header-left">
              <i class="pi pi-code"></i>
              <span>Editor</span>
            </div>
            <!-- Toolbar -->
            <div class="toolbar">
              @for (btn of toolbarButtons; track btn.label) {
                @if (btn.separator) {
                  <div class="toolbar-divider"></div>
                } @else {
                  <button class="toolbar-btn" (click)="btn.action()" [pTooltip]="btn.tooltip" tooltipPosition="bottom">
                    <i [class]="btn.icon"></i>
                  </button>
                }
              }
            </div>
          </div>
          <div class="editor-content">
            <app-monaco-editor
              #monacoEditor
              [language]="'markdown'"
              [height]="'100%'"
              [theme]="'vs-dark'"
              [(ngModel)]="markdownContent"
              (contentChange)="onContentChange($event)">
            </app-monaco-editor>
          </div>
        </div>

        <!-- Preview Pane -->
        <div class="preview-pane">
          <div class="pane-header">
            <div class="header-left">
              <i class="pi pi-eye"></i>
              <span>Preview</span>
            </div>
          </div>
          <div class="preview-content markdown-preview" 
               [innerHTML]="renderedHtml()"
               (click)="handlePreviewClick($event)">
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .demo-page {
      padding: 24px;
      height: calc(100vh - 48px);
      display: flex;
      flex-direction: column;
      background: var(--surface-ground);
    }

    .demo-header {
      margin-bottom: 16px;
    }

    .demo-header h1 {
      margin: 0 0 4px 0;
      color: var(--text-color);
      font-size: 1.5rem;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .demo-header h1 i { color: var(--primary-color); }

    .demo-header p {
      margin: 0;
      color: var(--text-color-secondary);
      font-size: 0.875rem;
    }

    .editor-layout {
      flex: 1;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      min-height: 0;
    }

    .editor-pane, .preview-pane {
      display: flex;
      flex-direction: column;
      background: var(--surface-card);
      border: 1px solid var(--surface-border);
      border-radius: 12px;
      overflow: hidden;
      min-height: 0;
    }

    .editor-content {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }

    .editor-content app-monaco-editor {
      flex: 1;
      min-height: 400px;
    }

    .pane-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      background: var(--surface-section);
      border-bottom: 1px solid var(--surface-border);
      min-height: 48px;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
      color: var(--text-color);
      font-size: 0.875rem;
    }

    .header-left i { color: var(--primary-color); }

    /* Toolbar */
    .toolbar {
      display: flex;
      align-items: center;
      gap: 2px;
    }

    .toolbar-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      color: var(--text-color-secondary);
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s;
    }

    .toolbar-btn:hover {
      background: var(--surface-hover);
      color: var(--text-color);
    }

    .toolbar-btn i { font-size: 14px; }

    .toolbar-divider {
      width: 1px;
      height: 20px;
      background: var(--surface-border);
      margin: 0 6px;
    }

    .preview-content {
      flex: 1;
      padding: 20px;
      overflow-y: auto;
      background: var(--surface-card);
    }

    @media (max-width: 1024px) {
      .editor-layout {
        grid-template-columns: 1fr;
        grid-template-rows: 1fr 1fr;
      }
    }
  `]
})
export class MarkdownRenderDemoComponent implements AfterViewInit {
  @ViewChild('monacoEditor') monacoEditor!: MonacoEditorComponent;

  private sanitizer = inject(DomSanitizer);
  private markdownService = inject(MarkdownRenderService);

  markdownContent = `# Welcome to the Markdown Editor

This editor uses **Monaco** (VS Code's editor) with a live preview.

## Toolbar Features

Use the toolbar buttons above to insert:
- **Bold** (Ctrl+B)
- *Italic* (Ctrl+I)
- \`Inline Code\`
- Code blocks
- Lists and more!

## Multi-Tab Code Blocks

Click the tabs to switch between languages:

\`\`\`javascript []
// JavaScript - Two Sum
function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}
\`\`\`
\`\`\`python []
# Python - Two Sum
def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []
\`\`\`
\`\`\`java []
// Java - Two Sum
public int[] twoSum(int[] nums, int target) {
    Map<Integer, Integer> map = new HashMap<>();
    for (int i = 0; i < nums.length; i++) {
        int complement = target - nums[i];
        if (map.containsKey(complement)) {
            return new int[] { map.get(complement), i };
        }
        map.put(nums[i], i);
    }
    return new int[] {};
}
\`\`\`

## Standard Code Block

\`\`\`typescript
interface User {
  id: number;
  name: string;
  email: string;
}

const fetchUser = async (id: number): Promise<User> => {
  const response = await fetch(\`/api/users/\${id}\`);
  return response.json();
};
\`\`\`

## Lists

1. First ordered item
2. Second ordered item
3. Third ordered item

- Unordered item
- Another item
- More items

## Blockquote

> This is a blockquote for important notes or quotes.

---

**Bold**, *italic*, and \`code\` formatting works!
`;

  renderedHtml = signal<SafeHtml>('');

  toolbarButtons = [
    { icon: 'pi pi-hashtag', label: 'heading', tooltip: 'Heading', action: () => this.insertHeading() },
    { icon: 'pi pi-bold', label: 'bold', tooltip: 'Bold (Ctrl+B)', action: () => this.insertBold() },
    { icon: 'pi pi-italic', label: 'italic', tooltip: 'Italic (Ctrl+I)', action: () => this.insertItalic() },
    { separator: true, label: 'sep1', tooltip: '', icon: '', action: () => {} },
    { icon: 'pi pi-code', label: 'code', tooltip: 'Inline Code', action: () => this.insertInlineCode() },
    { icon: 'pi pi-box', label: 'codeblock', tooltip: 'Code Block', action: () => this.insertCodeBlock() },
    { icon: 'pi pi-objects-column', label: 'multitab', tooltip: 'Multi-Tab Code', action: () => this.insertMultiTabCode() },
    { separator: true, label: 'sep2', tooltip: '', icon: '', action: () => {} },
    { icon: 'pi pi-list', label: 'ul', tooltip: 'Bullet List', action: () => this.insertUnorderedList() },
    { icon: 'pi pi-sort-numeric-up', label: 'ol', tooltip: 'Numbered List', action: () => this.insertOrderedList() },
    { separator: true, label: 'sep3', tooltip: '', icon: '', action: () => {} },
    { icon: 'pi pi-link', label: 'link', tooltip: 'Link', action: () => this.insertLink() },
    { icon: 'pi pi-image', label: 'image', tooltip: 'Image', action: () => this.insertImage() },
    { icon: 'pi pi-minus', label: 'hr', tooltip: 'Horizontal Rule', action: () => this.insertHorizontalRule() },
    { icon: 'pi pi-comment', label: 'quote', tooltip: 'Blockquote', action: () => this.insertBlockquote() },
  ];

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.updatePreview();
      this.markdownService.initializeTabSwitching();
    }, 100);
  }

  onContentChange(content: string): void {
    this.markdownContent = content;
    this.updatePreview();
  }

  private updatePreview(): void {
    const html = this.markdownService.renderToString(this.markdownContent);
    this.renderedHtml.set(this.sanitizer.bypassSecurityTrustHtml(html));
  }

  handlePreviewClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (target.classList.contains('code-tab-btn')) {
      const blockId = target.getAttribute('data-block-id');
      const tabIndex = parseInt(target.getAttribute('data-tab-index') || '0', 10);
      if (blockId) this.switchTab(blockId, tabIndex);
    }
  }

  private switchTab(blockId: string, tabIndex: number): void {
    const block = document.querySelector(`[data-block-id="${blockId}"]`);
    if (!block) return;
    block.querySelectorAll('.code-tab-btn').forEach((btn, i) => btn.classList.toggle('active', i === tabIndex));
    block.querySelectorAll('.code-tab-panel').forEach((panel, i) => panel.classList.toggle('active', i === tabIndex));
  }

  // Toolbar actions
  private insertAtCursor(before: string, after: string = '', placeholder: string = ''): void {
    const editor = this.monacoEditor?.getEditor();
    if (!editor) return;
    
    const selection = editor.getSelection();
    const selectedText = editor.getModel().getValueInRange(selection) || placeholder;
    const text = before + selectedText + after;
    
    editor.executeEdits('', [{
      range: selection,
      text: text,
      forceMoveMarkers: true
    }]);
    editor.focus();
  }

  insertHeading(): void {
    this.insertAtCursor('## ', '', 'Heading');
  }

  insertBold(): void {
    this.insertAtCursor('**', '**', 'bold text');
  }

  insertItalic(): void {
    this.insertAtCursor('*', '*', 'italic text');
  }

  insertInlineCode(): void {
    this.insertAtCursor('`', '`', 'code');
  }

  insertCodeBlock(): void {
    this.insertAtCursor('```javascript\n', '\n```', '// your code here');
  }

  insertMultiTabCode(): void {
    const template = `\`\`\`javascript []
// JavaScript
function example() {
  console.log("Hello");
}
\`\`\`
\`\`\`python []
# Python
def example():
    print("Hello")
\`\`\`
\`\`\`java []
// Java
public void example() {
    System.out.println("Hello");
}
\`\`\``;
    this.insertAtCursor(template, '', '');
  }

  insertUnorderedList(): void {
    this.insertAtCursor('- ', '', 'List item');
  }

  insertOrderedList(): void {
    this.insertAtCursor('1. ', '', 'List item');
  }

  insertLink(): void {
    this.insertAtCursor('[', '](https://example.com)', 'link text');
  }

  insertImage(): void {
    this.insertAtCursor('![', '](https://example.com/image.png)', 'alt text');
  }

  insertHorizontalRule(): void {
    this.insertAtCursor('\n---\n', '', '');
  }

  insertBlockquote(): void {
    this.insertAtCursor('> ', '', 'Quote text');
  }
}
