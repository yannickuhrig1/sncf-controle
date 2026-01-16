import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TarifEntry {
  id: string;
  type: string;
  typeLabel: string;
  montant: number;
  category?: 'bord' | 'exceptionnel' | 'controle' | 'pv';
}

interface TarifListItemProps {
  item: TarifEntry;
  onRemove: (id: string) => void;
}

export function TarifListItem({ item, onRemove }: TarifListItemProps) {
  const categoryColors = {
    bord: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    exceptionnel: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    controle: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    pv: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  };

  return (
    <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
      <div className="flex items-center gap-2">
        {item.category && (
          <Badge
            variant="secondary"
            className={cn('text-xs', categoryColors[item.category])}
          >
            {item.category === 'bord' ? 'Bord' : 
             item.category === 'exceptionnel' ? 'Except.' :
             item.category === 'controle' ? 'Contrôle' : 'PV'}
          </Badge>
        )}
        <span className="text-sm font-medium">{item.typeLabel}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">{item.montant.toFixed(2)}€</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={() => onRemove(item.id)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
