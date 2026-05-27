import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { normalizeBeninWhatsApp } from '@/lib/phone';
import { toast } from 'sonner';

export interface WaContact {
  id: string;
  user_id: string;
  phone_e164: string;
  phone_8: string | null;
  phone_10: string | null;
  display_name: string | null;
  tags: string[];
  is_whatsapp: boolean | null;
  opt_out: boolean;
  archived: boolean;
  source: string;
  last_validated_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface WaList { id: string; name: string; description: string | null; color: string | null; }
export interface WaCampaign {
  id: string; name: string; type: string; body: string; media_url: string | null; media_mime: string | null;
  session_id: string | null; list_ids: string[]; extra_contact_ids: string[];
  status: string; scheduled_at: string | null;
  throttle_per_hour: number; min_delay_s: number; max_delay_s: number;
  active_hours_start: string; active_hours_end: string; timezone: string;
  ai_variation: boolean; ai_prompt: string | null; stats: any; created_at: string;
}

export function useWaDiffusion() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<WaContact[]>([]);
  const [lists, setLists] = useState<WaList[]>([]);
  const [campaigns, setCampaigns] = useState<WaCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [c, l, ca] = await Promise.all([
      supabase.from('wa_contacts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('wa_contact_lists').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('wa_campaigns').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    ]);
    setContacts((c.data ?? []) as any);
    setLists((l.data ?? []) as any);
    setCampaigns((ca.data ?? []) as any);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const addContact = useCallback(async (input: { phone: string; display_name?: string; tags?: string[] }) => {
    if (!user) return;
    const norm = normalizeBeninWhatsApp(input.phone);
    if (!norm.valid) { toast.error('Numéro Bénin invalide'); return; }
    const { error } = await supabase.from('wa_contacts').insert({
      user_id: user.id,
      phone_e164: norm.e164_10 || norm.e164_8,
      phone_8: norm.e164_8 || null,
      phone_10: norm.e164_10 || null,
      display_name: input.display_name ?? null,
      tags: input.tags ?? [],
      source: 'manual',
    });
    if (error) {
      if (error.code === '23505') toast.error('Ce contact existe déjà');
      else toast.error(error.message);
      return;
    }
    toast.success('Contact ajouté');
    await refresh();
  }, [user, refresh]);

  const bulkAdd = useCallback(async (items: Array<{ phone: string; name?: string }>) => {
    if (!user) return { added: 0, dup: 0, invalid: 0 };
    let added = 0, dup = 0, invalid = 0;
    const rows: any[] = [];
    const seen = new Set(contacts.map(c => c.phone_e164));
    for (const it of items) {
      const n = normalizeBeninWhatsApp(it.phone);
      if (!n.valid) { invalid++; continue; }
      const key = n.e164_10 || n.e164_8;
      if (seen.has(key)) { dup++; continue; }
      seen.add(key);
      rows.push({
        user_id: user.id, phone_e164: key,
        phone_8: n.e164_8 || null, phone_10: n.e164_10 || null,
        display_name: it.name ?? null, source: 'import',
      });
    }
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await supabase.from('wa_contacts').insert(rows.slice(i, i + 200));
      if (!error) added += Math.min(200, rows.length - i);
    }
    await refresh();
    return { added, dup, invalid };
  }, [user, contacts, refresh]);

  const toggleOptOut = useCallback(async (id: string, val: boolean) => {
    await supabase.from('wa_contacts').update({ opt_out: val }).eq('id', id);
    await refresh();
  }, [refresh]);

  const toggleArchive = useCallback(async (id: string, val: boolean) => {
    await supabase.from('wa_contacts').update({ archived: val }).eq('id', id);
    await refresh();
  }, [refresh]);

  const removeContact = useCallback(async (id: string) => {
    await supabase.from('wa_contacts').delete().eq('id', id);
    await refresh();
  }, [refresh]);

  const createList = useCallback(async (name: string) => {
    if (!user) return;
    await supabase.from('wa_contact_lists').insert({ user_id: user.id, name });
    await refresh();
  }, [user, refresh]);

  const addToList = useCallback(async (listId: string, contactIds: string[]) => {
    if (contactIds.length === 0) return;
    await supabase.from('wa_contact_list_members').upsert(
      contactIds.map((cid) => ({ list_id: listId, contact_id: cid })),
      { onConflict: 'list_id,contact_id' }
    );
    toast.success(`${contactIds.length} contact(s) ajouté(s)`);
  }, []);

  const createCampaign = useCallback(async (data: Partial<WaCampaign>) => {
    if (!user) return null;
    const { data: row, error } = await supabase.from('wa_campaigns').insert({
      user_id: user.id, name: data.name ?? 'Sans titre', type: data.type ?? 'text',
      body: data.body ?? '', media_url: data.media_url ?? null, media_mime: data.media_mime ?? null,
      session_id: data.session_id ?? null, list_ids: data.list_ids ?? [], extra_contact_ids: data.extra_contact_ids ?? [],
      throttle_per_hour: data.throttle_per_hour ?? 30,
      min_delay_s: data.min_delay_s ?? 25, max_delay_s: data.max_delay_s ?? 75,
      active_hours_start: data.active_hours_start ?? '08:00:00',
      active_hours_end: data.active_hours_end ?? '20:00:00',
      ai_variation: data.ai_variation ?? true, scheduled_at: data.scheduled_at ?? null,
    }).select().single();
    if (error) { toast.error(error.message); return null; }
    await refresh();
    return row;
  }, [user, refresh]);

  const launchCampaign = useCallback(async (campaignId: string, opts?: { generateVariants?: boolean; body?: string }) => {
    if (opts?.generateVariants && opts.body) {
      const { data: ai } = await supabase.functions.invoke('whatsapp-diffusion-ai-variants', {
        body: { body: opts.body, count: 4 },
      });
      const variants: string[] = ai?.variants ?? [opts.body];
      const rows = variants.map((b, i) => ({ campaign_id: campaignId, variant_index: i, body: b }));
      await supabase.from('wa_campaign_messages').delete().eq('campaign_id', campaignId);
      await supabase.from('wa_campaign_messages').insert(rows);
    }
    const { data, error } = await supabase.functions.invoke('whatsapp-diffusion-enqueue', { body: { campaignId } });
    if (error) { toast.error(error.message); return false; }
    toast.success(`Campagne lancée : ${data?.scheduled} envois`);
    await refresh();
    return true;
  }, [refresh]);

  return {
    loading, contacts, lists, campaigns, refresh,
    addContact, bulkAdd, toggleOptOut, toggleArchive, removeContact,
    createList, addToList, createCampaign, launchCampaign,
  };
}
