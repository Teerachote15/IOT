import 'package:flutter/material.dart';

import '../models/room_model.dart';
import '../theme/app_color.dart';

class RoomCard extends StatelessWidget {

  final RoomModel room;

  const RoomCard({
    super.key,
    required this.room,
  });

  @override
  Widget build(BuildContext context) {

    return Card(

      elevation: 2,

      shape: RoundedRectangleBorder(
        side: const BorderSide(
          color: AppColor.border,
        ),

        borderRadius: BorderRadius.circular(20),
      ),

      child: ListTile(

        leading: CircleAvatar(
          radius: 25,
          backgroundColor: Colors.grey.shade200,
          child: const Icon(Icons.apartment),
        ),

        title: Text(
          room.roomName,
          style: const TextStyle(
            fontWeight: FontWeight.bold,
          ),
        ),

        subtitle: Text(room.floor),

        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,

          crossAxisAlignment: CrossAxisAlignment.end,

          children: [

            Text(
              room.online
                  ? "● Online"
                  : "● Offline",

              style: TextStyle(
                color: room.online
                    ? AppColor.green
                    : AppColor.red,

                fontWeight: FontWeight.bold,
              ),
            ),

            const SizedBox(height: 4),

            Text(
              "${room.temperature}° / ${room.humidity}%",
            )
          ],
        ),
      ),
    );
  }
}