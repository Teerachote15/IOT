import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_database/firebase_database.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../services/db_service.dart';
import '../theme/app_color.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  String? _selectedDeviceId;
  String _selectedMetric = 'temperature';
  String _selectedRange = '24h';

  Duration get _rangeDuration => switch (_selectedRange) {
    '3d' => const Duration(days: 3),
    '7d' => const Duration(days: 7),
    '30d' => const Duration(days: 30),
    _ => const Duration(hours: 24),
  };

  String get _metricLabel => switch (_selectedMetric) {
    'temperature' => 'อุณหภูมิ',
    'humidity' => 'ความชื้น',
    _ => 'กำลังไฟ',
  };

  String get _unit => switch (_selectedMetric) {
    'temperature' => '°C',
    'humidity' => '%',
    _ => 'W',
  };

  Color get _metricColor => switch (_selectedMetric) {
    'temperature' => AppColor.blue,
    'humidity' => AppColor.green,
    _ => AppColor.orange,
  };

  @override
  Widget build(BuildContext context) {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      return const Scaffold(body: _HistoryMessage('กรุณาเข้าสู่ระบบ'));
    }

    return Scaffold(
      backgroundColor: AppColor.background,
      appBar: AppBar(title: const Text('ประวัติข้อมูล')),
      body: StreamBuilder<DatabaseEvent>(
        stream: DBService.profileStream(user.uid),
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return _HistoryMessage(
              'โหลดข้อมูลพนักงานไม่สำเร็จ: ${snapshot.error}',
            );
          }
          if (!snapshot.hasData) {
            return const Center(child: CircularProgressIndicator());
          }

          final assignedValue = snapshot.data!.snapshot.child('rooms').value;
          final assignedRooms = assignedValue is List
              ? assignedValue.whereType<String>().toList()
              : assignedValue is Map
              ? assignedValue.values.whereType<String>().toList()
              : <String>[];
          final role = snapshot.data!.snapshot.child('role').value?.toString();
          final isAdmin = role == 'admin' || role == 'ผู้ดูแลระบบ';
          if (!isAdmin && assignedRooms.isEmpty) {
            return const _HistoryMessage(
              'บัญชีนี้ยังไม่ได้รับมอบหมายห้อง กรุณาติดต่อผู้ดูแลระบบ',
            );
          }

          return StreamBuilder<DatabaseEvent>(
            stream: DBService.devicesStream(),
            builder: (context, deviceSnapshot) {
              if (deviceSnapshot.hasError) {
                return _HistoryMessage(
                  'โหลดรายชื่ออุปกรณ์ไม่สำเร็จ: ${deviceSnapshot.error}',
                );
              }
              if (!deviceSnapshot.hasData) {
                return const Center(child: CircularProgressIndicator());
              }

              var devices = DBService.parseDevices(
                deviceSnapshot.data!.snapshot,
              );
              if (!isAdmin) {
                devices = devices
                    .where((device) => assignedRooms.contains(device['room']))
                    .toList();
              }
              if (devices.isEmpty) {
                return const _HistoryMessage(
                  'ยังไม่มีอุปกรณ์ในห้องที่ได้รับมอบหมาย',
                );
              }

              final selectedExists = devices.any(
                (device) => device['id'] == _selectedDeviceId,
              );
              final selectedId = selectedExists
                  ? _selectedDeviceId!
                  : devices.first['id'] as String;
              if (selectedId != _selectedDeviceId) {
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  if (mounted) setState(() => _selectedDeviceId = selectedId);
                });
              }

              return StreamBuilder<DatabaseEvent>(
                key: ValueKey(selectedId),
                stream: DBService.historyStream(selectedId),
                builder: (context, historySnapshot) {
                  if (historySnapshot.hasError) {
                    return _HistoryMessage(
                      'โหลดประวัติไม่สำเร็จ: ${historySnapshot.error}',
                    );
                  }
                  if (!historySnapshot.hasData) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  final rangeEnd = DateTime.now();
                  final rangeStart = rangeEnd.subtract(_rangeDuration);
                  final history = DBService.parseHistory(
                    historySnapshot.data!.snapshot,
                    since: rangeStart.millisecondsSinceEpoch,
                  );
                  final filteredHistory =
                      history.where((entry) {
                        final timestamp = entry['timestamp'] as num;
                        final hasMetric = _selectedMetric == 'power'
                            ? entry['sensor'] != 'dht22' &&
                                  entry['power'] != null
                            : entry[_selectedMetric] != null;
                        return hasMetric &&
                            timestamp <= rangeEnd.millisecondsSinceEpoch;
                      }).toList()..sort(
                        (a, b) => (a['timestamp'] as num).compareTo(
                          b['timestamp'] as num,
                        ),
                      );
                  final chartValues = filteredHistory
                      .map((entry) => _asDouble(entry[_selectedMetric]))
                      .toList();
                  final chartEntries = filteredHistory
                      .where((entry) => (entry['timestamp'] as num) > 0)
                      .toList();
                  final sampleStep = (chartEntries.length / 500).ceil();
                  final chartSamples = <Map<String, dynamic>>[];
                  for (
                    var index = 0;
                    index < chartEntries.length;
                    index += sampleStep == 0 ? 1 : sampleStep
                  ) {
                    chartSamples.add(chartEntries[index]);
                  }
                  if (chartEntries.isNotEmpty &&
                      chartSamples.last != chartEntries.last) {
                    chartSamples.add(chartEntries.last);
                  }
                  final latestValue = chartEntries.isEmpty
                      ? null
                      : _asDouble(chartEntries.last[_selectedMetric]);
                  final minimumValue = chartValues.isEmpty
                      ? null
                      : chartValues.reduce((a, b) => a < b ? a : b);
                  final maximumValue = chartValues.isEmpty
                      ? null
                      : chartValues.reduce((a, b) => a > b ? a : b);

                  return ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      DropdownButtonFormField<String>(
                        initialValue: selectedId,
                        decoration: const InputDecoration(
                          labelText: 'อุปกรณ์',
                          prefixIcon: Icon(Icons.sensors),
                          filled: true,
                          fillColor: Colors.white,
                          border: OutlineInputBorder(),
                        ),
                        items: devices
                            .map(
                              (device) => DropdownMenuItem(
                                value: device['id'] as String,
                                child: Text(
                                  '${device['name']} · ${device['room']}',
                                ),
                              ),
                            )
                            .toList(),
                        onChanged: (value) =>
                            setState(() => _selectedDeviceId = value),
                      ),
                      const SizedBox(height: 14),
                      DropdownButtonFormField<String>(
                        initialValue: _selectedRange,
                        decoration: const InputDecoration(
                          labelText: 'ช่วงเวลา',
                          prefixIcon: Icon(Icons.date_range_outlined),
                          filled: true,
                          fillColor: Colors.white,
                          border: OutlineInputBorder(),
                        ),
                        items: const [
                          DropdownMenuItem(
                            value: '24h',
                            child: Text('24 ชั่วโมง'),
                          ),
                          DropdownMenuItem(value: '3d', child: Text('3 วัน')),
                          DropdownMenuItem(value: '7d', child: Text('7 วัน')),
                          DropdownMenuItem(value: '30d', child: Text('30 วัน')),
                        ],
                        onChanged: (value) =>
                            setState(() => _selectedRange = value ?? '24h'),
                      ),
                      const SizedBox(height: 14),
                      SegmentedButton<String>(
                        segments: const [
                          ButtonSegment(
                            value: 'temperature',
                            label: Text('อุณหภูมิ'),
                            icon: Icon(Icons.thermostat),
                          ),
                          ButtonSegment(
                            value: 'humidity',
                            label: Text('ความชื้น'),
                            icon: Icon(Icons.water_drop_outlined),
                          ),
                          ButtonSegment(
                            value: 'power',
                            label: Text('กำลังไฟ'),
                            icon: Icon(Icons.bolt),
                          ),
                        ],
                        selected: {_selectedMetric},
                        onSelectionChanged: (selection) =>
                            setState(() => _selectedMetric = selection.first),
                      ),
                      const SizedBox(height: 16),
                      Card(
                        color: Colors.white,
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(12, 18, 18, 12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '$_metricLabel - ${devices.firstWhere((device) => device['id'] == selectedId)['name']}',
                                style: Theme.of(context).textTheme.titleMedium,
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '${_rangeLabel(_selectedRange)} · ${chartEntries.length} จุดข้อมูล',
                                style: Theme.of(context).textTheme.bodySmall
                                    ?.copyWith(color: AppColor.secondaryText),
                              ),
                              const SizedBox(height: 14),
                              if (chartSamples.length < 2)
                                const SizedBox(
                                  height: 230,
                                  child: Center(
                                    child: Text(
                                      'ข้อมูลย้อนหลังยังไม่เพียงพอสำหรับกราฟ',
                                      textAlign: TextAlign.center,
                                    ),
                                  ),
                                )
                              else
                                SizedBox(
                                  height: 250,
                                  child: LineChart(_chartData(chartSamples)),
                                ),
                              const SizedBox(height: 16),
                              Wrap(
                                spacing: 8,
                                runSpacing: 8,
                                children: [
                                  _ChartSummary(
                                    label: 'ล่าสุด',
                                    value: latestValue,
                                    unit: _unit,
                                    color: _metricColor,
                                  ),
                                  _ChartSummary(
                                    label: 'สูงสุด',
                                    value: maximumValue,
                                    unit: _unit,
                                    color: AppColor.orange,
                                  ),
                                  _ChartSummary(
                                    label: 'ต่ำสุด',
                                    value: minimumValue,
                                    unit: _unit,
                                    color: AppColor.blue,
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'รายการล่าสุด',
                        style: Theme.of(context).textTheme.titleMedium
                            ?.copyWith(
                              color: AppColor.primary,
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                      const SizedBox(height: 8),
                      if (filteredHistory.isEmpty)
                        const Card(
                          color: Colors.white,
                          child: Padding(
                            padding: EdgeInsets.all(20),
                            child: Text('ยังไม่มีข้อมูลย้อนหลัง'),
                          ),
                        ),
                      ...filteredHistory.reversed
                          .take(50)
                          .map(
                            (entry) => Card(
                              color: Colors.white,
                              child: ListTile(
                                leading: Icon(
                                  Icons.show_chart,
                                  color: _metricColor,
                                ),
                                title: Text(
                                  '${_asDouble(entry[_selectedMetric]).toStringAsFixed(1)} $_unit',
                                ),
                                subtitle: Text(
                                  _formatTimestamp(entry['timestamp']),
                                ),
                                trailing: Text(
                                  deviceSensorLabel(entry['sensor']),
                                ),
                              ),
                            ),
                          ),
                    ],
                  );
                },
              );
            },
          );
        },
      ),
    );
  }

  double _asDouble(dynamic value) {
    if (value is num) return value.toDouble();
    return double.tryParse(value?.toString() ?? '') ?? 0;
  }

  LineChartData _chartData(List<Map<String, dynamic>> entries) {
    final spots = entries.map((entry) {
      final timestamp = (entry['timestamp'] as num).toInt();
      final x = timestamp / Duration.millisecondsPerHour;
      return FlSpot(x, _asDouble(entry[_selectedMetric]));
    }).toList();
    spots.sort((a, b) => a.x.compareTo(b.x));
    final values = spots.map((spot) => spot.y).toList();
    final dataMin = values.reduce((a, b) => a < b ? a : b);
    final dataMax = values.reduce((a, b) => a > b ? a : b);
    final valueRange = dataMax - dataMin;
    final padding = valueRange == 0
        ? (dataMax.abs() * 0.08).clamp(1, 10).toDouble()
        : valueRange * 0.15;
    final minY = dataMin - padding;
    final maxY = dataMax + padding;
    final yInterval = (maxY - minY) / 4;
    final firstTimestamp = spots.first.x;
    final lastTimestamp = spots.last.x;
    final dataDurationHours = lastTimestamp - firstTimestamp;
    final xPadding = dataDurationHours == 0
        ? 1 / Duration.minutesPerHour
        : dataDurationHours * 0.05;
    final minX = firstTimestamp - xPadding;
    final maxX = lastTimestamp + xPadding;
    final xInterval = (maxX - minX) / 4;

    return LineChartData(
      minX: minX,
      maxX: maxX,
      minY: minY,
      maxY: maxY,
      gridData: FlGridData(
        show: true,
        drawVerticalLine: false,
        horizontalInterval: yInterval,
        getDrawingHorizontalLine: (_) => FlLine(
          color: AppColor.border.withValues(alpha: 0.75),
          strokeWidth: 1,
        ),
      ),
      borderData: FlBorderData(show: false),
      titlesData: FlTitlesData(
        topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        rightTitles: const AxisTitles(
          sideTitles: SideTitles(showTitles: false),
        ),
        leftTitles: AxisTitles(
          axisNameWidget: Text(
            _unit,
            style: const TextStyle(color: AppColor.secondaryText, fontSize: 11),
          ),
          sideTitles: SideTitles(
            showTitles: true,
            reservedSize: 42,
            interval: yInterval,
            getTitlesWidget: (value, meta) => SideTitleWidget(
              axisSide: meta.axisSide,
              space: 8,
              child: Text(
                value.toStringAsFixed(1),
                style: const TextStyle(
                  color: AppColor.secondaryText,
                  fontSize: 10,
                ),
              ),
            ),
          ),
        ),
        bottomTitles: AxisTitles(
          sideTitles: SideTitles(
            showTitles: true,
            reservedSize: 34,
            interval: xInterval,
            getTitlesWidget: (value, meta) {
              final time = DateTime.fromMillisecondsSinceEpoch(
                (value * Duration.millisecondsPerHour).round(),
              );
              final format = _rangeDuration <= const Duration(days: 1)
                  ? 'HH:mm'
                  : 'dd/MM HH:mm';
              return SideTitleWidget(
                axisSide: meta.axisSide,
                space: 8,
                child: Text(
                  DateFormat(format).format(time),
                  style: const TextStyle(
                    color: AppColor.secondaryText,
                    fontSize: 10,
                  ),
                ),
              );
            },
          ),
        ),
      ),
      lineTouchData: LineTouchData(
        handleBuiltInTouches: true,
        touchTooltipData: LineTouchTooltipData(
          getTooltipItems: (touchedSpots) => touchedSpots.map((spot) {
            final time = DateTime.fromMillisecondsSinceEpoch(
              (spot.x * Duration.millisecondsPerHour).round(),
            );
            return LineTooltipItem(
              '${DateFormat('dd/MM HH:mm').format(time)}\n'
              '${spot.y.toStringAsFixed(1)} $_unit',
              const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w600,
                fontSize: 12,
              ),
            );
          }).toList(),
        ),
      ),
      lineBarsData: [
        LineChartBarData(
          spots: spots,
          color: _metricColor,
          isCurved: false,
          barWidth: 2.5,
          dotData: FlDotData(
            show: spots.length < 24,
            getDotPainter: (spot, percent, barData, index) =>
                FlDotCirclePainter(
                  radius: 3,
                  color: _metricColor,
                  strokeWidth: 1.5,
                  strokeColor: Colors.white,
                ),
          ),
          belowBarData: BarAreaData(
            show: true,
            color: _metricColor.withValues(alpha: 0.1),
          ),
        ),
      ],
    );
  }

  String _rangeLabel(String range) => switch (range) {
    '3d' => '3 วันล่าสุด',
    '7d' => '7 วันล่าสุด',
    '30d' => '30 วันล่าสุด',
    _ => '24 ชั่วโมงล่าสุด',
  };

  String _formatTimestamp(dynamic value) {
    final milliseconds = value is num ? value.toInt() : 0;
    if (milliseconds <= 0) return 'ไม่ทราบเวลา';
    return DateFormat(
      'dd/MM/yyyy, HH:mm',
    ).format(DateTime.fromMillisecondsSinceEpoch(milliseconds));
  }

  String deviceSensorLabel(dynamic sensor) => sensor == 'pzem'
      ? 'PZEM'
      : sensor == 'dht22'
      ? 'DHT22'
      : 'Sensor';
}

class _ChartSummary extends StatelessWidget {
  const _ChartSummary({
    required this.label,
    required this.value,
    required this.unit,
    required this.color,
  });

  final String label;
  final double? value;
  final String unit;
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
    decoration: BoxDecoration(
      color: color.withValues(alpha: 0.08),
      borderRadius: BorderRadius.circular(12),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(color: AppColor.secondaryText, fontSize: 11),
        ),
        const SizedBox(height: 3),
        Text(
          value == null ? '--' : '${value!.toStringAsFixed(1)} $unit',
          style: TextStyle(
            color: color,
            fontWeight: FontWeight.w700,
            fontSize: 13,
          ),
        ),
      ],
    ),
  );
}

class _HistoryMessage extends StatelessWidget {
  const _HistoryMessage(this.message);

  final String message;

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Text(message, textAlign: TextAlign.center),
    ),
  );
}
