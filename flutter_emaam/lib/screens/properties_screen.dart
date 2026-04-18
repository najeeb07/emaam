import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart'; // Added import for FirebaseAuth
import '../main.dart'; // For primaryColor

class PropertiesScreen extends StatelessWidget {
  const PropertiesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Available Properties',
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(color: primaryColor),
          ),
          const SizedBox(height: 20),
          Expanded(
            child: StreamBuilder<QuerySnapshot>(
              stream: FirebaseFirestore.instance.collection('properties').snapshots(),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (snapshot.hasError) {
                  return Center(child: Text('Error: ${snapshot.error}'));
                }
                if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
                  return const Center(child: Text('No properties found.'));
                }

                return ListView.builder(
                  itemCount: snapshot.data!.docs.length,
                  itemBuilder: (context, index) {
                    var property = snapshot.data!.docs[index].data() as Map<String, dynamic>;
                    String propertyId = snapshot.data!.docs[index].id;

                    return Card(
                      margin: const EdgeInsets.only(bottom: 15),
                      elevation: 3,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      child: Padding(
                        padding: const EdgeInsets.all(15.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Display property image or default logo
                            ClipRRect(
                              borderRadius: BorderRadius.circular(8.0),
                              child: Image(
                                image: (property['imageUrls'] != null && (property['imageUrls'] as List).isNotEmpty)
                                    ? NetworkImage(property['imageUrls'][0]) as ImageProvider<Object>
                                    : const AssetImage('assets/logo.png') as ImageProvider<Object>,
                                fit: BoxFit.cover,
                                width: double.infinity,
                                height: 150,
                                errorBuilder: (context, error, stackTrace) {
                                  return Image.asset(
                                    'assets/logo.png',
                                    fit: BoxFit.cover,
                                    width: double.infinity,
                                    height: 150,
                                  );
                                },
                              ),
                            ),
                            const SizedBox(height: 10),
                            Text(
                              property['name'] ?? 'N/A',
                              style: Theme.of(context).textTheme.titleLarge?.copyWith(color: primaryColor),
                            ),
                            const SizedBox(height: 5),
                            Text('Location: ${property['location'] ?? 'N/A'}'),
                            Text('Total Plots: ${property['totalPlots'] ?? 0}'),
                            Text('Available Plots: ${property['availablePlots'] ?? 0}'),
                            Text('Default Price: ₹${(property['defaultPrice'] as num? ?? 0.0).toDouble().toStringAsFixed(2)}'),
                            const SizedBox(height: 10),
                            Align(
                              alignment: Alignment.centerRight,
                              child: ElevatedButton(
                                onPressed: () {
                                  // Navigate to a screen to view/manage plots for this property
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (context) => PlotManagementScreen(
                                        propertyId: propertyId,
                                        propertyName: property['name'],
                                        defaultPlotPrice: (property['defaultPrice'] as num? ?? 0.0).toDouble(),
                                      ),
                                    ),
                                  );
                                },
                                child: const Text('View Plots'),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class PlotManagementScreen extends StatefulWidget {
  final String propertyId;
  final String propertyName;
  final double defaultPlotPrice;

  const PlotManagementScreen({
    super.key,
    required this.propertyId,
    required this.propertyName,
    required this.defaultPlotPrice,
  });

  @override
  State<PlotManagementScreen> createState() => _PlotManagementScreenState();
}

class _PlotManagementScreenState extends State<PlotManagementScreen> {
  // Method to show sold plot details in a dialog
  Future<void> _showPlotDetails(Map<String, dynamic> plot, String plotDocId) async {
    // Fetch agent details
    String agentName = 'Unknown Agent';
    String clientName = plot['clientId'] ?? 'Unknown Client';
    String soldDate = 'N/A';
    
    if (plot['agentId'] != null) {
      try {
        final agentDoc = await FirebaseFirestore.instance
            .collection('agents')
            .doc(plot['agentId'])
            .get();
        agentName = agentDoc.data()?['name'] ?? 'Unknown Agent';
      } catch (e) {
        agentName = 'Unknown Agent';
      }
    }

    // Fetch transaction details for the date
    try {
      final transactionQuery = await FirebaseFirestore.instance
          .collection('transactions')
          .where('propertyId', isEqualTo: widget.propertyId)
          .where('plotNumber', isEqualTo: plot['plotNumber'])
          .limit(1)
          .get();
      
      if (transactionQuery.docs.isNotEmpty) {
        final transactionData = transactionQuery.docs.first.data();
        clientName = transactionData['clientName'] ?? clientName;
        if (transactionData['dateSold'] != null) {
          final timestamp = transactionData['dateSold'] as Timestamp;
          final date = timestamp.toDate();
          soldDate = '${date.day}/${date.month}/${date.year}';
        }
      }
    } catch (e) {
      // Handle error silently
    }

    if (!mounted) return;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(
          'Plot ${plot['plotNumber']} Details',
          style: TextStyle(color: primaryColor, fontWeight: FontWeight.bold),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildDetailRow('Status:', 'Sold', Colors.red),
            _buildDetailRow('Sold to:', clientName, Colors.white),
            _buildDetailRow('Sold by:', agentName, Colors.white),
            _buildDetailRow('Date Sold:', soldDate, Colors.white),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: Text('Close', style: TextStyle(color: primaryColor)),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow(String label, String value, Color valueColor) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              fontWeight: FontWeight.bold,
              color: primaryColor,
              fontSize: 14,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              value,
              style: TextStyle(color: valueColor, fontSize: 14),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('${widget.propertyName} Plots'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Manage Plots for ${widget.propertyName}',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                color: primaryColor,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 20),
            Expanded(
              child: StreamBuilder<QuerySnapshot>(
                stream: FirebaseFirestore.instance
                    .collection('properties')
                    .doc(widget.propertyId)
                    .collection('plots')
                    .snapshots(),
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  if (snapshot.hasError) {
                    return Center(child: Text('Error: ${snapshot.error}'));
                  }
                  if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
                    return const Center(child: Text('No plots found for this property.'));
                  }

                  return GridView.builder(
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 3,
                      crossAxisSpacing: 10,
                      mainAxisSpacing: 10,
                      childAspectRatio: 0.85,
                    ),
                    itemCount: snapshot.data!.docs.length,
                    itemBuilder: (context, index) {
                      var plot = snapshot.data!.docs[index].data() as Map<String, dynamic>;
                      String plotDocId = snapshot.data!.docs[index].id;
                      bool isSold = plot['status'] == 'sold';

                      return GestureDetector(
                        onTap: isSold
                            ? () => _showPlotDetails(plot, plotDocId) // Show details for sold plots
                            : null, // Available plots are not clickable
                        child: Card(
                          color: isSold
                              ? Colors.pink.shade100 // Light pink for sold plots
                              : Colors.green.shade100, // Light green for available plots
                          elevation: 3,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(8.0),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              crossAxisAlignment: CrossAxisAlignment.center,
                              children: [
                                Text(
                                  'Plot ${plot['plotNumber']}',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 14,
                                    color: Colors.black87,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'Price: ₹${(plot['price'] as num? ?? 0.0).toDouble().toStringAsFixed(2)}',
                                  style: const TextStyle(
                                    fontSize: 11,
                                    color: Colors.black87,
                                  ),
                                  textAlign: TextAlign.center,
                                ),
                                const SizedBox(height: 5),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: isSold ? Colors.red : Colors.green,
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Text(
                                    isSold ? 'Sold' : 'Available',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 10,
                                    ),
                                  ),
                                ),
                                if (isSold) ...[
                                  const SizedBox(height: 5),
                                  Text(
                                    'Client: ${plot['clientId'] ?? 'N/A'}',
                                    textAlign: TextAlign.center,
                                    style: const TextStyle(
                                      fontSize: 9,
                                      color: Colors.black87,
                                    ),
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 3),
                                  const Text(
                                    'Tap for details',
                                    style: TextStyle(
                                      fontSize: 8,
                                      color: Colors.black54,
                                      fontStyle: FontStyle.italic,
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ),
                      );
                    },
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
