import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../main.dart'; // For primaryColor

class PlotSelectionScreen extends StatefulWidget {
  const PlotSelectionScreen({super.key});

  @override
  State<PlotSelectionScreen> createState() => _PlotSelectionScreenState();
}

class _PlotSelectionScreenState extends State<PlotSelectionScreen> {
  String? _selectedPropertyId;
  String? _selectedPropertyName;
  String? _selectedPlotId;
  String? _selectedPlotNumber;
  double? _selectedPlotPrice;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Select Plot'),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Text(
              _selectedPropertyId == null
                  ? 'Select a Property'
                  : 'Select a Plot for ${_selectedPropertyName ?? ''}',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(color: primaryColor),
            ),
          ),
          Expanded(
            child: _selectedPropertyId == null
                ? _buildPropertySelectionList()
                : _buildPlotSelectionGrid(),
          ),
          if (_selectedPlotId != null)
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                children: [
                  Text(
                    'Selected Plot: ${_selectedPlotNumber ?? 'N/A'} (₹${_selectedPlotPrice?.toStringAsFixed(2) ?? '0.00'})',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 10),
                  ElevatedButton(
                    onPressed: () {
                      Navigator.of(context).pop({
                        'propertyId': _selectedPropertyId,
                        'propertyName': _selectedPropertyName,
                        'plotId': _selectedPlotId,
                        'plotNumber': _selectedPlotNumber,
                        'plotPrice': _selectedPlotPrice,
                      });
                    },
                    child: const Text('Confirm Selection'),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildPropertySelectionList() {
    return StreamBuilder<QuerySnapshot>(
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
              margin: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
              elevation: 3,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              child: ListTile(
                title: Text(property['name'] ?? 'N/A'),
                subtitle: Text('Location: ${property['location'] ?? 'N/A'}'),
                trailing: const Icon(Icons.arrow_forward_ios),
                onTap: () {
                  setState(() {
                    _selectedPropertyId = propertyId;
                    _selectedPropertyName = property['name'];
                    _selectedPlotId = null; // Reset plot selection when property changes
                    _selectedPlotNumber = null;
                    _selectedPlotPrice = null;
                  });
                },
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildPlotSelectionGrid() {
    if (_selectedPropertyId == null) {
      return const Center(child: Text('Please select a property first.'));
    }

    return StreamBuilder<QuerySnapshot>(
      stream: FirebaseFirestore.instance
          .collection('properties')
          .doc(_selectedPropertyId)
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
          padding: const EdgeInsets.all(16.0),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 3,
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
            childAspectRatio: 1.0,
          ),
          itemCount: snapshot.data!.docs.length,
          itemBuilder: (context, index) {
            var plot = snapshot.data!.docs[index].data() as Map<String, dynamic>;
            String plotDocId = snapshot.data!.docs[index].id;
            bool isSold = plot['status'] == 'sold';
            bool isSelected = _selectedPlotId == plotDocId;

            return GestureDetector(
              onTap: isSold
                  ? null
                  : () {
                      setState(() {
                        _selectedPlotId = isSelected ? null : plotDocId;
                        _selectedPlotNumber = isSelected ? null : plot['plotNumber'].toString();
                        _selectedPlotPrice = isSelected ? null : (plot['price'] as num? ?? 0.0).toDouble();
                      });
                    },
              child: Card(
                color: isSold
                    ? Colors.red.shade100
                    : (isSelected ? primaryColor.withOpacity(0.3) : Colors.green.shade100),
                elevation: 2,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                  side: isSelected ? const BorderSide(color: primaryColor, width: 2) : BorderSide.none,
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text('Plot ${plot['plotNumber']}', style: const TextStyle(fontWeight: FontWeight.bold)),
                    Text('Price: ₹${(plot['price'] as num? ?? 0.0).toDouble().toStringAsFixed(2)}'),
                    Text(isSold ? 'Sold' : 'Available',
                        style: TextStyle(color: isSold ? Colors.red : Colors.green)),
                    if (isSold) Text('Client: ${plot['clientId'] ?? 'N/A'}', textAlign: TextAlign.center),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }
}
