import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import '../firebase_options.dart';
import '../main.dart'; // For primaryColor
import 'plot_selection_screen.dart'; // Import PlotSelectionScreen

class AddClientScreen extends StatefulWidget {
  const AddClientScreen({super.key});

  @override
  State<AddClientScreen> createState() => _AddClientScreenState();
}

class _AddClientScreenState extends State<AddClientScreen> {
  bool _isLoading = false;
  final TextEditingController _clientNameController = TextEditingController();
  final TextEditingController _clientContactController = TextEditingController();
  final TextEditingController _clientAddressController = TextEditingController();
  final TextEditingController _clientEmailController = TextEditingController(); // New field
  final TextEditingController _clientPasswordController = TextEditingController(); // New field
  final TextEditingController _totalPaymentController = TextEditingController();
  final TextEditingController _advancePaymentController = TextEditingController();

  List<Map<String, dynamic>> _selectedPlots = [];
  DateTime? _purchaseDate;
  String? _errorMessage;

  @override
  void dispose() {
    _clientNameController.dispose();
    _clientContactController.dispose();
    _clientAddressController.dispose();
    _clientEmailController.dispose(); // Dispose new controller
    _clientPasswordController.dispose(); // Dispose new controller
    _totalPaymentController.dispose();
    _advancePaymentController.dispose();
    super.dispose();
  }

