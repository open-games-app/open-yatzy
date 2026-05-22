export class SocialPlatform {
  constructor() {
    this.currentUser = null;
    this.isFBActive = false;
    this.leaderboard = [
      { name: 'Stella_Ludo', score: 324, rank: 1, photoUrl: null },
      { name: 'Galaxy_Rolls', score: 295, rank: 2, photoUrl: null },
      { name: 'OpenYatzyMaster', score: 240, rank: 3, photoUrl: null },
      { name: 'DiceNinja', score: 180, rank: 4, photoUrl: null }
    ];
  }

  async initialize() {
    if (typeof FBInstant !== 'undefined') {
      try {
        await FBInstant.initializeAsync();
        await FBInstant.startGameAsync();
        this.isFBActive = true;
        this.currentUser = {
          id: FBInstant.player.getID(),
          displayName: FBInstant.player.getName(),
          photoUrl: FBInstant.player.getPhoto()
        };
      } catch (e) {
        console.error('FBInstant initialization failed:', e);
      }
    } else {
      console.log('FBInstant SDK not found, playing in simulation mode.');
    }
  }

  async login() {
    if (this.isFBActive) return this.currentUser;
    // Simulate login
    await new Promise(r => setTimeout(r, 400));
    this.currentUser = {
      id: 'web_sim_user_123',
      displayName: 'Guest Player'
    };
    return this.currentUser;
  }

  async submitScore(score) {
    if (this.isFBActive) {
      try {
        const lb = await FBInstant.getLeaderboardAsync('open_yatzy_global_leaderboard');
        await lb.setScoreAsync(score);
      } catch (e) {
        console.error('Failed to submit score to FBInstant:', e);
      }
      return;
    }

    if (!this.currentUser) return;
    
    // Simulating updates
    const name = this.currentUser.displayName;
    this.leaderboard = this.leaderboard.filter(e => e.name !== name);
    this.leaderboard.push({
      name,
      score,
      rank: 0,
      photoUrl: this.currentUser.photoUrl
    });

    this.leaderboard.sort((a, b) => b.score - a.score);
    this.leaderboard.forEach((e, idx) => {
      e.rank = idx + 1;
    });
  }

  async getLeaderboard() {
    if (this.isFBActive) {
      try {
        const lb = await FBInstant.getLeaderboardAsync('open_yatzy_global_leaderboard');
        const entries = await lb.getEntriesAsync(50, 0);
        return entries.map(e => ({
          name: e.getPlayer().getName(),
          score: e.getScore(),
          rank: e.getRank(),
          photoUrl: e.getPlayer().getPhoto()
        }));
      } catch (e) {
        console.error('Failed to fetch FBInstant leaderboard:', e);
      }
    }
    return [...this.leaderboard];
  }
}
