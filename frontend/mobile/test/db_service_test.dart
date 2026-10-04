import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/services/db_service.dart';

void main() {
  group('DBService.normalizeTimestamp', () {
    test('converts Unix seconds to milliseconds', () {
      expect(DBService.normalizeTimestamp(1791115200), 1791115200000);
    });

    test('keeps millisecond timestamps unchanged', () {
      expect(DBService.normalizeTimestamp(1791115200000), 1791115200000);
    });

    test('returns zero for missing timestamps', () {
      expect(DBService.normalizeTimestamp(null), 0);
    });
  });

  group('DBService.isStale', () {
    final now = DateTime.utc(2026, 1, 1, 12);
    final nowMs = now.millisecondsSinceEpoch;

    test('accepts readings up to two minutes old', () {
      expect(DBService.isStale(nowMs - 120000, now: now), isFalse);
    });

    test('rejects readings older than two minutes', () {
      expect(DBService.isStale(nowMs - 120001, now: now), isTrue);
    });

    test('rejects missing and implausibly future timestamps', () {
      expect(DBService.isStale(null, now: now), isTrue);
      expect(DBService.isStale(nowMs + 120001, now: now), isTrue);
    });
  });
}
