import { Injectable } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

export interface CodeBlock {
  language: string;
  code: string;
  label?: string;
}

export interface MultiTabCodeBlock {
  id: string;
  tabs: CodeBlock[];
  activeTab: number;
}

interface LanguageConfig {
  keywords: string[];
  lineComment?: string;
  blockCommentStart?: string;
  blockCommentEnd?: string;
  stringDelimiters: string[];
}

@Injectable({
  providedIn: 'root'
})
export class MarkdownRenderService {
  private multiTabBlocks: Map<string, MultiTabCodeBlock> = new Map();
  private blockIdCounter = 0;

  constructor(private sanitizer: DomSanitizer) {}

  /**
   * Render markdown content to HTML string (safe HTML)
   * Supports: headings, bold, italic, lists, code blocks, multi-tab code blocks,
   * inline code, blockquotes, links, images, horizontal rules, math expressions
   * Returns sanitized HTML string (XSS-safe)
   */
  render(markdown: string): string {
    if (!markdown) return '';
    
    // Reset block counter for fresh render
    this.blockIdCounter = 0;
    this.multiTabBlocks.clear();
    
    let html = this.escapeHtml(markdown);
    
    // Process in order (order matters!)
    html = this.processMultiTabCodeBlocks(html);
    html = this.processFencedCodeBlocks(html);
    html = this.processInlineCode(html);
    html = this.processMathBlocks(html);
    html = this.processInlineMath(html);
    html = this.processImages(html);
    html = this.processLinks(html);
    html = this.processHeadings(html);
    html = this.processBoldItalic(html);
    html = this.processBlockquotes(html);
    html = this.processHorizontalRules(html);
    html = this.processLists(html);
    html = this.processParagraphs(html);
    
    // Sanitize to prevent XSS before returning
    return this.sanitizer.sanitize(1, html) || '';  // 1 = SecurityContext.HTML
  }

  /**
   * Render markdown and return raw HTML string (for innerHTML binding)
   */
  renderToString(markdown: string): string {
    if (!markdown) return '';
    
    this.blockIdCounter = 0;
    this.multiTabBlocks.clear();
    
    let html = this.escapeHtml(markdown);
    
    html = this.processMultiTabCodeBlocks(html);
    html = this.processFencedCodeBlocks(html);
    html = this.processInlineCode(html);
    html = this.processMathBlocks(html);
    html = this.processInlineMath(html);
    html = this.processImages(html);
    html = this.processLinks(html);
    html = this.processHeadings(html);
    html = this.processBoldItalic(html);
    html = this.processBlockquotes(html);
    html = this.processHorizontalRules(html);
    html = this.processLists(html);
    html = this.processParagraphs(html);
    
    return html;
  }

  private escapeHtml(text: string): string {
    // Don't escape - we'll handle security through sanitization
    return text;
  }

  /**
   * Process LeetCode-style multi-tab code blocks
   * Format: consecutive code blocks with language []
   * ```javascript []
   * code
   * ```
   * ```python []
   * code
   * ```
   */
  private processMultiTabCodeBlocks(html: string): string {
    // Pattern to find consecutive code blocks with [] marker
    const multiTabPattern = /((?:```(\w+)\s*\[\]\n([\s\S]*?)```\n?)+)/g;
    
    return html.replace(multiTabPattern, (match) => {
      // Extract individual blocks from the match
      const blockPattern = /```(\w+)\s*\[\]\n([\s\S]*?)```/g;
      const tabs: CodeBlock[] = [];
      let blockMatch;
      
      while ((blockMatch = blockPattern.exec(match)) !== null) {
        tabs.push({
          language: blockMatch[1],
          code: blockMatch[2].trim(),
          label: this.getLanguageLabel(blockMatch[1])
        });
      }
      
      if (tabs.length === 0) return match;
      
      const blockId = `multi-tab-${++this.blockIdCounter}`;
      this.multiTabBlocks.set(blockId, { id: blockId, tabs, activeTab: 0 });
      
      return this.renderMultiTabBlock(blockId, tabs);
    });
  }

