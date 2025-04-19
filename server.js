const express = require('express');
const socketIo = require('socket.io');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Tournament state
let tournament = {
  name: '',
  players: [],
  matches: [],
  bracket: [],
  isStarted: false,
  winner: null,
  stats: {
    topScorer: null,
    mostAssists: null,
    bestDefense: null
  }
};

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
  console.log('New client connected');
  socket.emit('tournamentUpdate', tournament);

  socket.on('createTournament', (data) => {
    tournament = {
      name: data.name,
      players: data.players,
      matches: generateInitialMatches(data.players),
      bracket: generateBracketStructure(data.players),
      isStarted: true,
      winner: null,
      stats: {
        topScorer: null,
        mostAssists: null,
        bestDefense: null
      }
    };
    io.emit('tournamentUpdate', tournament);
  });

  socket.on('updateScore', (matchUpdate) => {
    const { matchId, scoreA, scoreB, details } = matchUpdate;
    updateMatchScore(matchId, scoreA, scoreB, details);
    
    const [roundIndex] = matchId.split('-').map(Number);
    if (checkRoundCompletion(roundIndex)) {
      if (isFinalRound(roundIndex)) {
        completeTournament();
      } else {
        generateNextRound(roundIndex);
      }
    }
    io.emit('tournamentUpdate', tournament);
  });
});

// Tournament logic functions
function generateInitialMatches(players) {
  return Array.from({ length: players.length / 2 }, (_, i) => ({
    matchId: `0-${i}`,
    playerA: players[i*2],
    playerB: players[i*2+1],
    scoreA: null,
    scoreB: null,
    winner: null,
    details: null
  }));
}

function generateBracketStructure(players) {
  const rounds = Math.log2(players.length);
  return Array.from({ length: rounds }, (_, round) => ({
    roundNumber: round + 1,
    complete: false,
    matches: Array.from({ length: players.length / Math.pow(2, round + 1) }, (_, match) => ({
      matchId: `${round}-${match}`,
      playerA: round === 0 ? players[match*2] : null,
      playerB: round === 0 ? players[match*2+1] : null,
      scoreA: null,
      scoreB: null,
      winner: null,
      details: null
    }))
  }));
}

function updateMatchScore(matchId, scoreA, scoreB, details) {
  const [roundIndex, matchIndex] = matchId.split('-').map(Number);
  const match = tournament.matches.find(m => m.matchId === matchId);
  
  if (match) {
    match.scoreA = scoreA;
    match.scoreB = scoreB;
    match.winner = scoreA > scoreB ? match.playerA : match.playerB;
    match.details = details;
    
    // Update bracket
    tournament.bracket[roundIndex].matches[matchIndex] = {...match};
    
    // Update player stats
    updatePlayerStats(match.playerA.id, details.playersA);
    updatePlayerStats(match.playerB.id, details.playersB);
  }
}

function updatePlayerStats(playerId, playerStats) {
  const player = tournament.players.find(p => p.id === playerId);
  if (!player.stats) player.stats = { goals: 0, assists: 0, cleanSheets: 0 };
  
  playerStats.forEach(stat => {
    player.stats.goals += stat.goals || 0;
    player.stats.assists += stat.assists || 0;
    if (stat.cleanSheet) player.stats.cleanSheets += 1;
  });
}

function checkRoundCompletion(roundIndex) {
  return tournament.bracket[roundIndex].matches.every(m => m.winner);
}

function isFinalRound(roundIndex) {
  return roundIndex === tournament.bracket.length - 1;
}

function generateNextRound(roundIndex) {
  tournament.bracket[roundIndex].complete = true;
  const nextRound = tournament.bracket[roundIndex + 1];
  const winners = tournament.bracket[roundIndex].matches.map(m => m.winner);
  
  winners.forEach((winner, i) => {
    const matchIndex = Math.floor(i / 2);
    if (i % 2 === 0) {
      nextRound.matches[matchIndex].playerA = winner;
    } else {
      nextRound.matches[matchIndex].playerB = winner;
    }
  });
  
  // Add new matches to flat array
  nextRound.matches.forEach((match, i) => {
    tournament.matches.push({
      ...match,
      matchId: `${roundIndex + 1}-${i}`
    });
  });
}

function completeTournament() {
  const finalRound = tournament.bracket[tournament.bracket.length - 1];
  tournament.winner = finalRound.matches[0].winner;
  tournament.isStarted = false;
  calculateTournamentStats();
}

function calculateTournamentStats() {
  tournament.stats.topScorer = [...tournament.players]
    .sort((a, b) => (b.stats?.goals || 0) - (a.stats?.goals || 0))[0];
  tournament.stats.mostAssists = [...tournament.players]
    .sort((a, b) => (b.stats?.assists || 0) - (a.stats?.assists || 0))[0];
  tournament.stats.bestDefense = [...tournament.players]
    .sort((a, b) => (b.stats?.cleanSheets || 0) - (a.stats?.cleanSheets || 0))[0];
}

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`LAN access: http://${getLocalIP()}:${PORT}`);
});

function getLocalIP() {
  const interfaces = require('os').networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}