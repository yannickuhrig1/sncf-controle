import { User, Users, UsersRound, UserSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ViewMode } from '@/hooks/useControlsWithFilter';

interface ViewModeToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  showTeamAgent?: boolean;
}

export function ViewModeToggle({ viewMode, onViewModeChange, showTeamAgent = false }: ViewModeToggleProps) {
  const modes: { value: ViewMode; label: string; icon: React.ElementType }[] = [
    { value: 'my-data', label: 'Mes données', icon: User },
    { value: 'all-data', label: 'Tout voir', icon: Users },
    ...(showTeamAgent ? [
      { value: 'by-team' as ViewMode, label: 'Équipe', icon: UsersRound },
      { value: 'by-agent' as ViewMode, label: 'Agent', icon: UserSearch },
    ] : []),
  ];

  return (
    <div className="flex items-center rounded-lg border p-1 bg-muted/30 flex-wrap">
      {modes.map(({ value, label, icon: Icon }) => (
        <Button
          key={value}
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 px-3 text-xs gap-1.5",
            viewMode === value && "bg-background shadow-sm"
          )}
          onClick={() => onViewModeChange(value)}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </Button>
      ))}
    </div>
  );
}
