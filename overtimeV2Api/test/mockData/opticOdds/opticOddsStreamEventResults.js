const streamResultsEvent = {
  data: {
    fixture_id: "3DA34AEB6566",
    is_live: true,
    league: "UEFA - Nations League",
    player_results: [],
    score: {
      sport: {
        id: "soccer",
        name: "Soccer",
      },
      league: {
        id: "uefa_-_nations_league",
        name: "UEFA - Nations League",
      },
      fixture: {
        id: "3DA34AEB6566",
        game_id: "41571-32765-2024-11-19",
        start_date: "2024-11-19T19:45:00Z",
        home_competitors: [
          {
            id: "7DAC26FE4F9B",
            name: "Montenegro",
            abbreviation: "MNE",
            logo: "https://cdn.opticodds.com/team-logos/soccer/6095.png",
          },
        ],
        away_competitors: [
          {
            id: "2C7B844242F1",
            name: "Türkiye",
            abbreviation: "TUR",
            logo: "https://cdn.opticodds.com/team-logos/soccer/6071.png",
          },
        ],
        home_team_display: "Montenegro",
        away_team_display: "Türkiye",
        status: "live",
        is_live: true,
      },
      scores: {
        home: {
          total: 3.0,
          periods: {
            period_1: 0.0,
            period_2: 0.0,
          },
          aggregate: null,
        },
        away: {
          total: 2.0,
          periods: {
            period_1: 0.0,
            period_2: 0.0,
          },
          aggregate: null,
        },
      },
      in_play: {
        period: "2H",
        clock: "77",
        last_play: null,
        time_min: null,
        time_sec: null,
        balls: null,
        outs: null,
        strikes: null,
        runners: null,
        batter: null,
        pitcher: null,
        possession: null,
        down: null,
        distance_to_go: null,
        field_position: null,
      },
      events: [],
      stats: null,
      extra: {
        decision: null,
        decision_method: null,
      },
      retirement_info: null,
    },
    sport: "soccer",
  },
  entry_id: "1722523617827-0",
};

// simulates multiple events
const streamResultsEvents = [streamResultsEvent];

module.exports = { streamResultsEvents };
