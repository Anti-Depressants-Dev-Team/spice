import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/library/liked_tracks_screen.dart';
import '../features/library/library_screen.dart';
import '../features/library/playlist_detail_screen.dart';
import '../features/player/now_playing_screen.dart';
import '../features/search/search_screen.dart';
import '../features/settings/settings_screen.dart';
import 'main_shell.dart';

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/search',
    routes: [
      // Top-level tabs wrapped in MainShell (persistent mini-player + nav bar).
      ShellRoute(
        builder: (context, state, child) => MainShell(
          location: state.matchedLocation,
          child: child,
        ),
        routes: [
          GoRoute(
            path: '/search',
            builder: (context, state) => const SearchScreen(),
          ),
          GoRoute(
            path: '/library',
            builder: (context, state) => const LibraryScreen(),
            routes: [
              GoRoute(
                path: 'liked',
                builder: (context, state) => const LikedTracksScreen(),
              ),
              GoRoute(
                path: ':id',
                builder: (context, state) => PlaylistDetailScreen(
                  playlistId: state.pathParameters['id']!,
                ),
              ),
            ],
          ),
          GoRoute(
            path: '/settings',
            builder: (context, state) => const SettingsScreen(),
          ),
        ],
      ),
      // Full-screen player lives outside the shell so it takes the whole screen.
      GoRoute(
        path: '/player',
        pageBuilder: (context, state) => const MaterialPage(
          fullscreenDialog: true,
          child: NowPlayingScreen(),
        ),
      ),
    ],
  );
});
