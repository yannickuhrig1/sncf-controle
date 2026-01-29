import { User, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ViewMode } from '@/hooks/useControlsWithFilter';

interface ViewModeToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function ViewModeToggle({ viewMode, onViewModeChange }: ViewModeToggleProps) {
  return (
    <div className="flex items-center rounded-lg border p-1 bg-muted/30">
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-7 px-3 text-xs gap-1.5",
          viewMode === 'my-data' && "bg-background shadow-sm"
        )}
        onClick={() => onViewModeChange('my-data')}
      >
        <User className="h-3.5 w-3.5" />
        Mes données
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-7 px-3 text-xs gap-1.5",
          viewMode === 'all-data' && "bg-background shadow-sm"
        )}
        onClick={() => onViewModeChange('all-data')}
      >
        <Users className="h-3.5 w-3.5" />
        Tout voir
      </Button>
    </div>
  );
}
