class RoomModel {
  final String roomName;
  final String floor;
  final bool online;
  final double temperature;
  final double humidity;

  RoomModel({
    required this.roomName,
    required this.floor,
    required this.online,
    required this.temperature,
    required this.humidity,
  });
}
