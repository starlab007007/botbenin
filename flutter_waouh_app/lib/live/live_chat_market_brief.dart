import 'package:flutter/material.dart';

import 'avatar/bot_character.dart' show botAvatarAsset;
import 'live_guided_ask.dart';
import 'live_theme.dart';

const Color _ink = Color(0xFF131A2E);
const Color _muted = Color(0xFF5D6880);
const Color _line = Color(0xFFE3E8F4);
const Color _bg = Color(0xFFF4F6FC);
const Color _soft = Color(0xFFEEF2FF);
const Color _blue = Color(0xFF3558E6);
const Color _teal = Color(0xFF0A8F83);
const Color _tealSoft = Color(0xFFE4F6F2);
const Color _gold = Color(0xFFA8690A);
const Color _goldSoft = Color(0xFFFFF5DD);

/// Avancement de la recherche : Demande, Recherche, Analyse, Offres, Échange (parité Web).
class LiveSearchStageBar extends StatelessWidget {
  const LiveSearchStageBar({super.key, required this.stage});
  final int stage;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (var i = 0; i < liveSearchStages.length; i++)
          Expanded(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        height: 2,
                        color: i == 0
                            ? Colors.transparent
                            : (i <= stage ? _teal : _line),
                      ),
                    ),
                    Container(
                      width: 22,
                      height: 22,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: i < stage ? _teal : Colors.white,
                        border: Border.all(
                          width: 2,
                          color: i < stage ? _teal : (i == stage ? _blue : _line),
                        ),
                      ),
                      child: i < stage
                          ? const Icon(Icons.check, size: 12, color: Colors.white)
                          : Text(
                              '${i + 1}',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                                color: i == stage ? _blue : _muted,
                              ),
                            ),
                    ),
                    Expanded(
                      child: Container(
                        height: 2,
                        color: i == liveSearchStages.length - 1
                            ? Colors.transparent
                            : (i < stage ? _teal : _line),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 5),
                Text(
                  liveSearchStages[i],
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 10.5,
                    fontWeight: i == stage ? FontWeight.w800 : FontWeight.w600,
                    color: i < stage ? _teal : (i == stage ? _ink : _muted),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

/// Analyse du marché par Bot dans la recherche du Chat : repères de prix, choix de Bot,
/// comparaison des meilleures offres et un seul bouton pour tout confier à Bot.
class LiveChatMarketBriefCard extends StatelessWidget {
  const LiveChatMarketBriefCard({
    super.key,
    required this.brief,
    required this.onDelegate,
    this.city,
    this.budget,
    this.kind,
    this.delegating = false,
    this.delegated = false,
    this.onFollow,
  });

  final LiveChatBrief brief;
  final String? city;
  final int? budget;
  final String? kind;
  final bool delegating;
  final bool delegated;
  final VoidCallback onDelegate;
  final VoidCallback? onFollow;

  bool get _ask => const <String>['service', 'prestation', 'demander', 'opportunite'].contains(kind);

  String _gap(LiveChatBriefRow row) {
    final gap = row.vsMedianPct;
    if (gap == null) return row.price == null ? 'Prix à demander' : '—';
    if (gap.abs() < 3) return 'Au prix médian';
    return gap < 0 ? '${gap.abs()} % sous la médiane' : '$gap % au-dessus';
  }

  Widget _stat(IconData icon, String label, String value, String note) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.fromLTRB(10, 10, 8, 10),
        decoration: BoxDecoration(
          color: _bg,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: _line),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              Icon(icon, size: 13, color: _muted),
              const SizedBox(width: 4),
              Flexible(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: _muted),
                ),
              ),
            ]),
            const SizedBox(height: 5),
            Text(
              value,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: _ink),
            ),
            const SizedBox(height: 2),
            Text(
              note,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 10.5, height: 1.3, color: _muted),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (brief.total == 0) return const SizedBox.shrink();
    final pick = brief.pick;
    final zone = (city ?? '').trim();
    final count = brief.delegable.length > 4 ? 4 : brief.delegable.length;
    final provider = _ask ? 'prestataire' : 'vendeur';
    final photo = pick == null ? null : liveBriefPhoto(pick.row);
    final priceNote = brief.low != null && brief.high != null && brief.high != brief.low
        ? 'jusqu’à ${liveBriefMoney(brief.high)} · médiane ${liveBriefMoney(brief.median)}'
        : '${brief.priced}/${brief.total} chiffrée${brief.priced > 1 ? 's' : ''}';

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: _line),
        boxShadow: const [
          BoxShadow(color: Color(0x1F1F316E), blurRadius: 30, offset: Offset(0, 14), spreadRadius: -18),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(children: [
            ClipOval(child: Image.asset(botAvatarAsset, width: 38, height: 38, fit: BoxFit.cover)),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Analyse du marché',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: _ink),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${brief.total} offre${brief.total > 1 ? 's' : ''} comparée${brief.total > 1 ? 's' : ''} par Bot',
                    style: const TextStyle(fontSize: 12, color: _muted),
                  ),
                ],
              ),
            ),
          ]),
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _stat(Icons.bar_chart_rounded, 'Prix', brief.low == null ? 'À demander' : liveBriefMoney(brief.low), priceNote),
              const SizedBox(width: 6),
              _stat(Icons.place_outlined, 'Votre zone', zone.isEmpty ? '—' : '${brief.inZone}/${brief.total}', zone.isEmpty ? 'Zone non précisée' : zone),
              const SizedBox(width: 6),
              _stat(Icons.verified_user_outlined, 'Joignables', '${brief.reachable}/${brief.total}', brief.reachable > 0 ? 'contact possible' : 'contact à trouver'),
            ],
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
            decoration: BoxDecoration(color: _soft, borderRadius: BorderRadius.circular(16)),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Padding(
                  padding: EdgeInsets.only(top: 2),
                  child: Icon(Icons.auto_awesome, size: 15, color: Color(0xFF4F46E5)),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(brief.advice, style: const TextStyle(fontSize: 13, height: 1.45, color: _ink)),
                ),
              ],
            ),
          ),
          if (pick != null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0x4DA8690A)),
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [_goldSoft, Colors.white],
                ),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: Container(
                      width: 68,
                      height: 68,
                      color: Colors.white,
                      alignment: Alignment.center,
                      child: photo == null
                          ? const Icon(Icons.emoji_events_outlined, color: _gold)
                          : Image.network(
                              photo,
                              width: 68,
                              height: 68,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => const Icon(Icons.emoji_events_outlined, color: _gold),
                            ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
                          decoration: BoxDecoration(color: _gold, borderRadius: BorderRadius.circular(999)),
                          child: Text(
                            pick.index > 0 ? 'Le choix de Bot · résultat ${pick.index}' : 'Le choix de Bot',
                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Colors.white),
                          ),
                        ),
                        const SizedBox(height: 7),
                        Text(
                          pick.title,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, height: 1.25, color: _ink),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          '${pick.price == null ? 'Prix à demander' : liveBriefMoney(pick.price)}${pick.city.isEmpty ? '' : ' · ${pick.city}'}',
                          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: _ink),
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 5,
                          runSpacing: 5,
                          children: [
                            for (final reason in brief.pickReasons)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                                decoration: BoxDecoration(color: _tealSoft, borderRadius: BorderRadius.circular(999)),
                                child: Text(
                                  reason,
                                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: _teal),
                                ),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
          if (brief.compare.length > 1) ...[
            const SizedBox(height: 12),
            Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: _line),
              ),
              child: Column(
                children: [
                  for (final row in brief.compare)
                    Container(
                      padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
                      decoration: BoxDecoration(
                        color: row.rank == 1 ? _bg : Colors.transparent,
                        border: row.rank == 1 ? null : const Border(top: BorderSide(color: _line)),
                      ),
                      child: Row(children: [
                        Container(
                          width: 24,
                          height: 24,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: row.rank == 1 ? _gold : _soft,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            '${row.rank}',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                              color: row.rank == 1 ? Colors.white : _blue,
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                row.title,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: _ink),
                              ),
                              Text(
                                [
                                  if (row.index > 0) 'Résultat ${row.index}',
                                  if (row.city.isNotEmpty) row.city,
                                ].join(' · '),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 11, color: _muted),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              row.price == null ? '—' : liveBriefMoney(row.price),
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: _ink),
                            ),
                            Text(_gap(row), style: const TextStyle(fontSize: 11, color: _muted)),
                          ],
                        ),
                      ]),
                    ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 12),
          if (brief.delegable.isEmpty)
            Container(
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: _line),
              ),
              child: Text(
                'Aucune de ces offres ne peut encore être confiée à Bot. Ouvrez une fiche ci-dessous pour écrire au $provider ou proposer un prix.',
                style: const TextStyle(fontSize: 12, height: 1.45, color: _muted),
              ),
            )
          else
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(20),
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [Color(0xFF1D2A6B), Color(0xFF3B3FD6), Color(0xFF5B4BEA)],
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    count > 1 ? 'Confier les $count meilleures offres à Bot' : 'Confier cette recherche à Bot',
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: Colors.white),
                  ),
                  const SizedBox(height: 5),
                  Text(
                    'Bot contacte le $provider, négocie${budget != null ? ' sans dépasser ${liveBriefMoney(budget)}' : ' dans vos limites'}${count > 1 ? ' et passe à l’offre suivante s’il n’obtient pas de réponse' : ''}. Vous confirmez toujours l’accord final, et aucun paiement ne part sans vous.',
                    style: const TextStyle(fontSize: 12, height: 1.5, color: Color(0xDDFFFFFF)),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    height: 50,
                    child: FilledButton.icon(
                      onPressed: delegating ? null : (delegated ? onFollow : onDelegate),
                      style: FilledButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: delegated ? _teal : const Color(0xFF1D2A6B),
                        disabledBackgroundColor: const Color(0xCCFFFFFF),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      icon: delegating
                          ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                          : Icon(delegated ? Icons.check_circle_outline : Icons.handshake_outlined, size: 18),
                      label: Text(
                        delegated
                            ? 'Bot s’en occupe · Suivre'
                            : (count > 1 ? 'Confier les $count à Bot' : 'Confier à Bot'),
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900),
                      ),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

/// Bandeau d'en-tête de la recherche : type de demande, zone et budget.
class LiveSearchChips extends StatelessWidget {
  const LiveSearchChips({super.key, this.city, this.budget});
  final String? city;
  final int? budget;

  @override
  Widget build(BuildContext context) {
    final zone = (city ?? '').trim();
    if (zone.isEmpty && budget == null) return const SizedBox.shrink();
    Widget chip(IconData icon, String label) => Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
          decoration: BoxDecoration(color: _soft, borderRadius: BorderRadius.circular(999)),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            Icon(icon, size: 13, color: WaouhPalette.blue),
            const SizedBox(width: 5),
            Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: _blue)),
          ]),
        );
    return Wrap(spacing: 6, runSpacing: 6, children: [
      if (zone.isNotEmpty) chip(Icons.place_outlined, zone),
      if (budget != null) chip(Icons.account_balance_wallet_outlined, 'Budget ${liveBriefMoney(budget)}'),
    ]);
  }
}
