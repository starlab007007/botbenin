import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'waouh_bi_smart_chat_screen.dart';

// WAOUH BI FINAL V8 ROUTE FIX
// Ancienne interface BI redirigée vers le chat natif.

class WaouhBiWorkspaceScreen extends WaouhBiSmartChatScreen {
  const WaouhBiWorkspaceScreen({
    super.key,
    SupabaseClient? client,
    SupabaseClient? supabase,
    dynamic title,
    dynamic name,
    dynamic fileName,
    dynamic filename,
    dynamic sourceName,
    dynamic sourceType,
    dynamic csvText,
    dynamic csv,
    dynamic rows,
    dynamic headers,
    dynamic columns,
    dynamic data,
    dynamic records,
    dynamic initialData,
    dynamic initialQuestion,
    dynamic datasourceId,
    dynamic datasource_id,
    dynamic file,
    dynamic source,
    dynamic dataset,
    dynamic datasource,
    dynamic agent,
    dynamic business,
    dynamic session,
    dynamic record,
    dynamic args,
    dynamic extra,
    dynamic onBack,
    dynamic onClose,
  }) : super(client: client, supabase: supabase);
}
