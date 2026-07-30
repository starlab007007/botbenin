import 'dart:io';
import 'dart:math' as math;
import 'dart:typed_data';

import 'package:cross_file/cross_file.dart';
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:public_file_saver/public_file_saver.dart';
import 'package:share_plus/share_plus.dart';

class WaouhAnalyticsReportData {
  const WaouhAnalyticsReportData({
    required this.title,
    required this.subtitle,
    required this.executiveSummary,
    required this.narrative,
    this.kpis = const <String, num>{},
    this.statistics = const <String, dynamic>{},
    this.recommendations = const <String>[],
    this.insights = const <String>[],
    this.charts = const <Map<String, dynamic>>[],
    this.columns = const <String>[],
    this.rows = const <Map<String, dynamic>>[],
  });

  final String title;
  final String subtitle;
  final String executiveSummary;
  final String narrative;
  final Map<String, num> kpis;
  final Map<String, dynamic> statistics;
  final List<String> recommendations;
  final List<String> insights;
  final List<Map<String, dynamic>> charts;
  final List<String> columns;
  final List<Map<String, dynamic>> rows;
}

class WaouhAnalyticsChartsGrid extends StatelessWidget {
  const WaouhAnalyticsChartsGrid({
    super.key,
    required this.charts,
    this.accent = const Color(0xFF076B5D),
    this.maxCharts = 4,
  });

  final List<Map<String, dynamic>> charts;
  final Color accent;
  final int maxCharts;

  @override
  Widget build(BuildContext context) {
    final visible = charts.where(_hasRenderableChart).take(maxCharts).toList();
    if (visible.isEmpty) return const SizedBox.shrink();

    return LayoutBuilder(
      builder: (context, constraints) {
        final twoColumns = constraints.maxWidth >= 620 && visible.length > 1;
        final cardWidth =
            twoColumns ? (constraints.maxWidth - 12) / 2 : constraints.maxWidth;
        return Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            for (final chart in visible)
              SizedBox(
                width: cardWidth,
                child: WaouhAnalyticsChart(chart: chart, accent: accent),
              ),
          ],
        );
      },
    );
  }
}

class WaouhAnalyticsChart extends StatelessWidget {
  const WaouhAnalyticsChart({
    super.key,
    required this.chart,
    this.accent = const Color(0xFF076B5D),
  });

  final Map<String, dynamic> chart;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    final type =
        '${chart['type'] ?? chart['chart_type'] ?? 'bar'}'.toLowerCase();
    final title = '${chart['title'] ?? 'Analyse graphique'}'.trim();
    final subtitle = '${chart['subtitle'] ?? ''}'.trim();
    final palette = _palette(accent);

    if (type == 'kpi') {
      final value = chart['value'] ?? chart['total'] ?? 0;
      return _ChartShell(
        title: title,
        subtitle: subtitle,
        accent: accent,
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: palette.first.withAlpha(28),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Icon(Icons.analytics_rounded, color: accent),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                _formatValue(value),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: accent,
                  fontWeight: FontWeight.w900,
                  fontSize: 28,
                ),
              ),
            ),
          ],
        ),
      );
    }

    final normalized = _normalizeChart(chart);
    if (normalized.series.isEmpty || normalized.labels.isEmpty) {
      return const SizedBox.shrink();
    }

    final chartHeight = type == 'pie' ? 250.0 : 240.0;
    return _ChartShell(
      title: title,
      subtitle: subtitle,
      accent: accent,
      child: Column(
        children: [
          SizedBox(
            height: chartHeight,
            width: double.infinity,
            child: CustomPaint(
              painter: _AnalyticsPainter(
                type: type,
                labels: normalized.labels,
                series: normalized.series,
                palette: palette,
              ),
            ),
          ),
          if (normalized.series.length > 1 || type == 'pie') ...[
            const SizedBox(height: 8),
            _ChartLegend(
              labels: type == 'pie'
                  ? normalized.labels
                  : normalized.series.map((item) => item.name).toList(),
              colors: palette,
            ),
          ],
        ],
      ),
    );
  }
}

class _ChartShell extends StatelessWidget {
  const _ChartShell({
    required this.title,
    required this.subtitle,
    required this.accent,
    required this.child,
  });

  final String title;
  final String subtitle;
  final Color accent;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FBFA),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFD9E8E3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: accent.withAlpha(24),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(Icons.auto_graph_rounded, size: 20, color: accent),
              ),
              const SizedBox(width: 9),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Color(0xFF10231F),
                        fontSize: 13,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    if (subtitle.isNotEmpty)
                      Text(
                        subtitle,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Color(0xFF66736F),
                          fontSize: 10.5,
                          height: 1.25,
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}

class _ChartLegend extends StatelessWidget {
  const _ChartLegend({required this.labels, required this.colors});

  final List<String> labels;
  final List<Color> colors;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 10,
      runSpacing: 7,
      children: [
        for (var i = 0; i < labels.length && i < 8; i++)
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 9,
                height: 9,
                decoration: BoxDecoration(
                  color: colors[i % colors.length],
                  borderRadius: BorderRadius.circular(99),
                ),
              ),
              const SizedBox(width: 5),
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 140),
                child: Text(
                  labels[i],
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Color(0xFF5F706B),
                    fontSize: 10.5,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
      ],
    );
  }
}

