import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FileText, Plus, Pencil, Trash2, ChevronDown, Search, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];

// Field labels for display
const FIELD_LABELS: Record<string, string> = {
  nb_passagers: 'Passagers',
  nb_en_regle: 'En règle',
  tarifs_controle: 'Tarifs contrôle',
  pv: 'PV',
  stt_50: 'STT 50%',
  stt_100: 'STT 100%',
  rnv: 'RNV',
  location: 'Lieu',
  train_number: 'N° Train',
  origin: 'Origine',
  destination: 'Destination',
  control_date: 'Date',
  control_time: 'Heure',
  notes: 'Notes',
  ri_positive: 'RI+',
  ri_negative: 'RI-',
  titre_tiers: 'Titre tiers',
  doc_naissance: 'Doc naissance',
  autre_tarif: 'Autre tarif',
  location_type: 'Type lieu',
};

interface AuditEntry {
  id: string;
  control_id: string;
  user_id: string;
  action: string;
  changes: Record<string, { old: string; new: string }> | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
}

interface AuditTrailViewProps {
  members: Profile[];
}

export function AuditTrailView({ members }: AuditTrailViewProps) {
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(30);

  const { data: auditLogs = [], isLoading } = useQuery({
    queryKey: ['audit-trail', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('control_audit_log' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []) as unknown as AuditEntry[];
    },
  });

  const getUserName = (userId: string) => {
    const member = members.find(m => m.user_id === userId);
    return member ? `${member.first_name} ${member.last_name}` : userId.slice(0, 8) + '…';
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'insert': return <Plus className="h-3.5 w-3.5" />;
      case 'update': return <Pencil className="h-3.5 w-3.5" />;
      case 'delete': return <Trash2 className="h-3.5 w-3.5" />;
      default: return null;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'insert': return 'bg-green-500/10 text-green-600 dark:text-green-400';
      case 'update': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
      case 'delete': return 'bg-red-500/10 text-red-600 dark:text-red-400';
      default: return '';
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'insert': return 'Création';
      case 'update': return 'Modification';
      case 'delete': return 'Suppression';
      default: return action;
    }
  };

  const filteredLogs = search
    ? auditLogs.filter(log => {
        const userName = getUserName(log.user_id).toLowerCase();
        const controlId = log.control_id.toLowerCase();
        const s = search.toLowerCase();
        return userName.includes(s) || controlId.includes(s) || log.action.includes(s);
      })
    : auditLogs;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Audit Trail
        </CardTitle>
        <CardDescription>Historique des modifications sur les contrôles</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par agent ou ID contrôle..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Aucune entrée d'audit
          </div>
        ) : (
          <ScrollArea className="max-h-[500px]">
            <div className="space-y-2">
              {filteredLogs.map(log => (
                <Collapsible key={log.id}>
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-left">
                      <div className={cn('p-1.5 rounded-md', getActionColor(log.action))}>
                        {getActionIcon(log.action)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{getUserName(log.user_id)}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {getActionLabel(log.action)}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(log.created_at), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                          {' · '}
                          <span className="font-mono">{log.control_id.slice(0, 8)}</span>
                        </p>
                      </div>
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-10 mt-1 p-3 rounded-lg bg-muted/20 border border-border/50 space-y-1.5">
                      {log.action === 'update' && log.changes && Object.entries(log.changes).length > 0 ? (
                        Object.entries(log.changes).map(([field, change]) => (
                          <div key={field} className="flex items-start gap-2 text-xs">
                            <span className="font-medium text-muted-foreground min-w-[100px]">
                              {FIELD_LABELS[field] || field}
                            </span>
                            <span className="text-red-500 line-through">{String(change.old ?? '—')}</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="text-green-600 dark:text-green-400">{String(change.new ?? '—')}</span>
                          </div>
                        ))
                      ) : log.action === 'insert' ? (
                        <p className="text-xs text-muted-foreground">
                          Nouveau contrôle créé
                          {log.new_values && (
                            <span> — {(log.new_values as any).location || ''} ({(log.new_values as any).nb_passagers || 0} passagers)</span>
                          )}
                        </p>
                      ) : log.action === 'delete' ? (
                        <p className="text-xs text-muted-foreground">
                          Contrôle supprimé
                          {log.old_values && (
                            <span> — {(log.old_values as any).location || ''} du {(log.old_values as any).control_date || ''}</span>
                          )}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Aucun détail disponible</p>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </ScrollArea>
        )}

        {filteredLogs.length >= limit && (
          <Button variant="outline" size="sm" className="w-full" onClick={() => setLimit(l => l + 30)}>
            Charger plus
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
