import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:intl/intl.dart';
import '../main.dart'; // For primaryColor

class ClientDetailScreen extends StatefulWidget {
  final String clientId;
  final Map<String, dynamic> clientData;

  const ClientDetailScreen({
    super.key,
    required this.clientId,
    required this.clientData,
  });

  @override
  State<ClientDetailScreen> createState() => _ClientDetailScreenState();
}

class _ClientDetailScreenState extends State<ClientDetailScreen> {
  final TextEditingController _paymentAmountController = TextEditingController();
  final TextEditingController _paymentNotesController = TextEditingController();
  final currencyFormat = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);

  @override
  void dispose() {
    _paymentAmountController.dispose();
    _paymentNotesController.dispose();
    super.dispose();
  }

  Future<void> _openWhatsAppReminder(Map<String, dynamic> clientData) async {
    final String clientName = clientData['name'] ?? 'Client';
    final String contact = clientData['contact'] ?? '';
    final double pendingAmount = (clientData['pendingPayment'] as num? ?? 0.0).toDouble();

    String phoneNumber = contact.replaceAll(RegExp(r'[^0-9]'), '');
    
    if (phoneNumber.length == 10) {
      phoneNumber = '91$phoneNumber';
    }

    final String message = '''Hello $clientName,

This is a friendly reminder regarding your pending payment.

*Pending Amount: ${currencyFormat.format(pendingAmount)}*

Please make the payment at your earliest convenience. If you have any questions or concerns, feel free to contact us.

Thank you for your cooperation!''';

    final String encodedMessage = Uri.encodeComponent(message);
    final Uri whatsappUrl = Uri.parse('https://wa.me/$phoneNumber?text=$encodedMessage');

    try {
      if (await canLaunchUrl(whatsappUrl)) {
        await launchUrl(whatsappUrl, mode: LaunchMode.externalApplication);
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Could not open WhatsApp. Please make sure WhatsApp is installed.')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error opening WhatsApp: $e')),
        );
      }
    }
  }

  void _showAddPaymentDialog(Map<String, dynamic> clientData) {
    String? dialogErrorMessage;
    DateTime? dialogSelectedDate;
    bool isLoading = false;
    
    showDialog(
      context: context,
      barrierColor: Colors.black87,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            Future<void> selectDate() async {
              final DateTime? picked = await showDatePicker(
                context: context,
                initialDate: dialogSelectedDate ?? DateTime.now(),
                firstDate: DateTime(2000),
                lastDate: DateTime(2101),
                builder: (context, child) {
                  return Theme(
                    data: Theme.of(context).copyWith(
                      colorScheme: ColorScheme.dark(
                        primary: primaryColor,
                        surface: Colors.black,
                      ),
                    ),
                    child: child!,
                  );
                },
              );
              if (picked != null) {
                setDialogState(() {
                  dialogSelectedDate = picked;
                });
              }
            }

            Future<void> addPayment() async {
              final currentUser = FirebaseAuth.instance.currentUser;
              if (currentUser == null) {
                Navigator.of(dialogContext).pop();
                ScaffoldMessenger.of(this.context).showSnackBar(
                  const SnackBar(content: Text('Please log in to add payments.')),
                );
                return;
              }

              if (_paymentAmountController.text.isEmpty || dialogSelectedDate == null) {
                setDialogState(() {
                  dialogErrorMessage = 'Please enter amount and select date.';
                });
                return;
              }

              double amount = double.tryParse(_paymentAmountController.text) ?? 0.0;
              if (amount <= 0) {
                setDialogState(() {
                  dialogErrorMessage = 'Please enter a valid amount.';
                });
                return;
              }

              setDialogState(() {
                isLoading = true;
                dialogErrorMessage = null;
              });

              try {
                final clientDoc = await FirebaseFirestore.instance
                    .collection('clients')
                    .doc(widget.clientId)
                    .get();
                    
                if (!clientDoc.exists) {
                  setDialogState(() {
                    isLoading = false;
                    dialogErrorMessage = 'Client not found.';
                  });
                  return;
                }

                final clientData = clientDoc.data() as Map<String, dynamic>;
                final double currentPendingPayment = (clientData['pendingPayment'] as num? ?? 0.0).toDouble();

                if (currentPendingPayment <= 0) {
                  setDialogState(() {
                    isLoading = false;
                    dialogErrorMessage = 'No pending payment remaining.';
                  });
                  return;
                }

                if (amount > currentPendingPayment) {
                  setDialogState(() {
                    isLoading = false;
                    dialogErrorMessage = 'Amount cannot exceed pending payment (${currencyFormat.format(currentPendingPayment)})';
                  });
                  return;
                }

                final transactionQuery = await FirebaseFirestore.instance
                    .collection('transactions')
                    .where('clientId', isEqualTo: widget.clientId)
                    .limit(1)
                    .get();

                if (transactionQuery.docs.isEmpty) {
                  setDialogState(() {
                    isLoading = false;
                    dialogErrorMessage = 'No main transaction found for this client and plot.';
                  });
                  return;
                }

                final transactionRef = transactionQuery.docs.first.reference;

                await transactionRef.collection('payments').add({
                  'amount': amount,
                  'date': dialogSelectedDate,
                  'notes': _paymentNotesController.text,
                  'addedByAgentId': currentUser.uid,
                  'addedDate': FieldValue.serverTimestamp(),
                });

                await transactionRef.update({
                  'pendingAmount': FieldValue.increment(-amount),
                });

                await FirebaseFirestore.instance
                    .collection('clients')
                    .doc(widget.clientId)
                    .update({
                  'pendingPayment': FieldValue.increment(-amount),
                });

                _paymentAmountController.clear();
                _paymentNotesController.clear();

                Navigator.of(dialogContext).pop();
                ScaffoldMessenger.of(this.context).showSnackBar(
                  const SnackBar(
                    content: Text('Payment added successfully!'),
                    backgroundColor: Colors.green,
                  ),
                );
              } on FirebaseException catch (e) {
                setDialogState(() {
                  isLoading = false;
                  dialogErrorMessage = 'Error adding payment: ${e.message}';
                });
              } catch (e) {
                setDialogState(() {
                  isLoading = false;
                  dialogErrorMessage = 'An unexpected error occurred: $e';
                });
              }
            }

            return Dialog(
              backgroundColor: Colors.transparent,
              child: Container(
                constraints: BoxConstraints(maxWidth: 400),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      Colors.black.withOpacity(0.95),
                      primaryColor.withOpacity(0.1),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: primaryColor.withOpacity(0.3)),
                ),
                child: SingleChildScrollView(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
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
                              child: Icon(Icons.add_card, color: primaryColor, size: 24),
                            ),
                            const SizedBox(width: 12),
                            Text(
                              'Add New Payment',
                              style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                color: primaryColor,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 24),
                        
                        TextField(
                          controller: _paymentAmountController,
                          decoration: InputDecoration(
                            labelText: 'Amount Paid',
                            prefixIcon: Icon(Icons.currency_rupee, color: primaryColor),
                            enabled: !isLoading,
                          ),
                          keyboardType: TextInputType.number,
                          style: TextStyle(color: Colors.white),
                        ),
                        const SizedBox(height: 16),
                        
                        InkWell(
                          onTap: isLoading ? null : selectDate,
                          borderRadius: BorderRadius.circular(8),
                          child: Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.05),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: primaryColor.withOpacity(0.5)),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  children: [
                                    Icon(Icons.calendar_today, color: primaryColor, size: 20),
                                    const SizedBox(width: 12),
                                    Text(
                                      dialogSelectedDate == null
                                          ? 'Select Payment Date'
                                          : DateFormat('dd MMM yyyy').format(dialogSelectedDate!),
                                      style: TextStyle(
                                        color: dialogSelectedDate == null ? Colors.white60 : Colors.white,
                                        fontSize: 14,
                                      ),
                                    ),
                                  ],
                                ),
                                Icon(Icons.arrow_drop_down, color: primaryColor),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),
                        
                        TextField(
                          controller: _paymentNotesController,
                          decoration: InputDecoration(
                            labelText: 'Notes (Optional)',
                            prefixIcon: Icon(Icons.note_alt, color: primaryColor),
                            enabled: !isLoading,
                          ),
                          maxLines: 2,
                          style: TextStyle(color: Colors.white),
                        ),
                        
                        if (dialogErrorMessage != null) ...[
                          const SizedBox(height: 16),
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.red.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: Colors.red.withOpacity(0.3)),
                            ),
                            child: Row(
                              children: [
                                Icon(Icons.error_outline, color: Colors.red, size: 20),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Text(
                                    dialogErrorMessage!,
                                    style: TextStyle(color: Colors.red, fontSize: 13),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                        
                        if (isLoading) ...[
                          const SizedBox(height: 20),
                          Center(child: CircularProgressIndicator(color: primaryColor)),
                        ],
                        
                        const SizedBox(height: 24),
                        Row(
                          children: [
                            Expanded(
                              child: TextButton(
                                onPressed: isLoading
                                    ? null
                                    : () {
                                        Navigator.of(dialogContext).pop();
                                        _paymentAmountController.clear();
                                        _paymentNotesController.clear();
                                      },
                                style: TextButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(vertical: 14),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                ),
                                child: Text('Cancel', style: TextStyle(color: Colors.white70)),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              flex: 2,
                              child: ElevatedButton(
                                onPressed: isLoading ? null : addPayment,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: primaryColor,
                                  foregroundColor: Colors.black,
                                  padding: const EdgeInsets.symmetric(vertical: 14),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                ),
                                child: Text('Add Payment', style: TextStyle(fontWeight: FontWeight.bold)),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<DocumentSnapshot>(
      stream: FirebaseFirestore.instance.collection('clients').doc(widget.clientId).snapshots(),
      builder: (context, clientSnapshot) {
        if (clientSnapshot.connectionState == ConnectionState.waiting) {
          return Scaffold(
            backgroundColor: Colors.black,
            appBar: AppBar(
              backgroundColor: Colors.transparent,
              iconTheme: IconThemeData(color: primaryColor),
              title: Text(widget.clientData['name'] ?? 'Client Details'),
            ),
            body: const Center(child: CircularProgressIndicator()),
          );
        }
        if (clientSnapshot.hasError || !clientSnapshot.hasData || !clientSnapshot.data!.exists) {
          return Scaffold(
            backgroundColor: Colors.black,
            appBar: AppBar(
              backgroundColor: Colors.transparent,
              iconTheme: IconThemeData(color: primaryColor),
              title: Text(widget.clientData['name'] ?? 'Client Details'),
            ),
            body: Center(
              child: Text(
                clientSnapshot.hasError ? 'Error: ${clientSnapshot.error}' : 'Client not found',
                style: TextStyle(color: Colors.white70),
              ),
            ),
          );
        }

        final clientData = clientSnapshot.data!.data() as Map<String, dynamic>;
        final pendingPayment = (clientData['pendingPayment'] as num? ?? 0.0).toDouble();
        final totalPayment = (clientData['totalPayment'] as num? ?? 0.0).toDouble();
        final advancePayment = (clientData['advancePayment'] as num? ?? 0.0).toDouble();
        final paymentProgress = totalPayment > 0 ? (advancePayment / totalPayment) : 0.0;

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
              backgroundColor: Colors.transparent,
              elevation: 0,
              iconTheme: IconThemeData(color: primaryColor),
              title: Text(
                clientData['name'] ?? 'Client Details',
                style: TextStyle(color: primaryColor, fontWeight: FontWeight.bold),
              ),
              actions: [
                PopupMenuButton<String>(
                  onSelected: (value) {
                    if (value == 'edit') {
                      _showEditClientDialog(clientData);
                    } else if (value == 'delete') {
                      _deleteClient(clientData);
                    }
                  },
                  icon: Icon(Icons.more_vert, color: primaryColor),
                  itemBuilder: (BuildContext context) {
                    return [
                      const PopupMenuItem<String>(
                        value: 'edit',
                        child: Text('Edit Client'),
                      ),
                      const PopupMenuItem<String>(
                        value: 'delete',
                        child: Text('Delete Client', style: TextStyle(color: Colors.red)),
                      ),
                    ];
                  },
                ),
              ],
            ),
            body: SafeArea(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Client Info Card
                    _buildClientInfoCard(clientData),
                    const SizedBox(height: 20),

                    // Payment Summary
                    _buildPaymentSummary(totalPayment, advancePayment, pendingPayment, paymentProgress),
                    const SizedBox(height: 20),

                    // WhatsApp Reminder Button
                    if (pendingPayment > 0) ...[
                      _buildWhatsAppButton(clientData),
                      const SizedBox(height: 20),
                    ],

                    // Payment History
                    _buildPaymentHistory(clientData),
                  ],
                ),
              ),
            ),
            floatingActionButton: pendingPayment > 0
                ? FloatingActionButton.extended(
                    onPressed: () => _showAddPaymentDialog(clientData),
                    backgroundColor: primaryColor,
                    icon: const Icon(Icons.add, color: Colors.black),
                    label: const Text('Add Payment', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
                  )
                : null,
          ),
        );
      },
    );
  }

  Future<void> _deleteClient(Map<String, dynamic> clientData) async {
    final bool confirm = await showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Client?'),
        content: Text(
          'Are you sure you want to delete "${clientData['name']}"? This will revert the plot to Available and remove the sale record.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    ) ?? false;

    if (!confirm) return;

    try {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => Center(child: CircularProgressIndicator(color: primaryColor)),
      );

      final batch = FirebaseFirestore.instance.batch();

      // 1. Delete Client Document
      final clientRef = FirebaseFirestore.instance.collection('clients').doc(widget.clientId);
      batch.delete(clientRef);

      // 2. Revert Plot Status
      final List<dynamic>? plots = clientData['plots'];
      
      if (plots != null && plots.isNotEmpty) {
        for (var plot in plots) {
          final String? propertyId = plot['propertyId'];
          final String? plotId = plot['plotId'];
          
          if (propertyId != null && plotId != null) {
            final plotRef = FirebaseFirestore.instance
                .collection('properties')
                .doc(propertyId)
                .collection('plots')
                .doc(plotId);
                
            batch.update(plotRef, {
              'status': 'Available',
              'clientId': FieldValue.delete(),
              'clientName': FieldValue.delete(),
              'agentId': FieldValue.delete(),
            });

            final propRef = FirebaseFirestore.instance.collection('properties').doc(propertyId);
            batch.update(propRef, {
              'availablePlots': FieldValue.increment(1),
            });
          }
        }
      } else {
        final String? propertyId = clientData['propertyId'];
        final String? plotId = clientData['plotId'];

        if (propertyId != null && plotId != null) {
          final plotRef = FirebaseFirestore.instance
              .collection('properties')
              .doc(propertyId)
              .collection('plots')
              .doc(plotId);
              
          batch.update(plotRef, {
            'status': 'Available',
            'clientId': FieldValue.delete(),
            'clientName': FieldValue.delete(),
            'agentId': FieldValue.delete(),
          });

          // 3. Increment Available Plots
          final propRef = FirebaseFirestore.instance.collection('properties').doc(propertyId);
          batch.update(propRef, {
            'availablePlots': FieldValue.increment(1),
          });
        }
      }

      // 4. Delete associated Transactions
      final tSnap = await FirebaseFirestore.instance
          .collection('transactions')
          .where('clientId', isEqualTo: widget.clientId)
          .get();

      for (var doc in tSnap.docs) {
        batch.delete(doc.reference);
      }

      await batch.commit();

      if (mounted) {
        Navigator.of(context, rootNavigator: true).pop(); // Close loading dialog
        Navigator.of(context).pop(); // Close Detail Screen
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Client deleted successfully.')),
        );
      }
    } catch (e) {
      if (mounted) Navigator.of(context, rootNavigator: true).pop(); // Close loading dialog
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error deleting client: $e')),
        );
      }
    }
  }

  void _showEditClientDialog(Map<String, dynamic> clientData) {
    final TextEditingController nameController = TextEditingController(text: clientData['name']);
    final TextEditingController contactController = TextEditingController(text: clientData['contact']);
    final TextEditingController addressController = TextEditingController(text: clientData['address']);

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Edit Client Details'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: nameController,
                  decoration: const InputDecoration(labelText: 'Name'),
                ),
                TextField(
                  controller: contactController,
                  decoration: const InputDecoration(labelText: 'Contact'),
                  keyboardType: TextInputType.phone,
                ),
                TextField(
                  controller: addressController,
                  decoration: const InputDecoration(labelText: 'Address'),
                  maxLines: 3,
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                try {
                  await FirebaseFirestore.instance
                      .collection('clients')
                      .doc(widget.clientId)
                      .update({
                    'name': nameController.text.trim(),
                    'contact': contactController.text.trim(),
                    'address': addressController.text.trim(),
                  });

                  // Try to update transactions names too
                  final tQuery = await FirebaseFirestore.instance
                      .collection('transactions')
                      .where('clientId', isEqualTo: widget.clientId)
                      .get();
                  
                  if (tQuery.docs.isNotEmpty) {
                    final batch = FirebaseFirestore.instance.batch();
                    for (var doc in tQuery.docs) {
                        batch.update(doc.reference, {
                            'clientName': nameController.text.trim(),
                            'clientMobile': contactController.text.trim(),
                        });
                    }
                    await batch.commit();
                  }

                   // Try to update property plots clientName
                  final List<dynamic>? plots = clientData['plots'];
                  if (plots != null && plots.isNotEmpty) {
                    for (var plot in plots) {
                      if (plot['propertyId'] != null && plot['plotId'] != null) {
                        await FirebaseFirestore.instance
                            .collection('properties')
                            .doc(plot['propertyId'])
                            .collection('plots')
                            .doc(plot['plotId'])
                            .update({
                                'clientName': nameController.text.trim()
                            });
                      }
                    }
                  } else if (clientData['propertyId'] != null && clientData['plotId'] != null) {
                       await FirebaseFirestore.instance
                          .collection('properties')
                          .doc(clientData['propertyId'])
                          .collection('plots')
                          .doc(clientData['plotId'])
                          .update({
                              'clientName': nameController.text.trim()
                          });
                  }

                  if (mounted) {
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Client details updated.')),
                    );
                  }
                } catch (e) {
                   ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Error updating: $e')),
                    );
                }
              },
              style: ElevatedButton.styleFrom(backgroundColor: primaryColor, foregroundColor: Colors.black),
              child: const Text('Save'),
            ),
          ],
        );
      },
    );
  }

  Widget _buildClientInfoCard(Map<String, dynamic> clientData) {
    return Card(
      elevation: 8,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      color: Colors.black.withOpacity(0.6),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: primaryColor.withOpacity(0.3)),
        ),
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
                  child: Icon(Icons.person, color: primaryColor, size: 30),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        clientData['name'] ?? 'N/A',
                        style: TextStyle(
                          color: primaryColor,
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Client Details',
                        style: TextStyle(color: Colors.white60, fontSize: 13),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            const Divider(color: Colors.white24, height: 1),
            const SizedBox(height: 16),
            
            _buildInfoRow(Icons.phone, 'Contact', clientData['contact'] ?? 'N/A'),
            _buildInfoRow(Icons.location_on, 'Address', clientData['address'] ?? 'N/A'),
            _buildInfoRow(Icons.person_outline, 'Agent', clientData['agentName'] ?? 'N/A'),
            _buildInfoRow(Icons.location_city, 'Property', clientData['propertyName'] ?? 'N/A'),
            _buildInfoRow(Icons.grid_on, 'Plot Number(s)', clientData['plots'] != null ? (clientData['plots'] as List).map((p) => p['plotNumber']).join(', ') : (clientData['plotNumber']?.toString() ?? 'N/A')),
            _buildInfoRow(Icons.calendar_today, 'Purchase Date',
              (clientData['purchaseDate'] as Timestamp?)?.toDate().toLocal().toString().split(' ')[0] ?? 'N/A'),
            _buildInfoRow(Icons.access_time, 'Added Date',
              (clientData['addedDate'] as Timestamp?)?.toDate().toLocal().toString().split(' ')[0] ?? 'N/A'),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
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

  Widget _buildPaymentSummary(double total, double paid, double pending, double progress) {
    return Card(
      elevation: 8,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      color: Colors.black.withOpacity(0.6),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: primaryColor.withOpacity(0.3)),
        ),
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.account_balance_wallet, color: primaryColor, size: 24),
                const SizedBox(width: 12),
                Text(
                  'Payment Summary',
                  style: TextStyle(
                    color: primaryColor,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            
            Row(
              children: [
                Expanded(
                  child: _buildSummaryItem('Total', currencyFormat.format(total), primaryColor),
                ),
                Expanded(
                  child: _buildSummaryItem('Paid', currencyFormat.format(paid), Colors.green),
                ),
                Expanded(
                  child: _buildSummaryItem('Pending', currencyFormat.format(pending),
                    pending > 0 ? Colors.orange : Colors.green),
                ),
              ],
            ),
            
            const SizedBox(height: 20),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Payment Progress', style: TextStyle(color: Colors.white70, fontSize: 13)),
                    Text(
                      '${(progress * 100).toStringAsFixed(0)}%',
                      style: TextStyle(color: primaryColor, fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: LinearProgressIndicator(
                    value: progress,
                    backgroundColor: Colors.white24,
                    valueColor: AlwaysStoppedAnimation<Color>(
                      progress >= 1.0 ? Colors.green : primaryColor,
                    ),
                    minHeight: 10,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryItem(String label, String value, Color color) {
    return Column(
      children: [
        Text(label, style: TextStyle(color: Colors.white60, fontSize: 12)),
        const SizedBox(height: 6),
        Text(
          value,
          style: TextStyle(color: color, fontSize: 16, fontWeight: FontWeight.bold),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }

  Widget _buildWhatsAppButton(Map<String, dynamic> clientData) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: () => _openWhatsAppReminder(clientData),
        icon: const Icon(Icons.chat, size: 22),
        label: const Text('Send WhatsApp Reminder', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF25D366),
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
    );
  }

  Widget _buildPaymentHistory(Map<String, dynamic> clientData) {
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
              .where('clientId', isEqualTo: widget.clientId)
              .where('plotId', isEqualTo: clientData['plotId'])
              .limit(1)
              .snapshots(),
          builder: (context, transactionSnapshot) {
            if (transactionSnapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            if (transactionSnapshot.hasError || !transactionSnapshot.hasData || transactionSnapshot.data!.docs.isEmpty) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(32.0),
                  child: Column(
                    children: [
                      Icon(Icons.receipt_long_outlined, size: 60, color: Colors.white30),
                      const SizedBox(height: 12),
                      Text('No transaction found', style: TextStyle(color: Colors.white60)),
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
                if (paymentsSnapshot.hasError || !paymentsSnapshot.hasData || paymentsSnapshot.data!.docs.isEmpty) {
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
