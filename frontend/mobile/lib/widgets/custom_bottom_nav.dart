import 'package:flutter/material.dart';
import '../theme/app_color.dart';

class CustomBottomNav extends StatelessWidget {
  final int currentIndex;
  final Function(int) onTap;

  const CustomBottomNav({
    super.key,
    required this.currentIndex,
    required this.onTap,
  });

  Widget _buildItem({
    required IconData icon,
    required String title,
    required bool selected,
    required VoidCallback onPressed,
  }) {
    return Expanded(
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onPressed,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 10),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                icon,
                size: 28,
                color: selected ? AppColor.primary : Colors.grey,
              ),

              const SizedBox(height: 5),

              Text(
                title,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: selected ? FontWeight.bold : FontWeight.w500,
                  color: selected ? AppColor.primary : Colors.grey,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Container(
        margin: const EdgeInsets.all(15),

        padding: const EdgeInsets.symmetric(vertical: 6),

        decoration: BoxDecoration(
          color: Colors.white,

          borderRadius: BorderRadius.circular(25),

          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: .12),
              blurRadius: 15,
              offset: const Offset(0, 5),
            ),
          ],
        ),

        child: Row(
          children: [
            _buildItem(
              icon: Icons.home_rounded,
              title: "หน้าหลัก",
              selected: currentIndex == 0,
              onPressed: () => onTap(0),
            ),

            _buildItem(
              icon: Icons.history_rounded,
              title: "ประวัติ",
              selected: currentIndex == 1,
              onPressed: () => onTap(1),
            ),

            _buildItem(
              icon: Icons.notifications_rounded,
              title: "แจ้งเตือน",
              selected: currentIndex == 2,
              onPressed: () => onTap(2),
            ),

            _buildItem(
              icon: Icons.settings_rounded,
              title: "ตั้งค่า",
              selected: currentIndex == 3,
              onPressed: () => onTap(3),
            ),
          ],
        ),
      ),
    );
  }
}
