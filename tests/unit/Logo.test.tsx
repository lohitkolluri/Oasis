import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { Logo } from '@/components/ui/Logo';

// Mock Next.js Image component safely for non-browser Node environments
vi.mock('next/image', () => ({
  default: (props: any) => <img {...props} />
}));

describe('Logo', () => {
  it('renders correctly with default sizes and props', () => {
    const { container } = render(<Logo />);
    const img = container.querySelector('img');
    
    expect(img).toBeDefined();
    expect(img?.getAttribute('width')).toBe('32');
    expect(img?.getAttribute('src')).toBe('/logo.png');
    // Ensure the priority boolean didn't crash
  });

  it('renders with custom sizes safely', () => {
    const { container } = render(<Logo size={64} />);
    const img = container.querySelector('img');
    expect(img?.getAttribute('width')).toBe('64');
    expect(img?.getAttribute('height')).toBe('64');
  });
});
