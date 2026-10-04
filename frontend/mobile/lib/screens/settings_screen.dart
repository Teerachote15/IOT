import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_database/firebase_database.dart';
import 'package:flutter/material.dart';

import '../services/db_service.dart';
import '../theme/app_color.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _oldPasswordController = TextEditingController();
  final _newPasswordController = TextEditingController();
  bool _changingPassword = false;

  @override
  void dispose() {
    _oldPasswordController.dispose();
    _newPasswordController.dispose();
    super.dispose();
  }

  Future<void> _changePassword() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null || user.email == null) return;
    final oldPassword = _oldPasswordController.text;
    final newPassword = _newPasswordController.text;
    if (oldPassword.isEmpty || newPassword.length < 6) {
      _showMessage('กรอกรหัสผ่านเดิมและรหัสผ่านใหม่อย่างน้อย 6 ตัวอักษร');
      return;
    }

    setState(() => _changingPassword = true);
    try {
      final credential = EmailAuthProvider.credential(
        email: user.email!,
        password: oldPassword,
      );
      await user.reauthenticateWithCredential(credential);
      await user.updatePassword(newPassword);
      _oldPasswordController.clear();
      _newPasswordController.clear();
      _showMessage('เปลี่ยนรหัสผ่านเรียบร้อย');
    } on FirebaseAuthException catch (error) {
      final message = switch (error.code) {
        'wrong-password' || 'invalid-credential' => 'รหัสผ่านเดิมไม่ถูกต้อง',
        'weak-password' => 'รหัสผ่านใหม่ไม่ปลอดภัยพอ',
        'requires-recent-login' => 'กรุณาออกจากระบบแล้วเข้าสู่ระบบใหม่',
        _ => error.message ?? 'เปลี่ยนรหัสผ่านไม่สำเร็จ',
      };
      _showMessage(message);
    } catch (error) {
      _showMessage('เปลี่ยนรหัสผ่านไม่สำเร็จ: $error');
    } finally {
      if (mounted) setState(() => _changingPassword = false);
    }
  }

  Future<void> _signOut() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('ออกจากระบบ'),
        content: const Text('ต้องการออกจากระบบใช่หรือไม่?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('ยกเลิก'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('ออกจากระบบ'),
          ),
        ],
      ),
    );
    if (confirm == true) await FirebaseAuth.instance.signOut();
  }

  void _showMessage(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  List<String> _roomNames(DataSnapshot snapshot) {
    final value = snapshot.child('rooms').value;
    if (value is List) return value.whereType<String>().toList();
    if (value is Map) return value.values.whereType<String>().toList();
    return [];
  }

  @override
  Widget build(BuildContext context) {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return const SizedBox.shrink();

    return Scaffold(
      backgroundColor: AppColor.background,
      appBar: AppBar(title: const Text('ตั้งค่า')),
      body: StreamBuilder<DatabaseEvent>(
        stream: DBService.profileStream(user.uid),
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text('โหลดข้อมูลบัญชีไม่สำเร็จ: ${snapshot.error}'),
              ),
            );
          }
          if (!snapshot.hasData) {
            return const Center(child: CircularProgressIndicator());
          }

          final profile = snapshot.data!.snapshot;
          final displayName = profile.child('name').value?.toString().trim();
          final name = displayName == null || displayName.isEmpty
              ? user.displayName ?? 'พนักงาน'
              : displayName;
          final role = profile.child('role').value?.toString() ?? 'พนักงาน';
          final rooms = _roomNames(profile);

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Card(
                color: Colors.white,
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 28,
                        backgroundColor: const Color(0xffeef2ff),
                        foregroundColor: AppColor.primary,
                        child: Text(name.characters.first.toUpperCase()),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              name,
                              style: Theme.of(context).textTheme.titleMedium
                                  ?.copyWith(
                                    color: AppColor.primary,
                                    fontWeight: FontWeight.w700,
                                  ),
                            ),
                            Text(user.email ?? ''),
                            Text(
                              role,
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Card(
                color: Colors.white,
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'ห้องที่ได้รับมอบหมาย',
                        style: Theme.of(context).textTheme.titleMedium
                            ?.copyWith(
                              color: AppColor.primary,
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                      const SizedBox(height: 10),
                      if (rooms.isEmpty)
                        const Text('ยังไม่มีการกำหนดห้อง')
                      else
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: rooms
                              .map(
                                (room) => Chip(
                                  avatar: const Icon(
                                    Icons.meeting_room_outlined,
                                    size: 18,
                                  ),
                                  label: Text(room),
                                ),
                              )
                              .toList(),
                        ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Card(
                color: Colors.white,
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'เปลี่ยนรหัสผ่าน',
                        style: Theme.of(context).textTheme.titleMedium
                            ?.copyWith(
                              color: AppColor.primary,
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _oldPasswordController,
                        obscureText: true,
                        decoration: const InputDecoration(
                          labelText: 'รหัสผ่านเดิม',
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _newPasswordController,
                        obscureText: true,
                        decoration: const InputDecoration(
                          labelText: 'รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)',
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 14),
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton(
                          onPressed: _changingPassword ? null : _changePassword,
                          child: Text(
                            _changingPassword
                                ? 'กำลังบันทึก...'
                                : 'เปลี่ยนรหัสผ่าน',
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              OutlinedButton.icon(
                onPressed: _signOut,
                icon: const Icon(Icons.logout),
                label: const Text('ออกจากระบบ'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.red.shade700,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
