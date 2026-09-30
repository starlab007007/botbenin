// Recette de bout en bout du parcours FLUTTER contre le vrai backend (production ou projet de test).
//
// Mêmes scénarios que scripts/waouh-chat/recette/recette-comptes.mjs (Web), mais exécutés avec le code de l'application :
//   LiveCommerceActionClient (contrat d'action v3), liveCommerceRequestFromPayload (bouton serveur → requête),
//   LiveMatchHistoryService (historique de la Deal Room), LiveChatService.sendMainMessage (chat libre),
//   LiveAvatarGuideService (avatar), liveParse* (lecture des réponses).
// Ne contacte jamais de tiers externe (pas de transmit_offer). Articles « ZZ TEST E2E … » à mettre en pause ensuite.
//
// Lancement (sans les variables, le test est ignoré et n'affecte pas la CI) :
//   cd flutter_waouh_app && X_EMAIL=… Y_EMAIL=… [Z_EMAIL=…] X_PW=… Y_PW=… [Z_PW=…] \
//     flutter test test/recette/recette_flutter_prod_test.dart --reporter expanded
// Variables facultatives : SB_URL / SB_ANON (par défaut lues dans ../src/integrations/supabase/client.ts), ONLY=S1,S3.
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:waouh_app_native/live/live_avatar_guide.dart';
import 'package:waouh_app_native/live/live_chat_service.dart';
import 'package:waouh_app_native/live/live_commerce_action_client.dart';
import 'package:waouh_app_native/live/live_match_history_service.dart';
import 'package:waouh_app_native/live/live_models.dart';
import 'package:waouh_app_native/live/live_session.dart';

const _allowed = ['mvynepqulhflxtyymtzs', 'ljzwqyzaovnandpyfpgc'];
final _env = Platform.environment;
final _enabled = (_env['X_EMAIL'] ?? '').isNotEmpty && (_env['X_PW'] ?? '').isNotEmpty && (_env['Y_EMAIL'] ?? '').isNotEmpty && (_env['Y_PW'] ?? '').isNotEmpty;

String _fromClientTs(String name) {
  for (final path in ['../src/integrations/supabase/client.ts', 'src/integrations/supabase/client.ts']) {
    final f = File(path);
    if (f.existsSync()) {
      final m = RegExp('$name\\s*=\\s*"([^"]+)"').firstMatch(f.readAsStringSync());
      if (m != null) return m.group(1)!;
    }
  }
  return '';
}

class _Who {
  _Who(this.tag, this.client, this.uid, this.sid, this.store) : cas = LiveCommerceActionClient(client);
  final String tag;
  final SupabaseClient client;
  final String uid;
  final String sid;
  final LiveSessionStore store;
  final LiveCommerceActionClient cas;
  int seq = 0;
}