class _ChartSeries {
  const _ChartSeries({required this.name, required this.values});

  final String name;
  final List<double> values;
}

class _NormalizedChart {
  const _NormalizedChart({required this.labels, required this.series});

  final List<String> labels;
  final List<_ChartSeries> series;
}

_NormalizedChart _normalizeChart(Map<String, dynamic> chart) {
  final labels = <String>[];
  final series = <_ChartSeries>[];

  final rawSeries = chart['series'];
  final rawLabels = chart['labels'];
  if (rawLabels is List) {
    labels.addAll(rawLabels.map((item) => '$item'));
  }
  if (rawSeries is List) {
    for (final raw in rawSeries.whereType<Map>()) {
      final map = Map<String, dynamic>.from(raw);
      final values = (map['values'] is List ? map['values'] as List : const [])
          .map(_asDouble)
          .toList();
      if (values.isEmpty) continue;
      series.add(
        _ChartSeries(
          name:
              '${map['name'] ?? map['label'] ?? 'Série ${series.length + 1}'}',
          values: values,
        ),
      );
    }
  }

  final rawPoints = chart['points'];
  if (series.isEmpty && rawPoints is List) {
    final points =
        rawPoints.whereType<Map>().map(Map<String, dynamic>.from).toList();
    if (labels.isEmpty) {
      labels.addAll(
          points.map((item) => '${item['name'] ?? item['label'] ?? ''}'));
    }
    final values = points.map((item) => _asDouble(item['value'])).toList();
    if (values.isNotEmpty) {
      series.add(
        _ChartSeries(
          name: '${chart['series_name'] ?? chart['y_label'] ?? 'Valeur'}',
          values: values,
        ),
      );
    }
  }

  if (labels.isEmpty && series.isNotEmpty) {
    labels.addAll(
      List<String>.generate(
          series.first.values.length, (index) => '${index + 1}'),
    );
  }

  final maxLength = series.fold<int>(
    labels.length,
    (value, item) => math.min(value, item.values.length),
  );
  final safeLength = math.min(maxLength, 20);
  final safeLabels = labels.take(safeLength).toList();
  final safeSeries = series
      .map(
        (item) => _ChartSeries(
          name: item.name,
          values: item.values.take(safeLength).toList(),
        ),
      )
      .where((item) => item.values.isNotEmpty)
      .toList();
  return _NormalizedChart(labels: safeLabels, series: safeSeries);
}

bool _hasRenderableChart(Map<String, dynamic> chart) {
  final type = '${chart['type'] ?? chart['chart_type'] ?? ''}'.toLowerCase();
  if (type == 'kpi') return true;
  final normalized = _normalizeChart(chart);
  return normalized.labels.isNotEmpty && normalized.series.isNotEmpty;
}

class _AnalyticsPainter extends CustomPainter {
  const _AnalyticsPainter({
    required this.type,
    required this.labels,
    required this.series,
    required this.palette,
  });

  final String type;
  final List<String> labels;
  final List<_ChartSeries> series;
  final List<Color> palette;

  @override
  void paint(Canvas canvas, Size size) {
    if (type == 'pie' || type == 'donut') {
      _paintPie(canvas, size);
      return;
    }
    if (type == 'line' || type == 'curve' || type == 'area') {
      _paintLine(canvas, size);
      return;
    }
    _paintBars(canvas, size);
  }

  void _paintGrid(Canvas canvas, Rect plot, double maxValue) {
    final gridPaint = Paint()
      ..color = const Color(0xFFE2ECE9)
      ..strokeWidth = 1;
    for (var i = 0; i <= 4; i++) {
      final y = plot.bottom - plot.height * i / 4;
      canvas.drawLine(Offset(plot.left, y), Offset(plot.right, y), gridPaint);
      final value = maxValue * i / 4;
      _drawText(
        canvas,
        _compact(value),
        Offset(0, y - 7),
        maxWidth: plot.left - 7,
        color: const Color(0xFF71817C),
        fontSize: 9,
        align: TextAlign.right,
      );
    }
  }

  void _paintBars(Canvas canvas, Size size) {
    final values = series.first.values;
    final maxValue = _maxAbs(series).clamp(1.0, double.infinity).toDouble();
    final plot =
        Rect.fromLTWH(46, 8, math.max(size.width - 54, 20.0), size.height - 42);
    _paintGrid(canvas, plot, maxValue);

    final count = values.length;
    final slot = plot.width / math.max(count, 1);
    final barWidth = math.min(slot * .58, 28.0);
    final paint = Paint()..color = palette.first;
    for (var i = 0; i < count; i++) {
      final ratio = values[i] / maxValue;
      final height = plot.height * ratio.clamp(0.0, 1.0);
      final left = plot.left + slot * i + (slot - barWidth) / 2;
      final rect = RRect.fromRectAndRadius(
        Rect.fromLTWH(left, plot.bottom - height, barWidth, height),
        const Radius.circular(6),
      );
      canvas.drawRRect(rect, paint);
      if (count <= 8) {
        _drawText(
          canvas,
          _compact(values[i]),
          Offset(left - 8, plot.bottom - height - 15),
          maxWidth: barWidth + 16,
          color: const Color(0xFF36564E),
          fontSize: 8.5,
          align: TextAlign.center,
        );
      }
      _drawText(
        canvas,
        _short(labels[i], 11),
        Offset(plot.left + slot * i, plot.bottom + 7),
        maxWidth: slot,
        color: const Color(0xFF5F706B),
        fontSize: 8.5,
        align: TextAlign.center,
      );
    }
  }

