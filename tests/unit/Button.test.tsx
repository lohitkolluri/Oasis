import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/Button';

describe('Button', () => {
  it('renders default button correctly', () => {
    render(<Button>Click Me</Button>);
    const btn = screen.getByRole('button', { name: /click me/i });
    expect(btn).toBeDefined();
    // Ensures 'disabled' is falsy by default
    expect((btn as HTMLButtonElement).disabled).toBeFalsy();
  });

  it('triggers onClick callback when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Action</Button>);
    
    const btn = screen.getByRole('button', { name: /action/i });
    fireEvent.click(btn);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('disables the button and prevents clicks', () => {
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Disabled</Button>);
    
    const btn = screen.getByRole('button', { name: /disabled/i });
    fireEvent.click(btn);
    
    expect((btn as HTMLButtonElement).disabled).toBeTruthy();
    // Native disabled buttons do not fire click events in the browser or jsdom
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('applies the fullWidth class when requested', () => {
    const { container } = render(<Button fullWidth>Wide</Button>);
    const btn = container.querySelector('button');
    expect(btn?.className).toContain('w-full');
  });
});