void main() {
  test('Recette Flutter de bout en bout (parcours de l\'application)', () async {
    final url = (_env['SB_URL'] ?? '').isNotEmpty ? _env['SB_URL']! : _fromClientTs('SUPABASE_URL');
    final anonEnv = _env['SB_ANON'] ?? '';
    final anon = RegExp(r'^eyJ[\w-]+\.[\w-]+\.[\w-]+$').hasMatch(anonEnv) ? anonEnv : _fromClientTs('SUPABASE_PUBLISHABLE_KEY');
    expect(_allowed.any(url.contains), isTrue, reason: 'Refus : projet non autorisé ($url).');

    final run = DateTime.now().millisecondsSinceEpoch.toRadixString(36);
    final only = (_env['ONLY'] ?? '').isEmpty ? null : _env['ONLY']!.split(',').toSet();
    bool want(String s) => only == null || only.contains(s);
    final rows = <String>[];
    var fails = 0, passes = 0, skips = 0;
    var current = '';
    void scenario(String name) {
      current = name;
      stdout.writeln('\n## $name');
    }

    void check(String id, bool ok, [String detail = '']) {
      if (ok) {
        passes++;
      } else {
        fails++;
        rows.add('$current · $id : $detail');
      }
      stdout.writeln('${ok ? 'PASS' : 'FAIL'} $id${detail.isEmpty ? '' : ' — $detail'}');
    }

    void skip(String id, String why) {
      skips++;
      stdout.writeln('SKIP $id — NON EXÉCUTÉ — $why');
    }

    Future<_Who> login(String tag, String email, String pw) async {
      final sid = 'recF$tag-$run';
      SharedPreferences.setMockInitialValues(<String, Object>{'waouh_web_session_id': sid});
      final client = SupabaseClient(url, anon, authOptions: const AuthClientOptions(autoRefreshToken: false));
      final res = await client.auth.signInWithPassword(email: email, password: pw);
      final store = LiveSessionStore();
      await store.initialize();
      return _Who(tag, client, res.user!.id, sid, store);
    }

    final x = await login('X', _env['X_EMAIL']!, _env['X_PW']!);
    final y = await login('Y', _env['Y_EMAIL']!, _env['Y_PW']!);
    final hasZ = (_env['Z_EMAIL'] ?? '').isNotEmpty && (_env['Z_PW'] ?? '').isNotEmpty;
    final z = hasZ ? await login('Z', _env['Z_EMAIL']!, _env['Z_PW']!) : null;
    stdout.writeln('Projet $url — comptes X, Y${z != null ? ', Z (admin)' : ' (sans admin : livraison et tiers NON EXÉCUTÉS)'} — parcours Flutter');

    // Action v3 par le client de l'application (en-tête x-waouh-session, idem, source flutter_deal_room).
    Future<Map<String, dynamic>> act(_Who who, Map<String, dynamic> body) async {
      final r = await who.cas.send(request: body, sessionId: who.sid, idem: '${who.tag}-$run-${++who.seq}');
      return r ?? <String, dynamic>{'ok': false, 'code': 'client_null'};
    }

    String key(Map<String, dynamic> r) => '${(r['reply'] is Map ? (r['reply'] as Map)['key'] : null) ?? r['code'] ?? ''}';
    String digits(String s) => s.replaceAll(RegExp(r'\D'), '');
    String oneLine(String s, [int n = 70]) {
      final t = s.replaceAll(RegExp(r'\s+'), ' ');
      return t.length > n ? t.substring(0, n) : t;
    }

    Future<String?> publish(_Who who, String title, int price) async {
      try {
        final res = await who.client.functions.invoke('waouh-status-publish', body: <String, dynamic>{
          'type': 'sell',
          'title': 'ZZ TEST E2E $title $run',
          'caption': 'Recette automatique Flutter — à ignorer',
          'price_fcfa': price,
          'location': 'Cotonou',
          'author_name': 'TEST E2E',
          'source': 'flutter_native',
          'idempotency_key': 'pub-${who.tag}-$run-${++who.seq}',
        });
        final d = res.data;
        return d is Map && d['ok'] == true ? '${d['article_id']}' : null;
      } on FunctionException {
        return null;
      }
    }

    LiveMatch matchOf(_Who who, String article, String role, {String? thread, String? neg, String? deal}) => LiveMatch(
          key: 'recette-$article-${who.tag}',
          articleId: article,
          role: role,
          title: 'ZZ TEST E2E',
          lastAt: DateTime.now(),
          threadId: thread,
          negotiationId: neg,
          dealId: deal,
        );

    Future<List<LiveMessage>> hist(_Who who, String article, String role, String? thread) async {
      final r = await LiveMatchHistoryService(who.client, who.store).loadResult(match: matchOf(who, article, role, thread: thread), authUserId: who.uid, limit: 120);
      return r.ok ? r.messages : <LiveMessage>[];
    }

    List<String> actionIds(LiveMessage m) {
      final a = m.meta['actions'];
      if (a is! List) return const [];
      return a.map((e) => e is Map ? '${e['id'] ?? e['payload'] ?? ''}' : '$e').where((s) => s.isNotEmpty).toList();
    }

    String kind(String id) => id.split(':').first.split('?').first.replaceFirst('waouh:', '');
    bool has(List<LiveMessage> h, RegExp re) => h.any((m) => re.hasMatch(m.text));
    String lastText(List<LiveMessage> h) => h.isEmpty ? '' : h.last.text;
    int dupCount(List<LiveMessage> h) {
      final seen = <String, int>{};
      for (final m in h) {
        final t = m.text.replaceAll(RegExp(r'\s+'), ' ').trim();
        if (t.length > 6) seen['${m.direction}|$t'] = (seen['${m.direction}|$t'] ?? 0) + 1;
      }
      return seen.values.where((n) => n > 1).length;
    }

    // Bouton tel que l'application le reçoit dans le message → requête v3 (liveCommerceRequestFromPayload) → client d'action.
    Future<Map<String, dynamic>?> tapButton(_Who who, List<LiveMessage> h, String wanted, String thread) async {
      for (final m in h.reversed) {
        for (final id in actionIds(m)) {
          if (kind(id) == wanted) {
            final req = liveCommerceRequestFromPayload(id, threadId: thread);
            if (req == null) return <String, dynamic>{'ok': false, 'code': 'flutter_mapping_null:$id'};
            return act(who, req);
          }
        }
      }
      return null;
    }

    Future<Map<String, String?>?> fullTrade(_Who s, _Who b, String label, {int turns = 1}) async {
      final article = await publish(s, label, 100000);
      check('$label · le vendeur publie', article != null, 'article=$article');
      if (article == null) return null;
      var r = await act(b, {'action': 'open_deal', 'article_id': article, 'source': 'flutter_deal_room'});
      final thread = '${r['thread_id'] ?? ''}', neg = '${r['negotiation_id'] ?? ''}';
      check('$label · l\'acheteur ouvre l\'article → Intéressé (fil, négociation)', r['ok'] == true && thread.isNotEmpty && neg.isNotEmpty && liveText((r['card'] as Map?)?['article_id']) == article, 'clé=${key(r)}');
      var hs = await hist(s, article, 'seller', thread);
      final sellerButtons = hs.expand(actionIds).map(kind).toSet();
      check('$label · le vendeur est notifié avec Accepter / Refuser (boutons lus par Flutter)', has(hs, RegExp('Nouvel acheteur')) && sellerButtons.containsAll(['accepter', 'refuser']), 'boutons=$sellerButtons');
      var price = 80000;
      for (var i = 0; i < turns; i++) {
        r = await act(b, {'action': 'offer', 'thread_id': thread, 'negotiation_id': neg, 'article_id': article, 'amount': price, 'confirmed': true});
        check('$label · tour ${i + 1} : l\'acheteur propose $price', r['ok'] == true && r['thread_id'] == thread, 'clé=${key(r)}');
        hs = await hist(s, article, 'seller', thread);
        check('$label · tour ${i + 1} : le vendeur reçoit $price', digits(lastText(hs)).contains('$price'), '« ${oneLine(lastText(hs))} »');
        price += 10000;
        r = await act(s, {'action': 'offer', 'thread_id': thread, 'negotiation_id': neg, 'article_id': article, 'amount': price, 'confirmed': true});
        check('$label · tour ${i + 1} : le vendeur contre-propose $price', r['ok'] == true && r['thread_id'] == thread, 'clé=${key(r)}');
        final hb = await hist(b, article, 'buyer', thread);
        check('$label · tour ${i + 1} : l\'acheteur reçoit $price + bouton Accepter', digits(lastText(hb)).contains('$price') && hb.isNotEmpty && actionIds(hb.last).map(kind).contains('accepter'), 'boutons=${hb.isEmpty ? [] : actionIds(hb.last)}');
      }
      final hb = await hist(b, article, 'buyer', thread);
      r = (await tapButton(b, hb, 'accepter', thread)) ?? await act(b, {'action': 'accept', 'negotiation_id': neg, 'thread_id': thread});
      final deal = '${r['deal_id'] ?? ''}';
      check('$label · l\'acheteur appuie sur Accepter → Accord (deal)', r['ok'] == true && deal.isNotEmpty && r['thread_id'] == thread, 'clé=${key(r)}');
      r = await act(s, {'action': 'seller_confirm', 'deal_id': deal});
      check('$label · le vendeur confirme la disponibilité', r['ok'] == true && r['thread_id'] == thread, 'clé=${key(r)}');
      final reqCash = liveCommerceRequestFromPayload('paiement-livraison:$deal');
      r = await act(b, reqCash ?? {'action': 'pay_mode', 'deal_id': deal, 'method': 'cash'});
      check('$label · l\'acheteur choisit le paiement à la livraison → Préparation', reqCash != null && r['ok'] == true && r['thread_id'] == thread, 'étape=${r['stage']}');
      if (z != null) {
        Future<FunctionResponse?> ops(Map<String, dynamic> body) async {
          try {
            return await z.client.functions.invoke('waouh-deal-ops', headers: {'x-waouh-session': z.sid}, body: {...body, 'session_id': z.sid});
          } on FunctionException catch (e) {
            return FunctionResponse(data: e.details, status: e.status);
          }
        }

        final a = await ops({'action': 'assign', 'deal_id': deal, 'courier_id': _env['COURIER_ID'] ?? '6558d4ff-1560-4177-bf2f-e5a1364e2212', 'eta_minutes': 30});
        final aj = a?.data is Map ? a!.data as Map : const {};
        check('$label · livreur assigné (admin ou automatique)', (a?.status == 409 && aj['current_status'] == 'assigned') || (a?.status == 200 && (aj['ok'] == true || aj['success'] == true)), 'http ${a?.status}');
        final p = await ops({'action': 'status', 'deal_id': deal, 'status': 'picked_up'});
        final d = await ops({'action': 'status', 'deal_id': deal, 'status': 'delivered'});
        check('$label · colis ramassé puis livré', p?.status == 200 && d?.status == 200, 'http ${p?.status}/${d?.status}');
        final reqPay = liveCommerceRequestFromPayload('confirmer-paiement-cash:$deal');
        r = await act(b, reqPay ?? {'action': 'confirm_payment', 'deal_id': deal, 'method': 'cash'});
        check('$label · paiement confirmé → Terminé', reqPay != null && r['ok'] == true && r['thread_id'] == thread, 'étape=${r['stage']}');
      } else {
        skip('$label · livreur, livraison, paiement, clôture', 'compte administrateur Z non fourni');
      }
      final ha = await hist(b, article, 'buyer', thread), hb2 = await hist(s, article, 'seller', thread);
      final threads = <String>{...ha.followedBy(hb2).map((m) => m.threadId ?? '').where((t) => t.isNotEmpty)};
      check('$label · thread_id canonique : tous les messages sur le même fil', threads.length <= 1 && (threads.isEmpty || threads.contains(thread)), 'fils vus=${threads.length}');
      check('$label · aucun message en double dans les deux historiques', dupCount(ha) == 0 && dupCount(hb2) == 0, 'doublons acheteur=${dupCount(ha)}, vendeur=${dupCount(hb2)}');
      return {'article': article, 'thread': thread, 'deal': deal};
    }

    if (want('S1')) {
      scenario('S1 X vend, Y achète (1 contre-proposition) — parcours Flutter');
      await fullTrade(x, y, 'S1');
    }
    if (want('S2')) {
      scenario('S2 Y vend, X achète (rôles inversés, 3 tours) — parcours Flutter');
      await fullTrade(y, x, 'S2', turns: 3);
    }

    if (want('S3')) {
      scenario('S3 refus du vendeur (bouton Refuser), nouvelle offre, bouton périmé');
      final article = (await publish(x, 'Refus', 50000))!;
      var r = await act(y, {'action': 'open_deal', 'article_id': article});
      final thread = '${r['thread_id']}', neg = '${r['negotiation_id']}';
      await act(y, {'action': 'offer', 'thread_id': thread, 'negotiation_id': neg, 'article_id': article, 'amount': 20000, 'confirmed': true});
      final hx = await hist(x, article, 'seller', thread);
      r = (await tapButton(x, hx, 'refuser', thread)) ?? await act(x, {'action': 'reject', 'thread_id': thread, 'negotiation_id': neg});
      check('S3a le vendeur appuie sur Refuser', r['ok'] == true, 'clé=${key(r)}');
      final hy = await hist(y, article, 'buyer', thread);
      check('S3b l\'acheteur est informé du refus', has(hy, RegExp('refus', caseSensitive: false)), '« ${oneLine(lastText(hy))} »');
      r = await act(x, {'action': 'accept', 'thread_id': thread, 'negotiation_id': neg});
      check('S3c un bouton périmé (accepter après refus) est refusé, aucun deal', r['ok'] == false && r['deal_id'] == null, 'clé=${key(r)}');
      r = await act(y, {'action': 'offer', 'thread_id': thread, 'negotiation_id': neg, 'article_id': article, 'amount': 30000, 'confirmed': true});
      check('S3d nouvelle offre après refus acceptée', r['ok'] == true, 'clé=${key(r)}');
      // S4d Flutter : « Retirer mon offre » (alias retirer-offre) disponible côté acheteur tant que l'offre est en attente.
      final hb = await hist(y, article, 'buyer', thread);
      final withdraw = hb.expand(actionIds).where((id) => kind(id) == 'retirer-offre').toList();
      check('S3e l\'acheteur voit « Retirer mon offre » tant que l\'offre est en attente', withdraw.isNotEmpty, 'boutons=${hb.isEmpty ? [] : actionIds(hb.last)}');
      if (withdraw.isNotEmpty) {
        r = await tapButton(y, hb, 'retirer-offre', thread) ?? {'ok': false};
        check('S3f l\'acheteur retire son offre (aucun deal, plus d\'impasse)', r['ok'] == true && r['deal_id'] == null, 'clé=${key(r)}');
      }
    }

    if (want('S4')) {
      scenario('S4 question / réponse (sans offre) — parcours Flutter');
      final article = (await publish(y, 'Question', 70000))!;
      var r = await act(x, {'action': 'ask', 'article_id': article, 'text': 'Est-ce garanti 1 an ?'});
      final thread = '${r['thread_id'] ?? ''}';
      check('S4a l\'acheteur pose une question sans offre', r['ok'] == true && thread.isNotEmpty, 'clé=${key(r)}');
      final hs = await hist(y, article, 'seller', thread);
      check('S4b le vendeur reçoit la question', has(hs, RegExp('garanti', caseSensitive: false)), '${hs.length} message(s)');
      r = await act(y, {'action': 'ask', 'thread_id': thread, 'article_id': article, 'text': 'Oui, garanti 1 an.'});
      final hb = await hist(x, article, 'buyer', thread);
      check('S4c le vendeur répond, l\'acheteur reçoit la réponse', r['ok'] == true && has(hb, RegExp('1 an', caseSensitive: false)), 'clé=${key(r)}');
    }

    if (want('S5')) {
      scenario('S5 garde-fous : auto-intérêt, doublons, idempotence, tiers');
      final article = (await publish(x, 'Gardefous', 40000))!;
      var r = await act(x, {'action': 'open_deal', 'article_id': article});
      check('S5a le vendeur ne peut pas s\'intéresser à son propre article', r['ok'] == false, 'clé=${key(r)}');
      final d1 = await act(y, {'action': 'open_deal', 'article_id': article}), d2 = await act(y, {'action': 'open_deal', 'article_id': article});
      final thread = '${d1['thread_id']}', neg = '${d1['negotiation_id']}';
      check('S5b deux « Intéressé » = même fil, même négociation', thread.isNotEmpty && thread == '${d2['thread_id']}' && neg == '${d2['negotiation_id']}');
      final hs = await hist(x, article, 'seller', thread);
      final n = hs.where((m) => RegExp('Nouvel acheteur').hasMatch(m.text)).length;
      check('S5c le vendeur n\'est notifié qu\'une fois (pas de doublon)', n == 1, '$n notification(s)');
      final body = <String, dynamic>{'action': 'offer', 'thread_id': thread, 'negotiation_id': neg, 'article_id': article, 'amount': 25000, 'confirmed': true};
      final i1 = await y.cas.send(request: body, sessionId: y.sid, idem: 'same-$run');
      final i2 = await y.cas.send(request: body, sessionId: y.sid, idem: 'same-$run');
      check('S5d même clé idem rejouée : réponse identique, marquée rejouée', i1?['ok'] == true && i2?['replayed'] == true, 'replayed=${i2?['replayed']}');
      final hs2 = await hist(x, article, 'seller', thread);
      final k = hs2.where((m) => digits(m.text).contains('25000')).length;
      check('S5e le rejeu n\'écrit pas de 2ᵉ message d\'offre', k == 1, '$k message(s)');
      final other = await x.cas.send(request: {...body, 'thread_id': thread}, sessionId: x.sid, idem: 'same-$run');
      check('S5f même clé idem par un autre utilisateur refusée', other?['ok'] == false, 'code=${other?['code']}');
      r = await act(y, {'action': 'offer', 'thread_id': thread, 'negotiation_id': neg, 'article_id': article, 'confirmed': true});
      check('S5g offre sans montant refusée', r['ok'] == false, 'code=${r['code']}');
      r = await act(y, {'action': 'inconnue', 'article_id': article});
      check('S5h action inconnue refusée', r['ok'] == false, 'code=${r['code']}');
      if (z != null) {
        r = await act(z, {...body, 'amount': 26000});
        check('S5j un tiers (Z) ne peut pas faire d\'offre dans ce fil', r['ok'] == false, 'code=${r['code']}');
        final hz = await hist(z, article, 'buyer', thread);
        check('S5k un tiers ne lit pas l\'historique du fil', hz.isEmpty, '${hz.length} message(s)');
      } else {
        skip('S5j-k tiers (refus, historique)', 'compte Z non fourni');
      }
    }

    if (want('S6')) {
      scenario('S6 deux acheteurs, un article : un seul deal, l\'autre est prévenu');
      if (z == null) {
        skip('S6 concurrence de deux acheteurs', 'compte Z non fourni');
      } else {
        final article = (await publish(x, 'Concurrence', 60000))!;
        final a = await act(y, {'action': 'open_deal', 'article_id': article}), b = await act(z, {'action': 'open_deal', 'article_id': article});
        check('S6a deux fils distincts pour deux acheteurs', '${a['thread_id']}'.isNotEmpty && a['thread_id'] != b['thread_id']);
        await act(y, {'action': 'offer', 'thread_id': a['thread_id'], 'negotiation_id': a['negotiation_id'], 'article_id': article, 'amount': 55000, 'confirmed': true});
        await act(z, {'action': 'offer', 'thread_id': b['thread_id'], 'negotiation_id': b['negotiation_id'], 'article_id': article, 'amount': 56000, 'confirmed': true});
        final ra = await act(x, {'action': 'accept', 'thread_id': a['thread_id'], 'negotiation_id': a['negotiation_id']});
        final rb = await act(x, {'action': 'accept', 'thread_id': b['thread_id'], 'negotiation_id': b['negotiation_id']});
        final wins = [ra, rb].where((r) => r['ok'] == true && r['deal_id'] != null).toList();
        check('S6b un seul deal est créé', wins.length == 1, 'clés=${key(ra)}/${key(rb)}');
        final yWon = wins.isNotEmpty && identical(wins.first, ra);
        final loser = yWon ? z : y;
        final loserThread = '${yWon ? b['thread_id'] : a['thread_id']}';
        final hl = await hist(loser, article, 'buyer', loserThread);
        check('S6c l\'acheteur évincé est prévenu (réservé / indisponible)', has(hl, RegExp('r[ée]serv|plus disponible|vendu|indisponible|un autre achete', caseSensitive: false)), '« ${oneLine(lastText(hl), 80)} »');
        final again = await act(loser, {'action': 'open_deal', 'article_id': article});
        check('S6d ouvrir l\'article réservé est refusé clairement', again['ok'] == false && RegExp('article_(reserved|sold)').hasMatch(key(again)), 'clé=${key(again)}');
      }
    }

    if (want('S7')) {
      scenario('S7 chat libre Flutter : je cherche / je vends / demande (LiveChatService.sendMainMessage)');
      Future<Map<String, dynamic>> chat(_Who who, String text) async {
        try {
          return await LiveChatService(who.client, who.store).sendMainMessage(text: text, attachments: const [], authUserId: who.uid, city: 'Cotonou', latitude: 6.3703, longitude: 2.3912);
        } catch (e) {
          return <String, dynamic>{'ok': false, 'error': '$e'};
        }
      }

      var r = await chat(y, 'Je cherche ZZ TEST E2E introuvable $run');
      check('S7a « Je cherche … » : réponse du moteur, normalisée par Flutter', r['ok'] != false && r.isNotEmpty, 'clés=${r.keys.take(8).toList()}');
      r = await chat(x, 'Je vends ZZ TEST E2E chat $run à 15000 FCFA à Cotonou');
      check('S7b « Je vends … » : réponse du moteur', r['ok'] != false, 'clés=${r.keys.take(8).toList()}');
      r = await chat(y, 'Demande : je voudrais une ZZ TEST E2E demande $run');
      check('S7c demande libre : réponse du moteur', r['ok'] != false, 'clés=${r.keys.take(8).toList()}');
    }

    if (want('S8')) {
      scenario('S8 avatar Flutter : tableau de mission, réglages, « Faire le point », anti-doublon');
      final svc = LiveAvatarGuideService((body) async {
        final res = await y.client.functions.invoke('waouh-avatar-briefing', body: {...body, 'session_id': y.sid});
        final d = res.data;
        return d is Map ? Map<String, dynamic>.from(d) : null;
      });
      final board = await svc.status();
      check('S8a tableau de mission lu par Flutter', board != null, 'board=${board == null ? null : 'ok'}');
      final prefs = await svc.savePrefs({'welcome': true, 'cadence': 'daily', 'notify_events': true, 'notify_digest': false});
      check('S8b réglages enregistrés (bilans WhatsApp coupés par défaut)', prefs != null && prefs.notifyDigest == false, 'prefs=${prefs == null ? null : 'ok'}');
      final now = await svc.brief('now', sessionId: y.sid);
      check('S8c « Faire le point » : bulles envoyées', now != null && now.sent, 'raison=${now?.reason}');
      final open = await svc.brief('open', sessionId: y.sid);
      check('S8d ouverture répétée : pas de second accueil', open != null && !open.sent && open.reason == 'too_soon', 'sent=${open?.sent}, raison=${open?.reason}');
    }

    stdout.writeln('\n==== BILAN FLUTTER : $passes réussis, $fails échecs, $skips non exécutés ====');
    for (final f in rows) {
      stdout.writeln(' - $f');
    }
    expect(fails, 0, reason: rows.join('\n'));
  }, skip: _enabled ? false : 'Recette Flutter ignorée : X_EMAIL/X_PW/Y_EMAIL/Y_PW non fournis', timeout: const Timeout(Duration(minutes: 20)));
}
