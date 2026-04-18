import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:intl/intl.dart';
import '../main.dart'; // For primaryColor
import 'welcome_screen.dart'; // Import WelcomeScreen

class ClientDashboardScreen extends StatefulWidget {
  const ClientDashboardScreen({super.key});

  @override
  State<ClientDashboardScreen> createState() => _ClientDashboardScreenState();
}

class _ClientDashboardScreenState extends State<ClientDashboardScreen> {
  final currencyFormat = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);

  Future<void> _openWhatsApp(String? agentId) async {
    if (agentId == null || agentId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Agent information not available')),
      );
      return;
    }

    try {
      // Fetch agent phone number from agents collection
      final agentDoc = await FirebaseFirestore.instance
          .collection('agents')
          .doc(agentId)
          .get();

      if (!agentDoc.exists) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Agent not found')),
          );
        }
        return;
      }

      final agentData = agentDoc.data() as Map<String, dynamic>?;
      final String? phone = agentData?['phone'];

      if (phone == null || phone.isEmpty) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Agent phone number not available')),
          );
        }
        return;
      }

      // Clean the phone number - remove spaces, dashes, etc.
      String cleanPhone = phone.replaceAll(RegExp(r'[^0-9+]'), '');
      
      // If the number doesn't start with a country code, assume Indian (+91)
      if (!cleanPhone.startsWith('+')) {
        if (cleanPhone.startsWith('0')) {
          cleanPhone = cleanPhone.substring(1);
        }
        cleanPhone = '91$cleanPhone';
      } else {
        cleanPhone = cleanPhone.substring(1); // Remove the '+'
      }

      final Uri whatsappUrl = Uri.parse('https://wa.me/$cleanPhone');

      if (await canLaunchUrl(whatsappUrl)) {
        await launchUrl(whatsappUrl, mode: LaunchMode.externalApplication);
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Could not open WhatsApp')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }

  Future<void> _logout() async {
    await FirebaseAuth.instance.signOut();
    if (mounted) {
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (context) => const WelcomeScreen()),
        (Route<dynamic> route) => false,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final User? clientUser = FirebaseAuth.instance.currentUser;

    if (clientUser == null) {
      return const Center(child: Text('No client is logged in.'));
    }

    final String clientId = clientUser.uid;

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
        extendBodyBehindAppBar: true,
        appBar: AppBar(
          title: Text(
            'My Dashboard',
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
              color: primaryColor,
              fontWeight: FontWeight.bold,
            ),
          ),
          backgroundColor: Colors.transparent,
          elevation: 0,
          automaticallyImplyLeading: false,
          actions: [
            IconButton(
              icon: const Icon(Icons.logout),
              onPressed: _logout,
              tooltip: 'Logout',
              color: primaryColor,
            ),
          ],
        ),
        body: SafeArea(
          child: StreamBuilder<DocumentSnapshot>(
            stream: FirebaseFirestore.instance.collection('clients').doc(clientId).snapshots(),
            builder: (context, clientSnapshot) {
              if (clientSnapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }
              if (clientSnapshot.hasError) {
                return Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.error_outline, size: 60, color: Colors.orange),
                      const SizedBox(height: 16),
                      Text('Error loading data', style: TextStyle(color: Colors.white70)),
                    ],
                  ),
                );
              }
              if (!clientSnapshot.hasData || !clientSnapshot.data!.exists) {
                return const Center(child: Text('Client data not found.', style: TextStyle(color: Colors.white70)));
              }

              final clientData = clientSnapshot.data!.data() as Map<String, dynamic>;

              return SingleChildScrollView(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Welcome Header
                    _buildWelcomeHeader(clientData),
                    const SizedBox(height: 24),

                    // Payment Summary Cards
                    _buildPaymentSummary(clientData),
                    const SizedBox(height: 24),

                    // Property Details Card
                    _buildPropertyCard(clientData),
                    const SizedBox(height: 24),

                    // Payment History Section
                    _buildPaymentHistorySection(clientId, clientData),
                  ],
                ),
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _buildWelcomeHeader(Map<String, dynamic> clientData) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            primaryColor.withOpacity(0.2),
            primaryColor.withOpacity(0.05),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: primaryColor.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: primaryColor.withOpacity(0.2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(Icons.person, color: primaryColor, size: 32),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Welcome Back!',
                  style: TextStyle(color: Colors.white60, fontSize: 14),
                ),
                const SizedBox(height: 4),
                Text(
                  clientData['name'] ?? 'N/A',
                  style: TextStyle(
                    color: primaryColor,
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Icon(Icons.email, size: 14, color: Colors.white60),
                    const SizedBox(width: 6),
                    Text(
                      clientData['email'] ?? 'N/A',
                      style: TextStyle(color: Colors.white70, fontSize: 12),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentSummary(Map<String, dynamic> clientData) {
    final totalPayment = (clientData['totalPayment'] as num? ?? 0.0).toDouble();
    final advancePayment = (clientData['advancePayment'] as num? ?? 0.0).toDouble();
    final pendingPayment = (clientData['pendingPayment'] as num? ?? 0.0).toDouble();
    final paymentProgress = totalPayment > 0 ? (advancePayment / totalPayment) : 0.0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Payment Overview',
          style: TextStyle(
            color: primaryColor,
            fontSize: 20,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: _buildSummaryCard(
                'Total Amount',
                currencyFormat.format(totalPayment),
                Icons.account_balance_wallet,
                primaryColor,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildSummaryCard(
                'Paid',
                currencyFormat.format(advancePayment),
                Icons.check_circle,
                Colors.green,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        _buildSummaryCard(
          'Pending',
          currencyFormat.format(pendingPayment),
          Icons.pending,
          pendingPayment > 0 ? Colors.orange : Colors.green,
          fullWidth: true,
        ),
        const SizedBox(height: 16),
        
        // Progress Bar
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.black.withOpacity(0.6),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: primaryColor.withOpacity(0.2)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Payment Progress', style: TextStyle(color: Colors.white70, fontSize: 13)),
                  Text(
                    '${(paymentProgress * 100).toStringAsFixed(0)}%',
                    style: TextStyle(color: primaryColor, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: LinearProgressIndicator(
                  value: paymentProgress,
                  backgroundColor: Colors.white24,
                  valueColor: AlwaysStoppedAnimation<Color>(
                    paymentProgress >= 1.0 ? Colors.green : primaryColor,
                  ),
                  minHeight: 10,
                ),
              ),
            ],
          ),
        ),
      ],
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

  Widget _buildPropertyCard(Map<String, dynamic> clientData) {
    return Card(
      elevation: 8,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      color: Colors.black.withOpacity(0.6),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: primaryColor.withOpacity(0.3), width: 1),
        ),
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: primaryColor.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(Icons.location_city, color: primaryColor, size: 24),
                ),
                const SizedBox(width: 12),
                Text(
                  'Property Details',
                  style: TextStyle(
                    color: primaryColor,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            const Divider(color: Colors.white24, height: 1),
            const SizedBox(height: 16),
            
            _buildDetailRow(Icons.business, 'Property', clientData['propertyName'] ?? 'N/A'),
            _buildDetailRow(Icons.grid_on, 'Plot Number', clientData['plotNumber']?.toString() ?? 'N/A'),
            _buildDetailRow(Icons.calendar_today, 'Purchase Date', 
              (clientData['purchaseDate'] as Timestamp?)?.toDate().toLocal().toString().split(' ')[0] ?? 'N/A'),
            _buildDetailRow(Icons.person_outline, 'Agent', clientData['agentName'] ?? 'N/A'),
            _buildDetailRow(Icons.phone, 'Contact', clientData['contact'] ?? 'N/A'),
            _buildDetailRow(Icons.location_on, 'Address', clientData['address'] ?? 'N/A'),
            
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () => _openWhatsApp(clientData['agentId']),
                icon: const Icon(Icons.chat, size: 20),
                label: const Text('Contact Agent on WhatsApp'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF25D366),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Icon(icon, size: 18, color: primaryColor.withOpacity(0.7)),
          const SizedBox(width: 12),
          Expanded(
            child: RichText(
              text: TextSpan(
                children: [
                  TextSpan(
                    text: '$label: ',
                    style: TextStyle(color: Colors.white60, fontSize: 14),
                  ),
                  TextSpan(
                    text: value,
                    style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w500),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentHistorySection(String clientId, Map<String, dynamic> clientData) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(Icons.history, color: primaryColor, size: 20),
            const SizedBox(width: 8),
            Text(
              'Payment History',
              style: TextStyle(
                color: primaryColor,
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        StreamBuilder<QuerySnapshot>(
          stream: FirebaseFirestore.instance
              .collection('transactions')
              .where('clientId', isEqualTo: clientId)
              .where('plotId', isEqualTo: clientData['plotId'])
              .limit(1)
              .snapshots(),
          builder: (context, transactionSnapshot) {
            if (transactionSnapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            if (transactionSnapshot.hasError) {
              return Center(
                child: Text('Error loading payments', style: TextStyle(color: Colors.white60)),
              );
            }
            if (!transactionSnapshot.hasData || transactionSnapshot.data!.docs.isEmpty) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(32.0),
                  child: Column(
                    children: [
                      Icon(Icons.receipt_long_outlined, size: 60, color: Colors.white30),
                      const SizedBox(height: 12),
                      Text('No transactions found', style: TextStyle(color: Colors.white60)),
                    ],
                  ),
                ),
              );
            }

            final mainTransactionId = transactionSnapshot.data!.docs.first.id;

            return StreamBuilder<QuerySnapshot>(
              stream: FirebaseFirestore.instance
                  .collection('transactions')
                  .doc(mainTransactionId)
                  .collection('payments')
                  .orderBy('date', descending: true)
                  .snapshots(),
              builder: (context, paymentsSnapshot) {
                if (paymentsSnapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (paymentsSnapshot.hasError) {
                  return Center(
                    child: Text('Error loading payment history', style: TextStyle(color: Colors.white60)),
                  );
                }
                if (!paymentsSnapshot.hasData || paymentsSnapshot.data!.docs.isEmpty) {
                  return Center(
                    child: Padding(
                      padding: const EdgeInsets.all(32.0),
                      child: Column(
                        children: [
                          Icon(Icons.receipt_long_outlined, size: 60, color: Colors.white30),
                          const SizedBox(height: 12),
                          Text('No payments recorded yet', style: TextStyle(color: Colors.white60)),
                        ],
                      ),
                    ),
                  );
                }

                return ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: paymentsSnapshot.data!.docs.length,
                  itemBuilder: (context, index) {
                    final payment = paymentsSnapshot.data!.docs[index].data() as Map<String, dynamic>;
                    final amount = (payment['amount'] as num? ?? 0.0).toDouble();
                    final date = payment['date'] as Timestamp?;
                    final notes = payment['notes'] ?? '';

                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      elevation: 6,
                      color: Colors.black.withOpacity(0.6),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: BorderSide(color: Colors.green.withOpacity(0.3)),
                      ),
                      child: ListTile(
                        contentPadding: const EdgeInsets.all(16),
                        leading: Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: Colors.green.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Icon(Icons.check_circle, color: Colors.green, size: 24),
                        ),
                        title: Text(
                          currencyFormat.format(amount),
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const SizedBox(height: 6),
                            Row(
                              children: [
                                Icon(Icons.calendar_today, size: 14, color: Colors.white60),
                                const SizedBox(width: 6),
                                Text(
                                  date != null ? DateFormat('dd MMM yyyy').format(date.toDate()) : 'N/A',
                                  style: TextStyle(color: Colors.white70, fontSize: 13),
                                ),
                              ],
                            ),
                            if (notes.isNotEmpty) ...[
                              const SizedBox(height: 4),
                              Text(
                                notes,
                                style: TextStyle(color: Colors.white60, fontSize: 12),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ],
                        ),
                        trailing: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: Colors.green.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            'Paid',
                            style: TextStyle(
                              color: Colors.green,
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                    );
                  },
                );
              },
            );
          },
        ),
      ],
    );
  }
}
