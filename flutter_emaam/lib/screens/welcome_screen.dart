import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:carousel_slider/carousel_slider.dart' as carousel_slider; // Alias the import
import 'package:emaam/main.dart'; // Import main.dart to access primaryColor
import 'package:emaam/screens/client_login_screen.dart'; // Import the new ClientLoginScreen
import 'package:emaam/screens/dashboard_screen.dart'; // For agent dashboard after login
import 'package:emaam/main.dart'; // Import main.dart to access LoginPage
import 'package:url_launcher/url_launcher.dart'; // Import url_launcher

// Define a simple data model for gallery items
class GalleryItem {
  final String imageUrl;
  final String? link; // Nullable link
  final String? title; // Optional title

  GalleryItem({required this.imageUrl, this.link, this.title});
}

class SliderItem {
  final String imageUrl;
  final String? link;
  final String? title;

  SliderItem({required this.imageUrl, this.link, this.title});
}

class WelcomeScreen extends StatefulWidget {
  const WelcomeScreen({Key? key}) : super(key: key);

  @override
  State<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends State<WelcomeScreen> {
  List<SliderItem> sliderItems = [];
  List<GalleryItem> galleryItems = []; // Use GalleryItem list
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchSliders();
    _fetchGalleryImages(); // Fetch gallery images on init
  }

  Future<void> _fetchSliders() async {
    try {
      final querySnapshot = await FirebaseFirestore.instance.collection('sliders').get();
      setState(() {
        sliderItems = querySnapshot.docs.map((doc) {
          final data = doc.data() as Map<String, dynamic>;
          return SliderItem(
            imageUrl: data['imageUrl'] as String,
            link: data['link'] as String?,
            title: data['title'] as String?,
          );
        }).toList();
      });
    } catch (e) {
      print("Error fetching sliders: $e");
      // Optionally show an error message to the user
    } finally {
      _checkLoadingStatus();
    }
  }

  Future<void> _fetchGalleryImages() async {
    try {
      final querySnapshot = await FirebaseFirestore.instance.collection('gallery').get();
      setState(() {
        galleryItems = querySnapshot.docs.map((doc) {
          final data = doc.data() as Map<String, dynamic>;
          return GalleryItem(
            imageUrl: data['imageUrl'] as String,
            link: data['link'] as String?, // Fetch link, it can be null
            title: data['title'] as String?,
          );
        }).toList();
      });
    } catch (e) {
      print("Error fetching gallery images: $e");
      // Optionally show an error message to the user
    } finally {
      _checkLoadingStatus();
    }
  }

  void _checkLoadingStatus() {
    if (sliderItems.isNotEmpty || galleryItems.isNotEmpty) {
      setState(() {
        _isLoading = false;
      });
    } else {
      // If both are empty, still set loading to false after attempts
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _openUrlWithOptionalTitle(String? link, String? title) async {
    final defaultUrl = Uri.parse('https://www.emaamconstructions.com/');
    final urlToLaunch = link != null && link.isNotEmpty ? Uri.parse(link) : defaultUrl;

    if (title != null && title.isNotEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(title)));
    }

    if (await canLaunchUrl(urlToLaunch)) {
      await launchUrl(urlToLaunch, mode: LaunchMode.externalApplication);
    } else {
      print('Could not launch $urlToLaunch');
      // Optionally show an error message to the user
    }
  }

  Future<void> _onGalleryImageTap(String? link, String? title) async {
    await _openUrlWithOptionalTitle(link, title);
  }

  Future<void> _onSliderTap(String? link, String? title) async {
    await _openUrlWithOptionalTitle(link, title);
  }

  void _loginAsAgent() {
    // Navigate to the agent login screen
    Navigator.of(context).push(
      MaterialPageRoute(builder: (context) => const LoginPage()), // Navigate to the LoginPage for agents
    );
  }

