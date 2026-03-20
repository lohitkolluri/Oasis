import { describe, expect, it } from 'vitest';
import { isMobileForGps } from '@/lib/utils/device';

describe('isMobileForGps', () => {
  it('returns true for common mobile user agents', () => {
    const iphoneUA =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
    const androidUA =
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36';

    expect(isMobileForGps(iphoneUA)).toBe(true);
    expect(isMobileForGps(androidUA)).toBe(true);
  });

  it('returns false for desktop or invalid user agents', () => {
    const desktopUA =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

    expect(isMobileForGps(desktopUA)).toBe(false);
    expect(isMobileForGps('')).toBe(false);
  });
});
