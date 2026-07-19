import 'package:flutter/material.dart';

import '../models/room_model.dart';
import '../theme/app_color.dart';
import '../widgets/info_card.dart';
import '../widgets/room_card.dart';
import '../widgets/custom_bottom_nav.dart';
import 'history_screen.dart';

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
    final rooms = [
      RoomModel(
        roomName: 'Room A',
        floor: 'ตึก 1 ชั้น 2',
        online: true,
        temperature: 24.8,
        humidity: 38,
      ),
      RoomModel(
        roomName: 'Room B',
        floor: 'ตึก 1 ชั้น 2',
        online: true,
        temperature: 24.8,
        humidity: 38,
      ),
      RoomModel(
        roomName: 'Room C',
        floor: 'ตึก 1 ชั้น 4',
        online: true,
        temperature: 24.8,
        humidity: 38,
      ),
      RoomModel(
        roomName: 'Room D',
        floor: 'ตึก 1 ชั้น 5',
        online: false,
        temperature: 24.8,
        humidity: 38,
      ),
    ];

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
          const Row(
            children: [
              InfoCard(
                icon: Icons.thermostat,
                value: '26.8°',
                label: 'เฉลี่ย',
                valueColor: AppColor.orange,
              ),
              InfoCard(
                icon: Icons.water_drop,
                value: '48%',
                label: 'เฉลี่ย',
                valueColor: AppColor.blue,
              ),
              InfoCard(
                icon: Icons.bolt,
                value: '7.5 K',
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
          ...rooms.map((room) => RoomCard(room: room)).toList(),
        ],
      ),
    );
  }
}