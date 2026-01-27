import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAdminSettings, type FraudRateThresholds } from '@/hooks/useAdminSettings';
import { Loader2, Palette, AlertTriangle } from 'lucide-react';

export function FraudThresholdsSettings() {
  const { fraudThresholds, updateFraudThresholds, isUpdating, isLoading } = useAdminSettings();
  const [localThresholds, setLocalThresholds] = useState<FraudRateThresholds>(fraudThresholds);

  useEffect(() => {
    setLocalThresholds(fraudThresholds);
  }, [fraudThresholds]);

  const handleSave = () => {
    if (localThresholds.low >= localThresholds.medium) {
      return;
    }
    updateFraudThresholds(localThresholds);
  };

  const hasChanges = 
    localThresholds.low !== fraudThresholds.low || 
    localThresholds.medium !== fraudThresholds.medium;

  const isValid = localThresholds.low > 0 && localThresholds.medium > localThresholds.low;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Couleurs du taux de fraude
        </CardTitle>
        <CardDescription>
          Définissez les seuils pour les indicateurs de couleur du taux de fraude
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Preview */}
        <div className="rounded-lg border p-4 bg-muted/30">
          <Label className="text-xs text-muted-foreground mb-3 block">Aperçu</Label>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-500" />
              <span className="text-sm">
                &lt; {localThresholds.low}% = Vert
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-yellow-500" />
              <span className="text-sm">
                {localThresholds.low}% - {localThresholds.medium}% = Jaune
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-500" />
              <span className="text-sm">
                ≥ {localThresholds.medium}% = Rouge
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Inputs */}
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="low-threshold" className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              Seuil vert/jaune (%)
            </Label>
            <Input
              id="low-threshold"
              type="number"
              min={1}
              max={99}
              step={0.5}
              value={localThresholds.low}
              onChange={(e) => setLocalThresholds({
                ...localThresholds,
                low: parseFloat(e.target.value) || 0,
              })}
            />
            <p className="text-xs text-muted-foreground">
              En dessous de ce seuil = vert (faible fraude)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="medium-threshold" className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              Seuil jaune/rouge (%)
            </Label>
            <Input
              id="medium-threshold"
              type="number"
              min={1}
              max={100}
              step={0.5}
              value={localThresholds.medium}
              onChange={(e) => setLocalThresholds({
                ...localThresholds,
                medium: parseFloat(e.target.value) || 0,
              })}
            />
            <p className="text-xs text-muted-foreground">
              Au-dessus de ce seuil = rouge (forte fraude)
            </p>
          </div>
        </div>

        {!isValid && (
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertTriangle className="h-4 w-4" />
            Le seuil vert doit être inférieur au seuil rouge
          </div>
        )}

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || !isValid || isUpdating}
          >
            {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Enregistrer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
