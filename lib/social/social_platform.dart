/// User Profile model containing credentials/identities from social platforms.
class UserProfile {
  final String id;
  final String displayName;
  final String? photoUrl;

  UserProfile({
    required this.id,
    required this.displayName,
    this.photoUrl,
  });
}

/// A unified contract for social actions, leaderboard syncing, and authorization.
abstract class SocialPlatform {
  /// The active profile. Null if not logged in.
  UserProfile? get currentUser;

  /// Initializes the social SDK interop.
  Future<void> initialize();

  /// Prompts the user to log in / authorize.
  Future<UserProfile?> login();

  /// Submits a new highscore to the platform's global leaderboard.
  Future<void> submitScore(int score);

  /// Retrieves the leaderboard entries (Map contains name, score, rank, photoUrl).
  Future<List<Map<String, dynamic>>> getLeaderboard();
}
