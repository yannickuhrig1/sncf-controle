import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Control = Database['public']['Tables']['controls']['Row'];

interface AgentRankingProps {
  controls: Control[];
  members: Profile[];
}

interface AgentStats {
  id: string;
  name: string;
  controlCount: number;
  passengers: number;
  fraudCount: number;
  fraudRate: number;
}

export function AgentRanking({ controls, members }: AgentRankingProps) {
  const rankings = useMemo(() => {
    const statsMap = new Map<string, AgentStats>();

    members.forEach(m => {
      statsMap.set(m.id, {
        id: m.id,
        name: `${m.first_name} ${m.last_name}`,
        controlCount: 0,
        passengers: 0,
        fraudCount: 0,
        fraudRate: 0,
      });
    });

    controls.forEach(c => {
      const stat = statsMap.get(c.agent_id);
      if (stat) {
        stat.controlCount += 1;
        stat.passengers += c.nb_passagers;
        stat.fraudCount += c.tarifs_controle + c.pv;
      }
    });

    const ranked = Array.from(statsMap.values()).map(s => ({
      ...s,
      fraudRate: s.passengers > 0 ? (s.fraudCount / s.passengers) * 100 : 0,
    }));

    return ranked.sort((a, b) => b.controlCount - a.controlCount);
  }, [controls, members]);

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (index === 1) return <Medal className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Award className="h-5 w-5 text-amber-600" />;
    return <span className="h-5 w-5 flex items-center justify-center text-xs font-bold text-muted-foreground">{index + 1}</span>;
  };

  if (rankings.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Classement agents
        </CardTitle>
        <CardDescription>Par nombre de contrôles aujourd'hui</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {rankings.map((agent, index) => (
          <div
            key={agent.id}
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg transition-colors',
              index === 0 && 'bg-yellow-500/10 border border-yellow-500/20',
              index === 1 && 'bg-muted/60',
              index === 2 && 'bg-amber-500/5',
              index > 2 && 'bg-muted/30'
            )}
          >
            <div className="flex-shrink-0">{getRankIcon(index)}</div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{agent.name}</p>
              <p className="text-xs text-muted-foreground">
                {agent.passengers} passagers
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-mono">
                {agent.controlCount}
              </Badge>
              {agent.fraudRate > 0 && (
                <Badge variant={agent.fraudRate > 5 ? 'destructive' : 'outline'} className="text-xs">
                  {agent.fraudRate.toFixed(1)}%
                </Badge>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
