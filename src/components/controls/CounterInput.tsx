import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CounterInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
  sublabel?: string;
  variant?: 'default' | 'success' | 'danger';
  showTotal?: { unitPrice: number; label: string };
  steps?: number[]; // e.g., [1, 10] for ±1 and ±10 buttons
  allowManualInput?: boolean;
}

export function CounterInput({
  value,
  onChange,
  min = 0,
  max = 999,
  label,
  sublabel,
  variant = 'default',
  showTotal,
  steps,
  allowManualInput = true,
}: CounterInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  const colorClasses = {
    default: 'text-foreground',
    success: 'text-green-600 dark:text-green-400',
    danger: 'text-red-600 dark:text-red-400',
  };

  const bgClasses = {
    default: 'bg-muted',
    success: 'bg-green-100 dark:bg-green-900/30',
    danger: 'bg-red-100 dark:bg-red-900/30',
  };

  useEffect(() => {
    if (!isEditing) {
      setInputValue(String(value));
    }
  }, [value, isEditing]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleChange = (delta: number) => {
    const newValue = Math.max(min, Math.min(max, value + delta));
    onChange(newValue);
  };

  const handleManualSubmit = () => {
    const parsed = parseInt(inputValue, 10);
    if (!isNaN(parsed)) {
      const clamped = Math.max(min, Math.min(max, parsed));
      onChange(clamped);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleManualSubmit();
    } else if (e.key === 'Escape') {
      setInputValue(String(value));
      setIsEditing(false);
    }
  };

  const renderValueDisplay = () => {
    if (isEditing && allowManualInput) {
      return (
        <Input
          ref={inputRef}
          type="number"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleManualSubmit}
          onKeyDown={handleKeyDown}
          className={cn(
            'h-9 text-center font-semibold text-lg min-w-[60px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
            colorClasses[variant]
          )}
          min={min}
          max={max}
        />
      );
    }

    return (
      <div
        onClick={() => allowManualInput && setIsEditing(true)}
        className={cn(
          'flex-1 h-9 flex items-center justify-center rounded-md font-semibold text-lg min-w-[60px] transition-colors',
          bgClasses[variant],
          colorClasses[variant],
          allowManualInput && 'cursor-pointer hover:ring-2 hover:ring-primary/50'
        )}
        title={allowManualInput ? 'Cliquer pour saisir manuellement' : undefined}
      >
        {value}
      </div>
    );
  };

  // If steps are provided, use multi-step layout
  if (steps && steps.length > 0) {
    return (
      <div className="space-y-1.5">
        {label && (
          <div>
            <span className={cn('text-sm font-medium', colorClasses[variant])}>
              {label}
            </span>
            {sublabel && (
              <p className="text-xs text-muted-foreground">{sublabel}</p>
            )}
          </div>
        )}
        <div className="flex items-center gap-1.5">
          {/* Minus buttons (largest step first) */}
          {[...steps].reverse().map((step) => (
            <Button
              key={`minus-${step}`}
              type="button"
              variant="outline"
              size="sm"
              className="h-9 px-2.5 text-xs font-medium"
              onClick={() => handleChange(-step)}
              disabled={value <= min}
            >
              <Minus className="h-3 w-3 mr-0.5" />
              {step}
            </Button>
          ))}
          
          {/* Value display */}
          {renderValueDisplay()}
          
          {/* Plus buttons (smallest step first) */}
          {steps.map((step) => (
            <Button
              key={`plus-${step}`}
              type="button"
              variant="outline"
              size="sm"
              className="h-9 px-2.5 text-xs font-medium"
              onClick={() => handleChange(step)}
              disabled={value >= max}
            >
              <Plus className="h-3 w-3 mr-0.5" />
              {step}
            </Button>
          ))}
        </div>
        {showTotal && value > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            {showTotal.label}: {value} × {showTotal.unitPrice}€ ={' '}
            <span className="font-medium">{value * showTotal.unitPrice}€</span>
          </p>
        )}
      </div>
    );
  }

  // Default single-step layout
  return (
    <div className="space-y-1.5">
      {label && (
        <div>
          <span className={cn('text-sm font-medium', colorClasses[variant])}>
            {label}
          </span>
          {sublabel && (
            <p className="text-xs text-muted-foreground">{sublabel}</p>
          )}
        </div>
      )}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={() => handleChange(-1)}
          disabled={value <= min}
        >
          <Minus className="h-4 w-4" />
        </Button>
        {renderValueDisplay()}
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={() => handleChange(1)}
          disabled={value >= max}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {showTotal && value > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {showTotal.label}: {value} × {showTotal.unitPrice}€ ={' '}
          <span className="font-medium">{value * showTotal.unitPrice}€</span>
        </p>
      )}
    </div>
  );
}
