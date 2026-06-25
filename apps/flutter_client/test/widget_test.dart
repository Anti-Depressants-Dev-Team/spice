import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:spice/main.dart';
import 'package:spice/services/audio/audio_providers.dart';
import 'package:spice/services/audio/spice_audio_handler.dart';
import 'package:spice/features/settings/settings_provider.dart';

void main() {
  testWidgets('SpiceApp boots into the search screen', (tester) async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          sharedPreferencesProvider.overrideWithValue(prefs),
          // Skip platform-dependent AudioService.init in widget tests by
          // leaving the future unresolved — MiniPlayer renders nothing while
          // the handler is loading.
          audioHandlerProvider
              .overrideWith((ref) => Completer<SpiceAudioHandler>().future),
        ],
        child: const SpiceApp(),
      ),
    );
    await tester.pump();
    expect(find.text('Spice'), findsOneWidget);
    expect(find.text('Search YouTube Music'), findsOneWidget);
  });
}