  void _loginAsUser() {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (context) => const ClientLoginScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        title: const Text('Welcome to Emaam Constructions'),
        backgroundColor: Colors.transparent, // Transparent for gradient
        elevation: 0,
        foregroundColor: primaryColor,
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Colors.black,
              Color(0xFF261D04), // Deep Dark Gold
              Colors.black,
            ], 
            stops: [0.0, 0.5, 1.0],
          ),
        ),
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : SafeArea(
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 20), // Add top margin to the slider
                      // Sliders Section
                      if (sliderItems.isNotEmpty)
                        carousel_slider.CarouselSlider( // Use the aliased CarouselSlider
                          options: carousel_slider.CarouselOptions(
                            height: 220.0,
                            enlargeCenterPage: true,
                            autoPlay: true,
                            aspectRatio: 16 / 9,
                            autoPlayCurve: Curves.fastOutSlowIn,
                            enableInfiniteScroll: true,
                            autoPlayAnimationDuration: const Duration(milliseconds: 800),
                            viewportFraction: 0.9,
                          ),
                          items: sliderItems.map((item) {
                            return Builder(
                              builder: (BuildContext context) {
                                return GestureDetector(
                                  onTap: () => _onSliderTap(item.link, item.title),
                                  child: Container(
                                    width: MediaQuery.of(context).size.width,
                                    margin: const EdgeInsets.symmetric(horizontal: 8.0),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF1E1E1E), // Dark placeholder
                                      borderRadius: BorderRadius.circular(8.0),
                                      border: Border.all(color: primaryColor.withOpacity(0.3)),
                                    ),
                                    child: Stack(
                                      fit: StackFit.expand,
                                      children: [
                                        ClipRRect(
                                          borderRadius: BorderRadius.circular(8.0),
                                          child: Image.network(
                                            item.imageUrl,
                                            fit: BoxFit.cover,
                                            errorBuilder: (context, error, stackTrace) => const Center(child: Icon(Icons.error, color: primaryColor)),
                                          ),
                                        ),
                                        if (item.title != null && item.title!.isNotEmpty)
                                          Positioned(
                                            left: 0,
                                            right: 0,
                                            bottom: 0,
                                            child: Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                              decoration: BoxDecoration(
                                                color: Colors.black.withOpacity(0.7),
                                                borderRadius: const BorderRadius.only(
                                                  bottomLeft: Radius.circular(8.0),
                                                  bottomRight: Radius.circular(8.0),
                                                ),
                                              ),
                                              child: Text(
                                                item.title!,
                                                style: const TextStyle(color: primaryColor, fontSize: 16, fontWeight: FontWeight.bold),
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                            ),
                                          ),
                                      ],
                                    ),
                                  ),
                                );
                              },
                            );
                          }).toList(),
                        )
                      else
                        Container(
                          height: 200,
                          color: const Color(0xFF1E1E1E),
                          child: const Center(child: Text('No sliders available', style: TextStyle(color: Colors.white54))),
                        ),
                      const SizedBox(height: 20),

                      // About Us Section
                      Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: const [
                            Text(
                              'ABOUT US',
                              style: TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                                color: primaryColor,
                              ),
                            ),
                            SizedBox(height: 10),
                            Text(
                              'At Emaam Constructions, we do things differently. Our focus isn’t just on building homes or selling land, it’s on creating real value for our clients.',
                              style: TextStyle(fontSize: 16, color: Colors.white),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 10),

                      // Gallery Section
                      Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'PROPERTIES',
                              style: TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                                color: primaryColor,
                              ),
                            ),
                            const SizedBox(height: 10),
                            if (galleryItems.isNotEmpty)
                              GridView.builder(
                                shrinkWrap: true, // Important for nested scroll views
                                physics: const NeverScrollableScrollPhysics(), // Disable GridView's own scrolling
                                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                                  crossAxisCount: 2, // 2 images per row
                                  crossAxisSpacing: 10.0,
                                  mainAxisSpacing: 10.0,
                                ),
                                itemCount: galleryItems.length,
                                itemBuilder: (context, index) {
                                  final item = galleryItems[index];
                                  return GestureDetector(
                                    onTap: () => _onGalleryImageTap(item.link, item.title),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.stretch,
                                      children: [
                                        Expanded(
                                          child: Container(
                                            decoration: BoxDecoration(
                                               borderRadius: BorderRadius.circular(8.0),
                                               border: Border.all(color: primaryColor.withOpacity(0.3)),
                                            ),
                                            child: ClipRRect(
                                              borderRadius: BorderRadius.circular(8.0),
                                              child: Image.network(
                                                item.imageUrl,
                                                fit: BoxFit.cover,
                                                errorBuilder: (context, error, stackTrace) => const Center(child: Icon(Icons.error, color: primaryColor)),
                                              ),
                                            ),
                                          ),
                                        ),
                                        if (item.title != null && item.title!.isNotEmpty)
                                          Padding(
                                            padding: const EdgeInsets.only(top: 6.0),
                                            child: Text(
                                              item.title!,
                                              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.white),
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ),
                                      ],
                                    ),
                                  );
                                },
                              )
                            else
                              Container(
                                height: 150,
                                color: const Color(0xFF1E1E1E),
                                child: const Center(child: Text('No gallery images available', style: TextStyle(color: Colors.white54))),
                              ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16.0),
                        child: SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: () async {
                              final Uri url = Uri.parse('https://forms.gle/aeq7UaRfpxZtp87n7');
                              if (await canLaunchUrl(url)) {
                                await launchUrl(url, mode: LaunchMode.externalApplication);
                              } else {
                                if (!context.mounted) return;
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Could not open form')),
                                );
                              }
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: primaryColor,
                              foregroundColor: Colors.black,
                              padding: const EdgeInsets.symmetric(vertical: 15),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                            child: const Text(
                              'Plot Purchase Application',
                              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),
                    ],
                  ),
                ),
              ),
      ),
      bottomNavigationBar: Container(
        color: Colors.black, // Ensure bottom bar background matches
        padding: const EdgeInsets.all(16.0),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            Expanded(
              child: ElevatedButton(
                onPressed: _loginAsAgent,
                style: ElevatedButton.styleFrom(
                  backgroundColor: primaryColor, // Gold
                  foregroundColor: Colors.black, // Black Text
                  padding: const EdgeInsets.symmetric(vertical: 15),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: const Text(
                  'Login as Agent',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: OutlinedButton( // Use OutlinedButton for User for distinction
                onPressed: _loginAsUser,
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: primaryColor, width: 2), // Gold Border
                  foregroundColor: primaryColor, // Gold Text
                  padding: const EdgeInsets.symmetric(vertical: 15),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: const Text(
                  'Login as User',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
