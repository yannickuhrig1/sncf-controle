import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOfflineControls, OfflineControl } from '@/hooks/useOfflineControls';
import { EditOfflineControlDialog } from './EditOfflineControlDialog';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  CloudOff, 
  RefreshCw, 
  Trash2, 
  Train, 
  Building2,
  Clock,
  Pencil
} from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export function PendingControlsPanel() {
  const { 
    offlineControls, 
    offlineCount, 
    isOnline, 
    isSyncing, 
    syncOfflineControls, 
    updateOfflineControl,
    removeOfflineControl,
    clearOfflineControls 
  } = useOfflineControls();

  const [editingControl, setEditingControl] = useState<OfflineControl | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  if (offlineCount === 0) {
    return null;
  }

  const getLocationIcon = (locationType: string | undefined) => {
    if (locationType === 'train') {
      return <Train className="h-4 w-4" />;
    }
    return <Building2 className="h-4 w-4" />;
  };

  const getLocationLabel = (control: OfflineControl) => {
    const data = control.data;
    if (data.location_type === 'train') {
      return data.train_number ? `Train ${data.train_number}` : data.location;
    }
    return data.location;
  };

  const handleEdit = (control: OfflineControl) => {
    setEditingControl(control);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = (id: string, data: OfflineControl['data']) => {
    updateOfflineControl(id, data);
  };

  return (
    <>
    <Card className="border-amber-500/50 bg-amber-500/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-amber-600">
            <CloudOff className="h-4 w-4" />
            Contrôles en attente
            <Badge variant="secondary" className="bg-amber-500/20 text-amber-600">
              {offlineCount}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            {offlineCount > 1 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">
                    Tout supprimer
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer tous les contrôles ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action supprimera définitivement {offlineCount} contrôle(s) en attente.
                      Ces données ne seront pas synchronisées avec le serveur.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={clearOfflineControls}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Tout supprimer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 text-xs"
              onClick={syncOfflineControls}
              disabled={!isOnline || isSyncing}
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Sync...' : 'Synchroniser'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {!isOnline && (
          <p className="text-xs text-muted-foreground mb-2">
            Connexion requise pour synchroniser
          </p>
        )}
        
        {offlineControls.map((control) => (
          <div 
            key={control.id}
            className="flex items-center justify-between p-2 rounded-lg bg-background/50 border border-border/50"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex-shrink-0 text-muted-foreground">
                {getLocationIcon(control.data.location_type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {getLocationLabel(control)}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>
                    {formatDistanceToNow(control.createdAt, { 
                      addSuffix: true, 
                      locale: fr 
                    })}
                  </span>
                  <span>•</span>
                  <span>{control.data.nb_passagers || 0} voyageurs</span>
                  {control.syncAttempts > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-amber-600">
                        {control.syncAttempts} échec{control.syncAttempts > 1 ? 's' : ''}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-primary"
                onClick={() => handleEdit(control)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer ce contrôle ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Ce contrôle en attente sera définitivement supprimé et ne sera pas synchronisé avec le serveur.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => removeOfflineControl(control.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Supprimer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
    
    <EditOfflineControlDialog
      control={editingControl}
      open={editDialogOpen}
      onOpenChange={setEditDialogOpen}
      onSave={handleSaveEdit}
    />
    </>
  );
}