  void _paintLine(Canvas canvas, Size size) {
    final maxValue = _maxAbs(series).clamp(1.0, double.infinity).toDouble();
    final plot =
        Rect.fromLTWH(46, 8, math.max(size.width - 54, 20.0), size.height - 42);
    _paintGrid(canvas, plot, maxValue);

    for (var s = 0; s < series.length; s++) {
      final values = series[s].values;
      final path = Path();
      final linePaint = Paint()
        ..color = palette[s % palette.length]
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round;
      final fillPaint = Paint()
        ..color = palette[s % palette.length].withAlpha(24)
        ..style = PaintingStyle.fill;
      final fillPath = Path();

      for (var i = 0; i < values.length; i++) {
        final x = values.length == 1
            ? plot.center.dx
            : plot.left + plot.width * i / (values.length - 1);
        final y =
            plot.bottom - plot.height * (values[i] / maxValue).clamp(0.0, 1.0);
        if (i == 0) {
          path.moveTo(x, y);
          fillPath.moveTo(x, plot.bottom);
          fillPath.lineTo(x, y);
        } else {
          path.lineTo(x, y);
          fillPath.lineTo(x, y);
        }
        canvas.drawCircle(
          Offset(x, y),
          3.2,
          Paint()..color = palette[s % palette.length],
        );
      }
      if (type == 'area' && values.isNotEmpty) {
        fillPath.lineTo(plot.right, plot.bottom);
        fillPath.close();
        canvas.drawPath(fillPath, fillPaint);
      }
      canvas.drawPath(path, linePaint);
    }

    final step = labels.length > 8 ? (labels.length / 6).ceil() : 1;
    for (var i = 0; i < labels.length; i += step) {
      final x = labels.length == 1
          ? plot.center.dx
          : plot.left + plot.width * i / (labels.length - 1);
      _drawText(
        canvas,
        _short(labels[i], 10),
        Offset(x - 28, plot.bottom + 7),
        maxWidth: 56,
        color: const Color(0xFF5F706B),
        fontSize: 8.5,
        align: TextAlign.center,
      );
    }
  }

  void _paintPie(Canvas canvas, Size size) {
    final values =
        series.first.values.map((value) => math.max(value, 0.0)).toList();
    final total = values.fold<double>(0, (sum, value) => sum + value);
    if (total <= 0) return;
    final radius = math.min(size.width, size.height) * .32;
    final center = Offset(size.width / 2, size.height / 2 - 4);
    var start = -math.pi / 2;
    for (var i = 0; i < values.length; i++) {
      final sweep = math.pi * 2 * values[i] / total;
      final paint = Paint()
        ..color = palette[i % palette.length]
        ..style = PaintingStyle.stroke
        ..strokeWidth = radius * .42;
      canvas.drawArc(
        Rect.fromCircle(center: center, radius: radius * .72),
        start,
        sweep,
        false,
        paint,
      );
      if (values[i] / total >= .08) {
        final angle = start + sweep / 2;
        final labelPoint = Offset(
          center.dx + math.cos(angle) * radius * .72,
          center.dy + math.sin(angle) * radius * .72,
        );
        _drawText(
          canvas,
          '${(values[i] / total * 100).round()}%',
          Offset(labelPoint.dx - 20, labelPoint.dy - 8),
          maxWidth: 40,
          color: Colors.white,
          fontSize: 10,
          fontWeight: FontWeight.w900,
          align: TextAlign.center,
        );
      }
      start += sweep;
    }
    canvas.drawCircle(
        center, radius * .40, Paint()..color = const Color(0xFFF8FBFA));
    _drawText(
      canvas,
      _compact(total),
      Offset(center.dx - 42, center.dy - 13),
      maxWidth: 84,
      color: const Color(0xFF10231F),
      fontSize: 16,
      fontWeight: FontWeight.w900,
      align: TextAlign.center,
    );
  }

  double _maxAbs(List<_ChartSeries> values) {
    var maxValue = 0.0;
    for (final item in values) {
      for (final value in item.values) {
        if (value.abs() > maxValue) maxValue = value.abs();
      }
    }
    return maxValue;
  }

  void _drawText(
    Canvas canvas,
    String text,
    Offset offset, {
    required double maxWidth,
    required Color color,
    required double fontSize,
    TextAlign align = TextAlign.left,
    FontWeight fontWeight = FontWeight.w600,
  }) {
    final painter = TextPainter(
      text: TextSpan(
        text: text,
        style:
            TextStyle(color: color, fontSize: fontSize, fontWeight: fontWeight),
      ),
      textDirection: TextDirection.ltr,
      textAlign: align,
      maxLines: 1,
      ellipsis: '…',
    )..layout(maxWidth: maxWidth);
    painter.paint(canvas, offset);
  }

