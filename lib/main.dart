import 'package:flutter/material.dart';

void main() {
  runApp(const WaouhApp());
}

class WaouhApp extends StatelessWidget {
  const WaouhApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'WAOUH',
      home: const Scaffold(
        body: Center(
          child: Text('WAOUH Flutter'),
        ),
      ),
    );
  }
}
