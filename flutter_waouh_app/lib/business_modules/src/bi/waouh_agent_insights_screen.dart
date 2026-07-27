import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../shared/waouh_business_ui.dart';
import 'waouh_agent_insights_models.dart';
import 'waouh_agent_insights_repository.dart';

class WaouhAgentInsightsScreen extends StatefulWidget {
  const WaouhAgentInsightsScreen({
    super.key,
    required this.client,
    required this.agentId,
    required this.agentName,
  });

  final SupabaseClient client;
  final String agentId;
  final String agentName;

  @override
  State<WaouhAgentInsightsScreen> createState() =>
      _WaouhAgentInsightsScreenState();
}

class _WaouhAgentInsightsScreenState extends State<WaouhAgentInsightsScreen> {
  late final WaouhAgentInsightsRepository _repository =
      WaouhAgentInsightsRepository(widget.client);
  final TextEditingController _question = TextEditingController();

  WaouhAgentInsights? _insights;
  String? _answer;
  Object? _error;
  bool _loading = true;
  bool _asking = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _question.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await _repository.loadOverview(widget.agentId);
      if (!mounted) {
        return;
      }
      setState(() {
        _insights = data;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _error = error;
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  Future<void> _ask() async {
    final question = _question.text.trim();
    if (question.isEmpty || _asking) {
      return;
    }

    setState(() {
      _asking = true;
      _answer = null;
    });

    try {
      final answer = await _repository.ask(widget.agentId, question);
      if (!mounted) {
        return;
      }
      setState(() {
        _answer = answer;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('$error')));
    } finally {
      if (mounted) {
        setState(() {
          _asking = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return WaouhBusinessUiScope(
      child: Scaffold(
        appBar: AppBar(
          title: const Text('BI / Analyse'),
          actions: [
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: IconButton.filledTonal(
                tooltip: 'Actualiser',
                onPressed: _loading ? null : _load,
                style: IconButton.styleFrom(
                  foregroundColor: WaouhBusinessColors.blue,
                  backgroundColor: WaouhBusinessColors.blue.withValues(
                    alpha: 0.10,
                  ),
                ),
                icon: const Icon(Icons.refresh_rounded),
              ),
            ),
          ],
        ),
        body: _loading
            ? const _InsightsSkeleton()
            : _error != null
            ? WaouhFailurePanel(error: _error!, onRetry: _load)
            : _insights == null
            ? WaouhFailurePanel(
                error: 'Données analytiques absentes.',
                onRetry: _load,
              )
            : _body(_insights!),
      ),
    );
  }

  Widget _body(WaouhAgentInsights insights) {
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(
          parent: BouncingScrollPhysics(),
        ),
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 34),
        children: [
          WaouhBusinessPageIntro(
            title: 'Pilotage de ${widget.agentName}',
            subtitle: 'Vos 30 derniers jours de conversations.',
            icon: Icons.insights_outlined,
            color: WaouhBusinessColors.blue,
          ),
          const SizedBox(height: 22),
          const WaouhIaSectionHeader(
            title: 'Vue d’ensemble',
            subtitle: 'L’activité de votre Agent IA.',
          ),
          const SizedBox(height: 12),
          GridView.count(
            crossAxisCount: MediaQuery.sizeOf(context).width >= 650 ? 4 : 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.18,
            children: [
              WaouhMetricCard(
                label: 'Conversations',
                value: waouhShortNumber(insights.totalConversations),
                icon: Icons.forum_outlined,
              ),
              WaouhMetricCard(
                label: 'Messages',
                value: waouhShortNumber(insights.totalMessages),
                icon: Icons.chat_bubble_outline,
                color: WaouhBusinessColors.blue,
              ),
              WaouhMetricCard(
                label: 'Contacts',
                value: waouhShortNumber(insights.uniqueContacts),
                icon: Icons.people_outline,
                color: WaouhIaPalette.purple,
              ),
              WaouhMetricCard(
                label: 'Transferts',
                value: waouhShortNumber(insights.totalHandoffs),
                icon: Icons.support_agent_outlined,
                color: WaouhBusinessColors.orange,
              ),
            ],
          ),
          const SizedBox(height: 22),
          _InsightSurface(
            title: 'Évolution',
            subtitle: 'Conversations par jour',
            icon: Icons.show_chart_rounded,
            color: WaouhBusinessColors.blue,
            child: SizedBox(
              height: 220,
              child: _TimelineChart(points: insights.conversationsPerDay),
            ),
          ),
          const SizedBox(height: 14),
          _InsightSurface(
            title: 'Produits demandés',
            subtitle: 'Ce que vos clients recherchent.',
            icon: Icons.shopping_bag_outlined,
            color: WaouhBusinessColors.jade,
            child: _CountedList(
              values: insights.topProducts,
              emptyLabel: 'Aucun produit détecté pour le moment.',
              color: WaouhBusinessColors.jade,
            ),
          ),
          const SizedBox(height: 14),
          _InsightSurface(
            title: 'Mots-clés clients',
            subtitle: 'Les intentions qui reviennent le plus.',
            icon: Icons.key_rounded,
            color: WaouhBusinessColors.blue,
            child: _CountedList(
              values: insights.topKeywords,
              emptyLabel: 'Aucun mot-clé exploitable pour le moment.',
              color: WaouhBusinessColors.blue,
            ),
          ),
          const SizedBox(height: 14),
          _InsightSurface(
            title: 'Questionner les données',
            subtitle: 'Interrogez les conversations de cet Agent.',
            icon: Icons.auto_awesome_outlined,
            color: WaouhBusinessColors.jade,
            child: Column(
              children: [
                TextField(
                  controller: _question,
                  minLines: 2,
                  maxLines: 4,
                  textInputAction: TextInputAction.done,
                  onSubmitted: (_) => _ask(),
                  decoration: const InputDecoration(
                    hintText:
                        'Ex. Quels produits attirent le plus de demandes ?',
                  ),
                ),
                const SizedBox(height: 10),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: _asking ? null : _ask,
                    icon: _asking
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Icon(Icons.insights_outlined),
                    label: Text(_asking ? 'Analyse…' : 'Analyser'),
                  ),
                ),
                if (_answer != null) ...[
                  const SizedBox(height: 12),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: WaouhBusinessColors.green.withValues(alpha: 0.07),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: WaouhBusinessColors.green.withValues(
                          alpha: 0.16,
                        ),
                      ),
                    ),
                    child: Text(_answer!, style: const TextStyle(height: 1.45)),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _InsightSurface extends StatelessWidget {
  const _InsightSurface({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.color,
    required this.child,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final Color color;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return WaouhBusinessSurface(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(13),
                ),
                child: Icon(icon, color: color, size: 20),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        color: WaouhBusinessColors.ink,
                        fontSize: 16.5,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: const TextStyle(
                        color: WaouhBusinessColors.muted,
                        fontSize: 12.5,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }
}

class _TimelineChart extends StatelessWidget {
  const _TimelineChart({required this.points});

  final List<WaouhTimelinePoint> points;

  @override
  Widget build(BuildContext context) {
    if (points.isEmpty) {
      return const Center(
        child: Text(
          'Aucune activité à afficher.',
          style: TextStyle(color: WaouhBusinessColors.muted),
        ),
      );
    }

    final maxY = points
        .map((item) => item.count)
        .fold<int>(1, (max, value) => value > max ? value : max)
        .toDouble();
    final interval = maxY <= 5 ? 1.0 : (maxY / 4).ceilToDouble();

    return LineChart(
      LineChartData(
        minX: 0,
        maxX: (points.length - 1).toDouble(),
        minY: 0,
        maxY: maxY + 1,
        gridData: FlGridData(
          show: true,
          drawVerticalLine: false,
          horizontalInterval: interval,
          getDrawingHorizontalLine: (_) =>
              const FlLine(color: Color(0xFFE7EEEB), strokeWidth: 1),
        ),
        borderData: FlBorderData(show: false),
        titlesData: FlTitlesData(
          topTitles: const AxisTitles(
            sideTitles: SideTitles(showTitles: false),
          ),
          rightTitles: const AxisTitles(
            sideTitles: SideTitles(showTitles: false),
          ),
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 28,
              interval: interval,
              getTitlesWidget: (value, _) => Text(
                value.round().toString(),
                style: const TextStyle(
                  color: WaouhBusinessColors.muted,
                  fontSize: 10,
                ),
              ),
            ),
          ),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              interval: points.length > 14 ? 7 : 3,
              reservedSize: 28,
              getTitlesWidget: (value, _) {
                final index = value.round();
                if (index < 0 || index >= points.length) {
                  return const SizedBox.shrink();
                }
                final day = points[index].day;
                final label = day.length >= 10 ? day.substring(8, 10) : day;
                return Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text(
                    label,
                    style: const TextStyle(
                      color: WaouhBusinessColors.muted,
                      fontSize: 10,
                    ),
                  ),
                );
              },
            ),
          ),
        ),
        lineBarsData: [
          LineChartBarData(
            isCurved: true,
            color: WaouhBusinessColors.blue,
            barWidth: 3,
            dotData: const FlDotData(show: false),
            belowBarData: BarAreaData(
              show: true,
              color: WaouhBusinessColors.blue.withValues(alpha: 0.10),
            ),
            spots: List<FlSpot>.generate(
              points.length,
              (index) =>
                  FlSpot(index.toDouble(), points[index].count.toDouble()),
            ),
          ),
        ],
      ),
    );
  }
}

class _CountedList extends StatelessWidget {
  const _CountedList({
    required this.values,
    required this.emptyLabel,
    required this.color,
  });

  final List<WaouhCountedLabel> values;
  final String emptyLabel;
  final Color color;

  @override
  Widget build(BuildContext context) {
    if (values.isEmpty) {
      return Text(
        emptyLabel,
        style: const TextStyle(color: WaouhBusinessColors.muted),
      );
    }

    final max = values.first.count <= 0
        ? 1
        : values.map((item) => item.count).reduce((a, b) => a > b ? a : b);

    return Column(
      children: values.take(6).map((item) {
        final fraction = item.count / max;
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Column(
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      item.label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: WaouhBusinessColors.ink,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    '${item.count}',
                    style: TextStyle(color: color, fontWeight: FontWeight.w900),
                  ),
                ],
              ),
              const SizedBox(height: 7),
              ClipRRect(
                borderRadius: BorderRadius.circular(99),
                child: LinearProgressIndicator(
                  value: fraction,
                  minHeight: 7,
                  color: color,
                  backgroundColor: color.withValues(alpha: 0.11),
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }
}

class _InsightsSkeleton extends StatelessWidget {
  const _InsightsSkeleton();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: const [
        _Skeleton(height: 104),
        SizedBox(height: 18),
        Row(
          children: [
            Expanded(child: _Skeleton(height: 118)),
            SizedBox(width: 12),
            Expanded(child: _Skeleton(height: 118)),
          ],
        ),
        SizedBox(height: 12),
        Row(
          children: [
            Expanded(child: _Skeleton(height: 118)),
            SizedBox(width: 12),
            Expanded(child: _Skeleton(height: 118)),
          ],
        ),
        SizedBox(height: 18),
        _Skeleton(height: 250),
      ],
    );
  }
}

class _Skeleton extends StatelessWidget {
  const _Skeleton({required this.height});

  final double height;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      decoration: BoxDecoration(
        color: const Color(0xFFEAF0ED),
        borderRadius: BorderRadius.circular(20),
      ),
    );
  }
}
