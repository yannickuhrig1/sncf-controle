import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useControls } from '@/hooks/useControls';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { Loader2, Train, Building2, TrainTrack, ArrowLeft, Save } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type LocationType = Database['public']['Enums']['location_type'];

export default function NewControl() {
  const { user, loading: authLoading } = useAuth();
  const { createControl, isCreating } = useControls();
  const navigate = useNavigate();

  const [locationType, setLocationType] = useState<LocationType>('train');
  const [location, setLocation] = useState('');
  const [trainNumber, setTrainNumber] = useState('');
  const [nbPassagers, setNbPassagers] = useState(0);
  const [nbEnRegle, setNbEnRegle] = useState(0);
  const [tarifsControle, setTarifsControle] = useState(0);
  const [pv, setPv] = useState(0);
  const [stt50, setStt50] = useState(0);
  const [stt100, setStt100] = useState(0);
  const [rnv, setRnv] = useState(0);
  const [riPositive, setRiPositive] = useState(0);
  const [riNegative, setRiNegative] = useState(0);
  const [notes, setNotes] = useState('');

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!location.trim()) {
      toast.error('Erreur', { description: 'Veuillez indiquer un lieu' });
      return;
    }

    try {
      await createControl({
        location_type: locationType,
        location: location.trim(),
        train_number: trainNumber.trim() || null,
        nb_passagers: nbPassagers,
        nb_en_regle: nbEnRegle,
        tarifs_controle: tarifsControle,
        pv,
        stt_50: stt50,
        stt_100: stt100,
        rnv,
        ri_positive: riPositive,
        ri_negative: riNegative,
        notes: notes.trim() || null,
      });

      toast.success('Contrôle enregistré', { description: 'Le contrôle a été ajouté avec succès' });

      navigate('/');
    } catch (error: any) {
      toast.error('Erreur', { description: error.message || "Impossible d'enregistrer le contrôle" });
    }
  };

  const locationIcons = {
    train: Train,
    gare: Building2,
    quai: TrainTrack,
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Nouveau contrôle</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Location Type */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Type de lieu</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={locationType}
                onValueChange={(v) => setLocationType(v as LocationType)}
                className="grid grid-cols-3 gap-4"
              >
                {(['train', 'gare', 'quai'] as LocationType[]).map((type) => {
                  const Icon = locationIcons[type];
                  return (
                    <Label
                      key={type}
                      htmlFor={type}
                      className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                        locationType === type
                          ? 'border-primary bg-primary/5'
                          : 'border-muted hover:border-primary/50'
                      }`}
                    >
                      <RadioGroupItem value={type} id={type} className="sr-only" />
                      <Icon className="h-6 w-6 mb-2" />
                      <span className="capitalize">{type}</span>
                    </Label>
                  );
                })}
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Location Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lieu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="location">
                  {locationType === 'train' ? 'Nom du train / Ligne' : 'Nom de la gare / Quai'}
                </Label>
                <Input
                  id="location"
                  placeholder={locationType === 'train' ? 'TGV 6201 Paris-Lyon' : 'Gare de Lyon'}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  required
                />
              </div>
              {locationType === 'train' && (
                <div className="space-y-2">
                  <Label htmlFor="trainNumber">Numéro de train (optionnel)</Label>
                  <Input
                    id="trainNumber"
                    placeholder="6201"
                    value={trainNumber}
                    onChange={(e) => setTrainNumber(e.target.value)}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Passenger Counts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Voyageurs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nbPassagers">Nombre total</Label>
                  <Input
                    id="nbPassagers"
                    type="number"
                    min="0"
                    value={nbPassagers}
                    onChange={(e) => setNbPassagers(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nbEnRegle">En règle</Label>
                  <Input
                    id="nbEnRegle"
                    type="number"
                    min="0"
                    value={nbEnRegle}
                    onChange={(e) => setNbEnRegle(parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fraud Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Infractions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tarifsControle">Tarifs contrôle</Label>
                  <Input
                    id="tarifsControle"
                    type="number"
                    min="0"
                    value={tarifsControle}
                    onChange={(e) => setTarifsControle(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pv">PV</Label>
                  <Input
                    id="pv"
                    type="number"
                    min="0"
                    value={pv}
                    onChange={(e) => setPv(parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stt50">STT 50%</Label>
                  <Input
                    id="stt50"
                    type="number"
                    min="0"
                    value={stt50}
                    onChange={(e) => setStt50(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stt100">STT 100%</Label>
                  <Input
                    id="stt100"
                    type="number"
                    min="0"
                    value={stt100}
                    onChange={(e) => setStt100(parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rnv">RNV (Régularisation Non Valide)</Label>
                <Input
                  id="rnv"
                  type="number"
                  min="0"
                  value={rnv}
                  onChange={(e) => setRnv(parseInt(e.target.value) || 0)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Identity Checks */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Relevés d'identité</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="riPositive">RI Positive</Label>
                  <Input
                    id="riPositive"
                    type="number"
                    min="0"
                    value={riPositive}
                    onChange={(e) => setRiPositive(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="riNegative">RI Négative</Label>
                  <Input
                    id="riNegative"
                    type="number"
                    min="0"
                    value={riNegative}
                    onChange={(e) => setRiNegative(parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notes (optionnel)</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Remarques, observations..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Submit */}
          <Button type="submit" className="w-full" size="lg" disabled={isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Enregistrer le contrôle
              </>
            )}
          </Button>
        </form>
      </div>
    </AppLayout>
  );
}
