import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart'; // Import FirebaseAuth
import 'package:intl/intl.dart';
import '../main.dart'; // For primaryColor

class DashboardScreen extends StatefulWidget {
  final Function(int) onTabChange;

  const DashboardScreen({super.key, required this.onTabChange});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final currencyFormat = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);

  @override
  Widget build(BuildContext context) {
    final String? agentId = FirebaseAuth.instance.currentUser?.uid;

    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Agent Dashboard',
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(color: primaryColor),
          ),
          const SizedBox(height: 20),
          Expanded(
            child: GridView.count(
              crossAxisCount: 2,
              crossAxisSpacing: 16,
              mainAxisSpacing: 16,
              children: [
                _buildDashboardCard(
                  context,
                  'Total Properties',
                  FirebaseFirestore.instance.collection('properties').snapshots(),
                  (snapshot) => snapshot.docs.length.toString(),
                  () => widget.onTabChange(1), // Switch to Properties tab
                ),
                _buildDashboardCard(
                  context,
                  'Total Clients',
                  agentId == null
                      ? Stream.empty()
                      : FirebaseFirestore.instance.collection('clients').where('agentId', isEqualTo: agentId).snapshots(),
                  (snapshot) => snapshot.docs.length.toString(),
                  () => widget.onTabChange(2), // Switch to Clients tab
                ),
                _buildDashboardCard(
                  context,
                  'Plots Sold',
                  agentId == null
                      ? Stream.empty()
                      : FirebaseFirestore.instance.collection('transactions').where('agentId', isEqualTo: agentId).snapshots(),
                  (snapshot) => snapshot.docs.length.toString(),
                  () => widget.onTabChange(3), // Switch to Transactions tab
                ),
                _buildCommissionCard(
                  context,
                  'Total Commission',
                  agentId == null
                      ? Stream.empty()
                      : FirebaseFirestore.instance.collection('commissions').where('agentId', isEqualTo: agentId).snapshots(),
                  () => widget.onTabChange(4), // Switch to Commissions tab
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDashboardCard(
    BuildContext context,
    String title,
    Stream<QuerySnapshot> stream,
    String Function(QuerySnapshot) dataExtractor,
    VoidCallback? onTap,
  ) {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10), // Match Card's shape
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                title,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(color: primaryColor),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 10),
              StreamBuilder<QuerySnapshot>(
                stream: stream,
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const CircularProgressIndicator();
                  }
                  if (snapshot.hasError) {
                    return Text('Error: ${snapshot.error}');
                  }
                  if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
                    return Text('0', style: Theme.of(context).textTheme.displaySmall);
                  }
                  return Text(
                    dataExtractor(snapshot.data!),
                    style: Theme.of(context).textTheme.displaySmall?.copyWith(color: primaryColor),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCommissionCard(
    BuildContext context,
    String title,
    Stream<QuerySnapshot> stream,
    VoidCallback? onTap,
  ) {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Padding(
          padding: const EdgeInsets.all(12.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.account_balance_wallet, color: primaryColor, size: 28),
              const SizedBox(height: 6),
              Text(
                title,
                style: Theme.of(context).textTheme.titleSmall?.copyWith(color: primaryColor),
                textAlign: TextAlign.center,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 8),
              StreamBuilder<QuerySnapshot>(
                stream: stream,
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    );
                  }
                  if (snapshot.hasError) {
                    return Text('Error', style: TextStyle(fontSize: 11, color: Colors.red));
                  }
                  if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
                    return Column(
                      children: [
                        FittedBox(
                          fit: BoxFit.scaleDown,
                          child: Text(
                            '₹0',
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              color: primaryColor,
                              fontWeight: FontWeight.bold,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Remaining',
                          style: TextStyle(fontSize: 10, color: Colors.white60),
                        ),
                      ],
                    );
                  }

                  // Calculate total remaining commission
                  double totalRemaining = 0;
                  for (var doc in snapshot.data!.docs) {
                    final data = doc.data() as Map<String, dynamic>;
                    totalRemaining += (data['remainingAmount'] ?? 0).toDouble();
                  }

                  // Format large amounts in lakhs/crores for compact display
                  String formattedAmount;
                  if (totalRemaining >= 10000000) { // 1 Crore or more
                    formattedAmount = '₹${(totalRemaining / 10000000).toStringAsFixed(2)}Cr';
                  } else if (totalRemaining >= 100000) { // 1 Lakh or more
                    formattedAmount = '₹${(totalRemaining / 100000).toStringAsFixed(2)}L';
                  } else {
                    formattedAmount = currencyFormat.format(totalRemaining);
                  }

                  return Column(
                    children: [
                      FittedBox(
                        fit: BoxFit.scaleDown,
                        child: Text(
                          formattedAmount,
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            color: primaryColor,
                            fontWeight: FontWeight.bold,
                          ),
                          textAlign: TextAlign.center,
                          maxLines: 1,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Remaining',
                        style: TextStyle(fontSize: 10, color: Colors.white60),
                      ),
                    ],
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}


