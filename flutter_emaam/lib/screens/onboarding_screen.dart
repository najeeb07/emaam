import 'package:flutter/material.dart';
import 'package:introduction_screen/introduction_screen.dart';
import 'package:emaam/screens/welcome_screen.dart'; // Import the new welcome screen

class OnboardingScreen extends StatelessWidget {
  final VoidCallback? onDoneCallback;
  const OnboardingScreen({Key? key, this.onDoneCallback}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return IntroductionScreen(
      pages: [
        PageViewModel(
          title: "Smart Investment",
          body: "Turn your savings into secured assets with plots, villas, and farmlands.\nBuild wealth that grows with time.",
          image: Image.asset('assets/image/v1.png', height: 200),
        ),
        PageViewModel(
          title: "Trust Emaam",
          body: "With years of experience in real estate, Emaam stands for reliability.\nYour dream home is safe in trusted hands.",
          image: Image.asset('assets/image/v2.png', height: 200),
        ),
        PageViewModel(
          title: "Future Security",
          body: "Invest today for a brighter tomorrow.\nProperties that ensure stability for generations.",
          image: Image.asset('assets/image/v3.png', height: 200),
        ),
      ],
      onDone: onDoneCallback ?? () {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (context) => const WelcomeScreen()),
        );
      },
      showSkipButton: true,
      skip: const Text("Skip"),
      next: const Icon(Icons.arrow_forward),
      done: const Text("Done", style: TextStyle(fontWeight: FontWeight.w600)),
      dotsDecorator: const DotsDecorator(
        size: Size(10.0, 10.0),
        color: Colors.black26,
        activeSize: Size(22.0, 10.0),
        activeShape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(25.0)),
        ),
      ),
    );
  }
}
