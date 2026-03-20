import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '@/components/ui/badge';

describe('Badge', () => {
  it('renders default badge properly via useRender hook', () => {
    render(<Badge>Default</Badge>);
    const badgeElement = screen.getByText('Default');
    expect(badgeElement).toBeDefined();
  });

  it('renders destructive class conditionally', () => {
    const { container } = render(<Badge variant="destructive">Error</Badge>);
    // Destructive class applies 'bg-destructive/10' or similar
    expect(container.innerHTML).toContain('destructive');
  });
});
