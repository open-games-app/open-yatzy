export const ScoringCategory = {
  ONES: 'ones',
  TWOS: 'twos',
  THREES: 'threes',
  FOURS: 'fours',
  FIVES: 'fives',
  SIXES: 'sixes',
  THREE_OF_A_KIND: 'threeOfAKind',
  FOUR_OF_A_KIND: 'fourOfAKind',
  FULL_HOUSE: 'fullHouse',
  SMALL_STRAIGHT: 'smallStraight',
  LARGE_STRAIGHT: 'largeStraight',
  YATZY: 'yatzy',
  CHANCE: 'chance'
};

export class YatzyEngine {
  constructor() {
    this.playerCount = 1;
    this.playerNames = ['Player 1'];
    this.activePlayerIndex = 0;
    this.scorecards = [];
    this.setupPlayers(1, ['Player 1']);
  }

  setupPlayers(count, names) {
    this.playerCount = count;
    this.playerNames = [...names];
    while (this.playerNames.length < this.playerCount) {
      this.playerNames.push(`Player ${this.playerNames.length + 1}`);
    }

    this.scorecards = [];
    for (let i = 0; i < this.playerCount; i++) {
      const card = {};
      for (const key of Object.values(ScoringCategory)) {
        card[key] = null;
      }
      this.scorecards.push(card);
    }

    this.resetGame();
  }

  resetGame() {
    this.diceValues = [1, 1, 1, 1, 1];
    this.heldDice = [false, false, false, false, false];
    this.rollsRemaining = 3;
    this.isGameOver = false;
    this.activePlayerIndex = 0;

    for (let i = 0; i < this.playerCount; i++) {
      for (const key of Object.values(ScoringCategory)) {
        this.scorecards[i][key] = null;
      }
    }
  }

  rollDice() {
    if (this.isGameOver || this.rollsRemaining <= 0) return false;
    for (let i = 0; i < 5; i++) {
      if (!this.heldDice[i] || this.rollsRemaining === 3) {
        this.diceValues[i] = Math.floor(Math.random() * 6) + 1;
      }
    }
    if (this.rollsRemaining === 3) {
      this.heldDice = [false, false, false, false, false];
    }
    this.rollsRemaining--;
    return true;
  }

  toggleHold(index) {
    if (index < 0 || index >= 5 || this.rollsRemaining === 3 || this.rollsRemaining < 0 || this.isGameOver) {
      return false;
    }
    this.heldDice[index] = !this.heldDice[index];
    return true;
  }

  selectCategory(category) {
    if (this.isGameOver || this.rollsRemaining === 3 || this.scorecards[this.activePlayerIndex][category] !== null) {
      return false;
    }
    this.scorecards[this.activePlayerIndex][category] = this.calculateScore(category, this.diceValues);
    this.diceValues = [1, 1, 1, 1, 1];
    this.heldDice = [false, false, false, false, false];
    this.rollsRemaining = 3;
    
    // Check if game is over (all cards filled)
    let allFilled = true;
    for (let i = 0; i < this.playerCount; i++) {
      if (!Object.values(this.scorecards[i]).every(val => val !== null)) {
        allFilled = false;
        break;
      }
    }
    this.isGameOver = allFilled;

    if (!this.isGameOver) {
      this.activePlayerIndex = (this.activePlayerIndex + 1) % this.playerCount;
    }
    return true;
  }

  calculateScore(category, dice) {
    const counts = {};
    for (const d of dice) {
      counts[d] = (counts[d] || 0) + 1;
    }
    const sum = dice.reduce((a, b) => a + b, 0);

    switch (category) {
      case ScoringCategory.ONES: return (counts[1] || 0) * 1;
      case ScoringCategory.TWOS: return (counts[2] || 0) * 2;
      case ScoringCategory.THREES: return (counts[3] || 0) * 3;
      case ScoringCategory.FOURS: return (counts[4] || 0) * 4;
      case ScoringCategory.FIVES: return (counts[5] || 0) * 5;
      case ScoringCategory.SIXES: return (counts[6] || 0) * 6;

      case ScoringCategory.THREE_OF_A_KIND:
        return Object.values(counts).some(c => c >= 3) ? sum : 0;
      case ScoringCategory.FOUR_OF_A_KIND:
        return Object.values(counts).some(c => c >= 4) ? sum : 0;
      case ScoringCategory.FULL_HOUSE: {
        const values = Object.values(counts);
        const hasThree = values.includes(3);
        const hasTwo = values.includes(2);
        const hasFive = values.includes(5);
        return (hasThree && hasTwo) || hasFive ? 25 : 0;
      }
      case ScoringCategory.SMALL_STRAIGHT: {
        const set = new Set(dice);
        if ((set.has(1) && set.has(2) && set.has(3) && set.has(4)) ||
            (set.has(2) && set.has(3) && set.has(4) && set.has(5)) ||
            (set.has(3) && set.has(4) && set.has(5) && set.has(6))) {
          return 30;
        }
        return 0;
      }
      case ScoringCategory.LARGE_STRAIGHT: {
        const set = new Set(dice);
        if ((set.has(1) && set.has(2) && set.has(3) && set.has(4) && set.has(5)) ||
            (set.has(2) && set.has(3) && set.has(4) && set.has(5) && set.has(6))) {
          return 40;
        }
        return 0;
      }
      case ScoringCategory.YATZY:
        return Object.values(counts).some(c => c === 5) ? 50 : 0;
      case ScoringCategory.CHANCE:
        return sum;
      default: return 0;
    }
  }

  getUpperSectionSum(playerIdx) {
    const idx = playerIdx !== undefined ? playerIdx : this.activePlayerIndex;
    const upperKeys = [
      ScoringCategory.ONES, ScoringCategory.TWOS, ScoringCategory.THREES,
      ScoringCategory.FOURS, ScoringCategory.FIVES, ScoringCategory.SIXES
    ];
    return upperKeys.reduce((sum, key) => sum + (this.scorecards[idx][key] || 0), 0);
  }

  getUpperSectionBonus(playerIdx) {
    return this.getUpperSectionSum(playerIdx) >= 63 ? 35 : 0;
  }

  getLowerSectionSum(playerIdx) {
    const idx = playerIdx !== undefined ? playerIdx : this.activePlayerIndex;
    const lowerKeys = [
      ScoringCategory.THREE_OF_A_KIND, ScoringCategory.FOUR_OF_A_KIND,
      ScoringCategory.FULL_HOUSE, ScoringCategory.SMALL_STRAIGHT,
      ScoringCategory.LARGE_STRAIGHT, ScoringCategory.YATZY, ScoringCategory.CHANCE
    ];
    return lowerKeys.reduce((sum, key) => sum + (this.scorecards[idx][key] || 0), 0);
  }

  getTotalScore(playerIdx) {
    const idx = playerIdx !== undefined ? playerIdx : this.activePlayerIndex;
    return this.getUpperSectionSum(idx) + this.getUpperSectionBonus(idx) + this.getLowerSectionSum(idx);
  }
}
