import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Option<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

interface Props<T extends string> {
  value: T;
  options: [Option<T>, Option<T>];
  onChange: (v: T) => void;
  className?: string;
}

export function Switch<T extends string>({ value, options, onChange, className }: Props<T>) {
  const activeIndex = options.findIndex((o) => o.value === value);

  return (
    <div
      className={cn(
        'relative inline-flex rounded-full border border-border bg-accent/40 p-1 backdrop-blur',
        className,
      )}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        className="absolute top-1 bottom-1 rounded-full bg-primary shadow-md"
        style={{
          insetInlineStart: activeIndex === 0 ? '4px' : 'calc(50% + 0px)',
          width: 'calc(50% - 4px)',
        }}
      />
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'relative z-10 flex min-w-[7rem] items-center justify-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              active ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