  Future<void> _addClient({
    required double totalPayment,
    required double advancePayment,
    required DateTime purchaseDate,
    required String clientEmail,
    required String clientPassword,
  }) async {
    final currentUser = FirebaseAuth.instance.currentUser;
    if (currentUser == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please log in to add clients.')),
      );
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    FirebaseApp? secondaryApp;

    try {
      secondaryApp = await Firebase.initializeApp(
        name: 'SecondaryApp',
        options: DefaultFirebaseOptions.currentPlatform,
      );

      final auth = FirebaseAuth.instanceFor(app: secondaryApp);
      final UserCredential userCredential = await auth.createUserWithEmailAndPassword(
        email: clientEmail,
        password: clientPassword,
      );

      final String? clientAuthUid = userCredential.user?.uid;

      if (clientAuthUid == null) {
        throw Exception('Failed to get client UID after authentication creation.');
      }

      final agentDoc = await FirebaseFirestore.instance.collection('agents').doc(currentUser.uid).get();
      final agentName = agentDoc.data()?['name'] ?? 'Unknown Agent';

      double pendingPayment = totalPayment - advancePayment;

      final clientDocRef = FirebaseFirestore.instance.collection('clients').doc(clientAuthUid);
      await clientDocRef.set({
        'name': _clientNameController.text,
        'contact': _clientContactController.text,
        'phone': _clientContactController.text,
        'address': _clientAddressController.text,
        'email': clientEmail,
        'agentId': currentUser.uid,
        'agentName': agentName,
        'addedDate': FieldValue.serverTimestamp(),
        'createdAt': FieldValue.serverTimestamp(),
        'plots': _selectedPlots,
        'propertyId': _selectedPlots.isNotEmpty ? _selectedPlots.first['propertyId'] : '',
        'propertyName': _selectedPlots.map((e) => e['propertyName']).toSet().join(', '),
        'plotId': _selectedPlots.isNotEmpty ? _selectedPlots.first['plotId'] : '',
        'plotNumber': _selectedPlots.map((e) => e['plotNumber']).join(', '),
        'totalPayment': totalPayment,
        'advancePayment': advancePayment,
        'pendingPayment': pendingPayment,
        'purchaseDate': purchaseDate,
      });

      final newClientId = clientDocRef.id;

      for (var plot in _selectedPlots) {
        await FirebaseFirestore.instance
            .collection('properties')
            .doc(plot['propertyId'])
            .collection('plots')
            .doc(plot['plotId'])
            .update({
          'status': 'sold',
          'clientId': newClientId,
          'clientName': _clientNameController.text,
          'agentId': currentUser.uid,
        });

        await FirebaseFirestore.instance.collection('properties').doc(plot['propertyId']).update({
          'availablePlots': FieldValue.increment(-1),
        });
      }

      final transactionDocRef = await FirebaseFirestore.instance.collection('transactions').add({
        'clientId': newClientId,
        'clientName': _clientNameController.text,
        'plots': _selectedPlots,
        'propertyId': _selectedPlots.isNotEmpty ? _selectedPlots.first['propertyId'] : '',
        'propertyName': _selectedPlots.map((e) => e['propertyName']).toSet().join(', '),
        'plotId': _selectedPlots.isNotEmpty ? _selectedPlots.first['plotId'] : '',
        'plotNumber': _selectedPlots.map((e) => e['plotNumber']).join(', '),
        'totalAmount': totalPayment,
        'advancePaid': advancePayment,
        'pendingAmount': pendingPayment,
        'dateSold': purchaseDate,
        'agentId': currentUser.uid,
        'agentName': agentName,
      });

      if (advancePayment > 0) {
        await transactionDocRef.collection('payments').add({
          'amount': advancePayment,
          'date': purchaseDate,
          'notes': 'Initial Advance Payment',
          'addedByAgentId': currentUser.uid,
          'addedDate': FieldValue.serverTimestamp(),
        });
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Client and plot details added successfully!')),
        );
        Navigator.of(context).pop();
      }
    } on FirebaseAuthException catch (e) {
      if (mounted) {
        String errorMsg = e.message ?? 'Authentication error';
        if (e.code == 'email-already-in-use') {
          errorMsg = 'An account with this email already exists.';
        }
        setState(() {
          _errorMessage = errorMsg;
        });
        ScaffoldMessenger.of(context).showSnackBar(
           SnackBar(content: Text(errorMsg)),
        );
      }
    } on FirebaseException catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Error adding client: ${e.message}';
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error adding client: ${e.message}')),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'An unexpected error occurred: $e';
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('An unexpected error occurred: $e')),
        );
      }
    } finally {
      if (secondaryApp != null) {
        await secondaryApp.delete();
      }
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _selectPurchaseDate(BuildContext context) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _purchaseDate ?? DateTime.now(),
      firstDate: DateTime(2000),
      lastDate: DateTime(2101),
    );
    if (picked != null && picked != _purchaseDate) {
      setState(() {
        _purchaseDate = picked;
      });
    }
  }

  void _updateTotalPayment() {
    double total = 0.0;
    for (var plot in _selectedPlots) {
      if (plot['plotPrice'] != null) {
        total += (plot['plotPrice'] as num).toDouble();
      }
    }
    _totalPaymentController.text = total.toStringAsFixed(2);
  }

  Future<void> _pickPlot() async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const PlotSelectionScreen()),
    );

    if (result != null && result is Map<String, dynamic>) {
      if (_selectedPlots.any((p) => p['plotId'] == result['plotId'])) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Plot already selected.')),
          );
        }
        return;
      }
      setState(() {
        _selectedPlots.add(result);
        _updateTotalPayment();
      });
    }
  }

  void _saveClient() async {
    setState(() {
      _errorMessage = null;
    });

    if (_clientNameController.text.isEmpty ||
        _clientContactController.text.isEmpty ||
        _clientAddressController.text.isEmpty ||
        _clientEmailController.text.isEmpty || // New check
        _clientPasswordController.text.isEmpty || // New check
        _selectedPlots.isEmpty ||
        _totalPaymentController.text.isEmpty ||
        _advancePaymentController.text.isEmpty ||
        _purchaseDate == null) {
      setState(() {
        _errorMessage = 'Please fill all required fields, including email and password, and select a plot.';
      });
      return;
    }

    // Basic email format validation
    if (!RegExp(r'^[^@]+@[^@]+\.[^@]+').hasMatch(_clientEmailController.text)) {
      setState(() {
        _errorMessage = 'Please enter a valid email address.';
      });
      return;
    }

    double totalPayment = double.tryParse(_totalPaymentController.text) ?? 0.0;
    double advancePayment = double.tryParse(_advancePaymentController.text) ?? 0.0;

    if (totalPayment <= 0 || advancePayment < 0 || advancePayment > totalPayment) {
      setState(() {
        _errorMessage = 'Please enter valid payment amounts.';
      });
      return;
    }

    await _addClient(
      totalPayment: totalPayment,
      advancePayment: advancePayment,
      purchaseDate: _purchaseDate!,
      clientEmail: _clientEmailController.text, // Pass new field
      clientPassword: _clientPasswordController.text, // Pass new field
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Add New Client',
          style: Theme.of(context).textTheme.headlineMedium?.copyWith(color: primaryColor),
        ),
        backgroundColor: Colors.white,
        iconTheme: IconThemeData(color: primaryColor), // Back button color
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextField(
                controller: _clientNameController,
                decoration: const InputDecoration(labelText: 'Client Name'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _clientContactController,
                decoration: const InputDecoration(labelText: 'Contact Number'),
                keyboardType: TextInputType.phone,
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _clientAddressController,
                decoration: const InputDecoration(labelText: 'Address'),
                maxLines: 3,
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _clientEmailController,
                decoration: const InputDecoration(labelText: 'Client Email'),
                keyboardType: TextInputType.emailAddress,
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _clientPasswordController,
                decoration: const InputDecoration(labelText: 'Client Password'),
                obscureText: true,
              ),
              const SizedBox(height: 20),
              ElevatedButton.icon(
                onPressed: _pickPlot,
                icon: const Icon(Icons.add),
                label: const Text('Add Plot'),
              ),
              const SizedBox(height: 10),
              if (_selectedPlots.isNotEmpty) ...[
                Column(
                  children: _selectedPlots.map((plot) {
                    return ListTile(
                      title: Text('Plot: ${plot['plotNumber'] ?? 'N/A'} (${plot['propertyName'] ?? 'N/A'})'),
                      subtitle: Text('Price: ₹${(plot['plotPrice'] as num?)?.toDouble().toStringAsFixed(2) ?? '0.00'}'),
                      trailing: IconButton(
                        icon: const Icon(Icons.delete, color: Colors.red),
                        onPressed: () {
                          setState(() {
                            _selectedPlots.removeWhere((p) => p['plotId'] == plot['plotId']);
                            _updateTotalPayment();
                          });
                        },
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 10),
              ],
              const SizedBox(height: 20),
              TextField(
                controller: _totalPaymentController,
                decoration: const InputDecoration(labelText: 'Total Payment'),
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _advancePaymentController,
                decoration: const InputDecoration(labelText: 'Advance Payment'),
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: 10),
              ListTile(
                title: Text(
                  _purchaseDate == null
                      ? 'Select Purchase Date'
                      : 'Purchase Date: ${_purchaseDate!.toLocal().toString().split(' ')[0]}',
                ),
                trailing: const Icon(Icons.calendar_today),
                onTap: () => _selectPurchaseDate(context),
              ),
              if (_errorMessage != null)
                Padding(
                  padding: const EdgeInsets.only(top: 10),
                  child: Text(
                    _errorMessage!,
                    style: const TextStyle(color: Colors.red),
                  ),
                ),
              const SizedBox(height: 20),
              Center(
                child: _isLoading
                    ? const CircularProgressIndicator()
                    : ElevatedButton(
                        onPressed: _saveClient,
                        style: ElevatedButton.styleFrom(
                    backgroundColor: primaryColor,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 15),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  child: const Text(
                    'Add Client',
                    style: TextStyle(fontSize: 18),
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
