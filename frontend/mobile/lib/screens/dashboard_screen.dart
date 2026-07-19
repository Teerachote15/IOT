import 'package:flutter/material.dart';

import '../models/room_model.dart';
import '../theme/app_color.dart';
import '../widgets/info_card.dart';
import '../widgets/room_card.dart';
import '../widgets/custom_bottom_nav.dart';
import 'history_screen.dart';
import '../services/db_service.dart';
import 'package:firebase_database/firebase_database.dart';

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
    DashboardContent(),
    DashboardContent(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: _pages[_selectedIndex],
      bottomNavigationBar: CustomBottomNav(
        currentIndex: _selectedIndex,
        onTap: (index) {
          setState(() {
            _selectedIndex = index;
          });
        },
      ),
    );
  }
}

class DashboardContent extends StatelessWidget {
  const DashboardContent({super.key});

  @override
  Widget build(BuildContext context) {
    // Live devices stream from RTDB
    return StreamBuilder<DatabaseEvent>(
      stream: DBService.devicesStream(),
      builder: (context, snapshot) {
        List<RoomModel> rooms = [];
        double avgTemp = 0;
        double avgHum = 0;

        if (snapshot.hasData && snapshot.data!.snapshot.value != null) {
          final value = snapshot.data!.snapshot.value as Map<dynamic, dynamic>;
          int count = 0;
          value.forEach((key, v) {
            if (v is Map) {
              final last = v['last'] ?? v['last_command'] ?? v;
              double t = 0;
              double h = 0;
              bool online = true;
              if (last is Map) {
                t = (last['temperature'] != null)
                    ? double.tryParse(last['temperature'].toString()) ?? 0
                    : 0;
                h = (last['humidity'] != null)
                    ? double.tryParse(last['humidity'].toString()) ?? 0
                    : 0;
              }

              rooms.add(RoomModel(
                roomName: key.toString(),
                floor: '-',
                online: online,
                temperature: t,
                humidity: h,
              ));

              avgTemp += t;
              avgHum += h;
              count++;
            }
          });

          if (count > 0) {
            avgTemp = avgTemp / count;
            avgHum = avgHum / count;
          }
        }

        return Scaffold(
          backgroundColor: Colors.white,
          appBar: AppBar(
            backgroundColor: Colors.white,
            elevation: 0,
            title: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'FACILITY OVERVIEW',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey,
                  ),
                ),
                SizedBox(height: 2),
                Text(
                  'Dashboard',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            bottom: PreferredSize(
              preferredSize: const Size.fromHeight(1),
              child: Container(
                color: Colors.black38,
                height: 2,
              ),
            ),
          ),
          body: ListView(
            padding: const EdgeInsets.all(15),
            children: [
              Row(
                children: [
                  InfoCard(
                    icon: Icons.thermostat,
                    value: '${avgTemp.toStringAsFixed(1)}°',
                    label: 'เฉลี่ย',
                    valueColor: AppColor.orange,
                  ),
                  InfoCard(
                    icon: Icons.water_drop,
                    value: '${avgHum.toStringAsFixed(0)}%',
                    label: 'เฉลี่ย',
                    valueColor: AppColor.blue,
                  ),
                  const InfoCard(
                    icon: Icons.bolt,
                    value: '—',
                    label: 'W รวม',
                    valueColor: AppColor.purple,
                  ),
                ],
              ),
              const SizedBox(height: 20),
              Container(
                height: 170,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppColor.border),
                ),
                child: const Center(
                  child: Text('Chart'),
                ),
              ),
              const SizedBox(height: 20),
              ...rooms.map((room) => RoomCard(room: room)),
            ],
          ),
        );
      },
    );
  }
}