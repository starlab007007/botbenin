import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'live_agent_ia_service.dart';

Future<bool> showAgentDeploySheet(
  BuildContext context, {
  required String agentId,
  required LiveAgentIaService service,
}) async {
  final rows = await Supabase.instance.client
      .from('whatsapp_accounts')
      .select('session_name,status')
      .eq('user_id', service.user.id)
      .order('created_at', ascending: false);
  if (!context.mounted) return false;
  final names = (rows as List)
      .whereType<Map>()
      .map((row) => '${row['session_name'] ?? ''}')
      .where((name) => name.isNotEmpty)
      .toList();
  final selected = await showModalBottomSheet<String>(
    context: context,
    backgroundColor: Colors.transparent,
    builder: (_) => SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
        decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(width: 42, height: 5, decoration: BoxDecoration(color: const Color(0xFFC9D8D2), borderRadius: BorderRadius.circular(99))),
          const SizedBox(height: 14),
          const Align(alignment: Alignment.centerLeft, child: Text('Déployer sur WhatsApp', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900))),
          const SizedBox(height: 6),
          const Align(alignment: Alignment.centerLeft, child: Text('L’agent répondra sur la session WAHA choisie.', style: TextStyle(color: Color(0xFF6B8279)))),
          const SizedBox(height: 12),
          if (names.isEmpty) const Padding(padding: EdgeInsets.all(18), child: Text('Aucune session disponible. Créez puis connectez une session dans le module IA.')),
          ...names.map((name) => ListTile(leading: const Icon(Icons.phone_android_rounded, color: Color(0xFF08756A)), title: Text(name), trailing: const Icon(Icons.chevron_right_rounded), onTap: () => Navigator.pop(context, name))),
          ListTile(leading: const Icon(Icons.save_outlined), title: const Text('Garder comme brouillon'), onTap: () => Navigator.pop(context, '')),
        ]),
      ),
    ),
  );
  if (selected == null) return false;
  await service.deploy(agentId, selected);
  return true;
}
