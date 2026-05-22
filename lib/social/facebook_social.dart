@JS()
library facebook_instant_games;

import 'dart:js_util';
import 'package:js/js.dart';
import 'social_platform.dart';

// JS Interop definitions for FBInstant SDK
@JS('FBInstant')
class FBInstant {
  external static Future<void> initializeAsync();
  external static Future<void> startGameAsync();
  external static FBPlayer get player;
  external static Future<FBLeaderboard> getLeaderboardAsync(String name);
}

@JS()
class FBPlayer {
  external String getName();
  external String getID();
  external String? getPhoto();
}

@JS()
class FBLeaderboard {
  external Future<FBLeaderboardEntry> setScoreAsync(int score, [String extraData]);
  external Future<List<FBLeaderboardEntry>> getEntriesAsync(int count, int offset);
}

@JS()
class FBLeaderboardEntry {
  external int getScore();
  external int getRank();
  external FBPlayer getPlayer();
}

SocialPlatform createPlatform() => FacebookSocialPlatform();

class FacebookSocialPlatform implements SocialPlatform {
  UserProfile? _currentUser;
  bool _isFBActive = false;

  @override
  UserProfile? get currentUser => _currentUser;

  @override
  Future<void> initialize() async {
    try {
      // Check if FBInstant is available in the window context
      final fbInstantExists = hasProperty(globalThis, 'FBInstant');
      if (fbInstantExists) {
        await promiseToFuture(FBInstant.initializeAsync());
        await promiseToFuture(FBInstant.startGameAsync());
        _isFBActive = true;
        
        // Grab current player details
        final player = FBInstant.player;
        _currentUser = UserProfile(
          id: player.getID(),
          displayName: player.getName(),
          photoUrl: player.getPhoto(),
        );
      } else {
        print("Facebook Instant Games SDK not found. Operating in simulation mode.");
      }
    } catch (e) {
      print("Failed to initialize Facebook Social Platform: $e");
    }
  }

  @override
  Future<UserProfile?> login() async {
    if (!_isFBActive) {
      // Fallback
      _currentUser = UserProfile(
        id: 'fb_mock_user_999',
        displayName: 'FB Web Player',
      );
      return _currentUser;
    }
    return _currentUser;
  }

  @override
  Future<void> submitScore(int score) async {
    if (!_isFBActive) return;
    try {
      final leaderboard = await promiseToFuture<FBLeaderboard>(
        FBInstant.getLeaderboardAsync('open_yatzy_global_leaderboard')
      );
      await promiseToFuture(leaderboard.setScoreAsync(score));
    } catch (e) {
      print("Error submitting score to FB Leaderboard: $e");
    }
  }

  @override
  Future<List<Map<String, dynamic>>> getLeaderboard() async {
    if (!_isFBActive) {
      return [
        {'name': 'Stella_Ludo', 'score': 324, 'rank': 1, 'photoUrl': null},
        {'name': 'FB Web Player', 'score': 210, 'rank': 2, 'photoUrl': null},
        {'name': 'DiceNinja', 'score': 180, 'rank': 3, 'photoUrl': null},
      ];
    }
    
    try {
      final leaderboard = await promiseToFuture<FBLeaderboard>(
        FBInstant.getLeaderboardAsync('open_yatzy_global_leaderboard')
      );
      final entries = await promiseToFuture<List<dynamic>>(
        leaderboard.getEntriesAsync(50, 0)
      );
      
      return entries.map((entry) {
        final fbEntry = entry as FBLeaderboardEntry;
        final player = fbEntry.getPlayer();
        return {
          'name': player.getName(),
          'score': fbEntry.getScore(),
          'rank': fbEntry.getRank(),
          'photoUrl': player.getPhoto(),
        };
      }).toList();
    } catch (e) {
      print("Error fetching FB Leaderboard: $e");
      return [];
    }
  }
}
