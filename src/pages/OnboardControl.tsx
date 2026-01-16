import { useState, useMemo } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useControls } from '@/hooks/useControls';
import { AppLayout } from '@/components/layout/AppLayout';
import { TarifSection } from '@/components/controls/TarifSection';
import { FraudSummary } from '@/components/controls/FraudSummary';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Train, ArrowLeft, Save, ArrowRight } from 'lucide-react';

export default function OnboardControl() {
  const { user, loading: authLoading } = useAuth();
  const { createControl, isCreating } = useControls();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Train info
  const [trainNumber, setTrainNumber] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  
  // Passengers
  const [nbPassagers, setNbPassagers] = useState(0);
  const [nbEnRegle, setNbEnRegle] = useState(0);

  // Tarifs à bord (ventes)
  const [tarifBordStt50, setTarifBordStt50] = useState({ count: 0, amount: 0 });
  const [tarifBordStt100, setTarifBordStt100] = useState({ count: 0, amount: 0 });
  const [tarifBordRnv, setTarifBordRnv] = useState({ count: 0, amount: 0 });
  const [tarifBordTitreTiers, setTarifBordTitreTiers] = useState({ count: 0, amount: 0 });
  const [tarifBordDocNaissance, setTarifBordDocNaissance] = useState({ count: 0, amount: 0 });
  const [tarifBordAutre, setTarifBordAutre] = useState({ count: 0, amount: 0 });

  // Tarifs contrôle (infractions régularisées)
  const [stt50, setStt50] = useState({ count: 0, amount: 0 });
  const [stt100, setStt100] = useState({ count: 0, amount: 0 });
  const [rnv, setRnv] = useState({ count: 0, amount: 0 });
  const [titreTiers, setTitreTiers] = useState({ count: 0, amount: 0 });
  const [docNaissance, setDocNaissance] = useState({ count: 0, amount: 0 });
  const [autreTarif, setAutreTarif] = useState({ count: 0, amount: 0 });

  // PV
  const [pvAbsenceTitre, setPvAbsenceTitre] = useState({ count: 0, amount: 0 });
  const [pvTitreInvalide, setPvTitreInvalide] = useState({ count: 0, amount: 0 });
  const [pvRefusControle, setPvRefusControle] = useState({ count: 0, amount: 0 });
  const [pvAutre, setPvAutre] = useState({ count: 0, amount: 0 });

  // RI
  const [riPositive, setRiPositive] = useState(0);
  const [riNegative, setRiNegative] = useState(0);

  // Notes
  const [notes, setNotes] = useState('');

  // Calculate fraud stats
  const fraudStats = useMemo(() => {
    const tarifsControleCount = stt50.count + stt100.count + rnv.count + titreTiers.count + docNaissance.count + autreTarif.count;
    const pvCount = pvAbsenceTitre.count + pvTitreInvalide.count + pvRefusControle.count + pvAutre.count;
    const fraudCount = tarifsControleCount + pvCount;
    const fraudRate = nbPassagers > 0 ? (fraudCount / nbPassagers) * 100 : 0;
    return { fraudCount, fraudRate, tarifsControleCount, pvCount };
  }, [nbPassagers, stt50, stt100, rnv, titreTiers, docNaissance, autreTarif, pvAbsenceTitre, pvTitreInvalide, pvRefusControle, pvAutre]);

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

    if (!trainNumber.trim()) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Veuillez indiquer le numéro de train',
      });
      return;
    }

    try {
      const locationName = origin && destination 
        ? `${origin} → ${destination}` 
        : trainNumber;

      await createControl({
        location_type: 'train',
        location: locationName,
        train_number: trainNumber.trim(),
        origin: origin.trim() || null,
        destination: destination.trim() || null,
        nb_passagers: nbPassagers,
        nb_en_regle: nbEnRegle,
        // Tarifs bord
        tarif_bord_stt_50: tarifBordStt50.count,
        tarif_bord_stt_50_amount: tarifBordStt50.amount,
        tarif_bord_stt_100: tarifBordStt100.count,
        tarif_bord_stt_100_amount: tarifBordStt100.amount,
        tarif_bord_rnv: tarifBordRnv.count,
        tarif_bord_rnv_amount: tarifBordRnv.amount,
        tarif_bord_titre_tiers: tarifBordTitreTiers.count,
        tarif_bord_titre_tiers_amount: tarifBordTitreTiers.amount,
        tarif_bord_doc_naissance: tarifBordDocNaissance.count,
        tarif_bord_doc_naissance_amount: tarifBordDocNaissance.amount,
        tarif_bord_autre: tarifBordAutre.count,
        tarif_bord_autre_amount: tarifBordAutre.amount,
        // Tarifs contrôle
        stt_50: stt50.count,
        stt_50_amount: stt50.amount,
        stt_100: stt100.count,
        stt_100_amount: stt100.amount,
        rnv: rnv.count,
        rnv_amount: rnv.amount,
        titre_tiers: titreTiers.count,
        titre_tiers_amount: titreTiers.amount,
        doc_naissance: docNaissance.count,
        doc_naissance_amount: docNaissance.amount,
        autre_tarif: autreTarif.count,
        autre_tarif_amount: autreTarif.amount,
        tarifs_controle: fraudStats.tarifsControleCount,
        // PV
        pv: fraudStats.pvCount,
        pv_absence_titre: pvAbsenceTitre.count,
        pv_absence_titre_amount: pvAbsenceTitre.amount,
        pv_titre_invalide: pvTitreInvalide.count,
        pv_titre_invalide_amount: pvTitreInvalide.amount,
        pv_refus_controle: pvRefusControle.count,
        pv_refus_controle_amount: pvRefusControle.amount,
        pv_autre: pvAutre.count,
        pv_autre_amount: pvAutre.amount,
        // RI
        ri_positive: riPositive,
        ri_negative: riNegative,
        notes: notes.trim() || null,
      } as any);

      toast({
        title: 'Contrôle enregistré',
        description: 'Le contrôle à bord a été ajouté avec succès',
      });

      navigate('/');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error.message || "Impossible d'enregistrer le contrôle",
      });
    }
  };

  const tarifsBordItems = [
    { id: 'stt50', label: 'STT 50% - Supplément Train Tarif réduit', ...tarifBordStt50, onCountChange: (v: number) => setTarifBordStt50(p => ({ ...p, count: v })), onAmountChange: (v: number) => setTarifBordStt50(p => ({ ...p, amount: v })) },
    { id: 'stt100', label: 'STT 100% - Supplément Train Tarif plein', ...tarifBordStt100, onCountChange: (v: number) => setTarifBordStt100(p => ({ ...p, count: v })), onAmountChange: (v: number) => setTarifBordStt100(p => ({ ...p, amount: v })) },
    { id: 'rnv', label: 'RNV - Régularisation Non Valide', ...tarifBordRnv, onCountChange: (v: number) => setTarifBordRnv(p => ({ ...p, count: v })), onAmountChange: (v: number) => setTarifBordRnv(p => ({ ...p, amount: v })) },
    { id: 'titreTiers', label: 'Titre tiers - Vente pour compte tiers', ...tarifBordTitreTiers, onCountChange: (v: number) => setTarifBordTitreTiers(p => ({ ...p, count: v })), onAmountChange: (v: number) => setTarifBordTitreTiers(p => ({ ...p, amount: v })) },
    { id: 'docNaissance', label: 'Document de naissance', ...tarifBordDocNaissance, onCountChange: (v: number) => setTarifBordDocNaissance(p => ({ ...p, count: v })), onAmountChange: (v: number) => setTarifBordDocNaissance(p => ({ ...p, amount: v })) },
    { id: 'autre', label: 'Autre tarification', ...tarifBordAutre, onCountChange: (v: number) => setTarifBordAutre(p => ({ ...p, count: v })), onAmountChange: (v: number) => setTarifBordAutre(p => ({ ...p, amount: v })) },
  ];

  const tarifsControleItems = [
    { id: 'ctrl-stt50', label: 'STT 50%', ...stt50, onCountChange: (v: number) => setStt50(p => ({ ...p, count: v })), onAmountChange: (v: number) => setStt50(p => ({ ...p, amount: v })) },
    { id: 'ctrl-stt100', label: 'STT 100%', ...stt100, onCountChange: (v: number) => setStt100(p => ({ ...p, count: v })), onAmountChange: (v: number) => setStt100(p => ({ ...p, amount: v })) },
    { id: 'ctrl-rnv', label: 'RNV', ...rnv, onCountChange: (v: number) => setRnv(p => ({ ...p, count: v })), onAmountChange: (v: number) => setRnv(p => ({ ...p, amount: v })) },
    { id: 'ctrl-titreTiers', label: 'Titre tiers', ...titreTiers, onCountChange: (v: number) => setTitreTiers(p => ({ ...p, count: v })), onAmountChange: (v: number) => setTitreTiers(p => ({ ...p, amount: v })) },
    { id: 'ctrl-docNaissance', label: 'Document de naissance', ...docNaissance, onCountChange: (v: number) => setDocNaissance(p => ({ ...p, count: v })), onAmountChange: (v: number) => setDocNaissance(p => ({ ...p, amount: v })) },
    { id: 'ctrl-autre', label: 'Autre', ...autreTarif, onCountChange: (v: number) => setAutreTarif(p => ({ ...p, count: v })), onAmountChange: (v: number) => setAutreTarif(p => ({ ...p, amount: v })) },
  ];

  const pvItems = [
    { id: 'pv-absence', label: 'Absence de titre', ...pvAbsenceTitre, onCountChange: (v: number) => setPvAbsenceTitre(p => ({ ...p, count: v })), onAmountChange: (v: number) => setPvAbsenceTitre(p => ({ ...p, amount: v })) },
    { id: 'pv-invalide', label: 'Titre non valide', ...pvTitreInvalide, onCountChange: (v: number) => setPvTitreInvalide(p => ({ ...p, count: v })), onAmountChange: (v: number) => setPvTitreInvalide(p => ({ ...p, amount: v })) },
    { id: 'pv-refus', label: 'Refus de contrôle', ...pvRefusControle, onCountChange: (v: number) => setPvRefusControle(p => ({ ...p, count: v })), onAmountChange: (v: number) => setPvRefusControle(p => ({ ...p, amount: v })) },
    { id: 'pv-autre', label: 'Autre motif', ...pvAutre, onCountChange: (v: number) => setPvAutre(p => ({ ...p, count: v })), onAmountChange: (v: number) => setPvAutre(p => ({ ...p, amount: v })) },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Train className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">Contrôle à bord</h1>
          </div>
        </div>

        {/* Fraud Summary - Sticky */}
        <div className="sticky top-16 z-30">
          <FraudSummary
            passengers={nbPassagers}
            fraudCount={fraudStats.fraudCount}
            fraudRate={fraudStats.fraudRate}
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Train Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informations train</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="trainNumber">Numéro de train *</Label>
                <Input
                  id="trainNumber"
                  placeholder="TGV 6201"
                  value={trainNumber}
                  onChange={(e) => setTrainNumber(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="origin">Origine</Label>
                  <Input
                    id="origin"
                    placeholder="Paris"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="destination">Destination</Label>
                  <div className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <Input
                      id="destination"
                      placeholder="Lyon"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Passengers */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Voyageurs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nbPassagers">Nombre contrôlés</Label>
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

          {/* Tarifs à bord */}
          <TarifSection
            title="Tarifs à bord"
            description="Ventes réalisées pendant le trajet"
            items={tarifsBordItems}
          />

          {/* Tarifs contrôle */}
          <TarifSection
            title="Tarifs contrôle"
            description="Infractions régularisées sur place"
            items={tarifsControleItems}
          />

          {/* PV */}
          <TarifSection
            title="Procès-Verbaux (PV)"
            description="Infractions verbalisées"
            items={pvItems}
          />

          {/* RI */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Relevés d'Identité (RI)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="riPositive" className="text-green-600">RI Positive</Label>
                  <p className="text-xs text-muted-foreground">Identité vérifiée</p>
                  <Input
                    id="riPositive"
                    type="number"
                    min="0"
                    value={riPositive}
                    onChange={(e) => setRiPositive(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="riNegative" className="text-red-600">RI Négative</Label>
                  <p className="text-xs text-muted-foreground">Identité non vérifiable</p>
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
              <CardTitle className="text-base">Commentaire</CardTitle>
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
