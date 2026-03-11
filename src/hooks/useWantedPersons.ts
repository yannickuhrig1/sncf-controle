import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface WantedPerson {
  id: string;
  nom: string;
  prenom: string;
  date_naissance: string | null;
  photo_url: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
}

export function useWantedPersons(onlyActive = true) {
  const [persons, setPersons] = useState<WantedPerson[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    let q = supabase
      .from('wanted_persons' as any)
      .select('*')
      .order('created_at', { ascending: false });
    if (onlyActive) q = q.eq('active', true);
    const { data } = await q;
    setPersons((data || []) as WantedPerson[]);
    setIsLoading(false);
  }, [onlyActive]);

  useEffect(() => { fetch(); }, [fetch]);

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel('wanted_persons_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wanted_persons' }, fetch)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetch]);

  const uploadPhoto = async (file: File): Promise<string | null> => {
    const ext = file.name.split('.').pop();
    const path = `${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('wanted-photos').upload(path, file, { upsert: true });
    if (error) return null;
    const { data } = supabase.storage.from('wanted-photos').getPublicUrl(path);
    // Use signed URL instead since bucket is private
    const { data: signed } = await supabase.storage.from('wanted-photos').createSignedUrl(path, 60 * 60 * 24 * 365);
    return signed?.signedUrl ?? null;
  };

  const addPerson = async (p: Omit<WantedPerson, 'id' | 'active' | 'created_at'> & { photoFile?: File }): Promise<boolean> => {
    let photo_url = p.photo_url;
    if (p.photoFile) {
      photo_url = await uploadPhoto(p.photoFile);
    }
    const { error } = await supabase.from('wanted_persons' as any).insert({
      nom: p.nom, prenom: p.prenom, date_naissance: p.date_naissance || null,
      photo_url, notes: p.notes || null, active: true,
    });
    if (error) return false;
    await fetch();
    return true;
  };

  const updatePerson = async (id: string, updates: Partial<WantedPerson> & { photoFile?: File }): Promise<boolean> => {
    let photo_url = updates.photo_url;
    if (updates.photoFile) {
      photo_url = await uploadPhoto(updates.photoFile);
    }
    const { error } = await supabase.from('wanted_persons' as any)
      .update({ ...updates, photo_url, photoFile: undefined, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return false;
    await fetch();
    return true;
  };

  const deletePerson = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('wanted_persons' as any).delete().eq('id', id);
    if (error) return false;
    await fetch();
    return true;
  };

  const toggleActive = async (id: string, active: boolean): Promise<void> => {
    await supabase.from('wanted_persons' as any).update({ active }).eq('id', id);
    await fetch();
  };

  return { persons, isLoading, addPerson, updatePerson, deletePerson, toggleActive, refresh: fetch };
}
