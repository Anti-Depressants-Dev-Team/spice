import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:just_audio_media_kit/just_audio_media_kit.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'app/router.dart';
import 'app/theme.dart';
import 'services/audio/audio_providers.dart';
import 'features/settings/settings_provider.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final prefs = await SharedPreferences.getInstance();

  // Route just_audio through libmpv on Windows/Linux/macOS. Android keeps
  // ExoPlayer (the default), which is what we wired the AndroidManifest for.
  if (!kIsWeb &&
      (defaultTargetPlatform == TargetPlatform.windows ||
          defaultTargetPlatform == TargetPlatform.linux ||
          defaultTargetPlatform == TargetPlatform.macOS)) {
    JustAudioMediaKit.ensureInitialized(
      windows: true,
      linux: true,
      macOS: true,
      android: false,
      iOS: false,
    );
  }

  // Status bar / nav bar — no fullscreen. (No-op on desktop, where these
  // overlays don't exist.)
  SystemChrome.setEnabledSystemUIMode(
    SystemUiMode.manual,
    overlays: const [SystemUiOverlay.top, SystemUiOverlay.bottom],
  );

  final container = ProviderContainer(
    overrides: [
      sharedPreferencesProvider.overrideWithValue(prefs),
    ],
  );
  // Pre-warm AudioService.init in the background so the first tap-to-play
  // doesn't pay the platform-channel startup cost.
  unawaited(container.read(audioHandlerProvider.future));

  runApp(
    UncontrolledProviderScope(
      container: container,
      child: const SpiceApp(),
    ),
  );
}

class SpiceApp extends ConsumerWidget {
  const SpiceApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    final themeSettings = ref.watch(themeSettingsProvider);

    return MaterialApp.router(
      title: 'Spice',
      theme: spiceTheme(brightness: Brightness.light, seedColor: Color(themeSettings.seedColor)),
      darkTheme: spiceTheme(brightness: Brightness.dark, seedColor: Color(themeSettings.seedColor)),
      themeMode: ThemeMode.system,
      routerConfig: router,
    );
  }
}
