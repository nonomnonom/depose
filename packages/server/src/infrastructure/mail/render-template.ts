import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { EmailTemplate } from './render.js';

const TEMPLATES_DIR = resolve(__dirname, 'templates');

function loadTemplate(name: EmailTemplate): string {
  const filePath = join(TEMPLATES_DIR, `${name}.html`);
  try {
    return readFileSync(filePath, 'utf8');
  } catch {
    throw new Error(`Missing email template: ${filePath}`);
  }
}

export function renderTemplate(template: EmailTemplate, ctx: Record<string, unknown>): string {
  const html = loadTemplate(template);
  return html.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = ctx[key];
    if (value == null) {
      return '';
    }
    return String(value);
  });
}
