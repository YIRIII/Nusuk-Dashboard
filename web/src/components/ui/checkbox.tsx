import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
  className?: string;
  'aria-label'?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export function Checkbox({ checked, onChange, className, onClick, ...rest }: Props) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={rest['aria-label']}
      onClick={(e) => {
        onClick?.(e);
        onChange(!checked);
      }}
      className={cn(
        'h-5 w-5 shrink-0 rounded-md border border-input bg-background transition-colors',
        'flex items-center justify-center',
        'hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        checked && 'bg-primary border-primary text-primary-foreground',
        className,
      )}
    >
      {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
    </button>
  );
}
