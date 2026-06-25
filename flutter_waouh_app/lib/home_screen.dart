import 'package:flutter/material.dart';

import 'screens/chat_screen.dart';
import 'screens/status_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int index = 0;
  final pages = const [ChatScreen(), StatusScreen()];

  @override
  Widget build(BuildContext context) => Scaffold(
        body: IndexedStack(index: index, children: pages),
        bottomNavigationBar: NavigationBar(
          selectedIndex: index,
          onDestinationSelected: (value) => setState(() => index = value),
          destinations: const [
            NavigationDestination(icon: Icon(Icons.chat_bubble_outline), label: 'WAOUH'),
            NavigationDestination(icon: Icon(Icons.auto_awesome_outlined), label: 'Statuts'),
          ],
        ),
      );
}
