import 'dart:math';

/// Represents the 13 scoring categories in a standard Yatzy scorecard.
enum ScoringCategory {
  ones,
  twos,
  threes,
  fours,
  fives,
  sixes,
  threeOfAKind,
  fourOfAKind,
  fullHouse,
  smallStraight,
  largeStraight,
  yatzy,
  chance,
}

/// Core Yatzy game engine managing game rules, states, and score computations.
class YatzyEngine {
  final Random _random = Random();

  // Current dice values [1-6] for the 5 dice.
  List<int> _diceValues = List.filled(5, 1);
  
  // Vectors representing whether each die is held (true) or active (false).
  List<bool> _heldDice = List.filled(5, false);
  
  // Remaining rolls in the current turn (max 3).
  int _rollsRemaining = 3;
  
  // Number of players (1 to 4)
  int _playerCount = 1;
  
  // List of player names
  List<String> _playerNames = ['Player 1'];
  
  // Index of the player currently taking their turn
  int _activePlayerIndex = 0;
  
  // Map of selected categories to their scores for each player.
  final List<Map<ScoringCategory, int?>> _scorecards = [];
  
  // Game over state.
  bool _isGameOver = false;

  YatzyEngine() {
    setupPlayers(1, ['Player 1']);
  }

  // Getters
  List<int> get diceValues => List.unmodifiable(_diceValues);
  List<bool> get heldDice => List.unmodifiable(_heldDice);
  int get rollsRemaining => _rollsRemaining;
  int get playerCount => _playerCount;
  List<String> get playerNames => List.unmodifiable(_playerNames);
  int get activePlayerIndex => _activePlayerIndex;
  List<Map<ScoringCategory, int?>> get scorecards => List.unmodifiable(_scorecards);
  bool get isGameOver => _isGameOver;

  /// Setup player count and custom names, resetting the game state.
  void setupPlayers(int count, List<String> names) {
    _playerCount = count;
    _playerNames = List.from(names);
    while (_playerNames.length < _playerCount) {
      _playerNames.add('Player ${_playerNames.length + 1}');
    }
    
    _scorecards.clear();
    for (int i = 0; i < _playerCount; i++) {
      final Map<ScoringCategory, int?> card = {};
      for (var cat in ScoringCategory.values) {
        card[cat] = null;
      }
      _scorecards.add(card);
    }
    
    resetGame();
  }

  /// Resets the game to the initial state using current players.
  void resetGame() {
    _diceValues = List.filled(5, 1);
    _heldDice = List.filled(5, false);
    _rollsRemaining = 3;
    _isGameOver = false;
    _activePlayerIndex = 0;
    
    for (int i = 0; i < _playerCount; i++) {
      for (var cat in ScoringCategory.values) {
        _scorecards[i][cat] = null;
      }
    }
  }

  /// Rolls all active (unheld) dice. Returns true if roll succeeded.
  bool rollDice() {
    if (_isGameOver || _rollsRemaining <= 0) {
      return false;
    }

    // Roll dice that are not held
    for (int i = 0; i < 5; i++) {
      if (!_heldDice[i] || _rollsRemaining == 3) {
        _diceValues[i] = _random.nextInt(6) + 1;
      }
    }
    
    // Once rolled, if it was the first roll, we clear all holds
    if (_rollsRemaining == 3) {
      _heldDice = List.filled(5, false);
    }

    _rollsRemaining--;
    return true;
  }

  /// Toggles the hold state for a die at a given index.
  /// Cannot hold dice before the first roll.
  bool toggleHold(int index) {
    if (index < 0 || index >= 5 || _rollsRemaining == 3 || _rollsRemaining < 0 || _isGameOver) {
      return false;
    }
    _heldDice[index] = !_heldDice[index];
    return true;
  }

  /// Selects a category to score the current dice roll for the active player.
  /// Resets turn counters, unholds all dice, and rotates the active player.
  bool selectCategory(ScoringCategory category) {
    if (_isGameOver || _rollsRemaining == 3 || _scorecards[_activePlayerIndex][category] != null) {
      return false;
    }

    // Calculate and assign score for the active player
    _scorecards[_activePlayerIndex][category] = calculateScore(category, _diceValues);

    // Reset dice details for next turn
    _diceValues = List.filled(5, 1);
    _heldDice = List.filled(5, false);
    _rollsRemaining = 3;

    // Check if game is over (all categories filled for all players)
    bool allFilled = true;
    for (int i = 0; i < _playerCount; i++) {
      if (!_scorecards[i].values.every((score) => score != null)) {
        allFilled = false;
        break;
      }
    }
    _isGameOver = allFilled;

    if (!_isGameOver) {
      // Rotate turns
      _activePlayerIndex = (_activePlayerIndex + 1) % _playerCount;
    }
    
    return true;
  }

