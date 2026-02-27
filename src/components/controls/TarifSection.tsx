import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface TarifItem {
  id: string;
  label: string;
  shortLabel?: string;
  count: number;
  amount: number;
  onCountChange: (value: number) => void;
  onAmountChange: (value: number) => void;
}

interface TarifSectionProps {
  title: string;
  description?: string;
  items: TarifItem[];
  variant?: 'default' | 'mint' | 'amber' | 'rose' | 'violet' | 'cyan';
}

const accentBar = {
  default: 'from-slate-300 to-gray-400',
  mint:    'from-teal-400 to-green-500',
  amber:   'from-amber-400 to-orange-500',
  rose:    'from-rose-400 to-red-500',
  violet:  'from-violet-400 to-purple-500',
  cyan:    'from-cyan-400 to-teal-500',
};

export function TarifSection({ title, description, items, variant = 'default' }: TarifSectionProps) {
  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <div className={cn('h-1 bg-gradient-to-r', accentBar[variant])} />
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="space-y-2">
            <Label className="text-sm font-medium">{item.label}</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Nombre</span>
                <Input
                  type="number"
                  min="0"
                  value={item.count}
                  onChange={(e) => item.onCountChange(parseInt(e.target.value) || 0)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Montant (€)</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.amount}
                  onChange={(e) => item.onAmountChange(parseFloat(e.target.value) || 0)}
                  className="h-9"
                />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