  private renderMultiTabBlock(blockId: string, tabs: CodeBlock[]): string {
    const tabButtons = tabs.map((tab, index) => `
      <button class="code-tab-btn ${index === 0 ? 'active' : ''}" 
              data-block-id="${blockId}" 
              data-tab-index="${index}"
              onclick="window.switchCodeTab && window.switchCodeTab('${blockId}', ${index})">
        ${this.escapeHtmlEntities(tab.label || tab.language)}
      </button>
    `).join('');
    
    const tabPanels = tabs.map((tab, index) => `
      <div class="code-tab-panel ${index === 0 ? 'active' : ''}" 
           data-block-id="${blockId}" 
           data-tab-index="${index}">
        <pre class="code-block"><code class="language-${tab.language}">${this.highlightCode(tab.code, tab.language)}</code></pre>
      </div>
    `).join('');
    
    return `
      <div class="multi-tab-code-block" data-block-id="${blockId}">
        <div class="code-tab-header">
          ${tabButtons}
          <button class="code-copy-btn" onclick="window.copyCodeBlock && window.copyCodeBlock('${blockId}')" title="Copy code">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
        </div>
        <div class="code-tab-content">
          ${tabPanels}
        </div>
      </div>
    `;
  }

  /**
   * Process standard fenced code blocks (without tabs)
   */
  private processFencedCodeBlocks(html: string): string {
    // Match code blocks that don't have [] marker
    const pattern = /```(\w*)\n([\s\S]*?)```/g;
    
    return html.replace(pattern, (match, language, code) => {
      const lang = language || 'plaintext';
      const trimmedCode = code.trim();
      
      return `
        <div class="code-block-wrapper">
          ${language ? `<span class="code-language-label">${this.getLanguageLabel(lang)}</span>` : ''}
          <pre class="code-block"><code class="language-${lang}">${this.highlightCode(trimmedCode, lang)}</code></pre>
        </div>
      `;
    });
  }

