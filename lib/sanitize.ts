const BLOCKED_PATTERNS = [
  /fetch\s*\(/gi,
  /XMLHttpRequest/gi,
  /WebSocket/gi,
  /new\s+EventSource/gi,
  /navigator\.sendBeacon/gi,
  /eval\s*\(/gi,
  /new\s+Function\s*\(/gi,
  /import\s*\(/gi,
  /document\.cookie/gi,
  /localStorage/gi,
  /sessionStorage/gi,
  /indexedDB/gi,
  /<script[^>]+src\s*=/gi,
  /<link[^>]+href\s*=\s*["']https?:/gi,
  /<iframe/gi,
  /window\.open/gi,
  /window\.location/gi,
  /document\.domain/gi,
];

// Patterns that catch common bypass attempts
const BYPASS_PATTERNS = [
  /\[\s*['"`]fetch['"`]\s*\]/gi,         // window['fetch']
  /\[\s*['"`]XMLHttpRequest['"`]\s*\]/gi, // window['XMLHttpRequest']
  /\[\s*['"`]WebSocket['"`]\s*\]/gi,      // window['WebSocket']
  /\[\s*['"`]eval['"`]\s*\]/gi,           // window['eval']
  /Function\s*\.\s*prototype/gi,           // Function.prototype.constructor
  /constructor\s*\(\s*['"`]/gi,            // .constructor('return fetch')
  /\[\s*['"`]constructor['"`]\s*\]/gi,     // [].constructor.constructor
  /atob\s*\(/gi,                           // base64 decode (obfuscation vector)
  /String\s*\.\s*fromCharCode/gi,          // character code construction
  /document\s*\.\s*createElement\s*\(\s*['"`]script/gi,
  /document\s*\.\s*createElement\s*\(\s*['"`]link/gi,
  /document\s*\.\s*createElement\s*\(\s*['"`]iframe/gi,
  /<meta[^>]*http-equiv\s*=\s*['"]?Content-Security-Policy/gi, // CSP override attempt
  /<img[^>]+src\s*=\s*['"]https?:/gi,     // external image requests (data exfil)
  /<[^>]+\bon\w+\s*=/gi,                  // ANY HTML event handler (onclick, onerror, onload, etc.)
];

const MAX_SIZE = 512 * 1024; // 512KB
const MAX_TITLE_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;

export interface SanitizeResult {
  valid: boolean;
  errors: string[];
  sanitizedHtml?: string;
}

export interface ValidateFieldsResult {
  valid: boolean;
  errors: string[];
  title?: string;
  description?: string | null;
}

export function validateGameFields(title: string, description?: string): ValidateFieldsResult {
  const errors: string[] = [];

  if (!title || typeof title !== 'string') {
    errors.push('Title is required');
    return { valid: false, errors };
  }

  const cleanTitle = title.trim().slice(0, MAX_TITLE_LENGTH);
  if (cleanTitle.length < 2) {
    errors.push('Title must be at least 2 characters');
  }

  // Strip any HTML tags from title and description
  const titleClean = cleanTitle.replace(/<[^>]*>/g, '');
  const descClean = description
    ? description.trim().slice(0, MAX_DESCRIPTION_LENGTH).replace(/<[^>]*>/g, '')
    : null;

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, errors: [], title: titleClean, description: descClean };
}

export function sanitizeGameHtml(html: string): SanitizeResult {
  const errors: string[] = [];

  // Size check
  if (html.length > MAX_SIZE) {
    errors.push(`Game HTML exceeds maximum size (${Math.round(html.length / 1024)}KB > 512KB)`);
  }

  // Check for blocked patterns
  for (const pattern of BLOCKED_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(html)) {
      errors.push(`Blocked pattern found: ${pattern.source}`);
    }
  }

  // Check for bypass attempts
  for (const pattern of BYPASS_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(html)) {
      errors.push(`Suspicious pattern found: ${pattern.source}`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Strip any existing CSP meta tags to prevent override attacks
  let sanitizedHtml = html.replace(/<meta[^>]*http-equiv\s*=\s*['"]?Content-Security-Policy[^>]*>/gi, '');

  // Inject our CSP meta tag
  const cspTag = '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data: blob:;">';

  if (sanitizedHtml.includes('<head>')) {
    sanitizedHtml = sanitizedHtml.replace('<head>', `<head>\n${cspTag}`);
  } else if (sanitizedHtml.includes('<html>')) {
    sanitizedHtml = sanitizedHtml.replace('<html>', `<html>\n<head>${cspTag}</head>`);
  } else {
    sanitizedHtml = `${cspTag}\n${sanitizedHtml}`;
  }

  return { valid: true, errors: [], sanitizedHtml };
}
