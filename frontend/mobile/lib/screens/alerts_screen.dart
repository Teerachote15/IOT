import 'package:flutter/material.dart';

import '../theme/app_color.dart';

class AlertsScreen extends StatelessWidget {
  const AlertsScreen({super.key});

  Widget _alertCard({
    required IconData icon,
    required Color iconBg,
    required String title,
    required String subtitle,
    required String message,
    required Color borderColor,
    required bool unread,
    VoidCallback? onClose,
  }) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: borderColor, width: 2),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: iconBg,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: Colors.white),
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
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    if (unread)
                      Container(
                        margin: const EdgeInsets.only(left: 6),
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColor.primary,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Text(
                          'ใหม่',
                          style: TextStyle(color: Colors.white, fontSize: 12),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: const TextStyle(color: Colors.grey),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                  decoration: BoxDecoration(
                    color: borderColor.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    message,
                    style: TextStyle(color: borderColor),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(width: 8),

          InkWell(
            onTap: onClose,
            child: const Icon(Icons.close_rounded, color: Colors.grey),
          ),
        ],
      ),
    );
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
              'การแจ้งเตือน',
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey,
              ),
            ),
            SizedBox(height: 2),
            Text(
              'Alerts',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Colors.black,
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
        padding: const EdgeInsets.all(16),
        children: [
          const Text('ยังไม่ได้อ่าน', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),

          _alertCard(
            icon: Icons.thermostat,
            iconBg: AppColor.orange,
            title: 'Room A',
            subtitle: 'ตึก 1 ชั้น 2',
            message: 'อุณหภูมิ 29.8°C เกินค่า 28°C',
            borderColor: AppColor.red,
            unread: true,
            onClose: () {},
          ),

          _alertCard(
            icon: Icons.water_drop,
            iconBg: AppColor.blue,
            title: 'Room C',
            subtitle: 'ตึก 1 ชั้น 4',
            message: 'ความชื้น ...% เกินค่า ...% ',
            borderColor: AppColor.orange,
            unread: true,
            onClose: () {},
          ),

          const SizedBox(height: 20),

          const Text('อ่านแล้ว', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.grey)),
          const SizedBox(height: 8),

          Opacity(
            opacity: 0.6,
            child: _alertCard(
              icon: Icons.thermostat,
              iconBg: Colors.grey,
              title: 'Room B',
              subtitle: 'ตึก 1 ชั้น 2',
              message: 'อุณหภูมิ 29.8°C เกินค่า 28°C',
              borderColor: AppColor.border,
              unread: false,
              onClose: () {},
            ),
          ),

          Opacity(
            opacity: 0.6,
            child: _alertCard(
              icon: Icons.water_drop,
              iconBg: Colors.grey,
              title: 'Room C',
              subtitle: 'ตึก 1 ชั้น 4',
              message: 'ความชื้น ...% เกินค่า ...% ',
              borderColor: AppColor.border,
              unread: false,
              onClose: () {},
            ),
          ),
        ],
      ),
    );
  }
}
