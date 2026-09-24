import 'package:flutter/material.dart';

import 'fa_web_consultation_screen.dart';
import 'fa_web_generated_assets.dart';
import 'fa_web_journal_screen.dart';
import 'fa_web_theme.dart';

class FaIaHomeScreen extends StatelessWidget {
  const FaIaHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.sizeOf(context);
    final compact = size.height < 760;
    final heroHeight = (size.height - (compact ? 260 : 285))
        .clamp(compact ? 310.0 : 338.0, compact ? 430.0 : 500.0)
        .toDouble();

    return Scaffold(
      backgroundColor: FaWebColors.background,
      appBar: faWebAppBar(
        title: 'FA IA',
        subtitle: 'Consultation du Fâ',
      ),
      body: SafeArea(
        top: false,
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(10, 9, 10, 10),
          child: Column(
            children: [
              _Hero(
                height: heroHeight,
                onStart: () => _openConsultation(context),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: _HomeAction(
                      icon: Icons.adjust_rounded,
                      iconBackground: const Color(0xFFF8EFDC),
                      iconColor: const Color(0xFFD6A64A),
                      title: 'Télé-consultation',
                      subtitle: 'Une intention, un signe',
                      onTap: () => _openConsultation(context),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _HomeAction(
                      icon: Icons.bookmark_outline_rounded,
                      iconBackground: const Color(0xFFE8EFEC),
                      iconColor: const Color(0xFF497B67),
                      title: 'Journal',
                      subtitle: 'Vos consultations',
                      onTap: () => Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => const FaWebJournalScreen(),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 7),
              const _HomeSignature(),
            ],
          ),
        ),
      ),
    );
  }

  void _openConsultation(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => const FaWebConsultationScreen(),
      ),
    );
  }
}

class _Hero extends StatelessWidget {
  const _Hero({required this.height, required this.onStart});

  final double height;
  final VoidCallback onStart;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      width: double.infinity,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(25),
        color: FaWebColors.dark,
        image: DecorationImage(
          image: FaWebGeneratedAssets.hero,
          fit: BoxFit.cover,
          alignment: Alignment(0, -0.64),
          filterQuality: FilterQuality.high,
        ),
        boxShadow: const [
          BoxShadow(
            blurRadius: 42,
            offset: Offset(0, 18),
            color: Color(0x3D271208),
          ),
        ],
      ),
      child: Stack(
        children: [
          const Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  stops: [0, 0.42, 0.66, 1],
                  colors: [
                    Color(0x03080402),
                    Color(0x0A080402),
                    Color(0x52110703),
                    Color(0xF0150603),
                  ],
                ),
              ),
            ),
          ),
          Positioned(
            left: 15,
            right: 15,
            bottom: 14,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Align(
                  alignment: Alignment.centerLeft,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0x80190B05),
                      borderRadius: BorderRadius.circular(999),
                      border: Border.all(
                        color: const Color(0x75E5AD45),
                      ),
                    ),
                    child: const Text(
                      '8 CAURIS · 1 SIGNE',
                      style: TextStyle(
                        color: FaWebColors.gold2,
                        fontSize: 9,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                SizedBox(
                  height: 50,
                  child: FilledButton.icon(
                    onPressed: onStart,
                    style: FilledButton.styleFrom(
                      backgroundColor: FaWebColors.gold,
                      foregroundColor: const Color(0xFF1B0D07),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(17),
                      ),
                      textStyle: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    icon: const Icon(Icons.adjust_rounded),
                    label: const Text('Lancer le Fâ'),
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

class _HomeAction extends StatelessWidget {
  const _HomeAction({
    required this.icon,
    required this.iconBackground,
    required this.iconColor,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final Color iconBackground;
  final Color iconColor;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: FaWebColors.surface,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Container(
          constraints: const BoxConstraints(minHeight: 80),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: const Color(0xFFE8DDD2)),
          ),
          child: Row(
            children: [
              Container(
                width: 31,
                height: 31,
                decoration: BoxDecoration(
                  color: iconBackground,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: iconColor, size: 17),
              ),
              const SizedBox(width: 9),
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      maxLines: 2,
                      style: const TextStyle(
                        color: FaWebColors.ink,
                        fontSize: 14,
                        height: 1.04,
                        fontWeight: FontWeight.w900,
                        letterSpacing: -0.3,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      maxLines: 2,
                      style: const TextStyle(
                        color: FaWebColors.muted,
                        fontSize: 10,
                        height: 1.12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _HomeSignature extends StatelessWidget {
  const _HomeSignature();

  @override
  Widget build(BuildContext context) {
    return const DefaultTextStyle(
      style: TextStyle(
        color: Color(0x945B3E2A),
        fontSize: 9.5,
        height: 1.12,
        fontWeight: FontWeight.w600,
        letterSpacing: 0.45,
      ),
      child: Column(
        children: [
          Text('Une intention.'),
          Text('Un lancer.'),
          Text('Un message.'),
        ],
      ),
    );
  }
}
