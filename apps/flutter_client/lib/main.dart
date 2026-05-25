import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:just_audio_media_kit/just_audio_media_kit.dart';

import 'app/router.dart';
import 'app/theme.dart';
import 'services/audio/audio_providers.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

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

  final container = ProviderContainer();
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
    return MaterialApp.router(
      title: 'Spice',
      theme: spiceTheme(brightness: Brightness.light),
      darkTheme: spiceTheme(brightness: Brightness.dark),
      themeMode: ThemeMode.system,
      routerConfig: router,
    );
  }
}
