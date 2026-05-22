import 'social_platform.dart';

SocialPlatform createPlatform() => StubSocialPlatform();

/// A fallback in-memory implementation of SocialPlatform for local testing/development.
class StubSocialPlatform implements SocialPlatform {
  UserProfile? _currentUser;
  final List<Map<String, dynamic>> _mockLeaderboard = [
    {'name': 'Stella_Ludo', 'score': 324, 'rank': 1, 'photoUrl': null},
    {'name': 'Galaxy_Rolls', 'score': 295, 'rank': 2, 'photoUrl': null},
    {'name': 'OpenYatzyMaster', 'score': 240, 'rank': 3, 'photoUrl': null},
    {'name': 'DiceNinja', 'score': 180, 'rank': 4, 'photoUrl': null},
  ];

  @override
  UserProfile? get currentUser => _currentUser;

  @override
  Future<void> initialize() async {
    // Simulating minor network delay
    await Future.delayed(const Duration(milliseconds: 300));
  }

  @override
  Future<UserProfile?> login() async {
    await Future.delayed(const Duration(milliseconds: 500));
    _currentUser = UserProfile(
      id: 'stub_user_123',
      displayName: 'Guest Player',
    );
    return _currentUser;
  }

  @override
  Future<void> submitScore(int score) async {
    await Future.delayed(const Duration(milliseconds: 200));
    if (_currentUser == null) return;
    
    // Remove if already exists
    _mockLeaderboard.removeWhere((item) => item['name'] == _currentUser!.displayName);
    
    _mockLeaderboard.add({
      'name': _currentUser!.displayName,
      'score': score,
      'rank': 0, // Computed dynamically below
      'photoUrl': _currentUser!.photoUrl,
    });
    
    // Sort and rank
    _mockLeaderboard.sort((a, b) => (b['score'] as int).compareTo(a['score'] as int));
    for (int i = 0; i < _mockLeaderboard.length; i++) {
      _mockLeaderboard[i]['rank'] = i + 1;
    }
  }

  @override
  Future<List<Map<String, dynamic>>> getLeaderboard() async {
    await Future.delayed(const Duration(milliseconds: 400));
    return List.from(_mockLeaderboard);
  }
}
