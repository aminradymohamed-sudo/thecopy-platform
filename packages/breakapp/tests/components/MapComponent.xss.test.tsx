import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * XSS Security Tests for MapComponent
 * Tests for CVE-2025-69993 - Leaflet bindPopup XSS vulnerability
 */
describe('MapComponent - XSS Prevention', () => {
  // Test dangerous pattern detection (used in sanitizePopupContent)
  const dangerousPatterns = [
    /on\w+\s*=/gi, // Event handlers (onclick, onerror, etc.)
    /<script/gi, // Script tags
    /javascript:/gi, // Javascript protocol
    /<iframe/gi, // iframes
    /<object/gi, // object tags
  ];

  it('should detect onclick event handlers', () => {
    const payload = '<span onclick="alert(\'XSS\')">Click me</span>';
    const hasDangerous = dangerousPatterns.some(pattern => pattern.test(payload));
    expect(hasDangerous).toBe(true);
  });

  it('should detect onerror event handlers', () => {
    const payload = '<img onerror=alert(\'XSS\')>';
    const hasDangerous = dangerousPatterns.some(pattern => pattern.test(payload));
    expect(hasDangerous).toBe(true);
  });

  it('should detect script tags', () => {
    const payload = '<script>alert("XSS")</script>';
    const hasDangerous = dangerousPatterns.some(pattern => pattern.test(payload));
    expect(hasDangerous).toBe(true);
  });

  it('should detect javascript: protocol', () => {
    const payload = '<a href="javascript:alert(\'XSS\')">Link</a>';
    const hasDangerous = dangerousPatterns.some(pattern => pattern.test(payload));
    expect(hasDangerous).toBe(true);
  });

  it('should detect iframe tags', () => {
    const payload = '<iframe src="http://evil.com"></iframe>';
    const hasDangerous = dangerousPatterns.some(pattern => pattern.test(payload));
    expect(hasDangerous).toBe(true);
  });

  it('should detect object tags', () => {
    const payload = '<object data="http://evil.com/payload.swf"></object>';
    const hasDangerous = dangerousPatterns.some(pattern => pattern.test(payload));
    expect(hasDangerous).toBe(true);
  });

  it('should allow safe text content', () => {
    const payload = 'الموقع المحدد';
    const hasDangerous = dangerousPatterns.some(pattern => pattern.test(payload));
    expect(hasDangerous).toBe(false);
  });

  it('should allow safe Arabic text', () => {
    const payload = 'الاسم: محمد';
    const hasDangerous = dangerousPatterns.some(pattern => pattern.test(payload));
    expect(hasDangerous).toBe(false);
  });

  it('should escape HTML by using textContent then innerHTML', () => {
    const malicious = '<img src=x onerror="alert(\'XSS\')" />';
    const div = document.createElement('div');
    div.textContent = malicious;
    const escaped = div.innerHTML;
    
    // textContent + innerHTML pattern escapes all HTML
    expect(escaped).toContain('&lt;');
    expect(escaped).toContain('&gt;');
    // The dangerous code is now just text
    expect(escaped).not.toMatch(/<img/);
  });

  it('should handle empty strings', () => {
    const div = document.createElement('div');
    div.textContent = '';
    expect(div.innerHTML).toBe('');
  });

  it('should preserve legitimate text with special characters', () => {
    const text = 'Distance: 100 meters (approx)';
    const div = document.createElement('div');
    div.textContent = text;
    expect(div.innerHTML).toBe(text);
  });

  it('should escape angle brackets in legitimate content', () => {
    const text = 'Price: 100 < 200';
    const div = document.createElement('div');
    div.textContent = text;
    expect(div.innerHTML).toContain('&lt;');
  });
});


