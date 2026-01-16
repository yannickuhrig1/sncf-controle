import { cn } from '@/lib/utils';

interface TarifTypeToggleProps {
  types: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}

export function TarifTypeToggle({ types, value, onChange }: TarifTypeToggleProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {types.map((type) => (
        <button
          key={type.value}
          type="button"
          onClick={() => onChange(type.value)}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-full transition-colors',
            value === type.value
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          )}
        >
          {type.label}
        </button>
      ))}
    </div>
  );
}
