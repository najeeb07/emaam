import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../main.dart'; // For primaryColor
import 'client_detail_screen.dart';
import 'add_client_screen.dart'; // Import the new full-screen add client screen

class ClientsScreen extends StatefulWidget {
  const ClientsScreen({super.key});

  @override
  State<ClientsScreen> createState() => _ClientsScreenState();
}

class _ClientsScreenState extends State<ClientsScreen> {

  @override
  Widget build(BuildContext context) {
    final currentUser = FirebaseAuth.instance.currentUser;
    if (currentUser == null) {
      return const Center(child: Text('Please log in to view clients.'));
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'My Clients',
          style: Theme.of(context).textTheme.headlineMedium?.copyWith(color: primaryColor),
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 20),
            Expanded(
              child: StreamBuilder<QuerySnapshot>(
                stream: FirebaseFirestore.instance
                    .collection('clients')
                    .where('agentId', isEqualTo: currentUser.uid)
                    .snapshots(),
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  if (snapshot.hasError) {
                    return Center(child: Text('Error: ${snapshot.error}'));
                  }
                  if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
                    return const Center(child: Text('No clients found.'));
                  }

                  return ListView.builder(
                    itemCount: snapshot.data!.docs.length,
                    itemBuilder: (context, index) {
                      var client = snapshot.data!.docs[index].data() as Map<String, dynamic>;
                      String clientId = snapshot.data!.docs[index].id;
                      return GestureDetector(
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => ClientDetailScreen(
                                clientId: clientId,
                                clientData: client,
                              ),
                            ),
                          );
                        },
                        child: Card(
                          margin: const EdgeInsets.only(bottom: 15),
                          elevation: 3,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          child: Padding(
                            padding: const EdgeInsets.all(15.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  client['name'] ?? 'N/A',
                                  style: Theme.of(context).textTheme.titleLarge?.copyWith(color: primaryColor),
                                ),
                                const SizedBox(height: 5),
                                Text('Contact: ${client['contact'] ?? 'N/A'}'),
                                Text('Address: ${client['address'] ?? 'N/A'}'),
                                Text('Agent: ${client['agentName'] ?? 'N/A'}'),
                                Text('Added Date: ${(client['addedDate'] as Timestamp?)?.toDate().toLocal().toString().split(' ')[0] ?? 'N/A'}'),
                                // Display property and plot if available (from _sellPlot)
                                if (client.containsKey('propertyName') && client['propertyName'] != null)
                                  Text('Property: ${client['propertyName']}'),
                                if (client.containsKey('plotNumber') && client['plotNumber'] != null)
                                  Text('Plot Number: ${client['plotNumber']}'),
                                if (client.containsKey('purchaseDate') && client['purchaseDate'] != null)
                                  Text('Purchase Date: ${(client['purchaseDate'] as Timestamp?)?.toDate().toLocal().toString().split(' ')[0] ?? 'N/A'}'),
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
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => const AddClientScreen()),
          );
        },
        backgroundColor: primaryColor,
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }
}
