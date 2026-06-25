import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

final sharedPreferencesProvider = Provider<SharedPreferences>((ref) {
  throw UnimplementedError('sharedPreferencesProvider must be overridden');
});

class ThemeSettings {
  final int seedColor;

  ThemeSettings({this.seedColor = 0xFFE85A2B}); // Default Spice orange

  ThemeSettings copyWith({int? seedColor}) {
    return ThemeSettings(
      seedColor: seedColor ?? this.seedColor,
    );
  }
}

class ThemeSettingsNotifier extends Notifier<ThemeSettings> {
  static const _colorKey = 'theme_seed_color';

  @override
  ThemeSettings build() {
    final prefs = ref.watch(sharedPreferencesProvider);
    final color = prefs.getInt(_colorKey);
    return ThemeSettings(seedColor: color ?? 0xFFE85A2B);
  }

  Future<void> updateSeedColor(int color) async {
    final prefs = ref.read(sharedPreferencesProvider);
    await prefs.setInt(_colorKey, color);
    state = state.copyWith(seedColor: color);
  }
}

final themeSettingsProvider = NotifierProvider<ThemeSettingsNotifier, ThemeSettings>(() {
  return ThemeSettingsNotifier();
});
