const liveApiFixtures = [
  {
    id: "047DE4F72D90",
    game_id: "15560-42607-2024-11-27",
    start_date: "2024-11-27T10:00:00Z",
    home_competitors: [
      {
        id: "82662BA48A52",
        name: "Yokohama F. Marinos",
        abbreviation: "FMA",
        logo: "https://cdn.opticodds.com/team-logos/soccer/2803.png",
      },
    ],
    away_competitors: [
      {
        id: "C1A01D308894",
        name: "FC Pohang Steelers",
        abbreviation: "POH",
        logo: "https://cdn.opticodds.com/team-logos/soccer/2767.png",
      },
    ],
    home_team_display: "Yokohama F. Marinos",
    away_team_display: "FC Pohang Steelers",
    status: "live",
    is_live: true,
    sport: {
      id: "soccer",
      name: "Soccer",
    },
    league: {
      id: "afc_-_champions_league",
      name: "AFC - Champions League",
    },
    home_starter: null,
    home_record: null,
    home_seed: null,
    home_rotation_number: 30107,
    away_starter: null,
    away_record: null,
    away_seed: null,
    away_rotation_number: 30106,
    tournament: null,
    tournament_stage: null,
    has_odds: true,
    venue_name: "Nissan Stadium",
    venue_location: null,
    venue_neutral: false,
    broadcast: null,
    result: {
      scores: {
        home: {
          total: 1.0,
        },
        away: {
          total: 0.0,
        },
      },
      in_play_data: {
        period: "2H",
        clock: "49",
        last_play: null,
      },
    },
    lineups: {
      home: [],
      away: [],
    },
    season_type: "League Stage",
    season_year: "2024/2025",
    season_week: "5",
    weather: null,
    weather_temp: null,
    source_ids: {},
  },
];

module.exports = { liveApiFixtures };
