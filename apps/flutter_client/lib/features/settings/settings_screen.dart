import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'settings_provider.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = ref.watch(themeSettingsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        children: [
          const Padding(
            padding: EdgeInsets.all(16.0),
            child: Text(
              'Appearance',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
          ),
          ListTile(
            title: const Text('Theme Color'),
            subtitle: const Text('Choose a global theme color'),
            trailing: Container(
              width: 24,
              height: 24,
              decoration: BoxDecoration(
                color: Color(settings.seedColor),
                shape: BoxShape.circle,
              ),
            ),
            onTap: () => _showColorPicker(context, ref, settings.seedColor),
          ),
        ],
      ),
    );
  }

  Future<void> _showColorPicker(BuildContext context, WidgetRef ref, int currentColor) async {
    final colors = [
      0xFFE85A2B, // Spice Orange (Default)
      0xFFE53935, // Red
      0xFF8E24AA, // Purple
      0xFF3949AB, // Indigo
      0xFF039BE5, // Light Blue
      0xFF00897B, // Teal
      0xFF43A047, // Green
      0xFFFFB300, // Amber
      0xFF6D4C41, // Brown
      0xFF546E7A, // Blue Grey
    ];

    await showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Select Theme Color'),
          content: Wrap(
            spacing: 8,
            runSpacing: 8,
            children: colors.map((colorValue) {
              return GestureDetector(
                onTap: () {
                  ref.read(themeSettingsProvider.notifier).updateSeedColor(colorValue);
                  Navigator.of(context).pop();
                },
                child: Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: Color(colorValue),
                    shape: BoxShape.circle,
                    border: currentColor == colorValue
                        ? Border.all(color: Theme.of(context).colorScheme.onSurface, width: 2)
                        : null,
                  ),
                ),
              );
            }).toList(),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cancel'),
            ),
          ],
        );
      },
    );
  }
}
