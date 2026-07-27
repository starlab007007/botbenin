import 'package:flutter/material.dart';

import '../data/fa_ia_catalog.dart';
import '../domain/fa_ia_engine.dart';
import '../domain/fa_ia_models.dart';
import 'fa_ia_chain.dart';
import 'fa_ia_theme.dart';

class FaIaLibraryScreen extends StatefulWidget {
  const FaIaLibraryScreen({super.key, required this.engine});

  final FaIaEngine engine;

  @override
  State<FaIaLibraryScreen> createState() => _FaIaLibraryScreenState();
}

class _FaIaLibraryScreenState extends State<FaIaLibraryScreen> {
  final TextEditingController _search = TextEditingController();
  bool _matrixMode = false;
  bool _mejiOnly = false;

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  List<FaCombinedSign> get _filtered {
    final query = _normalize(_search.text);
    return widget.engine.allSigns
        .where((sign) {
          if (_mejiOnly && !sign.isMeji) return false;
          if (query.isEmpty) return true;
          final haystack = _normalize(
            <String>[
              sign.reference,
              sign.canonicalName,
              sign.x.canonicalName,
              sign.y.canonicalName,
              ...sign.x.aliases,
              ...sign.y.aliases,
            ].join(' '),
          );
          return haystack.contains(query);
        })
        .toList(growable: false);
  }

  String _normalize(String value) => value
      .toLowerCase()
      .replaceAll(RegExp(r'[àáâãäå]'), 'a')
      .replaceAll(RegExp(r'[èéêë]'), 'e')
      .replaceAll(RegExp(r'[ìíîï]'), 'i')
      .replaceAll(RegExp(r'[òóôõö]'), 'o')
      .replaceAll(RegExp(r'[ùúûü]'), 'u')
      .replaceAll('ç', 'c')
      .replaceAll(RegExp(r'[^a-z0-9]+'), ' ')
      .trim();

  void _openSign(FaCombinedSign sign) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => _FaIaSignDetailScreen(sign: sign),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final signs = _filtered;
    return Scaffold(
      backgroundColor: FaIaColors.background,
      appBar: AppBar(
        backgroundColor: FaIaColors.deepBrown,
        foregroundColor: Colors.white,
        title: const Text(
          'Les 256 signes',
          style: TextStyle(fontWeight: FontWeight.w900),
        ),
        actions: <Widget>[
          IconButton(
            tooltip: _matrixMode ? 'Afficher la liste' : 'Afficher la matrice',
            onPressed: () => setState(() => _matrixMode = !_matrixMode),
            icon: Icon(
              _matrixMode ? Icons.view_list_rounded : Icons.grid_on_rounded,
            ),
          ),
        ],
      ),
      body: SafeArea(
        top: false,
        child: Column(
          children: <Widget>[
            _LibraryHeader(
              search: _search,
              matrixMode: _matrixMode,
              mejiOnly: _mejiOnly,
              count: signs.length,
              onSearchChanged: (_) => setState(() {}),
              onClearSearch: () {
                _search.clear();
                setState(() {});
              },
              onMejiChanged: (value) => setState(() => _mejiOnly = value),
            ),
            Expanded(
              child: _matrixMode
                  ? _FaMatrix(engine: widget.engine, onOpen: _openSign)
                  : _SignList(signs: signs, onOpen: _openSign),
            ),
          ],
        ),
      ),
    );
  }
}

class _LibraryHeader extends StatelessWidget {
  const _LibraryHeader({
    required this.search,
    required this.matrixMode,
    required this.mejiOnly,
    required this.count,
    required this.onSearchChanged,
    required this.onClearSearch,
    required this.onMejiChanged,
  });

