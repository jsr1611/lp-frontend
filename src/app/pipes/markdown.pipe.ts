import { Pipe, PipeTransform } from '@angular/core';
import { marked } from 'marked';

marked.setOptions({ gfm: true, breaks: false });

/**
 * Renders Markdown to HTML. Use with [innerHTML], which also runs Angular's sanitizer,
 * so scripts and event handlers in a post are stripped.
 */
@Pipe({ name: 'markdown', standalone: false })
export class MarkdownPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';
    return marked.parse(value, { async: false }) as string;
  }
}