  /// Computes the score for a specific category given a set of dice values.
  static int calculateScore(ScoringCategory category, List<int> dice) {
    // Helper frequency map
    final Map<int, int> counts = {};
    for (var d in dice) {
      counts[d] = (counts[d] ?? 0) + 1;
    }

    int sum = dice.fold(0, (prev, element) => prev + element);

    switch (category) {
      case ScoringCategory.ones:
        return (counts[1] ?? 0) * 1;
      case ScoringCategory.twos:
        return (counts[2] ?? 0) * 2;
      case ScoringCategory.threes:
        return (counts[3] ?? 0) * 3;
      case ScoringCategory.fours:
        return (counts[4] ?? 0) * 4;
      case ScoringCategory.fives:
        return (counts[5] ?? 0) * 5;
      case ScoringCategory.sixes:
        return (counts[6] ?? 0) * 6;

      case ScoringCategory.threeOfAKind:
        bool hasThree = counts.values.any((c) => c >= 3);
        return hasThree ? sum : 0;

      case ScoringCategory.fourOfAKind:
        bool hasFour = counts.values.any((c) => c >= 4);
        return hasFour ? sum : 0;

      case ScoringCategory.fullHouse:
        bool hasThree = counts.values.any((c) => c == 3);
        bool hasTwo = counts.values.any((c) => c == 2);
        bool hasFiveOfAKind = counts.values.any((c) => c == 5); // 5 of a kind counts as full house
        return (hasThree && hasTwo) || hasFiveOfAKind ? 25 : 0;

      case ScoringCategory.smallStraight:
        final diceSet = dice.toSet();
        if ((diceSet.contains(1) && diceSet.contains(2) && diceSet.contains(3) && diceSet.contains(4)) ||
            (diceSet.contains(2) && diceSet.contains(3) && diceSet.contains(4) && diceSet.contains(5)) ||
            (diceSet.contains(3) && diceSet.contains(4) && diceSet.contains(5) && diceSet.contains(6))) {
          return 30;
        }
        return 0;

      case ScoringCategory.largeStraight:
        final diceSet = dice.toSet();
        if ((diceSet.contains(1) && diceSet.contains(2) && diceSet.contains(3) && diceSet.contains(4) && diceSet.contains(5)) ||
            (diceSet.contains(2) && diceSet.contains(3) && diceSet.contains(4) && diceSet.contains(5) && diceSet.contains(6))) {
          return 40;
        }
        return 0;

      case ScoringCategory.yatzy:
        bool hasFive = counts.values.any((c) => c == 5);
        return hasFive ? 50 : 0;

      case ScoringCategory.chance:
        return sum;
    }
  }

  // Upper section sum (Ones through Sixes) for a player index
  int getUpperSectionSum([int? playerIndex]) {
    final idx = playerIndex ?? _activePlayerIndex;
    if (idx < 0 || idx >= _playerCount) return 0;
    
    int sum = 0;
    final upperCategories = [
      ScoringCategory.ones,
      ScoringCategory.twos,
      ScoringCategory.threes,
      ScoringCategory.fours,
      ScoringCategory.fives,
      ScoringCategory.sixes,
    ];
    for (var cat in upperCategories) {
      sum += _scorecards[idx][cat] ?? 0;
    }
    return sum;
  }

  // Upper section bonus (35 points if sum >= 63)
  int getUpperSectionBonus([int? playerIndex]) {
    return getUpperSectionSum(playerIndex) >= 63 ? 35 : 0;
  }

  // Lower section sum (Three of a Kind through Chance)
  int getLowerSectionSum([int? playerIndex]) {
    final idx = playerIndex ?? _activePlayerIndex;
    if (idx < 0 || idx >= _playerCount) return 0;
    
    int sum = 0;
    final lowerCategories = [
      ScoringCategory.threeOfAKind,
      ScoringCategory.fourOfAKind,
      ScoringCategory.fullHouse,
      ScoringCategory.smallStraight,
      ScoringCategory.largeStraight,
      ScoringCategory.yatzy,
      ScoringCategory.chance,
    ];
    for (var cat in lowerCategories) {
      sum += _scorecards[idx][cat] ?? 0;
    }
    return sum;
  }

  // Total scorecard score
  int getTotalScore([int? playerIndex]) {
    final idx = playerIndex ?? _activePlayerIndex;
    return getUpperSectionSum(idx) + getUpperSectionBonus(idx) + getLowerSectionSum(idx);
  }
}
