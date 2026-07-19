import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';

import '../theme/app_color.dart';
import '../widgets/custom_bottom_nav.dart';
import '../services/db_service.dart';

import 'package:firebase_database/firebase_database.dart';
import 'package:intl/intl.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {

  String room = "Room A";

  int selected = 0;

  List<String> devices = [];
  List<Map<String, dynamic>> history = [];

  @override
  void initState() {
    super.initState();
    _loadDevices();
    _loadHistory();
  }

  Future<void> _loadDevices() async {
    try {
      final snapshot = await DBService.devicesRef.get();
      if (snapshot.exists && snapshot.value != null) {
        final data = snapshot.value as Map<dynamic, dynamic>;
        setState(() {
          devices = data.keys.map((k) => k.toString()).toList();
          if (devices.isNotEmpty) room = devices[0];
        });
        _loadHistory();
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('ไม่สามารถโหลดอุปกรณ์: ตรวจสอบสิทธิ์ RTDB')),
      );
    }
  }

  Future<void> _loadHistory() async {
    if (room.isEmpty) return;
    final list = await DBService.getHistory(room, limit: 24);
    setState(() {
      history = list;
    });
  }

  @override
  Widget build(BuildContext context) {

    return Scaffold(

      backgroundColor: Colors.white,

      appBar: AppBar(

        backgroundColor: Colors.white,
        elevation: 0,

        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [

            Text(
              "Data History",
              style: TextStyle(
                fontSize: 26,
                fontWeight: FontWeight.bold,
                color: AppColor.primary,
              ),
            ),

            Text(
              "ประวัติข้อมูล",
              style: TextStyle(
                fontSize: 13,
                color: Colors.grey,
              ),
            ),

          ],
        ),

        actions: [

          Stack(
            children: [

              IconButton(
                onPressed: () {},
                icon: const Icon(Icons.notifications_none),
              ),

              Positioned(
                right: 10,
                top: 10,
                child: Container(
                  width: 16,
                  height: 16,
                  decoration: const BoxDecoration(
                    color: Colors.red,
                    shape: BoxShape.circle,
                  ),
                  child: const Center(
                    child: Text(
                      "2",
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 9,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          )
        ],

        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(2),
          child: Divider(
            thickness: 2,
            color: Colors.grey.shade400,
            height: 2,
          ),
        ),
      ),

      body: ListView(

        padding: const EdgeInsets.all(16),

        children: [

          const Text(
            "เลือกห้อง",
            style: TextStyle(fontWeight: FontWeight.bold),
          ),

          const SizedBox(height: 8),

          DropdownButtonFormField(

            value: room,
            decoration: InputDecoration(

              filled: true,
              fillColor: Colors.grey.shade300,

              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),

            items: devices.isEmpty
                ? [
                    const DropdownMenuItem(
                      value: 'Room A',
                      child: Text('Room A'),
                    )
                  ]
                : devices
                    .map((d) => DropdownMenuItem(
                          value: d,
                          child: Text(d),
                        ))
                    .toList(),

            onChanged: (value) async {
              setState(() {
                room = value!;
              });
              await _loadHistory();
            },
          ),

          const SizedBox(height: 15),

          Row(

            children: [

              Expanded(
                child: _button(
                    "อุณหภูมิ",
                    0,
                    AppColor.orange),
              ),

              const SizedBox(width: 10),

              Expanded(
                child: _button(
                    "ความชื้น",
                    1,
                    AppColor.blue),
              ),

              const SizedBox(width: 10),

              Expanded(
                child: _button(
                    "การใช้ไฟ",
                    2,
                    AppColor.purple),
              ),

            ],
          ),

          const SizedBox(height: 20),

          Container(

            height: 260,

            padding: const EdgeInsets.all(15),

            decoration: BoxDecoration(

              borderRadius: BorderRadius.circular(20),

              border: Border.all(
                color: AppColor.border,
              ),
            ),

            child: LineChart(

              LineChartData(

                borderData: FlBorderData(show: true),

                titlesData: FlTitlesData(show: true),

                lineBarsData: [

                  LineChartBarData(

                    spots: history.asMap().entries.map((e) {
                      final i = e.key.toDouble();
                      final item = e.value;
                      final t = item['temperature'] != null
                          ? (double.tryParse(item['temperature'].toString()) ?? 0.0)
                          : 0.0;
                      return FlSpot(i, t);
                    }).toList(),

                    isCurved: true,

                    dotData: FlDotData(show: false),

                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 20),

          Container(

            decoration: BoxDecoration(

              border: Border.all(color: AppColor.border),

              borderRadius: BorderRadius.circular(20),
            ),

            child: DataTable(

              columns: const [

                DataColumn(label: Text("เวลา")),

                DataColumn(label: Text("อุณหภูมิ")),

                DataColumn(label: Text("ความชื้น")),

                DataColumn(label: Text("การใช้ไฟ")),
              ],

              rows: history.isEmpty
                  ? List.generate(
                      5,
                      (index) => const DataRow(
                        cells: [
                          DataCell(Text("--")),
                          DataCell(Text("--")),
                          DataCell(Text("--")),
                          DataCell(Text("--")),
                        ],
                      ),
                    )
                  : history.reversed.map((item) {
                      final ts = item['ts'] ?? item['key'];
                      final date = DateTime.tryParse(ts.toString()) ??
                          DateTime.fromMillisecondsSinceEpoch(
                              int.tryParse(ts.toString()) ?? 0);
                      final timeLabel = DateFormat.Hm().format(date);
                      final temp = item['temperature']?.toString() ?? '--';
                      final hum = item['humidity']?.toString() ?? '--';
                      final watt = item['w']?.toString() ?? '--';
                      return DataRow(cells: [
                        DataCell(Text(timeLabel)),
                        DataCell(Text('$temp°C')),
                        DataCell(Text('$hum%')),
                        DataCell(Text('$watt W')),
                      ]);
                    }).toList(),
            ),
          )

        ],
      ),

      // Bottom navigation controlled by parent DashboardScreen
    );
  }

  Widget _button(String text,int index,Color color){

    bool active = selected==index;

    return ElevatedButton(

      style: ElevatedButton.styleFrom(

        elevation: active?4:0,

        backgroundColor:
        active?color:Colors.white,

        foregroundColor:
        active?Colors.white:color,

        side: BorderSide(color: color),

        shape: RoundedRectangleBorder(

          borderRadius: BorderRadius.circular(12),

        ),
      ),

      onPressed: (){

        setState(() {

          selected=index;

        });

      },

      child: Text(text),
    );
  }

}