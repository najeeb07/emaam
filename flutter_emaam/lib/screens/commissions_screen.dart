import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../main.dart';
import 'package:intl/intl.dart';

class CommissionsScreen extends StatefulWidget {
  const CommissionsScreen({super.key});

  @override
  State<CommissionsScreen> createState() => _CommissionsScreenState();
}

class _CommissionsScreenState extends State<CommissionsScreen> {
  final String? agentId = FirebaseAuth.instance.currentUser?.uid;
  final currencyFormat = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);

  @override
  Widget build(BuildContext context) {
    if (agentId == null) {
      return const Center(child: Text('Please login to view commissions'));
    }

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Colors.black,
            Colors.black.withOpacity(0.95),
            primaryColor.withOpacity(0.1),
          ],
        ),
      ),
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          title: const Text('My Commissions'),
          backgroundColor: Colors.transparent,
          elevation: 0,
        ),
        body: StreamBuilder<QuerySnapshot>(
          stream: FirebaseFirestore.instance
              .collection('commissions')
              .where('agentId', isEqualTo: agentId)
              .snapshots(),
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }

            if (snapshot.hasError) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(20.0),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.error_outline, size: 80, color: Colors.orange.withOpacity(0.5)),
                      const SizedBox(height: 20),
                      const Text(
                        'Unable to load commissions',
                        style: TextStyle(fontSize: 18, color: Colors.white70),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 10),
                      Text(
                        'Please try again later',
                        style: TextStyle(fontSize: 14, color: Colors.white54),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              );
            }

            if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.account_balance_wallet_outlined, size: 80, color: primaryColor.withOpacity(0.5)),
                    const SizedBox(height: 20),
                    const Text(
                      'No commissions yet',
                      style: TextStyle(fontSize: 18, color: Colors.white70),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      'Commissions will appear here once assigned',
                      style: TextStyle(fontSize: 14, color: Colors.white54),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              );
            }

            // Sort commissions by createdAt in memory (newest first)
            final commissions = snapshot.data!.docs.toList();
            commissions.sort((a, b) {
              final aData = a.data() as Map<String, dynamic>;
              final bData = b.data() as Map<String, dynamic>;
              final aCreatedAt = aData['createdAt'] as Timestamp?;
              final bCreatedAt = bData['createdAt'] as Timestamp?;
              
              if (aCreatedAt == null && bCreatedAt == null) return 0;
              if (aCreatedAt == null) return 1;
              if (bCreatedAt == null) return -1;
              
              return bCreatedAt.compareTo(aCreatedAt);
            });

            // Calculate totals
            double totalCommissionAmount = 0;
            double totalPaidAmount = 0;
            double totalRemainingAmount = 0;

            for (var doc in commissions) {
              final data = doc.data() as Map<String, dynamic>;
              totalCommissionAmount += (data['totalCommission'] ?? 0).toDouble();
              totalPaidAmount += (data['paidAmount'] ?? 0).toDouble();
              totalRemainingAmount += (data['remainingAmount'] ?? 0).toDouble();
            }

            return Column(
              children: [
                // Summary Cards
                Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: _buildSummaryCard(
                              'Total Commission',
                              currencyFormat.format(totalCommissionAmount),
                              Icons.account_balance_wallet,
                              primaryColor,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _buildSummaryCard(
                              'Received',
                              currencyFormat.format(totalPaidAmount),
                              Icons.check_circle,
                              Colors.green,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      _buildSummaryCard(
                        'Remaining',
                        currencyFormat.format(totalRemainingAmount),
                        Icons.pending,
                        Colors.orange,
                        fullWidth: true,
                      ),
                    ],
                  ),
                ),

                // Commission List
                Expanded(
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: commissions.length,
                    itemBuilder: (context, index) {
                      final commission = commissions[index].data() as Map<String, dynamic>;
                      final commissionId = commissions[index].id;
                      return _buildCommissionCard(commission, commissionId);
                    },
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _buildSummaryCard(String title, String value, IconData icon, Color color, {bool fullWidth = false}) {
    return Card(
      elevation: 8,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      color: Colors.black.withOpacity(0.6),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withOpacity(0.3), width: 1),
        ),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: fullWidth ? CrossAxisAlignment.start : CrossAxisAlignment.center,
          children: [
            Row(
              mainAxisAlignment: fullWidth ? MainAxisAlignment.start : MainAxisAlignment.center,
              children: [
                Icon(icon, color: color, size: 28),
                if (fullWidth) const SizedBox(width: 12),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              title,
              style: TextStyle(
                color: Colors.white70,
                fontSize: fullWidth ? 16 : 12,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              value,
              style: TextStyle(
                color: color,
                fontSize: fullWidth ? 28 : 18,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCommissionCard(Map<String, dynamic> commission, String commissionId) {
    final propertyName = commission['propertyName'] ?? 'Unknown Property';
    final plots = commission['plots'] as List<dynamic>? ?? [];
    final plotNumbers = plots.map((p) => p['plotNumber'].toString()).join(', ');
    final totalCommission = (commission['totalCommission'] ?? 0).toDouble();
    final paidAmount = (commission['paidAmount'] ?? 0).toDouble();
    final remainingAmount = (commission['remainingAmount'] ?? 0).toDouble();
    final lastPaymentDate = commission['lastPaymentDate'] as Timestamp?;
    final paymentHistory = commission['paymentHistory'] as List<dynamic>? ?? [];

    final progressPercentage = totalCommission > 0 ? (paidAmount / totalCommission) : 0.0;

    return Card(
      elevation: 6,
      margin: const EdgeInsets.only(bottom: 16),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      color: Colors.black.withOpacity(0.7),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => _showCommissionDetails(commission, commissionId),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: primaryColor.withOpacity(0.2), width: 1),
          ),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: primaryColor.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(Icons.location_city, color: primaryColor, size: 24),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          propertyName,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Plot(s): $plotNumbers',
                          style: TextStyle(
                            fontSize: 14,
                            color: primaryColor.withOpacity(0.9),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              
              // Progress Bar
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Payment Progress',
                        style: TextStyle(fontSize: 12, color: Colors.white70),
                      ),
                      Text(
                        '${(progressPercentage * 100).toStringAsFixed(0)}%',
                        style: TextStyle(fontSize: 12, color: primaryColor, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: LinearProgressIndicator(
                      value: progressPercentage,
                      backgroundColor: Colors.white24,
                      valueColor: AlwaysStoppedAnimation<Color>(primaryColor),
                      minHeight: 8,
                    ),
                  ),
                ],
              ),
              
              const SizedBox(height: 16),
              const Divider(color: Colors.white24, height: 1),
              const SizedBox(height: 16),

              // Commission Details
              Row(
                children: [
                  Expanded(
                    child: _buildDetailItem('Total', currencyFormat.format(totalCommission), Colors.white),
                  ),
                  Expanded(
                    child: _buildDetailItem('Paid', currencyFormat.format(paidAmount), Colors.green),
                  ),
                  Expanded(
                    child: _buildDetailItem('Pending', currencyFormat.format(remainingAmount), Colors.orange),
                  ),
                ],
              ),

              if (lastPaymentDate != null) ...[
                const SizedBox(height: 12),
                Row(
                  children: [
                    Icon(Icons.calendar_today, size: 14, color: Colors.white60),
                    const SizedBox(width: 6),
                    Text(
                      'Last Payment: ${DateFormat('dd MMM yyyy').format(lastPaymentDate.toDate())}',
                      style: const TextStyle(fontSize: 12, color: Colors.white60),
                    ),
                  ],
                ),
              ],

              if (paymentHistory.isNotEmpty) ...[
                const SizedBox(height: 8),
                Row(
                  children: [
                    Icon(Icons.history, size: 14, color: Colors.white60),
                    const SizedBox(width: 6),
                    Text(
                      '${paymentHistory.length} payment(s) received',
                      style: const TextStyle(fontSize: 12, color: Colors.white60),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDetailItem(String label, String value, Color color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 11, color: Colors.white60),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
      ],
    );
  }

  void _showCommissionDetails(Map<String, dynamic> commission, String commissionId) {
    final propertyName = commission['propertyName'] ?? 'Unknown Property';
    final plots = commission['plots'] as List<dynamic>? ?? [];
    final plotNumbers = plots.map((p) => p['plotNumber'].toString()).join(', ');
    final totalCommission = (commission['totalCommission'] ?? 0).toDouble();
    final paidAmount = (commission['paidAmount'] ?? 0).toDouble();
    final remainingAmount = (commission['remainingAmount'] ?? 0).toDouble();
    final paymentHistory = commission['paymentHistory'] as List<dynamic>? ?? [];

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.75,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Colors.black.withOpacity(0.95),
              Colors.black.withOpacity(0.98),
            ],
          ),
          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          border: Border.all(color: primaryColor.withOpacity(0.3), width: 1),
        ),
        child: Column(
          children: [
            // Handle bar
            Container(
              margin: const EdgeInsets.only(top: 12, bottom: 8),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.white38,
                borderRadius: BorderRadius.circular(2),
              ),
            ),

            // Header
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: primaryColor.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(Icons.account_balance_wallet, color: primaryColor, size: 28),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              propertyName,
                              style: const TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                            Text(
                              'Plot(s): $plotNumbers',
                              style: TextStyle(fontSize: 14, color: primaryColor),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // Summary
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.05),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: primaryColor.withOpacity(0.2)),
                    ),
                    child: Column(
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Total Commission:', style: TextStyle(color: Colors.white70)),
                            Text(
                              currencyFormat.format(totalCommission),
                              style: TextStyle(
                                color: primaryColor,
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                        const Divider(color: Colors.white24, height: 24),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Amount Paid:', style: TextStyle(color: Colors.white70)),
                            Text(
                              currencyFormat.format(paidAmount),
                              style: const TextStyle(
                                color: Colors.green,
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Amount Remaining:', style: TextStyle(color: Colors.white70)),
                            Text(
                              currencyFormat.format(remainingAmount),
                              style: const TextStyle(
                                color: Colors.orange,
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // Payment History
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Row(
                children: [
                  Icon(Icons.history, color: primaryColor, size: 20),
                  const SizedBox(width: 8),
                  const Text(
                    'Payment History',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12),

            Expanded(
              child: paymentHistory.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.receipt_long_outlined, size: 60, color: Colors.white30),
                          const SizedBox(height: 12),
                          const Text(
                            'No payments recorded yet',
                            style: TextStyle(color: Colors.white60),
                          ),
                        ],
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      itemCount: paymentHistory.length,
                      itemBuilder: (context, index) {
                        final payment = paymentHistory[paymentHistory.length - 1 - index] as Map<String, dynamic>;
                        final amount = (payment['amount'] ?? 0).toDouble();
                        final date = payment['date'] as Timestamp?;

                        return Card(
                          margin: const EdgeInsets.only(bottom: 12),
                          color: Colors.white.withOpacity(0.05),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                            side: BorderSide(color: Colors.white.withOpacity(0.1)),
                          ),
                          child: ListTile(
                            leading: Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: Colors.green.withOpacity(0.2),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Icon(Icons.check_circle, color: Colors.green, size: 24),
                            ),
                            title: Text(
                              currencyFormat.format(amount),
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            subtitle: Text(
                              date != null ? DateFormat('dd MMM yyyy, hh:mm a').format(date.toDate()) : 'N/A',
                              style: const TextStyle(color: Colors.white60, fontSize: 12),
                            ),
                            trailing: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                              decoration: BoxDecoration(
                                color: Colors.green.withOpacity(0.2),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: const Text(
                                'Paid',
                                style: TextStyle(color: Colors.green, fontSize: 12, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
