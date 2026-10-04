import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_database/firebase_database.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../services/db_service.dart';
import '../theme/app_color.dart';
import 'alerts_screen.dart';
import 'history_screen.dart';
import 'settings_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _selectedIndex = 0;

  final List<Widget> _pages = const [
    DashboardContent(),
    HistoryScreen(),
    AlertsScreen(),
    SettingsScreen(),
  ];

  static const _destinations = [
    (Icons.dashboard_outlined, Icons.dashboard, 'หน้าหลัก'),
    (Icons.history_outlined, Icons.history, 'ประวัติ'),
    (Icons.notifications_outlined, Icons.notifications, 'แจ้งเตือน'),
    (Icons.settings_outlined, Icons.settings, 'ตั้งค่า'),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(index: _selectedIndex, children: _pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (index) =>
            setState(() => _selectedIndex = index),
        destinations: [
          for (var index = 0; index < _destinations.length; index++)
            NavigationDestination(
              icon: Icon(_destinations[index].$1),
              selectedIcon: Icon(_destinations[index].$2),
              label: _destinations[index].$3,
            ),
        ],
      ),
    );
  }
}

class DashboardContent extends StatefulWidget {
  const DashboardContent({super.key});

  @override
  State<DashboardContent> createState() => _DashboardContentState();
}

class _DashboardContentState extends State<DashboardContent> {
  String _selectedRoom = '';
  final Set<String> _controllingDeviceIds = {};

  List<String> _assignedRooms(DataSnapshot? profileSnapshot) {
    final rawRooms = profileSnapshot?.child('rooms').value;
    if (rawRooms is List) {
      return rawRooms.whereType<String>().toList();
    }
    if (rawRooms is Map) {
      return rawRooms.values.whereType<String>().toList();
    }
    return [];
  }

