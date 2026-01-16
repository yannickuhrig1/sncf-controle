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

const variantClasses = {
  default: '',
  mint: 'bg-card-mint text-card-mint-foreground border-card-mint',
  amber: 'bg-card-amber text-card-amber-foreground border-card-amber',
  rose: 'bg-card-rose text-card-rose-foreground border-card-rose',
  violet: 'bg-card-violet text-card-violet-foreground border-card-violet',
  cyan: 'bg-card-cyan text-card-cyan-foreground border-card-cyan',
};

export function TarifSection({ title, description, items, variant = 'default' }: TarifSectionProps) {
  return (
    <Card className={cn(variantClasses[variant])}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && (
          <p className={cn(
            "text-sm",
            variant === 'default' ? 'text-muted-foreground' : 'opacity-70'
          )}>{description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="space-y-2">
            <Label className="text-sm font-medium">{item.label}</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className={cn(
                  "text-xs",
                  variant === 'default' ? 'text-muted-foreground' : 'opacity-70'
                )}>Nombre</span>
                <Input
                  type="number"
                  min="0"
                  value={item.count}
                  onChange={(e) => item.onCountChange(parseInt(e.target.value) || 0)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <span className={cn(
                  "text-xs",
                  variant === 'default' ? 'text-muted-foreground' : 'opacity-70'
                )}>Montant (€)</span>
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
