import 'package:drift/drift.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:source_api/source_api.dart';

import '../db/database.dart';
import '../db/database_provider.dart';

class HistoryRepository {
  HistoryRepository(this._db);
  final AppDatabase _db;

  Stream<List<SpiceHistoryRow>> watchRecent({int limit = 50}) {
    return (_db.select(_db.spiceHistory)
          ..orderBy([(h) => OrderingTerm.desc(h.playedAt)])
          ..limit(limit))
        .watch();
  }

  Future<void> record(Track track, Duration listened) async {
    await _db.into(_db.spiceHistory).insert(
          SpiceHistoryCompanion.insert(
            sourceId: track.sourceId,
            trackId: track.id,
            title: track.title,
            artist:
                Value(track.artists.map((a) => a.name).join(', ')),
            artworkUrl: Value(track.artworkUrl),
            msListened: Value(listened.inMilliseconds),
          ),
        );
  }
}

final historyRepositoryProvider = Provider<HistoryRepository>((ref) {
  return HistoryRepository(ref.watch(databaseProvider));
});

final recentHistoryProvider = StreamProvider<List<SpiceHistoryRow>>((ref) {
  return ref.watch(historyRepositoryProvider).watchRecent();
});
