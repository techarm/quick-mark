import { describe, expect, it } from 'vitest';
import type { Link } from './types';
import { formatDate, getDomain, getExpiryInfo } from './utils';

describe('getDomain', () => {
  it('returns hostname from a valid URL', () => {
    expect(getDomain('https://example.com/path?q=1')).toBe('example.com');
  });

  it('returns hostname from URL with subdomain', () => {
    expect(getDomain('https://sub.example.com')).toBe('sub.example.com');
  });

  it('returns original string for invalid URL', () => {
    expect(getDomain('not-a-url')).toBe('not-a-url');
  });

  it('returns original string for empty string', () => {
    expect(getDomain('')).toBe('');
  });
});

const baseLink: Link = {
  id: '1',
  url: 'https://example.com',
  title: 'Test',
  description: null,
  favicon_url: null,
  category_id: null,
  workspace_id: null,
  is_temporary: false,
  expires_at: null,
  visit_count: 0,
  last_visited_at: null,
  is_pinned: false,
  position: 0,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

describe('getExpiryInfo', () => {
  it('returns null for non-temporary links', () => {
    expect(getExpiryInfo(baseLink)).toBeNull();
  });

  it('returns null for temporary links without expires_at', () => {
    expect(getExpiryInfo({ ...baseLink, is_temporary: true })).toBeNull();
  });

  it('returns expired info for past dates', () => {
    const result = getExpiryInfo({
      ...baseLink,
      is_temporary: true,
      expires_at: '2020-01-01T00:00:00Z',
    });
    expect(result).toEqual({ label: '期限切れ', urgent: true });
  });

  it('returns hours remaining when less than 1 day', () => {
    const soon = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(); // 3 hours
    const result = getExpiryInfo({
      ...baseLink,
      is_temporary: true,
      expires_at: soon,
    });
    expect(result).not.toBeNull();
    expect(result!.urgent).toBe(true);
    expect(result!.label).toMatch(/あと\d+時間/);
  });

  it('returns days remaining when more than 1 day', () => {
    const later = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(); // 5 days
    const result = getExpiryInfo({
      ...baseLink,
      is_temporary: true,
      expires_at: later,
    });
    expect(result).not.toBeNull();
    expect(result!.urgent).toBe(false);
    expect(result!.label).toMatch(/あと\d+日/);
  });
});

describe('formatDate', () => {
  it('formats a valid date string in ja-JP format', () => {
    const result = formatDate('2025-06-15T14:30:00Z');
    // Should contain year, month, day, hour, minute
    expect(result).toMatch(/2025/);
    expect(result).toMatch(/06/);
    expect(result).toMatch(/15/);
  });

  it('returns original string for invalid date', () => {
    expect(formatDate('invalid-date')).toBe('invalid-date');
  });
});