  final TextEditingController search;
  final bool matrixMode;
  final bool mejiOnly;
  final int count;
  final ValueChanged<String> onSearchChanged;
  final VoidCallback onClearSearch;
  final ValueChanged<bool> onMejiChanged;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 10),
      child: Column(
        children: <Widget>[
          FaIaCard(
            padding: const EdgeInsets.all(15),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                const Text('Référentiel structurel', style: FaIaText.h2),
                const SizedBox(height: 5),
                Text(
                  matrixMode
                      ? 'La matrice respecte l’ordre X–Y : la colonne A vient de Y et la colonne B vient de X.'
                      : 'Recherchez par nom, variante ou référence. Les 16 signes Mêji sont les cellules de la diagonale.',
                  style: FaIaText.muted,
                ),
                const SizedBox(height: 13),
                TextField(
                  controller: search,
                  enabled: !matrixMode,
                  onChanged: onSearchChanged,
                  textInputAction: TextInputAction.search,
                  decoration: InputDecoration(
                    hintText: matrixMode
                        ? 'Recherche disponible en mode liste'
                        : 'Rechercher Gbé, Yêkou, 1-2…',
                    prefixIcon: const Icon(Icons.search_rounded),
                    suffixIcon: search.text.isEmpty
                        ? null
                        : IconButton(
                            onPressed: onClearSearch,
                            icon: const Icon(Icons.close_rounded),
                          ),
                    filled: true,
                    fillColor: FaIaColors.background,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  children: <Widget>[
                    Expanded(
                      child: Text(
                        matrixMode
                            ? 'Matrice complète 16 × 16'
                            : '$count signe${count > 1 ? 's' : ''}',
                        style: FaIaText.label,
                      ),
                    ),
                    if (!matrixMode)
                      FilterChip(
                        selected: mejiOnly,
                        onSelected: onMejiChanged,
                        label: const Text('Mêji uniquement'),
                        avatar: const Icon(Icons.view_column_rounded, size: 17),
                        selectedColor: FaIaColors.ivory,
                        checkmarkColor: FaIaColors.deepBrown,
                      ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SignList extends StatelessWidget {
  const _SignList({required this.signs, required this.onOpen});

  final List<FaCombinedSign> signs;
  final ValueChanged<FaCombinedSign> onOpen;

  @override
  Widget build(BuildContext context) {
    if (signs.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              Icon(Icons.search_off_rounded, size: 50, color: FaIaColors.muted),
              SizedBox(height: 12),
              Text(
                'Aucun signe ne correspond à cette recherche.',
                textAlign: TextAlign.center,
                style: FaIaText.muted,
              ),
            ],
          ),
        ),
      );
    }

    return ListView.separated(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 30),
      itemCount: signs.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        final sign = signs[index];
        return Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(20),
            onTap: () => onOpen(sign),
            child: Ink(
              padding: const EdgeInsets.all(15),
              decoration: BoxDecoration(
                color: FaIaColors.surface,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: FaIaColors.line),
              ),
              child: Row(
                children: <Widget>[
                  _MiniMatrix(sign: sign),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Row(
                          children: <Widget>[
                            Expanded(
                              child: Text(
                                sign.canonicalName,
                                style: FaIaText.h2,
                              ),
                            ),
                            if (sign.isMeji)
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: FaIaColors.ivory,
                                  borderRadius: BorderRadius.circular(999),
                                ),
                                child: const Text(
                                  'MÊJI',
                                  style: FaIaText.label,
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Réf. ${sign.reference} · A = ${sign.y.canonicalName} · B = ${sign.x.canonicalName}',
                          style: FaIaText.muted,
                        ),
                      ],
                    ),
                  ),
                  const Icon(
                    Icons.chevron_right_rounded,
                    color: FaIaColors.copper,
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class _MiniMatrix extends StatelessWidget {
  const _MiniMatrix({required this.sign});

  final FaCombinedSign sign;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 66,
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 8),
      decoration: BoxDecoration(
        color: FaIaColors.deepBrown,
        borderRadius: BorderRadius.circular(15),
      ),
      child: Column(
        children: <Widget>[
          const Text(
            'A    B',
            style: TextStyle(
              color: FaIaColors.gold,
              fontSize: 9,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 3),
          for (var index = 0; index < 4; index += 1)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 1),
              child: Text(
                '${sign.columnA[index].symbol.padRight(3)}${sign.columnB[index].symbol}',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 10,
                  height: 1.05,
                  fontWeight: FontWeight.w800,
                  fontFamily: 'monospace',
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _FaMatrix extends StatelessWidget {
  const _FaMatrix({required this.engine, required this.onOpen});

  final FaIaEngine engine;
  final ValueChanged<FaCombinedSign> onOpen;

  @override
  Widget build(BuildContext context) {
    const cellSize = 72.0;
    const headerSize = 78.0;
    return Scrollbar(
      thumbVisibility: true,
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 30),
        scrollDirection: Axis.vertical,
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Container(
            decoration: BoxDecoration(
              color: FaIaColors.surface,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: FaIaColors.line),
            ),
            clipBehavior: Clip.antiAlias,
            child: Table(
              defaultColumnWidth: const FixedColumnWidth(cellSize),
              border: TableBorder.all(color: FaIaColors.line, width: 0.7),
              children: <TableRow>[
                TableRow(
                  decoration: const BoxDecoration(color: FaIaColors.deepBrown),
                  children: <Widget>[
                    const SizedBox(
                      width: headerSize,
                      height: 62,
                      child: Center(
                        child: Text(
                          'X ↓ / Y →',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: FaIaColors.gold,
                            fontSize: 10,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                    ),
                    for (final sign in FaIaCatalog.baseSigns)
                      SizedBox(
                        height: 62,
                        child: Center(
                          child: RotatedBox(
                            quarterTurns: 3,
                            child: Text(
                              '${sign.number}. ${sign.canonicalName}',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 9,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
                for (final x in FaIaCatalog.baseSigns)
                  TableRow(
                    children: <Widget>[
                      Container(
                        height: cellSize,
                        color: FaIaColors.ivory,
                        padding: const EdgeInsets.all(6),
                        alignment: Alignment.center,
                        child: Text(
                          '${x.number}. ${x.canonicalName}',
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 9,
                            height: 1.1,
                            fontWeight: FontWeight.w900,
                            color: FaIaColors.deepBrown,
                          ),
                        ),
                      ),
                      for (final y in FaIaCatalog.baseSigns)
                        _MatrixCell(
                          sign: FaCombinedSign(x: x, y: y),
                          onTap: onOpen,
                        ),
                    ],
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _MatrixCell extends StatelessWidget {
  const _MatrixCell({required this.sign, required this.onTap});

  final FaCombinedSign sign;
  final ValueChanged<FaCombinedSign> onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () => onTap(sign),
      child: Container(
        height: 72,
        color: sign.isMeji ? const Color(0xFFF6E2C4) : Colors.white,
        padding: const EdgeInsets.all(5),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            Text(
              sign.reference,
              style: const TextStyle(
                fontSize: 9,
                fontWeight: FontWeight.w900,
                color: FaIaColors.copper,
              ),
            ),
            const SizedBox(height: 3),
            for (var index = 0; index < 4; index += 1)
              Text(
                '${sign.columnA[index].symbol} ${sign.columnB[index].symbol}',
                style: const TextStyle(
                  fontSize: 8.5,
                  height: 1.02,
                  fontFamily: 'monospace',
                  fontWeight: FontWeight.w800,
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _FaIaSignDetailScreen extends StatelessWidget {
  const _FaIaSignDetailScreen({required this.sign});

  final FaCombinedSign sign;

  List<FaFaceState> get _faces => <FaFaceState>[
    ...sign.columnA.map(
      (trait) => trait == FaTrait.one ? FaFaceState.open : FaFaceState.closed,
    ),
    ...sign.columnB.map(
      (trait) => trait == FaTrait.one ? FaFaceState.open : FaFaceState.closed,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: FaIaColors.background,
      appBar: AppBar(
        backgroundColor: FaIaColors.deepBrown,
        foregroundColor: Colors.white,
        title: Text(
          sign.canonicalName,
          style: const TextStyle(fontWeight: FontWeight.w900),
        ),
      ),
      body: SafeArea(
        top: false,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 18, 16, 32),
          children: <Widget>[
            FaIaCard(
              color: FaIaColors.deepBrown,
              borderColor: FaIaColors.deepBrown,
              child: Column(
                children: <Widget>[
                  Text(
                    sign.canonicalName,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 27,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Référence ${sign.reference}${sign.isMeji ? ' · signe Mêji' : ''}',
                    style: const TextStyle(
                      color: FaIaColors.gold,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Schéma structurel vérifié mathématiquement',
                    style: TextStyle(color: Color(0xFFE8D6BD), fontSize: 12),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),
            FaIaCard(
              child: FaIaChainView(
                faces: _faces,
                height: 390,
                animation: 1,
                showTraits: true,
              ),
            ),
            const SizedBox(height: 14),
            FaIaCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  const FaIaSectionTitle(
                    icon: Icons.schema_rounded,
                    title: 'Construction du signe',
                  ),
                  const SizedBox(height: 12),
                  _InfoRow(
                    label: 'Colonne A (gauche)',
                    value:
                        '${sign.y.canonicalName} · ${sign.columnA.map((item) => item.symbol).join(' – ')}',
                  ),
                  _InfoRow(
                    label: 'Colonne B (droite)',
                    value:
                        '${sign.x.canonicalName} · ${sign.columnB.map((item) => item.symbol).join(' – ')}',
                  ),
                  _InfoRow(
                    label: 'Règle',
                    value: 'Pour X–Y, A vient de Y et B vient de X.',
                  ),
                  _InfoRow(label: 'Faces', value: 'Ouvert = I · Fermé = II'),
                ],
              ),
            ),
            const SizedBox(height: 14),
            FaIaCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  const FaIaSectionTitle(
                    icon: Icons.menu_book_rounded,
                    title: 'Thèmes traditionnels disponibles',
                  ),
                  const SizedBox(height: 12),
                  Text(
                    '${sign.x.canonicalName} : ${sign.x.theme}.',
                    style: FaIaText.body,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '${sign.y.canonicalName} : ${sign.y.theme}.',
                    style: FaIaText.body,
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Cette fiche présente la structure exacte et les thèmes initiaux. Les récits, proverbes, interdits et prescriptions d’une combinaison doivent être publiés seulement après validation culturelle.',
                    style: FaIaText.muted,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 11),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          SizedBox(width: 128, child: Text(label, style: FaIaText.label)),
          const SizedBox(width: 8),
          Expanded(child: Text(value, style: FaIaText.muted)),
        ],
      ),
    );
  }
}
