import 'package:flutter/material.dart';

import 'bots_native_home.dart';

class BotsScreenNative extends StatelessWidget {
  const BotsScreenNative({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: const Color(0xFFF7FAF8),
        appBar: AppBar(
          backgroundColor: const Color(0xFF075E54),
          foregroundColor: Colors.white,
          title: const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Mes Bots', style: TextStyle(fontWeight: FontWeight.w900)),
              Text('Webhooks, partage et automatisations',
                  style: TextStyle(fontSize: 11)),
            ],
          ),
        ),
        body: const BotsNativeHome(),
      );
}
