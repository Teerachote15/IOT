import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_database/firebase_database.dart';

import '../services/db_service.dart';
import '../theme/app_color.dart';

class AlertsScreen extends StatefulWidget {
  const AlertsScreen({super.key});

  @override
  State<AlertsScreen> createState() => _AlertsScreenState();
}

class _AlertsScreenState extends State<AlertsScreen> {
  final _searchController = TextEditingController();
  String _selectedMetric = 'all';
  String _selectedStatus = 'active';
  String _selectedRoom = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _resolveAlert(BuildContext context, String alertId) async {
    try {
      await FirebaseDatabase.instance.ref('alerts/$alertId').update({
        'resolved': true,
        'resolvedBy': FirebaseAuth.instance.currentUser?.uid,
        'resolvedAt': ServerValue.timestamp,
      });
    } catch (error) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('ไม่สามารถยืนยันการแจ้งเตือนได้: $error')),
      );
    }
  }

  Widget _alertCard({
    required IconData icon,
    required String title,
    required String subtitle,
    required String message,
    required Color borderColor,
    required bool unread,
    VoidCallback? onClose,
  }) {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 6),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: borderColor.withValues(alpha: 0.65)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: borderColor.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: borderColor),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          title,
                          style: const TextStyle(
                            color: AppColor.primary,
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      if (unread)
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 9,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: borderColor.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            'ใหม่',
                            style: TextStyle(
                              color: borderColor,
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      color: AppColor.secondaryText,
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 7,
                    ),
                    decoration: BoxDecoration(
                      color: borderColor.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      message,
                      style: TextStyle(
                        color: borderColor,
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  if (onClose != null) ...[
                    const SizedBox(height: 10),
                    Align(
                      alignment: Alignment.centerRight,
                      child: TextButton.icon(
                        onPressed: onClose,
                        icon: const Icon(Icons.check_circle_outline, size: 17),
                        label: const Text('ยืนยันการแจ้งเตือน'),
                        style: TextButton.styleFrom(
                          foregroundColor: AppColor.primary,
                          visualDensity: VisualDensity.compact,
                        ),
                      ),
                    ),
                  ] else ...[
                    const SizedBox(height: 8),
                    const Align(
                      alignment: Alignment.centerRight,
                      child: Text(
                        'ยืนยันแล้ว',
                        style: TextStyle(
                          color: AppColor.secondaryText,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      return const Scaffold(body: Center(child: Text('กรุณาเข้าสู่ระบบ')));
    }

    return Scaffold(
      backgroundColor: AppColor.background,
      appBar: AppBar(
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'การแจ้งเตือน',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
            ),
          ],
        ),
      ),
      body: StreamBuilder<DatabaseEvent>(
        stream: DBService.profileStream(user.uid),
        builder: (context, profileSnapshot) {
          if (profileSnapshot.hasError) {
            return _loadError(
              'โหลดข้อมูลพนักงานไม่สำเร็จ: ${profileSnapshot.error}',
            );
          }
          if (!profileSnapshot.hasData) {
            return const Center(child: CircularProgressIndicator());
          }

          final profile = profileSnapshot.data!.snapshot;
          final role = profile.child('role').value?.toString();
          final isAdmin = role == 'admin' || role == 'ผู้ดูแลระบบ';
          final roomValue = profile.child('rooms').value;
          final assignedRooms = roomValue is List
              ? roomValue.whereType<String>().toList()
              : roomValue is Map
              ? roomValue.values.whereType<String>().toList()
              : <String>[];
          if (!isAdmin && assignedRooms.isEmpty) {
            return const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Text(
                  'บัญชีนี้ยังไม่ได้รับมอบหมายห้อง กรุณาติดต่อผู้ดูแลระบบ',
                  textAlign: TextAlign.center,
                ),
              ),
            );
          }

          return StreamBuilder<DatabaseEvent>(
            stream: DBService.alertsStream(),
            builder: (context, snapshot) {
              if (snapshot.hasError) {
                return _loadError(
                  'โหลดการแจ้งเตือนไม่สำเร็จ: ${snapshot.error}',
                );
              }
              if (!snapshot.hasData) {
                return const Center(child: CircularProgressIndicator());
              }

              final alerts = <MapEntry<String, Map<dynamic, dynamic>>>[];
              final value = snapshot.data!.snapshot.value;
              if (value is Map) {
                value.forEach((key, alert) {
                  if (key is String && alert is Map) {
                    alerts.add(MapEntry(key, alert));
                  }
                });
              }
              final scopedAlerts = isAdmin
                  ? alerts
                  : alerts
                        .where(
                          (entry) => assignedRooms.contains(
                            entry.value['room']?.toString(),
                          ),
                        )
                        .toList();
              scopedAlerts.sort((a, b) {
                final aTime = a.value['timestamp'] is num
                    ? (a.value['timestamp'] as num).toInt()
                    : 0;
                final bTime = b.value['timestamp'] is num
                    ? (b.value['timestamp'] as num).toInt()
                    : 0;
                return bTime.compareTo(aTime);
              });

              final rooms = isAdmin
                  ? scopedAlerts
                        .map((entry) => entry.value['room']?.toString() ?? '')
                        .where((room) => room.isNotEmpty)
                        .toSet()
                        .toList()
                  : assignedRooms.toSet().toList();
              rooms.sort();
              if (_selectedRoom.isNotEmpty && !rooms.contains(_selectedRoom)) {
                _selectedRoom = '';
              }
              final search = _searchController.text.trim().toLowerCase();
              final filtered = scopedAlerts.where((entry) {
                final alert = entry.value;
                final resolved = alert['resolved'] == true;
                final metric = alert['metric']?.toString() ?? '';
                final room = alert['room']?.toString() ?? '';
                final text =
                    '${alert['deviceName'] ?? ''} ${alert['deviceId'] ?? ''} $room $metric ${alert['value'] ?? ''}'
                        .toLowerCase();
                return (_selectedStatus == 'all' ||
                        (_selectedStatus == 'active' && !resolved) ||
                        (_selectedStatus == 'resolved' && resolved)) &&
                    (_selectedMetric == 'all' || metric == _selectedMetric) &&
                    (_selectedRoom.isEmpty || room == _selectedRoom) &&
                    (search.isEmpty || text.contains(search));
              }).toList();
              final active = filtered.where(
                (entry) => entry.value['resolved'] != true,
              );
              final resolved = filtered.where(
                (entry) => entry.value['resolved'] == true,
              );

              return RefreshIndicator(
                onRefresh: () async => snapshot.data!.snapshot.ref.get(),
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    Text(
                      isAdmin
                          ? 'สถานะการแจ้งเตือนรายห้อง'
                          : 'ห้องที่ได้รับมอบหมาย',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: AppColor.primary,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 8),
                    ...rooms
                        .where(
                          (room) =>
                              _selectedRoom.isEmpty || room == _selectedRoom,
                        )
                        .map((room) {
                          final roomAlerts = scopedAlerts
                              .where(
                                (entry) =>
                                    entry.value['room']?.toString() == room,
                              )
                              .toList();
                          final activeCount = roomAlerts
                              .where((entry) => entry.value['resolved'] != true)
                              .length;
                          final status = roomAlerts.isEmpty
                              ? 'ไม่มีการแจ้งเตือน'
                              : activeCount == 0
                              ? 'ไม่มีการแจ้งเตือนที่ค้างอยู่'
                              : 'มีการแจ้งเตือน $activeCount รายการ';
                          final statusColor = activeCount > 0
                              ? AppColor.orange
                              : AppColor.green;
                          return Card(
                            color: Colors.white,
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: statusColor.withValues(
                                  alpha: 0.12,
                                ),
                                child: Icon(
                                  activeCount > 0
                                      ? Icons.notifications_active_outlined
                                      : Icons.notifications_off_outlined,
                                  color: statusColor,
                                ),
                              ),
                              title: Text(
                                room,
                                style: const TextStyle(
                                  color: AppColor.primary,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              subtitle: Text(
                                status,
                                style: TextStyle(color: statusColor),
                              ),
                              trailing: Text('${roomAlerts.length}'),
                              onTap: () => setState(() => _selectedRoom = room),
                            ),
                          );
                        }),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _searchController,
                      decoration: InputDecoration(
                        labelText: 'ค้นหาการแจ้งเตือน',
                        prefixIcon: const Icon(Icons.search),
                        suffixIcon: _searchController.text.isEmpty
                            ? null
                            : IconButton(
                                onPressed: () {
                                  _searchController.clear();
                                  setState(() {});
                                },
                                icon: const Icon(Icons.clear),
                              ),
                        filled: true,
                        fillColor: Colors.white,
                        border: const OutlineInputBorder(),
                      ),
                      onChanged: (_) => setState(() {}),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      initialValue: _selectedRoom,
                      decoration: const InputDecoration(
                        labelText: 'ห้อง',
                        prefixIcon: Icon(Icons.meeting_room_outlined),
                        filled: true,
                        fillColor: Colors.white,
                        border: OutlineInputBorder(),
                      ),
                      items: [
                        const DropdownMenuItem(
                          value: '',
                          child: Text('ทุกห้อง'),
                        ),
                        ...rooms.map(
                          (room) =>
                              DropdownMenuItem(value: room, child: Text(room)),
                        ),
                      ],
                      onChanged: (value) =>
                          setState(() => _selectedRoom = value ?? ''),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      initialValue: _selectedMetric,
                      decoration: const InputDecoration(
                        labelText: 'ประเภท',
                        prefixIcon: Icon(Icons.tune),
                        filled: true,
                        fillColor: Colors.white,
                        border: OutlineInputBorder(),
                      ),
                      items: const [
                        DropdownMenuItem(
                          value: 'all',
                          child: Text('ทุกประเภท'),
                        ),
                        DropdownMenuItem(
                          value: 'power',
                          child: Text('กำลังไฟ'),
                        ),
                        DropdownMenuItem(
                          value: 'temperature',
                          child: Text('อุณหภูมิ'),
                        ),
                        DropdownMenuItem(
                          value: 'humidity',
                          child: Text('ความชื้น'),
                        ),
                      ],
                      onChanged: (value) =>
                          setState(() => _selectedMetric = value ?? 'all'),
                    ),
                    const SizedBox(height: 12),
                    SegmentedButton<String>(
                      segments: const [
                        ButtonSegment(
                          value: 'active',
                          label: Text('รอดำเนินการ'),
                        ),
                        ButtonSegment(
                          value: 'resolved',
                          label: Text('ยืนยันแล้ว'),
                        ),
                        ButtonSegment(value: 'all', label: Text('ทั้งหมด')),
                      ],
                      selected: {_selectedStatus},
                      onSelectionChanged: (selection) =>
                          setState(() => _selectedStatus = selection.first),
                    ),
                    const SizedBox(height: 16),
                    if (filtered.isEmpty)
                      const Card(
                        color: Colors.white,
                        child: Padding(
                          padding: EdgeInsets.all(20),
                          child: Text(
                            'ไม่พบการแจ้งเตือนตามตัวกรอง',
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ),
                    if (_selectedStatus != 'resolved') ...[
                      Text(
                        'รอดำเนินการ',
                        style: Theme.of(context).textTheme.titleMedium
                            ?.copyWith(
                              color: AppColor.primary,
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                      const SizedBox(height: 8),
                      ...active.map(
                        (entry) => _buildAlertCard(context, entry, true),
                      ),
                    ],
                    if (_selectedStatus != 'active') ...[
                      const SizedBox(height: 16),
                      Text(
                        'ยืนยันแล้ว',
                        style: Theme.of(context).textTheme.titleMedium
                            ?.copyWith(
                              color: AppColor.secondaryText,
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                      const SizedBox(height: 8),
                      ...resolved.map(
                        (entry) => Opacity(
                          opacity: 0.6,
                          child: _buildAlertCard(context, entry, false),
                        ),
                      ),
                    ],
                  ],
                ),
              );
            },
          );
        },
      ),
    );
  }

  Widget _loadError(String message) => Center(
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Padding(
          padding: const EdgeInsets.all(20),
          child: Text(message, textAlign: TextAlign.center),
        ),
        OutlinedButton.icon(
          onPressed: () => setState(() {}),
          icon: const Icon(Icons.refresh),
          label: const Text('ลองอีกครั้ง'),
        ),
      ],
    ),
  );

  Widget _buildAlertCard(
    BuildContext context,
    MapEntry<String, Map<dynamic, dynamic>> entry,
    bool unread,
  ) {
    final alert = entry.value;
    final metric = alert['metric']?.toString() ?? '';
    final metricLabel = metric == 'temperature'
        ? 'อุณหภูมิ'
        : metric == 'humidity'
        ? 'ความชื้น'
        : metric == 'power'
        ? 'กำลังไฟ'
        : 'ค่า';
    final unit = metric == 'temperature'
        ? '°C'
        : metric == 'humidity'
        ? '%'
        : metric == 'power'
        ? ' W'
        : '';
    final deviceName =
        alert['deviceName']?.toString() ??
        alert['deviceId']?.toString() ??
        'อุปกรณ์';
    final room = alert['room']?.toString() ?? 'ไม่ระบุห้อง';
    final value = alert['value'] ?? '-';
    final threshold = alert['threshold'] ?? '-';
    final timestamp = alert['timestamp'] is num
        ? DateTime.fromMillisecondsSinceEpoch(
            (alert['timestamp'] as num).toInt(),
          )
        : null;
    final timeText = timestamp == null
        ? 'ไม่ทราบเวลา'
        : '${timestamp.day}/${timestamp.month}/${timestamp.year} '
              '${timestamp.hour.toString().padLeft(2, '0')}:'
              '${timestamp.minute.toString().padLeft(2, '0')}';
    final color = metric == 'power'
        ? AppColor.orange
        : metric == 'temperature'
        ? AppColor.blue
        : metric == 'humidity'
        ? AppColor.green
        : AppColor.secondaryText;
    final icon = metric == 'humidity'
        ? Icons.water_drop
        : metric == 'power'
        ? Icons.bolt
        : Icons.thermostat;

    return _alertCard(
      icon: icon,
      title: deviceName,
      subtitle: '$room · $timeText',
      message: '$metricLabel $value$unit / เกณฑ์ $threshold$unit',
      borderColor: color,
      unread: unread,
      onClose: unread ? () => _resolveAlert(context, entry.key) : null,
    );
  }
}
