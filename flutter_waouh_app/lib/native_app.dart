import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'app_bootstrap.dart';
import 'auth_model.dart';
import 'chat_model.dart';
import 'core/local_identity.dart';
import 'core/media_service.dart';
import 'data/chat_reader.dart';
import 'data/waouh_sender.dart';
import 'home_screen.dart';
import 'status_model.dart';

class NativeApp extends StatelessWidget {
  const NativeApp({super.key, required this.identity});
  final LocalIdentity identity;

  @override
  Widget build(BuildContext context) {
    final media = MediaService(supabase);
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthModel(identity)),
        ChangeNotifierProvider(
          create: (context) => ChatModel(
            identity,
            context.read<AuthModel>(),
            ChatReader(supabase, identity),
            WaouhSender(supabase, identity),
            media,
          ),
        ),
        ChangeNotifierProvider(
          create: (context) => StatusModel(
            context.read<AuthModel>(), media, supabase,
          ),
        ),
      ],
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        title: 'WaouhApp',
        theme: ThemeData(
          useMaterial3: true,
          colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF075E54)),
          inputDecorationTheme: InputDecorationTheme(
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
          ),
        ),
        home: const HomeScreen(),
      ),
    );
  }
}
