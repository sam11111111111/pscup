const socket = io();

socket.on('tournamentUpdate', (data) => {
  document.getElementById('tournamentTitle').textContent = 
    data.name || 'Waiting for tournament to start...';
  
  renderBracket(data);
  renderAnnouncements(data);
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






function renderAnnouncements(data) {
  const announcements = document.getElementById('announcements');
  announcements.innerHTML = '';
  
  if (data.winner) {
    const announcement = document.createElement('div');
    announcement.className = 'announcement';
    announcement.innerHTML = `
      <h3>Tournament Complete!</h3>
      <p>${data.winner.name} from ${data.winner.club} has won the tournament!</p>
    `;
    announcements.appendChild(announcement);
  }
}

function sendChat() {
  const input = document.getElementById('chatInput');
  if (input.value.trim()) {
    socket.emit('chatMessage', input.value);
    input.value = '';
  }
}

socket.on('chatMessage', (msg) => {
  const chatBox = document.getElementById('chatBox');
  const message = document.createElement('div');
  message.textContent = msg;
  chatBox.appendChild(message);
  chatBox.scrollTop = chatBox.scrollHeight;
});