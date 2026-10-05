import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/services/db_service.dart';

void main() {
  group('DBService.bucketHistory', () {
    const start = 1000000;
    const interval = Duration(minutes: 15);
    final intervalMs = interval.inMilliseconds;

    test('fills missing time buckets with zero', () {
      final buckets = DBService.bucketHistory(
        entries: [
          {'timestamp': start + 1000, 'temperature': 20.5},
          {'timestamp': start + intervalMs * 2 + 1000, 'temperature': 22.5},
        ],
        metric: 'temperature',
        start: start,
        end: start + intervalMs * 3,
        interval: interval,
      );

      expect(buckets, hasLength(3));
      expect(buckets.map((bucket) => bucket['temperature']), [20.5, 0, 22.5]);
      expect(buckets.map((bucket) => bucket['hasData']), [true, false, true]);
    });

    test(
      'averages readings in the same bucket and ignores outside readings',
      () {
        final buckets = DBService.bucketHistory(
          entries: [
            {'timestamp': start - 1, 'power': 100},
            {'timestamp': start + 1000, 'power': 20},
            {'timestamp': start + 2000, 'power': 40},
            {'timestamp': start + intervalMs * 2, 'power': 500},
          ],
          metric: 'power',
          start: start,
          end: start + intervalMs * 2,
          interval: interval,
        );

        expect(buckets.map((bucket) => bucket['power']), [30, 0]);
      },
    );
  });

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
