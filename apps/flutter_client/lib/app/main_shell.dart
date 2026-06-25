import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../features/player/mini_player.dart';

/// Persistent chrome wrapping the top-level tabs: search + library + settings.
///
/// Layout is body=[child, MiniPlayer], `bottomNavigationBar`=tabs. Putting the
/// mini-player inside the body (not the bottomNavigationBar slot) means
/// `resizeToAvoidBottomInset` lifts it above the keyboard when typing in
/// search — the nav bar stays at the system bottom and gets covered, which
/// matches every mainstream music app.
class MainShell extends StatelessWidget {
  const MainShell({
    super.key,
    required this.child,
    required this.location,
  });

  final Widget child;
  final String location;

  @override
  Widget build(BuildContext context) {
    final index = _indexFor(location);
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            Expanded(child: child),
            const MiniPlayer(),
          ],
        ),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        onDestinationSelected: (i) => _goToTab(context, i),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.search_outlined),
            selectedIcon: Icon(Icons.search),
            label: 'Search',
          ),
          NavigationDestination(
            icon: Icon(Icons.library_music_outlined),
            selectedIcon: Icon(Icons.library_music),
            label: 'Library',
          ),
          NavigationDestination(
            icon: Icon(Icons.settings_outlined),
            selectedIcon: Icon(Icons.settings),
            label: 'Settings',
          ),
        ],
      ),
    );
  }

  static int _indexFor(String location) {
    if (location.startsWith('/settings')) return 2;
    if (location.startsWith('/library')) return 1;
    return 0;
  }

  static void _goToTab(BuildContext context, int index) {
    context.go(switch (index) {
      2 => '/settings',
      1 => '/library',
      _ => '/search',
    });
  }
}
