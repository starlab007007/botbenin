import 'package:nowa_runtime/nowa_runtime.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:botbenin/app_constants.dart';

@NowaGenerated()
class SupabaseService {
  static SupabaseClient get client {
    return Supabase.instance.client;
  }

  Future<void> initialize() async {
    await Supabase.initialize(
      url: AppConstants.supabaseUrl,
      anonKey: AppConstants.supabaseAnonKey,
    );
  }
}
