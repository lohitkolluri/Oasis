import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '@/components/ui/StatusBadge';

describe('StatusBadge', () => {
  it('renders correctly with default automatic label', () => {
    render(<StatusBadge status="active" />);
    // label should automatically capitalize 'active' => 'Active'
    expect(screen.getByText('Active')).toBeDefined();
  });

  it('renders with a custom explicitly provided label', () => {
    render(<StatusBadge status="high" label="Critical Issue" />);
    // Should render 'Critical Issue' instead of 'High'
    expect(screen.queryByText('High')).toBeNull();
    expect(screen.getByText('Critical Issue')).toBeDefined();
  });

  it('renders the specific pulse animation class when pulse=true is provided', () => {
    const { container } = render(<StatusBadge status="high" pulse={true} />);
    // In StatusBadge, 'high' status has 'animate-violet-pulse' when pulse is true
    expect(container.querySelector('.animate-violet-pulse')).toBeDefined();
    expect(container.innerHTML).toContain('animate-violet-pulse');
  });

  it('falls back to "low" styling for invalid or unknown statuses safely', () => {
    // @ts-expect-error - Ignoring type to simulate runtime invalid status
    const { container } = render(<StatusBadge status="unknown_status" label="Unknown" />);
    expect(screen.getByText('Unknown')).toBeDefined();
    // 'low' status has background '#262626'
    expect(container.innerHTML).toContain('bg-[#262626]');
  });
});
