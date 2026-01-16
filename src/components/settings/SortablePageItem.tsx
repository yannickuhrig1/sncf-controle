import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { PageId } from '@/hooks/useUserPreferences';

interface SortablePageItemProps {
  id: PageId;
  label: string;
  isVisible: boolean;
  canDisable: boolean;
  isUpdating: boolean;
  onToggle: () => void;
}

export function SortablePageItem({
  id,
  label,
  isVisible,
  canDisable,
  isUpdating,
  onToggle,
}: SortablePageItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center justify-between p-3 rounded-lg border bg-card',
        isDragging && 'opacity-50 shadow-lg z-50',
      )}
    >
      <div className="flex items-center gap-3">
        <button
          {...attributes}
          {...listeners}
          className="touch-none cursor-grab active:cursor-grabbing p-1 -m-1 text-muted-foreground hover:text-foreground"
          aria-label="Réordonner"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <Label className="font-normal cursor-default">{label}</Label>
      </div>
      <Switch
        checked={isVisible}
        onCheckedChange={onToggle}
        disabled={!canDisable || isUpdating}
      />
    </div>
  );
}
