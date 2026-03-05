import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  forwardRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

// Monaco types
declare const monaco: any;

@Component({
  selector: 'app-monaco-editor',
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MonacoEditorComponent),
      multi: true
    }
  ],
  template: `
    <div class="monaco-wrapper" [style.height]="height">
      <div #editorContainer class="editor-container"></div>
      @if (!editorLoaded) {
        <div class="loading-overlay">
          <i class="pi pi-spin pi-spinner"></i>
          <span>Loading editor...</span>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
    .monaco-wrapper {
      position: relative;
      width: 100%;
      height: 100%;
      min-height: 300px;
    }
    .editor-container {
      width: 100%;
      height: 100%;
    }
    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: var(--surface-ground);
      color: var(--text-color-secondary);
      font-size: 14px;
    }
    .loading-overlay i {
      font-size: 20px;
    }
  `]
})
export class MonacoEditorComponent implements AfterViewInit, OnDestroy, OnChanges, ControlValueAccessor {
  @ViewChild('editorContainer', { static: true }) editorContainer!: ElementRef;

  @Input() language: string = 'markdown';
  @Input() height: string = '400px';
  @Input() theme: string = 'vs-dark';
  @Input() options: any = {};
  @Input() readOnly: boolean = false;

  @Output() ready = new EventEmitter<any>();
  @Output() contentChange = new EventEmitter<string>();

  private editor: any;
  private value: string = '';
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};
  private static monacoLoaded = false;
  private static monacoLoading = false;
  private static loadCallbacks: (() => void)[] = [];

  editorLoaded = false;

  ngAfterViewInit(): void {
    this.loadMonaco();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.editor) {
      if (changes['language']) {
        monaco.editor.setModelLanguage(this.editor.getModel(), this.language);
      }
      if (changes['theme']) {
        monaco.editor.setTheme(this.theme);
      }
      if (changes['readOnly']) {
        this.editor.updateOptions({ readOnly: this.readOnly });
      }
    }
  }

  ngOnDestroy(): void {
    if (this.editor) {
      this.editor.dispose();
    }
  }

  // ControlValueAccessor
  writeValue(value: string): void {
    this.value = value || '';
    if (this.editor && this.editor.getValue() !== this.value) {
      this.editor.setValue(this.value);
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    if (this.editor) {
      this.editor.updateOptions({ readOnly: isDisabled });
    }
  }

  // Public methods
  getValue(): string {
    return this.editor ? this.editor.getValue() : this.value;
  }

  setValue(value: string): void {
    this.value = value;
    if (this.editor) {
      this.editor.setValue(value);
    }
  }

  focus(): void {
    if (this.editor) {
      this.editor.focus();
    }
  }

  getEditor(): any {
    return this.editor;
  }

  private loadMonaco(): void {
    if (MonacoEditorComponent.monacoLoaded) {
      this.initEditor();
      return;
    }

    if (MonacoEditorComponent.monacoLoading) {
      MonacoEditorComponent.loadCallbacks.push(() => this.initEditor());
      return;
    }

    MonacoEditorComponent.monacoLoading = true;

    // Configure Monaco's loader
    const script = document.createElement('script');
    script.src = '/monaco/vs/loader.js';
    script.onload = () => {
      (window as any).require.config({
        paths: { vs: '/monaco/vs' }
      });

      (window as any).require(['vs/editor/editor.main'], () => {
        MonacoEditorComponent.monacoLoaded = true;
        MonacoEditorComponent.monacoLoading = false;
        this.initEditor();
        MonacoEditorComponent.loadCallbacks.forEach(cb => cb());
        MonacoEditorComponent.loadCallbacks = [];
      });
    };
    document.head.appendChild(script);
  }

  private initEditor(): void {
    const defaultOptions = {
      value: this.value,
      language: this.language,
      theme: this.theme,
      automaticLayout: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 14,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
      lineNumbers: 'on',
      renderLineHighlight: 'line',
      wordWrap: 'on',
      readOnly: this.readOnly,
      padding: { top: 12, bottom: 12 },
      ...this.options
    };

    this.editor = monaco.editor.create(this.editorContainer.nativeElement, defaultOptions);

    // Listen for changes
    this.editor.onDidChangeModelContent(() => {
      const value = this.editor.getValue();
      this.value = value;
      this.onChange(value);
      this.contentChange.emit(value);
    });

    this.editor.onDidBlurEditorWidget(() => {
      this.onTouched();
    });

    this.editorLoaded = true;
    this.ready.emit(this.editor);
  }
}
