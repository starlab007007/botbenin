import 'package:flutter/material.dart';
import 'package:nowa_runtime/nowa_runtime.dart';
import 'package:provider/provider.dart';

@NowaGenerated()
class AppState extends ChangeNotifier {
  ThemeData get theme {
    return ThemeData(
      useMaterial3: true,
      colorSchemeSeed: const Color(0xFF045844),
    );
  }

  static AppState of(BuildContext context, {bool listen = false}) {
    return Provider.of<AppState>(context, listen: listen);
  }
}
