import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader } from '@/components/ui/Card';

describe('Card', () => {
  it('renders successfully with default base styles', () => {
    const { container } = render(<Card>Card Content</Card>);
    expect(screen.getByText('Card Content')).toBeDefined();
    // Default variant has 'bg-[#161616]'
    expect(container.innerHTML).toContain('bg-[#161616]');
    // Default padding is 'md' => 'p-5'
    expect(container.innerHTML).toContain('p-5');
  });

  it('renders the neon variant and small padding', () => {
    const { container } = render(<Card variant="neon" padding="sm">Neon Card</Card>);
    expect(container.innerHTML).toContain('shadow-neon-cyan-sm');
    expect(container.innerHTML).toContain('p-4');
  });
});

describe('CardHeader', () => {
  it('renders the title and description cleanly', () => {
    render(
      <CardHeader 
        title="Admin Panel" 
        description="Manage your users here" 
        badge={<span>Active</span>} 
      />
    );
    expect(screen.getByText('Admin Panel')).toBeDefined();
    expect(screen.getByText('Manage your users here')).toBeDefined();
    expect(screen.getByText('Active')).toBeDefined();
  });
});
