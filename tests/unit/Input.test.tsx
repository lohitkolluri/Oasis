import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Input } from '@/components/ui/input';

describe('Input', () => {
  it('renders and passes HTML attributes natively', () => {
    render(<Input placeholder="Type here" type="password" disabled />);
    
    // We assert that the placeholder correctly roots it and properties flow down identically
    const input = screen.getByPlaceholderText('Type here') as HTMLInputElement;
    
    expect(input).toBeDefined();
    expect(input.type).toBe('password');
    expect(input.disabled).toBeTruthy();
  });
});
