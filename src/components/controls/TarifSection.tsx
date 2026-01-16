import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
}

export function TarifSection({ title, description, items }: TarifSectionProps) {
  return (
    <Card>
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
