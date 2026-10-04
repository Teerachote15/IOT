import 'package:flutter/material.dart';
import '../theme/app_color.dart';

class InfoCard extends StatelessWidget {
  final IconData icon;
  final String value;
  final String label;
  final Color valueColor;

  const InfoCard({
    super.key,
    required this.icon,
    required this.value,
    required this.label,
    required this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        height: 120,

        margin: const EdgeInsets.symmetric(horizontal: 5),

        decoration: BoxDecoration(
          color: Colors.white,

          borderRadius: BorderRadius.circular(20),

          border: Border.all(color: AppColor.border),
        ),

        child: Padding(
          padding: const EdgeInsets.all(12),

          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              Icon(icon),

              Text(
                value,
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: valueColor,
                  fontSize: 22,
                ),
              ),

              Text(label),
            ],
          ),
        ),
      ),
    );
  }
}
