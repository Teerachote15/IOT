import 'package:firebase_database/firebase_database.dart';

class DBService {
  DBService._();

  static final DatabaseReference devicesRef =
      FirebaseDatabase.instance.ref('devices');

  static Stream<DatabaseEvent> devicesStream() {
    try {
      return devicesRef.onValue;
    } catch (e) {
      return const Stream.empty();
    }
  }

  static Future<List<Map<String, dynamic>>> getHistory(String deviceId,
      {int limit = 24}) async {
    try {
      final ref = devicesRef.child(deviceId).child('history');
      final snapshot = await ref.orderByKey().limitToLast(limit).get();
      if (!snapshot.exists || snapshot.value == null) return [];

      final data = snapshot.value as Map<dynamic, dynamic>;
      final list = <Map<String, dynamic>>[];
      data.forEach((key, value) {
        if (value is Map) {
          final map = Map<String, dynamic>.from(value as Map);
          map['key'] = key.toString();
          list.add(map);
        }
      });

      // sort by key (assumed chronological)
      list.sort((a, b) => a['key'].compareTo(b['key']));
      return list;
    } catch (e) {
      return [];
    }
  }
}
