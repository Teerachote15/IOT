import 'package:flutter/material.dart';

import 'dashboard_screen.dart';
import 'package:firebase_auth/firebase_auth.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {

  bool hidePassword = true;

  final TextEditingController emailController = TextEditingController();
  final TextEditingController passwordController = TextEditingController();

  @override
  Widget build(BuildContext context) {

    return Scaffold(
      backgroundColor: Colors.white,

      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20),

          child: Column(
            children: [

              const SizedBox(height: 60),

              //-----------------------------------
              // Logo
              //-----------------------------------

              Container(
                width: 90,
                height: 90,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: const [
                    BoxShadow(
                      blurRadius: 8,
                      color: Colors.black26,
                      offset: Offset(0,4),
                    )
                  ],
                ),

                child: const Icon(
                  Icons.wifi,
                  size: 50,
                ),
              ),

              const SizedBox(height: 12),

              Container(
                width: 180,
                height: 45,

                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(30),
                  boxShadow: const [
                    BoxShadow(
                      blurRadius: 6,
                      color: Colors.black26,
                      offset: Offset(0,4),
                    )
                  ],
                ),

                child: const Center(
                  child: Text(
                    "IoT Monitor",
                    style: TextStyle(
                      fontSize: 20,
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 60),

              //-----------------------------------
              // Email
              //-----------------------------------

              const Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  "E-mail",
                  style: TextStyle(
                    fontSize: 30,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),

              const SizedBox(height: 10),

              TextField(
                controller: emailController,

                decoration: InputDecoration(

                  filled: true,
                  fillColor: Colors.grey.shade300,

                  hintText: "โปรดกรอกข้อมูล ชื่อ อีเมลผู้ใช้",

                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),

              const SizedBox(height: 40),

              //-----------------------------------
              // Password
              //-----------------------------------

              const Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  "Password",
                  style: TextStyle(
                    fontSize: 30,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),

              const SizedBox(height: 10),

              TextField(

                controller: passwordController,
                obscureText: hidePassword,

                decoration: InputDecoration(

                  filled: true,
                  fillColor: Colors.grey.shade300,

                  hintText: "โปรดกรอกข้อมูล รหัสผ่านผู้ใช้",

                  suffixIcon: IconButton(
                    icon: Icon(
                      hidePassword
                          ? Icons.visibility
                          : Icons.visibility_off,
                    ),
                    onPressed: () {
                      setState(() {
                        hidePassword = !hidePassword;
                      });
                    },
                  ),

                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),

              const SizedBox(height: 120),

              //-----------------------------------
              // Login Button
              //-----------------------------------

              SizedBox(
                width: 250,
                height: 55,

                child: ElevatedButton(

                  onPressed: () async {
                    final email = emailController.text.trim();
                    final password = passwordController.text.trim();
                    try {
                      await FirebaseAuth.instance.signInWithEmailAndPassword(
                        email: email,
                        password: password,
                      );
                      Navigator.pushReplacement(
                        context,
                        MaterialPageRoute(builder: (context) => DashboardScreen()),
                      );
                    } on FirebaseAuthException catch (e) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(e.message ?? 'Login failed')),
                      );
                    }
                  },

                  style: ElevatedButton.styleFrom(

                    backgroundColor: const Color(0xff172554),

                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(30),
                    ),

                    elevation: 8,
                  ),

                  child: const Text(
                    "Sign in",
                    style: TextStyle(
                      fontSize: 22,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),

            ],
          ),
        ),
      ),
    );
  }
}