  Future<void> _toggleRelay(Map<String, dynamic> device) async {
    final deviceId = device['id'] as String;
    final currentState = device['relayState'];
    if (currentState is! bool ||
        device['hasRelay'] != true ||
        DBService.isStale(device['timestamp'])) {
      return;
    }
    final requestedState = !currentState;
    final action = requestedState ? 'เปิด' : 'ปิด';
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text('ยืนยันการ$actionปลั๊ก'),
        content: Text('ต้องการ$actionปลั๊กของ ${device['name']} ใช่หรือไม่?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('ยกเลิก'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: Text(action),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    setState(() => _controllingDeviceIds.add(deviceId));
    DatabaseReference? logRef;
    var commandSent = false;
    try {
      final user = FirebaseAuth.instance.currentUser;
      logRef = FirebaseDatabase.instance.ref('deviceControlLogs').push();
      if (logRef.key == null) {
        throw StateError('ไม่สามารถสร้างบันทึกคำสั่งอุปกรณ์ได้');
      }
      await logRef.set({
        'deviceId': deviceId,
        'deviceName': device['name'],
        'requestedState': requestedState,
        'outcome': 'pending',
        'actorUid': user?.uid,
        'actorEmail': user?.email,
        'actorName': user?.displayName ?? user?.email,
        'requestedAt': ServerValue.timestamp,
      });
      await FirebaseDatabase.instance
          .ref('devices/$deviceId/enabled')
          .set(requestedState);
      commandSent = true;
      await FirebaseDatabase.instance
          .ref('devices/$deviceId/relayState')
          .onValue
          .firstWhere((event) => event.snapshot.value == requestedState)
          .timeout(const Duration(seconds: 20));
      await logRef.update({
        'outcome': 'sent',
        'completedAt': ServerValue.timestamp,
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('อุปกรณ์รายงานสถานะหลังส่งคำสั่งแล้ว')),
      );
    } catch (error) {
      var failure = error;
      if (logRef != null) {
        try {
          await logRef.update({
            'outcome': 'failed',
            'completedAt': ServerValue.timestamp,
            'error': error.toString(),
          });
        } catch (logError) {
          failure = StateError('$error; บันทึกผลคำสั่งไม่สำเร็จ: $logError');
        }
      }
      if (!mounted) return;
      final message = commandSent
          ? 'ส่งคำสั่งแล้ว แต่ไม่ได้รับการยืนยันจากอุปกรณ์: $failure'
          : 'ส่งคำสั่งควบคุมไม่สำเร็จ: $failure';
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(message)));
    } finally {
      if (mounted) setState(() => _controllingDeviceIds.remove(deviceId));
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return const SizedBox.shrink();

    return Scaffold(
      backgroundColor: AppColor.background,
      appBar: AppBar(
        title: const Row(
          children: [
            CircleAvatar(
              radius: 17,
              backgroundColor: Color(0xffeef2ff),
              child: Icon(
                Icons.wifi_tethering,
                size: 19,
                color: AppColor.primary,
              ),
            ),
            SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'IoT Monitor',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                Text(
                  'ภาพรวมอุปกรณ์',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppColor.secondaryText,
                    fontWeight: FontWeight.normal,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
      body: StreamBuilder<DatabaseEvent>(
        stream: DBService.profileStream(user.uid),
        builder: (context, profileState) {
          if (profileState.hasError) {
            return _ErrorState(
              message: 'โหลดข้อมูลพนักงานไม่สำเร็จ: ${profileState.error}',
            );
          }
          if (!profileState.hasData) {
            return const Center(child: CircularProgressIndicator());
          }
          final assignedRooms = _assignedRooms(profileState.data!.snapshot);
          final role = profileState.data!.snapshot
              .child('role')
              .value
              ?.toString();
          final isAdmin = role == 'admin' || role == 'ผู้ดูแลระบบ';
          if (!isAdmin && assignedRooms.isEmpty) {
            return const _ErrorState(
              message: 'บัญชีนี้ยังไม่ได้รับมอบหมายห้อง กรุณาติดต่อผู้ดูแลระบบ',
            );
          }

          return StreamBuilder<DatabaseEvent>(
            stream: DBService.devicesStream(),
            builder: (context, deviceState) {
              if (deviceState.hasError) {
                return _ErrorState(
                  message: 'โหลดอุปกรณ์ไม่สำเร็จ: ${deviceState.error}',
                );
              }
              if (!deviceState.hasData) {
                return const Center(child: CircularProgressIndicator());
              }

              var devices = DBService.parseDevices(deviceState.data!.snapshot);
              if (!isAdmin) {
                devices = devices
                    .where((device) => assignedRooms.contains(device['room']))
                    .toList();
              }

              final roomNames =
                  devices
                      .map((device) => device['room'].toString())
                      .toSet()
                      .toList()
                    ..sort();
              if (_selectedRoom.isNotEmpty &&
                  !roomNames.contains(_selectedRoom)) {
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  if (mounted) setState(() => _selectedRoom = '');
                });
              }
              final shownDevices = _selectedRoom.isEmpty
                  ? devices
                  : devices
                        .where((device) => device['room'] == _selectedRoom)
                        .toList();
              final temperatureDevices =
                  shownDevices
                      .where(
                        (device) =>
                            device['hasTemperature'] == true &&
                            !DBService.isStale(device['dhtTimestamp']),
                      )
                      .toList()
                    ..sort(
                      (a, b) => (b['dhtTimestamp'] as double).compareTo(
                        a['dhtTimestamp'] as double,
                      ),
                    );
              final humidityDevices =
                  shownDevices
                      .where(
                        (device) =>
                            device['hasHumidity'] == true &&
                            !DBService.isStale(device['dhtTimestamp']),
                      )
                      .toList()
                    ..sort(
                      (a, b) => (b['dhtTimestamp'] as double).compareTo(
                        a['dhtTimestamp'] as double,
                      ),
                    );
              final onlineCount = shownDevices
                  .where(
                    (device) =>
                        device['status'] == 'online' &&
                        !DBService.isStale(device['timestamp']),
                  )
                  .length;
              final currentTemperature = temperatureDevices.isEmpty
                  ? null
                  : temperatureDevices.first['temperature'] as double;
              final currentHumidity = humidityDevices.isEmpty
                  ? null
                  : humidityDevices.first['humidity'] as double;
              final totalPower = shownDevices.fold<double>(
                0,
                (total, device) =>
                    total +
                    (device['hasPower'] == true &&
                            !DBService.isStale(device['pzemTimestamp'])
                        ? device['power'] as double
                        : 0),
              );

              return RefreshIndicator(
                onRefresh: () async {
                  await deviceState.data!.snapshot.ref.get();
                },
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    if (!isAdmin) _AssignedRoomsBanner(rooms: assignedRooms),
                    DropdownButtonFormField<String>(
                      initialValue: _selectedRoom,
                      decoration: const InputDecoration(
                        labelText: 'เลือกห้อง',
                        prefixIcon: Icon(Icons.meeting_room_outlined),
                        filled: true,
                        fillColor: Colors.white,
                        border: OutlineInputBorder(),
                      ),
                      items: [
                        const DropdownMenuItem(
                          value: '',
                          child: Text('ทุกห้องที่ได้รับมอบหมาย'),
                        ),
                        ...roomNames.map(
                          (room) =>
                              DropdownMenuItem(value: room, child: Text(room)),
                        ),
                      ],
                      onChanged: (room) =>
                          setState(() => _selectedRoom = room ?? ''),
                    ),
                    const SizedBox(height: 16),
                    GridView.count(
                      crossAxisCount: 2,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      mainAxisSpacing: 12,
                      crossAxisSpacing: 12,
                      childAspectRatio: 1.6,
                      children: [
                        _MetricCard(
                          icon: Icons.thermostat,
                          title: 'อุณหภูมิปัจจุบัน',
                          value: currentTemperature == null
                              ? '--'
                              : '${currentTemperature.toStringAsFixed(1)} °C',
                          color: AppColor.blue,
                          detail: temperatureDevices.isEmpty
                              ? null
                              : temperatureDevices.first['name'].toString(),
                        ),
                        _MetricCard(
                          icon: Icons.water_drop_outlined,
                          title: 'ความชื้นปัจจุบัน',
                          value: currentHumidity == null
                              ? '--'
                              : '${currentHumidity.toStringAsFixed(0)}%',
                          color: AppColor.green,
                          detail: humidityDevices.isEmpty
                              ? null
                              : humidityDevices.first['name'].toString(),
                        ),
                        _MetricCard(
                          icon: Icons.bolt,
                          title: 'กำลังไฟรวม',
                          value: '${totalPower.toStringAsFixed(1)} W',
                          color: AppColor.orange,
                        ),
                        _MetricCard(
                          icon: Icons.wifi,
                          title: 'ออนไลน์',
                          value: '$onlineCount / ${shownDevices.length}',
                          color: AppColor.green,
                        ),
                      ],
                    ),
                    const SizedBox(height: 22),
                    Text(
                      _selectedRoom.isEmpty
                          ? 'อุปกรณ์ทั้งหมด'
                          : 'อุปกรณ์ · $_selectedRoom',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    if (shownDevices.isEmpty)
                      const Card(
                        child: Padding(
                          padding: EdgeInsets.all(22),
                          child: Text(
                            'ยังไม่มีอุปกรณ์ในห้องที่ได้รับมอบหมาย',
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ),
                    ...shownDevices.map(
                      (device) => _DeviceCard(
                        device: device,
                        busy: _controllingDeviceIds.contains(device['id']),
                        onRelayToggle: () => _toggleRelay(device),
                      ),
                    ),
                  ],
                ),
              );
            },
          );
        },
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({
    required this.icon,
    required this.title,
    required this.value,
    required this.color,
    this.detail,
  });

  final IconData icon;
  final String title;
  final String value;
  final Color color;
  final String? detail;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(icon, color: color, size: 17),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.labelMedium?.copyWith(
                      color: AppColor.secondaryText,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
            const Spacer(),
            FittedBox(
              fit: BoxFit.scaleDown,
              alignment: Alignment.centerLeft,
              child: Text(
                value,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontSize: 21,
                  fontWeight: FontWeight.w700,
                  color: AppColor.primary,
                ),
              ),
            ),
            if (detail != null) ...[
              const SizedBox(height: 2),
              Text(
                detail!,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(
                  context,
                ).textTheme.labelSmall?.copyWith(color: AppColor.secondaryText),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _DeviceCard extends StatelessWidget {
  const _DeviceCard({
    required this.device,
    required this.busy,
    required this.onRelayToggle,
  });

  final Map<String, dynamic> device;
  final bool busy;
  final VoidCallback onRelayToggle;

  @override
  Widget build(BuildContext context) {
    final stale = DBService.isStale(device['timestamp']);
    final online = device['status'] == 'online' && !stale;
    final statusLabel =
        !device['hasTemperature'] &&
            !device['hasHumidity'] &&
            !device['hasPower']
        ? 'ไม่มีข้อมูลเซนเซอร์'
        : stale
        ? 'ข้อมูลล่าช้า'
        : online
        ? 'ออนไลน์'
        : 'ออฟไลน์';
    final statusColor = stale && statusLabel == 'ข้อมูลล่าช้า'
        ? AppColor.orange
        : online
        ? AppColor.green
        : AppColor.red;
    final timestamp = (device['timestamp'] as num?)?.toInt() ?? 0;
    final lastUpdated = timestamp <= 0
        ? 'ไม่พบเวลาอัปเดต'
        : _formatLastUpdated(DateTime.fromMillisecondsSinceEpoch(timestamp));
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
        child: ListTile(
          contentPadding: const EdgeInsets.symmetric(horizontal: 10),
          leading: CircleAvatar(
            backgroundColor: statusColor.withValues(alpha: 0.1),
            child: Icon(Icons.sensors, color: statusColor),
          ),
          title: Text(
            device['name'].toString(),
            style: const TextStyle(
              color: AppColor.primary,
              fontWeight: FontWeight.w700,
            ),
          ),
          subtitle: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                '${device['room']} · $statusLabel',
                style: const TextStyle(color: AppColor.secondaryText),
              ),
              const SizedBox(height: 3),
              Row(
                children: [
                  const Icon(
                    Icons.update,
                    size: 13,
                    color: AppColor.secondaryText,
                  ),
                  const SizedBox(width: 4),
                  Flexible(
                    child: Text(
                      'อัปเดตล่าสุด $lastUpdated',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColor.secondaryText,
                        fontSize: 11,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
          trailing: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    device['hasTemperature'] == true &&
                            !DBService.isStale(device['dhtTimestamp'])
                        ? '${(device['temperature'] as double).toStringAsFixed(1)} °C'
                        : '-- °C',
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                  Text(
                    device['hasHumidity'] == true &&
                            !DBService.isStale(device['dhtTimestamp'])
                        ? '${(device['humidity'] as double).toStringAsFixed(0)}%'
                        : '--%',
                    style: const TextStyle(color: AppColor.secondaryText),
                  ),
                ],
              ),
              if (device['hasRelay'] == true) ...[
                const SizedBox(width: 6),
                IconButton(
                  tooltip: device['relayState'] == true
                      ? 'ปิดปลั๊ก'
                      : 'เปิดปลั๊ก',
                  onPressed: busy || stale || device['relayState'] is! bool
                      ? null
                      : onRelayToggle,
                  icon: busy
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : Icon(
                          device['relayState'] == true
                              ? Icons.power_settings_new
                              : Icons.power_settings_new_outlined,
                          color: device['relayState'] == true
                              ? AppColor.green
                              : AppColor.secondaryText,
                        ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  String _formatLastUpdated(DateTime timestamp) {
    final now = DateTime.now();
    if (timestamp.year == now.year &&
        timestamp.month == now.month &&
        timestamp.day == now.day) {
      return 'วันนี้ ${DateFormat('HH:mm').format(timestamp)}';
    }
    return DateFormat('dd/MM/yyyy HH:mm').format(timestamp);
  }
}

class _AssignedRoomsBanner extends StatelessWidget {
  const _AssignedRoomsBanner({required this.rooms});

  final List<String> rooms;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Text(
        'ห้องที่ได้รับมอบหมาย: ${rooms.join(', ')}',
        style: Theme.of(context).textTheme.bodySmall,
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Text(message, textAlign: TextAlign.center),
    ),
  );
}
