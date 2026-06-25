import 'package:flutter/material.dart';

ThemeData spiceTheme({required Brightness brightness, Color seedColor = const Color(0xFFE85A2B)}) {
  final scheme = ColorScheme.fromSeed(
    seedColor: seedColor,
    brightness: brightness,
  );
  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    visualDensity: VisualDensity.adaptivePlatformDensity,
  );
}
