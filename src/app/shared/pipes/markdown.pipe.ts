import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SecurityContext } from '@angular/platform-browser';
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

  transform(value: string | null | undefined): string {
    if (!value) {
      return '';
    }
    // render() now returns sanitized HTML string (safe)
    return this.markdownService.render(value);
  }
}
