import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';

import '../theme/app_color.dart';
import '../widgets/custom_bottom_nav.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {

  String room = "Room A";

  int selected = 0;

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

            items: const [

              DropdownMenuItem(
                value: "Room A",
                child: Text("Room A"),
              ),

              DropdownMenuItem(
                value: "Room B",
                child: Text("Room B"),
              ),

              DropdownMenuItem(
                value: "Room C",
                child: Text("Room C"),
              ),
            ],

            onChanged: (value){

              setState(() {

                room = value!;

              });

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

                    spots: const [

                      FlSpot(0,20),

                      FlSpot(4,21),

                      FlSpot(8,24),

                      FlSpot(12,23),

                      FlSpot(16,25),

                      FlSpot(20,22),

                    ],

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

              rows: List.generate(

                10,

                (index)=> const DataRow(

                  cells: [

                    DataCell(Text("00:00")),

                    DataCell(Text("20.3°C")),

                    DataCell(Text("49%")),

                    DataCell(Text("1129W")),

                  ],
                ),
              ),
            ),
          )

        ],
      ),

      bottomNavigationBar: CustomBottomNav(

        currentIndex: 1,

        onTap: (index){},

      ),
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