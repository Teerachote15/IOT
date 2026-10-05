import 'package:firebase_database/firebase_database.dart';

class DBService {
  DBService._();

  static const Duration staleAfter = Duration(minutes: 2);
  static final DatabaseReference _root = FirebaseDatabase.instance.ref();
  static DatabaseReference get devicesRef => _root.child('devices');

  static Stream<DatabaseEvent> devicesStream() => devicesRef.onValue;

  static Stream<DatabaseEvent> profileStream(String uid) =>
      _root.child('users/$uid').onValue;

  static Stream<DatabaseEvent> alertsStream() => _root.child('alerts').onValue;

  static Stream<DatabaseEvent> historyStream(String deviceId) =>
      devicesRef.child(deviceId).onValue;

  static List<Map<String, dynamic>> parseDevices(DataSnapshot snapshot) {
    final value = snapshot.value;
    if (value is! Map) return [];

    final devices = <Map<String, dynamic>>[];
    value.forEach((key, rawDevice) {
      if (key == null || rawDevice is! Map) return;
      final device = Map<String, dynamic>.from(rawDevice);
      final sensors = device['sensors'] is Map
          ? Map<String, dynamic>.from(device['sensors'] as Map)
          : <String, dynamic>{};
      final dht = sensors['dht22'] is Map
          ? Map<String, dynamic>.from(sensors['dht22'] as Map)
          : <String, dynamic>{};
      final pzem = sensors['pzem'] is Map
          ? Map<String, dynamic>.from(sensors['pzem'] as Map)
          : <String, dynamic>{};
      final dhtLast = dht['last'] is Map
          ? Map<String, dynamic>.from(dht['last'] as Map)
          : device['last'] is Map
          ? Map<String, dynamic>.from(device['last'] as Map)
          : <String, dynamic>{};
      final pzemLast = pzem['last'] is Map
          ? Map<String, dynamic>.from(pzem['last'] as Map)
          : <String, dynamic>{};

      devices.add({
        ...device,
        'id': key.toString(),
        'name': device['name']?.toString() ?? key.toString(),
        'room': device['room']?.toString() ?? 'ไม่ระบุห้อง',
        'temperature': _number(dhtLast['temperature']),
        'humidity': _number(dhtLast['humidity']),
        'power': _number(pzemLast['power'] ?? dhtLast['power']),
        'hasTemperature': dhtLast['temperature'] is num,
        'hasHumidity': dhtLast['humidity'] is num,
        'hasPower': pzemLast['power'] is num || dhtLast['power'] is num,
        'timestamp': normalizeTimestamp(
          [
            _number(dhtLast['timestamp']),
            _number(pzemLast['timestamp']),
          ].reduce((a, b) => a > b ? a : b),
        ),
        'dhtTimestamp': normalizeTimestamp(dhtLast['timestamp']),
        'pzemTimestamp': normalizeTimestamp(pzemLast['timestamp']),
        'relayState': device['relayState'] ?? device['enabled'],
        'hasRelay':
            (device['capabilities'] is Map &&
                (device['capabilities'] as Map)['relay'] == true) ||
            pzem.isNotEmpty,
      });
    });

    devices.sort(
      (a, b) => a['name'].toString().compareTo(b['name'].toString()),
    );
    return devices;
  }

  static List<Map<String, dynamic>> parseHistory(
    DataSnapshot snapshot, {
    int limit = 0,
    int? since,
  }) {
    final root = snapshot.value;
    if (root is! Map) return [];
    final device = Map<String, dynamic>.from(root);
    final sensors = device['sensors'] is Map
        ? Map<String, dynamic>.from(device['sensors'] as Map)
        : <String, dynamic>{};
    final entries = <Map<String, dynamic>>[];

    void appendHistory(dynamic rawHistory, String sensor) {
      if (rawHistory is! Map) return;
      rawHistory.forEach((key, value) {
        if (value is! Map) return;
        final entry = Map<String, dynamic>.from(value);
        entry['key'] = key.toString();
        entry['sensor'] = sensor;
        entry['timestamp'] = normalizeTimestamp(entry['timestamp']);
        if (since != null && (entry['timestamp'] as double) < since) return;
        entries.add(entry);
      });
    }

    final dht = sensors['dht22'];
    final pzem = sensors['pzem'];
    appendHistory(dht is Map ? dht['history'] : null, 'dht22');
    appendHistory(pzem is Map ? pzem['history'] : null, 'pzem');
    if (entries.isEmpty) appendHistory(device['history'], 'legacy');

    entries.sort(
      (a, b) => (a['timestamp'] as double).compareTo(b['timestamp'] as double),
    );
    return limit <= 0 || entries.length <= limit
        ? entries
        : entries.sublist(entries.length - limit);
  }

  static List<Map<String, dynamic>> bucketHistory({
    required List<Map<String, dynamic>> entries,
    required String metric,
    required int start,
    required int end,
    required Duration interval,
  }) {
    if (interval.inMilliseconds <= 0 || end <= start) return [];
    final intervalMs = interval.inMilliseconds;
    final bucketCount = ((end - start) / intervalMs).ceil();
    final valuesByBucket = List<List<double>>.generate(
      bucketCount,
      (_) => <double>[],
    );

    for (final entry in entries) {
      final timestamp = entry['timestamp'];
      final value = entry[metric];
      if (timestamp is! num ||
          timestamp < start ||
          timestamp >= end ||
          value is! num) {
        continue;
      }
      final index = ((timestamp - start) / intervalMs).floor();
      if (index < 0 || index >= bucketCount) continue;
      valuesByBucket[index].add(value.toDouble());
    }

    return List<Map<String, dynamic>>.generate(bucketCount, (index) {
      final readings = valuesByBucket[index];
      final hasData = readings.isNotEmpty;
      final average = hasData
          ? readings.reduce((a, b) => a + b) / readings.length
          : 0.0;
      return {
        'timestamp': start + index * intervalMs,
        metric: average,
        'hasData': hasData,
      };
    });
  }

  static double _number(dynamic value) {
    if (value is num) return value.toDouble();
    return double.tryParse(value?.toString() ?? '') ?? 0;
  }

  static double normalizeTimestamp(dynamic value) {
    if (value is DateTime) return value.millisecondsSinceEpoch.toDouble();
    final timestamp = _number(value);
    return timestamp > 0 && timestamp < 1000000000000
        ? timestamp * 1000
        : timestamp;
  }

  static bool isStale(dynamic timestamp, {DateTime? now}) {
    final value = timestamp is num ? timestamp.toInt() : 0;
    if (value <= 0) return true;
    final age = (now ?? DateTime.now()).millisecondsSinceEpoch - value;
    return age > staleAfter.inMilliseconds || age < -staleAfter.inMilliseconds;
  }
}
