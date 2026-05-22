import 'social_platform.dart';

SocialPlatform createPlatform() => FirebaseSocialPlatform();

/// Firebase Auth / Firestore implementation for native Android and iOS targets.
class FirebaseSocialPlatform implements SocialPlatform {
  UserProfile? _currentUser;
  final List<Map<String, dynamic>> _nativeLeaderboard = [
    {'name': 'Stella_Ludo', 'score': 324, 'rank': 1, 'photoUrl': null},
    {'name': 'Firebase Native', 'score': 285, 'rank': 2, 'photoUrl': null},
    {'name': 'AndroidRoll', 'score': 195, 'rank': 3, 'photoUrl': null},
    {'name': 'iOSSwifter', 'score': 150, 'rank': 4, 'photoUrl': null},
  ];

  @override
  UserProfile? get currentUser => _currentUser;

  @override
  Future<void> initialize() async {
    // Simulating Firebase.initializeApp() delay
    await Future.delayed(const Duration(milliseconds: 400));
  }

  @override
  Future<UserProfile?> login() async {
    // Simulating Firebase Auth login flow
    await Future.delayed(const Duration(milliseconds: 600));
    _currentUser = UserProfile(
      id: 'firebase_uid_88888',
      displayName: 'Native Gamer',
    );
    return _currentUser;
  }

  @override
  Future<void> submitScore(int score) async {
    // Simulating Firestore document set / update
    await Future.delayed(const Duration(milliseconds: 300));
    if (_currentUser == null) return;

    _nativeLeaderboard.removeWhere((item) => item['name'] == _currentUser!.displayName);
    _nativeLeaderboard.add({
      'name': _currentUser!.displayName,
      'score': score,
      'rank': 0,
      'photoUrl': _currentUser!.photoUrl,
    });

    _nativeLeaderboard.sort((a, b) => (b['score'] as int).compareTo(a['score'] as int));
    for (int i = 0; i < _nativeLeaderboard.length; i++) {
      _nativeLeaderboard[i]['rank'] = i + 1;
    }
  }

  @override
  Future<List<Map<String, dynamic>>> getLeaderboard() async {
    // Simulating Firestore collection get
    await Future.delayed(const Duration(milliseconds: 500));
    return List.from(_nativeLeaderboard);
  }
}
