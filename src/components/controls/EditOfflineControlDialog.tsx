import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CounterInput } from './CounterInput';
import { toast } from 'sonner';
import type { OfflineControl } from '@/hooks/useOfflineControls';

interface EditOfflineControlDialogProps {
  control: OfflineControl | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, data: OfflineControl['data']) => void;
}

export function EditOfflineControlDialog({
  control,
  open,
  onOpenChange,
  onSave,
}: EditOfflineControlDialogProps) {
  const [formData, setFormData] = useState<OfflineControl['data'] | null>(null);

  useEffect(() => {
    if (control) {
      setFormData({ ...control.data });
    }
  }, [control]);

  if (!control || !formData) return null;

  const handleSave = () => {
    if (!formData.location) {
      toast.error('Le lieu est requis');
      return;
    }
    onSave(control.id, formData);
    onOpenChange(false);
    toast.success('Contrôle modifié');
  };

  const isTrain = formData.location_type === 'train';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le contrôle</DialogTitle>
          <DialogDescription>
            Modifiez les données avant synchronisation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Location info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Lieu</Label>
              <Input
                value={formData.location || ''}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
            {isTrain && (
              <div className="space-y-2">
                <Label>N° Train</Label>
                <Input
                  value={formData.train_number || ''}
                  onChange={(e) => setFormData({ ...formData, train_number: e.target.value })}
                />
              </div>
            )}
          </div>

          {isTrain && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Origine</Label>
                <Input
                  value={formData.origin || ''}
                  onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Destination</Label>
                <Input
                  value={formData.destination || ''}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* Passengers */}
          <div className="grid grid-cols-2 gap-4">
            <CounterInput
              label="Voyageurs"
              value={formData.nb_passagers ?? 0}
              onChange={(v) => setFormData({ ...formData, nb_passagers: v })}
              min={0}
            />
            <CounterInput
              label="En règle"
              value={formData.nb_en_regle ?? 0}
              onChange={(v) => setFormData({ ...formData, nb_en_regle: v })}
              min={0}
              max={formData.nb_passagers}
            />
          </div>

          {/* Fraud data */}
          <div className="grid grid-cols-3 gap-4">
            <CounterInput
              label="STT 50"
              value={formData.stt_50 ?? 0}
              onChange={(v) => setFormData({ ...formData, stt_50: v })}
              min={0}
            />
            <CounterInput
              label="STT 100"
              value={formData.stt_100 ?? 0}
              onChange={(v) => setFormData({ ...formData, stt_100: v })}
              min={0}
            />
            <CounterInput
              label="RNV"
              value={formData.rnv ?? 0}
              onChange={(v) => setFormData({ ...formData, rnv: v })}
              min={0}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <CounterInput
              label="Tarifs C."
              value={formData.tarifs_controle ?? 0}
              onChange={(v) => setFormData({ ...formData, tarifs_controle: v })}
              min={0}
            />
            <CounterInput
              label="PV"
              value={formData.pv ?? 0}
              onChange={(v) => setFormData({ ...formData, pv: v })}
              min={0}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <CounterInput
              label="RI+"
              value={formData.ri_positive ?? 0}
              onChange={(v) => setFormData({ ...formData, ri_positive: v })}
              min={0}
            />
            <CounterInput
              label="RI-"
              value={formData.ri_negative ?? 0}
              onChange={(v) => setFormData({ ...formData, ri_negative: v })}
              min={0}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave}>
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
