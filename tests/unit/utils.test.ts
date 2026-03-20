import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('Utils', () => {
  describe('cn()', () => {
    it('merges tailwind classes correctly via clsx and tw-merge', () => {
      // Basic concatenation
      expect(cn('bg-red-500', 'text-white')).toBe('bg-red-500 text-white');
      
      // Merge conflict resolution (the last class wins out)
      expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');
      
      // Compound rule overriding
      expect(cn('px-2 py-1', 'p-4')).toBe('p-4');
      
      // Conditional classes
      expect(cn('base-class', true && 'truthy-class', false && 'falsy-class')).toBe('base-class truthy-class');
    });
  });
});
