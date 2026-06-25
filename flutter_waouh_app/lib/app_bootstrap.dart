import 'package:supabase_flutter/supabase_flutter.dart';

import 'core/app_config.dart';

late final SupabaseClient supabase;

Future<void> initializeAppBackend() async {
  await Supabase.initialize(
    url: AppConfig.supabaseUrl,
    publishableKey: AppConfig.supabaseAnonKey,
  );
  supabase = Supabase.instance.client;
}