  /**
   * Process inline code `code`
   */
  private processInlineCode(html: string): string {
    return html.replace(/`([^`\n]+)`/g, '<code class="inline-code">$1</code>');
  }

  /**
   * Process block math expressions $$...$$
   */
  private processMathBlocks(html: string): string {
    return html.replace(/\$\$([^$]+)\$\$/g, (match, math) => {
      return `<div class="math-block">${this.escapeHtmlEntities(math.trim())}</div>`;
    });
  }

  /**
   * Process inline math expressions $...$
   */
  private processInlineMath(html: string): string {
    // Single $ for inline math (but not $$)
    return html.replace(/(?<!\$)\$(?!\$)([^$\n]+)\$(?!\$)/g, (match, math) => {
      return `<span class="math-inline">${this.escapeHtmlEntities(math)}</span>`;
    });
  }

  /**
   * Process images ![alt](url)
   */
  private processImages(html: string): string {
    return html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, url) => {
      return `<img src="${this.escapeHtmlEntities(url)}" alt="${this.escapeHtmlEntities(alt)}" class="markdown-image" loading="lazy" />`;
    });
  }

  /**
   * Process links [text](url)
   */
  private processLinks(html: string): string {
    return html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
      return `<a href="${this.escapeHtmlEntities(url)}" class="markdown-link" target="_blank" rel="noopener noreferrer">${this.escapeHtmlEntities(text)}</a>`;
    });
  }

  /**
   * Process headings # ## ### etc
   */
  private processHeadings(html: string): string {
    // Process headings (must be at start of line)
    html = html.replace(/^###### (.+)$/gm, '<h6 class="md-heading md-h6">$1</h6>');
    html = html.replace(/^##### (.+)$/gm, '<h5 class="md-heading md-h5">$1</h5>');
    html = html.replace(/^#### (.+)$/gm, '<h4 class="md-heading md-h4">$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3 class="md-heading md-h3">$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2 class="md-heading md-h2">$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1 class="md-heading md-h1">$1</h1>');
    return html;
  }

  /**
   * Process bold and italic
   */
  private processBoldItalic(html: string): string {
    // Bold: **text** or __text__
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    
    // Italic: *text* or _text_
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/(?<![a-zA-Z])_([^_]+)_(?![a-zA-Z])/g, '<em>$1</em>');
    
    return html;
  }

  /**
   * Process blockquotes > text
   */
  private processBlockquotes(html: string): string {
    // Find consecutive lines starting with >
    const lines = html.split('\n');
    const result: string[] = [];
    let inBlockquote = false;
    let blockquoteContent: string[] = [];
    
    for (const line of lines) {
      if (line.startsWith('&gt; ') || line.startsWith('> ')) {
        const content = line.replace(/^(&gt;|>) /, '');
        if (!inBlockquote) {
          inBlockquote = true;
          blockquoteContent = [content];
        } else {
          blockquoteContent.push(content);
        }
      } else {
        if (inBlockquote) {
          result.push(`<blockquote class="md-blockquote">${blockquoteContent.join('<br>')}</blockquote>`);
          inBlockquote = false;
          blockquoteContent = [];
        }
        result.push(line);
      }
    }
    
    // Handle trailing blockquote
    if (inBlockquote) {
      result.push(`<blockquote class="md-blockquote">${blockquoteContent.join('<br>')}</blockquote>`);
    }
    
    return result.join('\n');
  }

  /**
   * Process horizontal rules ---
   */
  private processHorizontalRules(html: string): string {
    return html.replace(/^---+$/gm, '<hr class="md-hr" />');
  }

  /**
   * Process ordered and unordered lists
   */
  private processLists(html: string): string {
    const lines = html.split('\n');
    const result: string[] = [];
    let inOrderedList = false;
    let inUnorderedList = false;
    let listItems: string[] = [];
    
    for (const line of lines) {
      const orderedMatch = line.match(/^(\d+)\. (.+)$/);
      const unorderedMatch = line.match(/^[-*] (.+)$/);
      
      if (orderedMatch) {
        if (inUnorderedList) {
          result.push(`<ul class="md-list md-ul">${listItems.map(item => `<li>${item}</li>`).join('')}</ul>`);
          inUnorderedList = false;
          listItems = [];
        }
        if (!inOrderedList) {
          inOrderedList = true;
          listItems = [];
        }
        listItems.push(orderedMatch[2]);
      } else if (unorderedMatch) {
        if (inOrderedList) {
          result.push(`<ol class="md-list md-ol">${listItems.map(item => `<li>${item}</li>`).join('')}</ol>`);
          inOrderedList = false;
          listItems = [];
        }
        if (!inUnorderedList) {
          inUnorderedList = true;
          listItems = [];
        }
        listItems.push(unorderedMatch[1]);
      } else {
        if (inOrderedList) {
          result.push(`<ol class="md-list md-ol">${listItems.map(item => `<li>${item}</li>`).join('')}</ol>`);
          inOrderedList = false;
          listItems = [];
        }
        if (inUnorderedList) {
          result.push(`<ul class="md-list md-ul">${listItems.map(item => `<li>${item}</li>`).join('')}</ul>`);
          inUnorderedList = false;
          listItems = [];
        }
        result.push(line);
      }
    }
    
    // Handle trailing lists
    if (inOrderedList) {
      result.push(`<ol class="md-list md-ol">${listItems.map(item => `<li>${item}</li>`).join('')}</ol>`);
    }
    if (inUnorderedList) {
      result.push(`<ul class="md-list md-ul">${listItems.map(item => `<li>${item}</li>`).join('')}</ul>`);
    }
    
    return result.join('\n');
  }

  /**
   * Wrap remaining text in paragraphs
   */
  private processParagraphs(html: string): string {
    // Split by double newlines
    const blocks = html.split(/\n\n+/);
    
    return blocks.map(block => {
      const trimmed = block.trim();
      
      // Don't wrap if already a block element
      if (!trimmed) return '';
      if (trimmed.startsWith('<h') || 
          trimmed.startsWith('<ul') || 
          trimmed.startsWith('<ol') ||
          trimmed.startsWith('<blockquote') ||
          trimmed.startsWith('<pre') ||
          trimmed.startsWith('<div') ||
          trimmed.startsWith('<hr') ||
          trimmed.startsWith('<img')) {
        return trimmed;
      }
      
      // Replace single newlines with <br> and wrap in <p>
      return `<p class="md-paragraph">${trimmed.replace(/\n/g, '<br>')}</p>`;
    }).join('\n');
  }

  /**
   * Basic syntax highlighting using tokenization approach
   * This avoids nested span issues by processing code character by character
   */
  private highlightCode(code: string, language: string): string {
    const lang = language.toLowerCase();
    
    // Get language config
    const config = this.getLanguageConfig(lang);
    if (!config) {
      return this.escapeHtmlEntities(code);
    }
    
    return this.tokenizeAndHighlight(code, config);
  }

  private getLanguageConfig(lang: string): LanguageConfig | null {
    const configs: Record<string, LanguageConfig> = {
      'javascript': { keywords: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'new', 'this', 'class', 'extends', 'import', 'export', 'from', 'default', 'async', 'await', 'try', 'catch', 'finally', 'throw', 'typeof', 'instanceof', 'in', 'of', 'null', 'undefined', 'true', 'false'], lineComment: '//', blockCommentStart: '/*', blockCommentEnd: '*/', stringDelimiters: ['"', "'", '`'] },
      'js': { keywords: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'new', 'this', 'class', 'extends', 'import', 'export', 'from', 'default', 'async', 'await', 'try', 'catch', 'finally', 'throw', 'typeof', 'instanceof', 'in', 'of', 'null', 'undefined', 'true', 'false'], lineComment: '//', blockCommentStart: '/*', blockCommentEnd: '*/', stringDelimiters: ['"', "'", '`'] },
      'typescript': { keywords: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'new', 'this', 'class', 'extends', 'import', 'export', 'from', 'default', 'async', 'await', 'try', 'catch', 'finally', 'throw', 'typeof', 'instanceof', 'in', 'of', 'null', 'undefined', 'true', 'false', 'interface', 'type', 'enum', 'implements', 'private', 'public', 'protected', 'readonly', 'abstract'], lineComment: '//', blockCommentStart: '/*', blockCommentEnd: '*/', stringDelimiters: ['"', "'", '`'] },
      'ts': { keywords: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'new', 'this', 'class', 'extends', 'import', 'export', 'from', 'default', 'async', 'await', 'try', 'catch', 'finally', 'throw', 'typeof', 'instanceof', 'in', 'of', 'null', 'undefined', 'true', 'false', 'interface', 'type', 'enum', 'implements', 'private', 'public', 'protected', 'readonly', 'abstract'], lineComment: '//', blockCommentStart: '/*', blockCommentEnd: '*/', stringDelimiters: ['"', "'", '`'] },
      'python': { keywords: ['def', 'class', 'if', 'elif', 'else', 'for', 'while', 'try', 'except', 'finally', 'with', 'as', 'import', 'from', 'return', 'yield', 'raise', 'pass', 'break', 'continue', 'and', 'or', 'not', 'in', 'is', 'True', 'False', 'None', 'lambda', 'global', 'nonlocal', 'assert', 'async', 'await'], lineComment: '#', stringDelimiters: ['"', "'"] },
      'py': { keywords: ['def', 'class', 'if', 'elif', 'else', 'for', 'while', 'try', 'except', 'finally', 'with', 'as', 'import', 'from', 'return', 'yield', 'raise', 'pass', 'break', 'continue', 'and', 'or', 'not', 'in', 'is', 'True', 'False', 'None', 'lambda', 'global', 'nonlocal', 'assert', 'async', 'await'], lineComment: '#', stringDelimiters: ['"', "'"] },
      'java': { keywords: ['public', 'private', 'protected', 'static', 'final', 'abstract', 'class', 'interface', 'extends', 'implements', 'new', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally', 'throw', 'throws', 'import', 'package', 'void', 'int', 'long', 'double', 'float', 'boolean', 'char', 'byte', 'short', 'String', 'null', 'true', 'false', 'this', 'super'], lineComment: '//', blockCommentStart: '/*', blockCommentEnd: '*/', stringDelimiters: ['"'] },
      'go': { keywords: ['break', 'case', 'chan', 'const', 'continue', 'default', 'defer', 'else', 'fallthrough', 'for', 'func', 'go', 'goto', 'if', 'import', 'interface', 'map', 'package', 'range', 'return', 'select', 'struct', 'switch', 'type', 'var', 'nil', 'true', 'false', 'iota', 'int', 'int8', 'int16', 'int32', 'int64', 'uint', 'uint8', 'uint16', 'uint32', 'uint64', 'float32', 'float64', 'complex64', 'complex128', 'byte', 'rune', 'string', 'bool', 'error'], lineComment: '//', blockCommentStart: '/*', blockCommentEnd: '*/', stringDelimiters: ['"', '`'] },
      'cpp': { keywords: ['auto', 'break', 'case', 'char', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum', 'extern', 'float', 'for', 'goto', 'if', 'int', 'long', 'register', 'return', 'short', 'signed', 'sizeof', 'static', 'struct', 'switch', 'typedef', 'union', 'unsigned', 'void', 'volatile', 'while', 'class', 'public', 'private', 'protected', 'virtual', 'friend', 'inline', 'namespace', 'new', 'delete', 'this', 'template', 'typename', 'using', 'try', 'catch', 'throw', 'true', 'false', 'nullptr', 'bool', 'string', 'include'], lineComment: '//', blockCommentStart: '/*', blockCommentEnd: '*/', stringDelimiters: ['"', "'"] },
      'c': { keywords: ['auto', 'break', 'case', 'char', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum', 'extern', 'float', 'for', 'goto', 'if', 'int', 'long', 'register', 'return', 'short', 'signed', 'sizeof', 'static', 'struct', 'switch', 'typedef', 'union', 'unsigned', 'void', 'volatile', 'while', 'include'], lineComment: '//', blockCommentStart: '/*', blockCommentEnd: '*/', stringDelimiters: ['"', "'"] },
      'ruby': { keywords: ['def', 'end', 'class', 'module', 'if', 'elsif', 'else', 'unless', 'case', 'when', 'while', 'until', 'for', 'do', 'begin', 'rescue', 'ensure', 'raise', 'return', 'yield', 'break', 'next', 'redo', 'retry', 'self', 'nil', 'true', 'false', 'and', 'or', 'not', 'in', 'require', 'require_relative', 'include', 'extend', 'attr_accessor', 'attr_reader', 'attr_writer'], lineComment: '#', stringDelimiters: ['"', "'"] },
      'rb': { keywords: ['def', 'end', 'class', 'module', 'if', 'elsif', 'else', 'unless', 'case', 'when', 'while', 'until', 'for', 'do', 'begin', 'rescue', 'ensure', 'raise', 'return', 'yield', 'break', 'next', 'redo', 'retry', 'self', 'nil', 'true', 'false', 'and', 'or', 'not', 'in', 'require', 'require_relative', 'include', 'extend', 'attr_accessor', 'attr_reader', 'attr_writer'], lineComment: '#', stringDelimiters: ['"', "'"] },
    };
    return configs[lang] || null;
  }

  private tokenizeAndHighlight(code: string, config: LanguageConfig): string {
    const result: string[] = [];
    let i = 0;
    const len = code.length;
    
    while (i < len) {
      // Check for line comment
      if (config.lineComment && code.substring(i, i + config.lineComment.length) === config.lineComment) {
        const endOfLine = code.indexOf('\n', i);
        const end = endOfLine === -1 ? len : endOfLine;
        result.push(`<span class="hljs-comment">${this.escapeHtmlEntities(code.substring(i, end))}</span>`);
        i = end;
        continue;
      }
      
      // Check for block comment
      if (config.blockCommentStart && code.substring(i, i + config.blockCommentStart.length) === config.blockCommentStart) {
        const endIdx = code.indexOf(config.blockCommentEnd!, i + config.blockCommentStart.length);
        const end = endIdx === -1 ? len : endIdx + config.blockCommentEnd!.length;
        result.push(`<span class="hljs-comment">${this.escapeHtmlEntities(code.substring(i, end))}</span>`);
        i = end;
        continue;
      }
      
      // Check for strings
      let foundString = false;
      for (const delim of config.stringDelimiters) {
        if (code[i] === delim) {
          const endIdx = this.findStringEnd(code, i + 1, delim);
          result.push(`<span class="hljs-string">${this.escapeHtmlEntities(code.substring(i, endIdx))}</span>`);
          i = endIdx;
          foundString = true;
          break;
        }
      }
      if (foundString) continue;
      
      // Check for numbers
      if (/\d/.test(code[i]) && (i === 0 || !/\w/.test(code[i - 1]))) {
        let j = i;
        while (j < len && /[\d.xXbBoOeEfFlLuU]/.test(code[j])) j++;
        result.push(`<span class="hljs-number">${this.escapeHtmlEntities(code.substring(i, j))}</span>`);
        i = j;
        continue;
      }
      
      // Check for keywords/identifiers
      if (/[a-zA-Z_]/.test(code[i])) {
        let j = i;
        while (j < len && /\w/.test(code[j])) j++;
        const word = code.substring(i, j);
        if (config.keywords.includes(word)) {
          result.push(`<span class="hljs-keyword">${this.escapeHtmlEntities(word)}</span>`);
        } else {
          result.push(this.escapeHtmlEntities(word));
        }
        i = j;
        continue;
      }
      
      // Regular character
      result.push(this.escapeHtmlEntities(code[i]));
      i++;
    }
    
    return result.join('');
  }

  private findStringEnd(code: string, start: number, delim: string): number {
    let i = start;
    while (i < code.length) {
      if (code[i] === '\\' && i + 1 < code.length) {
        i += 2; // Skip escaped character
        continue;
      }
      if (code[i] === delim) {
        return i + 1;
      }
      if (delim !== '`' && code[i] === '\n') {
        return i; // End at newline for single-line strings
      }
      i++;
    }
    return code.length;
  }
  private escapeHtmlEntities(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private getLanguageLabel(language: string): string {
    const labels: Record<string, string> = {
      'javascript': 'JavaScript',
      'js': 'JavaScript',
      'typescript': 'TypeScript',
      'ts': 'TypeScript',
      'python': 'Python',
      'py': 'Python',
      'java': 'Java',
      'cpp': 'C++',
      'c++': 'C++',
      'c': 'C',
      'csharp': 'C#',
      'cs': 'C#',
      'ruby': 'Ruby',
      'rb': 'Ruby',
      'go': 'Go',
      'rust': 'Rust',
      'swift': 'Swift',
      'kotlin': 'Kotlin',
      'scala': 'Scala',
      'php': 'PHP',
      'sql': 'SQL',
      'html': 'HTML',
      'css': 'CSS',
      'scss': 'SCSS',
      'json': 'JSON',
      'yaml': 'YAML',
      'xml': 'XML',
      'bash': 'Bash',
      'shell': 'Shell',
      'sh': 'Shell',
      'plaintext': 'Plain Text',
      'text': 'Plain Text'
    };
    
    return labels[language.toLowerCase()] || language.toUpperCase();
  }

  /**
   * Get current multi-tab blocks (for external tab switching)
   */
  getMultiTabBlocks(): Map<string, MultiTabCodeBlock> {
    return this.multiTabBlocks;
  }

  /**
   * Initialize global tab switching function
   * Call this after rendering content
   */
  initializeTabSwitching(): void {
    (window as any).switchCodeTab = (blockId: string, tabIndex: number) => {
      const block = document.querySelector(`[data-block-id="${blockId}"]`);
      if (!block) return;
      
      // Update buttons
      block.querySelectorAll('.code-tab-btn').forEach((btn, index) => {
        btn.classList.toggle('active', index === tabIndex);
      });
      
      // Update panels
      block.querySelectorAll('.code-tab-panel').forEach((panel, index) => {
        panel.classList.toggle('active', index === tabIndex);
      });
    };

    (window as any).copyCodeBlock = (blockId: string) => {
      const block = document.querySelector(`[data-block-id="${blockId}"]`);
      if (!block) return;
      
      const activePanel = block.querySelector('.code-tab-panel.active code');
      if (activePanel) {
        const code = activePanel.textContent || '';
        navigator.clipboard.writeText(code).then(() => {
          // Show feedback
          const copyBtn = block.querySelector('.code-copy-btn');
          if (copyBtn) {
            copyBtn.classList.add('copied');
            setTimeout(() => copyBtn.classList.remove('copied'), 2000);
          }
        });
      }
    };
  }
}
