const socket = io();
let tournamentData = null;

function addPlayerField() {
  const container = document.getElementById('playerFields');
  const count = container.children.length + 1;
  
  const div = document.createElement('div');
  div.className = 'player-input';
  div.innerHTML = `
    <input type="text" placeholder="Player ${count} Name" class="player-name">
    <input type="text" placeholder="Club" class="player-club">
  `;
  
  container.appendChild(div);
}

function createTournament() {
  const name = document.getElementById('tournamentName').value;
  const nameInputs = document.querySelectorAll('.player-name');
  const clubInputs = document.querySelectorAll('.player-club');
  
  const players = Array.from(nameInputs).map((input, index) => ({
    id: index + 1,
    name: input.value,
    club: clubInputs[index].value
  }));
  
  socket.emit('createTournament', { name, players });
}

socket.on('tournamentUpdate', (data) => {
  tournamentData = data;
  renderBracket();
});






function renderBracket(data) {
  const bracketView = document.getElementById('bracketView');
  bracketView.innerHTML = `<h3>${data.name}</h3>`;
  
  data.bracket.forEach(round => {
    const roundDiv = document.createElement('div');
    roundDiv.className = 'round';
    roundDiv.innerHTML = `<h4>${getRoundName(round.roundNumber, data.bracket.length)}</h4>`;
    
    round.matches.forEach((match, index) => {
      const matchDiv = document.createElement('div');
      matchDiv.className = `match ${match.winner ? 'completed' : ''}`;
      
      const playerAName = match.playerA ? `${match.playerA.name} (${match.playerA.club})` : 'TBD';
      const playerBName = match.playerB ? `${match.playerB.name} (${match.playerB.club})` : 'TBD';
      
      let scoreText = '';
      if (match.scoreA !== null && match.scoreB !== null) {
        scoreText = `<div class="score">${match.scoreA} - ${match.scoreB}</div>`;
      }
      
      matchDiv.innerHTML = `
        <div class="match-players">
          <div class="player ${match.winner === match.playerA ? 'winner' : ''}">${playerAName}</div>
          <div class="vs">vs</div>
          <div class="player ${match.winner === match.playerB ? 'winner' : ''}">${playerBName}</div>
          ${scoreText}
        </div>
      `;
      
      roundDiv.appendChild(matchDiv);
    });
    
    bracketView.appendChild(roundDiv);
  });
}

function getRoundName(roundNumber, totalRounds) {
  const roundNames = {
    1: ['Final', 'Semifinal', 'Quarterfinal'],
    2: ['Final', 'Semifinal'],
    3: ['Final']
  };
  
  return roundNames[totalRounds][roundNumber - 1] || `Round ${roundNumber}`;
}





function updateScore(matchIndex) {
  const scoreA = parseInt(document.getElementById(`scoreA_${matchIndex}`).value);
  const scoreB = parseInt(document.getElementById(`scoreB_${matchIndex}`).value);
  
  socket.emit('updateScore', {
    matchId: matchIndex,
    scoreA: scoreA,
    scoreB: scoreB
  });
}