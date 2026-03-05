import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MarkdownRenderService } from '../services/markdown-render.service';

/**
 * Pipe to render markdown content in templates
 * Usage: {{ markdownContent | markdown }}
 */
@Pipe({
  name: 'markdown',
  standalone: true
})
export class MarkdownPipe implements PipeTransform {
  constructor(
    private markdownService: MarkdownRenderService,
    private sanitizer: DomSanitizer
  ) {}

  transform(value: string | null | undefined): SafeHtml {
    if (!value) {
      return this.sanitizer.bypassSecurityTrustHtml('');
    }
    return this.markdownService.render(value);
  }
}