  @override
  bool shouldRepaint(covariant _AnalyticsPainter oldDelegate) {
    return oldDelegate.type != type ||
        oldDelegate.labels != labels ||
        oldDelegate.series != series ||
        oldDelegate.palette != palette;
  }
}

class WaouhReportActions extends StatefulWidget {
  const WaouhReportActions({
    super.key,
    required this.data,
    this.accent = const Color(0xFF076B5D),
    this.compact = false,
  });

  final WaouhAnalyticsReportData data;
  final Color accent;
  final bool compact;

  @override
  State<WaouhReportActions> createState() => _WaouhReportActionsState();
}

class _WaouhReportActionsState extends State<WaouhReportActions> {
  bool _busy = false;

  Future<void> _download() async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      final path = await WaouhAnalyticsReportService.save(widget.data);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            path.startsWith('content://')
                ? 'Rapport PDF enregistré dans Téléchargements/WAOUH.'
                : 'Rapport PDF enregistré : $path',
          ),
        ),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Rapport PDF impossible : $error')),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _share() async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await WaouhAnalyticsReportService.share(widget.data);
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Partage impossible : $error')),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.compact) {
      return Wrap(
        spacing: 8,
        runSpacing: 8,
        children: [
          OutlinedButton.icon(
            onPressed: _busy ? null : _download,
            icon: _busy
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.download_rounded, size: 18),
            label: const Text('PDF'),
          ),
          FilledButton.icon(
            onPressed: _busy ? null : _share,
            style: FilledButton.styleFrom(backgroundColor: widget.accent),
            icon: const Icon(Icons.share_rounded, size: 18),
            label: const Text('Partager'),
          ),
        ],
      );
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF2F8F6),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFD5E8E3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.picture_as_pdf_rounded,
                  color: widget.accent, size: 19),
              const SizedBox(width: 7),
              const Expanded(
                child: Text(
                  'Rapport professionnel',
                  style: TextStyle(
                    color: Color(0xFF10231F),
                    fontSize: 12.5,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 5),
          const Text(
            'Synthèse, statistiques, graphiques, recommandations et données clés.',
            style: TextStyle(
                color: Color(0xFF66736F), fontSize: 10.5, height: 1.3),
          ),
          const SizedBox(height: 10),
          LayoutBuilder(
            builder: (context, constraints) {
              final stackActions = constraints.maxWidth < 330;

              final downloadButton = SizedBox(
                height: 50,
                child: OutlinedButton.icon(
                  onPressed: _busy ? null : _download,
                  icon: _busy
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.download_rounded, size: 18),
                  label: const FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Text(
                      'Télécharger PDF',
                      maxLines: 1,
                      softWrap: false,
                    ),
                  ),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size.fromHeight(50),
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                ),
              );

              final shareButton = SizedBox(
                height: 50,
                child: FilledButton.icon(
                  onPressed: _busy ? null : _share,
                  style: FilledButton.styleFrom(
                    backgroundColor: widget.accent,
                    minimumSize: const Size.fromHeight(50),
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  icon: const Icon(Icons.share_rounded, size: 18),
                  label: const FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Text(
                      'Partager',
                      maxLines: 1,
                      softWrap: false,
                    ),
                  ),
                ),
              );

              if (stackActions) {
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    downloadButton,
                    const SizedBox(height: 8),
                    shareButton,
                  ],
                );
              }

              return Row(
                children: [
                  Expanded(flex: 6, child: downloadButton),
                  const SizedBox(width: 8),
                  Expanded(flex: 5, child: shareButton),
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}

class WaouhAnalyticsReportService {
  const WaouhAnalyticsReportService._();

  static Future<Uint8List> build(WaouhAnalyticsReportData data) async {
    final document = pw.Document(
      title: data.title,
      author: 'WAOUH AI',
      subject: data.subtitle,
      creator: 'WAOUH AI — Top Analyste',
    );
    final accent = PdfColor.fromInt(0xFF076B5D);
    final deep = PdfColor.fromInt(0xFF075E54);
    final light = PdfColor.fromInt(0xFFF1F7F5);
    final border = PdfColor.fromInt(0xFFD6E6E1);
    final muted = PdfColor.fromInt(0xFF5F706B);

    document.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(32),
        header: (context) => pw.Container(
          padding: const pw.EdgeInsets.only(bottom: 10),
          decoration: pw.BoxDecoration(
            border: pw.Border(bottom: pw.BorderSide(color: border, width: 0.7)),
          ),
          child: pw.Row(
            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
            children: [
              pw.Text(
                'WAOUH AI · RAPPORT ANALYTIQUE',
                style: pw.TextStyle(
                  color: deep,
                  fontSize: 10,
                  fontWeight: pw.FontWeight.bold,
                ),
              ),
              pw.Text(
                'Page ${context.pageNumber}/${context.pagesCount}',
                style: pw.TextStyle(color: muted, fontSize: 9),
              ),
            ],
          ),
        ),
        footer: (_) => pw.Align(
          alignment: pw.Alignment.centerRight,
          child: pw.Text(
            'Généré le ${_dateLabel(DateTime.now())}',
            style: pw.TextStyle(color: muted, fontSize: 8),
          ),
        ),
        build: (context) {
          final widgets = <pw.Widget>[
            pw.Container(
              width: double.infinity,
              padding: const pw.EdgeInsets.all(22),
              decoration: pw.BoxDecoration(
                color: deep,
                borderRadius: pw.BorderRadius.circular(18),
              ),
              child: pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Text(
                    data.title,
                    style: pw.TextStyle(
                      color: PdfColors.white,
                      fontSize: 25,
                      fontWeight: pw.FontWeight.bold,
                    ),
                  ),
                  pw.SizedBox(height: 7),
                  pw.Text(
                    data.subtitle,
                    style: const pw.TextStyle(
                        color: PdfColors.white, fontSize: 11),
                  ),
                ],
              ),
            ),
            pw.SizedBox(height: 18),
            _pdfSectionTitle('Synthèse exécutive', accent),
            _pdfTextCard(
              data.executiveSummary.trim().isNotEmpty
                  ? data.executiveSummary
                  : data.narrative,
              light,
              border,
            ),
          ];

          if (data.kpis.isNotEmpty) {
            widgets.addAll([
              pw.SizedBox(height: 16),
              _pdfSectionTitle('Indicateurs clés', accent),
              pw.Wrap(
                spacing: 8,
                runSpacing: 8,
                children: data.kpis.entries
                    .take(12)
                    .map(
                      (entry) => pw.Container(
                        width: 162,
                        padding: const pw.EdgeInsets.all(11),
                        decoration: pw.BoxDecoration(
                          color: light,
                          borderRadius: pw.BorderRadius.circular(10),
                          border: pw.Border.all(color: border, width: .6),
                        ),
                        child: pw.Column(
                          crossAxisAlignment: pw.CrossAxisAlignment.start,
                          children: [
                            pw.Text(
                              _formatValue(entry.value),
                              style: pw.TextStyle(
                                color: deep,
                                fontSize: 17,
                                fontWeight: pw.FontWeight.bold,
                              ),
                            ),
                            pw.SizedBox(height: 3),
                            pw.Text(
                              _humanize(entry.key),
                              style: pw.TextStyle(color: muted, fontSize: 9),
                            ),
                          ],
                        ),
                      ),
                    )
                    .toList(),
              ),
            ]);
          }

          if (data.statistics.isNotEmpty) {
            widgets.addAll([
              pw.SizedBox(height: 16),
              _pdfSectionTitle('Analyse statistique', accent),
              _pdfStatistics(data.statistics, light, border, muted, deep),
            ]);
          }

          for (final chart in data.charts.where(_hasRenderableChart).take(4)) {
            widgets.addAll([
              pw.SizedBox(height: 16),
              _pdfSectionTitle('${chart['title'] ?? 'Graphique'}', accent),
              pw.Container(
                width: double.infinity,
                padding: const pw.EdgeInsets.all(10),
                decoration: pw.BoxDecoration(
                  color: PdfColors.white,
                  borderRadius: pw.BorderRadius.circular(12),
                  border: pw.Border.all(color: border, width: .7),
                ),
                child: pw.SvgImage(
                  svg: _chartSvg(chart),
                  width: 500,
                  height: 235,
                ),
              ),
            ]);
          }

          if (data.recommendations.isNotEmpty) {
            widgets.addAll([
              pw.SizedBox(height: 16),
              _pdfSectionTitle('Recommandations prioritaires', accent),
              ...data.recommendations.take(12).toList().asMap().entries.map(
                    (entry) => pw.Container(
                      margin: const pw.EdgeInsets.only(bottom: 7),
                      padding: const pw.EdgeInsets.all(10),
                      decoration: pw.BoxDecoration(
                        color: light,
                        borderRadius: pw.BorderRadius.circular(10),
                        border: pw.Border.all(color: border, width: .6),
                      ),
                      child: pw.Row(
                        crossAxisAlignment: pw.CrossAxisAlignment.start,
                        children: [
                          pw.Container(
                            width: 20,
                            height: 20,
                            alignment: pw.Alignment.center,
                            decoration: pw.BoxDecoration(
                              color: accent,
                              borderRadius: pw.BorderRadius.circular(99),
                            ),
                            child: pw.Text(
                              '${entry.key + 1}',
                              style: pw.TextStyle(
                                color: PdfColors.white,
                                fontSize: 9,
                                fontWeight: pw.FontWeight.bold,
                              ),
                            ),
                          ),
                          pw.SizedBox(width: 8),
                          pw.Expanded(
                            child: pw.Text(
                              entry.value,
                              style: const pw.TextStyle(
                                  fontSize: 10.5, lineSpacing: 2),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
            ]);
          }

          if (data.insights.isNotEmpty) {
            widgets.addAll([
              pw.SizedBox(height: 16),
              _pdfSectionTitle('Constats clés', accent),
              pw.Bullet(text: data.insights.take(12).join('\n')),
            ]);
          }

          if (data.rows.isNotEmpty && data.columns.isNotEmpty) {
            final columns = data.columns.take(8).toList();
            final rows = data.rows.take(25).toList();
            widgets.addAll([
              pw.SizedBox(height: 16),
              _pdfSectionTitle('Données de référence', accent),
              pw.Table.fromTextArray(
                headers: columns.map(_humanize).toList(),
                data: rows
                    .map(
                      (row) => columns
                          .map((column) => _short('${row[column] ?? ''}', 44))
                          .toList(),
                    )
                    .toList(),
                headerDecoration: pw.BoxDecoration(color: deep),
                headerStyle: pw.TextStyle(
                  color: PdfColors.white,
                  fontSize: 8,
                  fontWeight: pw.FontWeight.bold,
                ),
                cellStyle: const pw.TextStyle(fontSize: 7.5),
                cellPadding: const pw.EdgeInsets.all(4),
                border: pw.TableBorder.all(color: border, width: .5),
                oddRowDecoration: pw.BoxDecoration(color: light),
              ),
            ]);
          }

          widgets.addAll([
            pw.SizedBox(height: 18),
            _pdfSectionTitle('Conclusion analytique', accent),
            _pdfTextCard(data.narrative, light, border),
            pw.SizedBox(height: 12),
            pw.Text(
              'Ce rapport constitue une aide à la décision. Les recommandations doivent être confrontées au contexte opérationnel et à la qualité des données disponibles.',
              style: pw.TextStyle(
                  color: muted, fontSize: 8.5, fontStyle: pw.FontStyle.italic),
            ),
          ]);
          return widgets;
        },
      ),
    );
    return document.save();
  }

  static Future<String> save(WaouhAnalyticsReportData data) async {
    final bytes = await build(data);
    final filename = _filename(data.title);
    final saved = await PublicFileSaver().saveBytes(
      bytes: bytes,
      fileName: filename,
      mimeType: 'application/pdf',
      subDir: 'WAOUH',
    );

    if (saved == null ||
        (!saved.isSuccess && saved.uri == null && saved.path == null)) {
      throw StateError(
        'Le téléphone n’a pas confirmé l’enregistrement du PDF.',
      );
    }

    return saved.path ?? saved.uri ?? saved.fileName;
  }

  static Future<void> share(WaouhAnalyticsReportData data) async {
    final bytes = await build(data);
    final filename = _filename(data.title);
    final directory = await getTemporaryDirectory();
    if (!await directory.exists()) {
      await directory.create(recursive: true);
    }
    final file = File('${directory.path}/$filename');
    await file.writeAsBytes(bytes, flush: true);

    await SharePlus.instance.share(
      ShareParams(
        files: <XFile>[
          XFile(file.path, mimeType: 'application/pdf'),
        ],
        fileNameOverrides: <String>[filename],
        subject: data.title,
        text: 'Rapport professionnel généré par WAOUH AI.',
      ),
    );
  }

  static String _filename(String title) {
    final safe = title
        .toLowerCase()
        .replaceAll(RegExp(r'[^a-z0-9àâçéèêëîïôûùüÿñæœ]+'), '-')
        .replaceAll(RegExp(r'^-+|-+$'), '');
    final date = DateTime.now();
    final suffix =
        '${date.year}${date.month.toString().padLeft(2, '0')}${date.day.toString().padLeft(2, '0')}';
    return 'rapport-${safe.isEmpty ? 'waouh-ai' : safe}-$suffix.pdf';
  }
}

pw.Widget _pdfSectionTitle(String text, PdfColor accent) {
  return pw.Padding(
    padding: const pw.EdgeInsets.only(bottom: 7),
    child: pw.Row(
      children: [
        pw.Container(width: 4, height: 17, color: accent),
        pw.SizedBox(width: 7),
        pw.Text(
          text,
          style: pw.TextStyle(
            color: accent,
            fontSize: 14,
            fontWeight: pw.FontWeight.bold,
          ),
        ),
      ],
    ),
  );
}

pw.Widget _pdfTextCard(String text, PdfColor light, PdfColor border) {
  return pw.Container(
    width: double.infinity,
    padding: const pw.EdgeInsets.all(12),
    decoration: pw.BoxDecoration(
      color: light,
      borderRadius: pw.BorderRadius.circular(11),
      border: pw.Border.all(color: border, width: .6),
    ),
    child: pw.Text(
      text.trim().isEmpty ? 'Aucune synthèse disponible.' : text.trim(),
      style: const pw.TextStyle(fontSize: 10.5, lineSpacing: 3),
    ),
  );
}

pw.Widget _pdfStatistics(
  Map<String, dynamic> statistics,
  PdfColor light,
  PdfColor border,
  PdfColor muted,
  PdfColor deep,
) {
  final rows = <List<String>>[];
  void append(String prefix, dynamic value, int depth) {
    if (rows.length >= 60) return;
    if (value is Map && depth < 3) {
      for (final child in value.entries) {
        append(
          prefix.isEmpty ? '${child.key}' : '$prefix — ${child.key}',
          child.value,
          depth + 1,
        );
      }
      return;
    }
    if (value is List) {
      rows.add([_humanize(prefix), value.take(8).join(', ')]);
      return;
    }
    rows.add([_humanize(prefix), _formatValue(value)]);
  }

  for (final entry in statistics.entries) {
    append(entry.key, entry.value, 0);
  }
  if (rows.isEmpty) return pw.SizedBox.shrink();
  return pw.Table.fromTextArray(
    headers: const ['Indicateur', 'Valeur'],
    data: rows,
    headerDecoration: pw.BoxDecoration(color: deep),
    headerStyle: pw.TextStyle(
      color: PdfColors.white,
      fontSize: 9,
      fontWeight: pw.FontWeight.bold,
    ),
    cellStyle: const pw.TextStyle(fontSize: 8.5),
    cellPadding: const pw.EdgeInsets.all(5),
    border: pw.TableBorder.all(color: border, width: .5),
    oddRowDecoration: pw.BoxDecoration(color: light),
  );
}

String _chartSvg(Map<String, dynamic> chart) {
  final normalized = _normalizeChart(chart);
  final type = '${chart['type'] ?? chart['chart_type'] ?? 'bar'}'.toLowerCase();
  final title = _escapeXml('${chart['title'] ?? 'Graphique'}');
  const width = 700.0;
  const height = 310.0;
  const left = 68.0;
  const top = 42.0;
  const plotWidth = 600.0;
  const plotHeight = 210.0;
  final colors = [
    '#0B7F72',
    '#E9B95E',
    '#3478C8',
    '#D96B5F',
    '#6F5BB5',
    '#5D9E63',
    '#9A6A3A'
  ];

  if (type == 'kpi') {
    return '''<svg xmlns="http://www.w3.org/2000/svg" width="$width" height="$height" viewBox="0 0 $width $height">
<rect width="$width" height="$height" rx="22" fill="#F3F8F6"/>
<text x="40" y="64" font-family="Helvetica" font-size="25" font-weight="700" fill="#075E54">$title</text>
<text x="40" y="175" font-family="Helvetica" font-size="68" font-weight="700" fill="#0B7F72">${_escapeXml(_formatValue(chart['value'] ?? 0))}</text>
</svg>''';
  }

  if (normalized.labels.isEmpty || normalized.series.isEmpty) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="$width" height="$height"></svg>';
  }

  if (type == 'pie' || type == 'donut') {
    final values = normalized.series.first.values
        .map((value) => math.max(value, 0.0))
        .toList();
    final total = values.fold<double>(0, (sum, value) => sum + value);
    final circumference = 2 * math.pi * 82;
    var offset = 0.0;
    final circles = <String>[];
    final legend = <String>[];
    for (var i = 0; i < values.length; i++) {
      final ratio = total <= 0 ? 0 : values[i] / total;
      final dash = circumference * ratio;
      circles.add(
          '<circle cx="225" cy="165" r="82" fill="none" stroke="${colors[i % colors.length]}" stroke-width="42" stroke-dasharray="$dash ${circumference - dash}" stroke-dashoffset="${-offset}" transform="rotate(-90 225 165)"/>');
      offset += dash;
      final y = 80 + i * 27;
      legend.add(
          '<rect x="390" y="${y - 11}" width="13" height="13" rx="3" fill="${colors[i % colors.length]}"/><text x="413" y="$y" font-family="Helvetica" font-size="14" fill="#334B45">${_escapeXml(_short(normalized.labels[i], 28))} — ${(ratio * 100).toStringAsFixed(1)}%</text>');
    }
    return '''<svg xmlns="http://www.w3.org/2000/svg" width="$width" height="$height" viewBox="0 0 $width $height">
<rect width="$width" height="$height" rx="18" fill="#FFFFFF"/>
<text x="30" y="30" font-family="Helvetica" font-size="20" font-weight="700" fill="#10231F">$title</text>
${circles.join()}<circle cx="225" cy="165" r="48" fill="#FFFFFF"/>
<text x="225" y="170" text-anchor="middle" font-family="Helvetica" font-size="20" font-weight="700" fill="#075E54">${_escapeXml(_compact(total))}</text>
${legend.take(7).join()}
</svg>''';
  }

  final maxValue = normalized.series
      .expand((item) => item.values)
      .fold<double>(0, (max, value) => value.abs() > max ? value.abs() : max)
      .clamp(1, double.infinity)
      .toDouble();
  final grid = <String>[];
  for (var i = 0; i <= 4; i++) {
    final y = top + plotHeight - plotHeight * i / 4;
    final value = maxValue * i / 4;
    grid.add(
        '<line x1="$left" y1="$y" x2="${left + plotWidth}" y2="$y" stroke="#E2ECE9" stroke-width="1"/><text x="${left - 8}" y="${y + 4}" text-anchor="end" font-family="Helvetica" font-size="10" fill="#70817C">${_escapeXml(_compact(value))}</text>');
  }

  if (type == 'line' || type == 'curve' || type == 'area') {
    final paths = <String>[];
    for (var s = 0; s < normalized.series.length; s++) {
      final values = normalized.series[s].values;
      final points = <String>[];
      for (var i = 0; i < values.length; i++) {
        final x = values.length == 1
            ? left + plotWidth / 2
            : left + plotWidth * i / (values.length - 1);
        final y = top + plotHeight - plotHeight * (values[i] / maxValue);
        points.add('$x,$y');
      }
      paths.add(
          '<polyline fill="none" stroke="${colors[s % colors.length]}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" points="${points.join(' ')}"/>');
      for (final point in points) {
        final parts = point.split(',');
        paths.add(
            '<circle cx="${parts[0]}" cy="${parts[1]}" r="4" fill="${colors[s % colors.length]}"/>');
      }
    }
    final labels = <String>[];
    final step = normalized.labels.length > 8
        ? (normalized.labels.length / 6).ceil()
        : 1;
    for (var i = 0; i < normalized.labels.length; i += step) {
      final x = normalized.labels.length == 1
          ? left + plotWidth / 2
          : left + plotWidth * i / (normalized.labels.length - 1);
      labels.add(
          '<text x="$x" y="${top + plotHeight + 24}" text-anchor="middle" font-family="Helvetica" font-size="10" fill="#5F706B">${_escapeXml(_short(normalized.labels[i], 11))}</text>');
    }
    return '''<svg xmlns="http://www.w3.org/2000/svg" width="$width" height="$height" viewBox="0 0 $width $height"><rect width="$width" height="$height" rx="18" fill="#FFFFFF"/><text x="30" y="30" font-family="Helvetica" font-size="20" font-weight="700" fill="#10231F">$title</text>${grid.join()}${paths.join()}${labels.join()}</svg>''';
  }

  final values = normalized.series.first.values;
  final slot = plotWidth / math.max(values.length, 1);
  final barWidth = math.min(slot * .58, 48.0);
  final bars = <String>[];
  for (var i = 0; i < values.length; i++) {
    final barHeight = plotHeight * (values[i] / maxValue).clamp(0, 1);
    final x = left + slot * i + (slot - barWidth) / 2;
    final y = top + plotHeight - barHeight;
    bars.add(
        '<rect x="$x" y="$y" width="$barWidth" height="$barHeight" rx="7" fill="#0B7F72"/><text x="${x + barWidth / 2}" y="${y - 7}" text-anchor="middle" font-family="Helvetica" font-size="10" fill="#334B45">${_escapeXml(_compact(values[i]))}</text><text x="${left + slot * i + slot / 2}" y="${top + plotHeight + 24}" text-anchor="middle" font-family="Helvetica" font-size="10" fill="#5F706B">${_escapeXml(_short(normalized.labels[i], 11))}</text>');
  }
  return '''<svg xmlns="http://www.w3.org/2000/svg" width="$width" height="$height" viewBox="0 0 $width $height"><rect width="$width" height="$height" rx="18" fill="#FFFFFF"/><text x="30" y="30" font-family="Helvetica" font-size="20" font-weight="700" fill="#10231F">$title</text>${grid.join()}${bars.join()}</svg>''';
}

List<Color> _palette(Color accent) {
  return <Color>[
    accent,
    const Color(0xFFE9B95E),
    const Color(0xFF3478C8),
    const Color(0xFFD96B5F),
    const Color(0xFF6F5BB5),
    const Color(0xFF5D9E63),
    const Color(0xFF9A6A3A),
    const Color(0xFF3C8DA8),
  ];
}

double _asDouble(dynamic value) {
  if (value is num) return value.toDouble();
  final cleaned =
      '$value'.replaceAll(RegExp(r'[^0-9,.-]'), '').replaceAll(',', '.');
  return double.tryParse(cleaned) ?? 0;
}

String _formatValue(dynamic value) {
  if (value is num) return _compact(value.toDouble());
  return '$value';
}

String _compact(double value) {
  final absolute = value.abs();
  if (absolute >= 1000000000)
    return '${(value / 1000000000).toStringAsFixed(1)} Md';
  if (absolute >= 1000000) return '${(value / 1000000).toStringAsFixed(1)} M';
  if (absolute >= 1000) return '${(value / 1000).toStringAsFixed(1)} k';
  if (value == value.roundToDouble()) return value.round().toString();
  return value.toStringAsFixed(2);
}

String _humanize(String value) {
  final text = value.replaceAll('_', ' ').trim();
  if (text.isEmpty) return text;
  return '${text[0].toUpperCase()}${text.substring(1)}';
}

String _short(String value, int maxLength) {
  final text = value.trim();
  if (text.length <= maxLength) return text;
  return '${text.substring(0, math.max(maxLength - 1, 1))}…';
}

String _escapeXml(String value) {
  return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&apos;');
}

String _dateLabel(DateTime date) {
  const months = <String>[
    'janvier',
    'février',
    'mars',
    'avril',
    'mai',
    'juin',
    'juillet',
    'août',
    'septembre',
    'octobre',
    'novembre',
    'décembre',
  ];
  return '${date.day} ${months[date.month - 1]} ${date.year} à ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
}
