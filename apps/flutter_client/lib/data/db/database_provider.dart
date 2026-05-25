import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'database.dart';

/// Singleton [AppDatabase]. Opened lazily on first read.
final databaseProvider = Provider<AppDatabase>((ref) {
  final db = AppDatabase.open();
  ref.onDispose(db.close);
  return db;
});
