import {CONSTANTS} from './consts.js';
import {serverConnected, startLocalGame, getRooms, createRoom, joinRoom, sendMessage, startGame} from './main.js';
import {startMapEditor, initEditorToolbar} from './mapEditor.js';

let currentTab = 'mainMenu';

export function showMenuTab(tabId) {
	document.getElementById(currentTab).style.display = 'none';
	document.getElementById(tabId).style.display = 'flex';
	currentTab = tabId;
	switch (tabId) {
		case 'onlineMenu':
			refreshRoomList();
			break;
	}
}

export function menuInit() {
	document.getElementById('localGameButton').addEventListener('click', () => {
		startLocalGame();
		showMenuTab('lobby');
	});
	document.getElementById('onlineGameButton').addEventListener('click', () => showMenuTab('onlineMenu'));
	document.getElementById('refreshRoomsButton').addEventListener('click', refreshRoomList);
	document.getElementById('createRoomButton').addEventListener('click', () => {
		const nameInput = document.getElementById('roomNameInput');
		const passwordInput = document.getElementById('roomPasswordInput');
		const usernameInput = document.getElementById('usernameInput');
		const name = nameInput.value.trim();
		const password = passwordInput.value.trim();
		const username = usernameInput.value.trim();

		createRoom(name, password, username);
	});
	document.getElementById('mapEditorButton').addEventListener('click', () => {
		startMapEditor();
		showMenuTab('gameMenu');
	});
	// initialize editor toolbar UI wiring
	initEditorToolbar();
	const backButtons = document.getElementsByClassName('backToMainButton');
	for (const button of backButtons) {
		button.addEventListener('click', () => {
			showMenuTab('mainMenu');
		});
	}
	const chatInput = document.getElementById('chatInput');
	addEventListener('keydown', (e) => {
		if (e.key === 'Enter') {
			const message = chatInput.value.trim();
			if (!document.activeElement.isEqualNode(chatInput)) {
				chatInput.focus();
				e.preventDefault();
				return;
			} else if (message.length > 0 && serverConnected) {
				sendMessage(message);
				chatInput.value = '';
				chatInput.blur();
			}
		}
	});
	const startGameButton = document.getElementById('startGameButton');
	startGameButton.addEventListener('click', () => {
		startGame();
	});
	for (const mode of CONSTANTS.MODES) {
		const dropdown = document.getElementById('gameModeDropdown');
		const option = document.createElement('option');
		option.value = mode;
		option.innerText = mode.charAt(0).toUpperCase() + mode.slice(1);
		dropdown.appendChild(option);
	}
	for (const map of CONSTANTS.MAPS) {
		const dropdown = document.getElementById('mapDropdown');
		const option = document.createElement('option');
		option.value = map;
		option.innerText = map;
		dropdown.appendChild(option);
	}
}

function refreshRoomList() {
	getRooms().then((rooms) => {
		const roomList = document.getElementById('roomList');
		roomList.innerHTML = '';
		rooms.forEach((room) => {
			const roomElement = document.createElement('button');
			roomElement.classList.add('room');
			const roomNameElement = document.createElement('span');
			roomNameElement.classList.add('roomName');
			roomNameElement.innerText = room.name;
			roomElement.appendChild(roomNameElement);
			if (room.requiresPassword) {
				const lockIcon = document.createElement('span');
				lockIcon.classList.add('requiresPassword');
				lockIcon.innerText = 'Requires Password';
				roomElement.appendChild(lockIcon);
			}
			roomElement.addEventListener('click', () => joinRoom(room.id, document.getElementById('usernameInput').value.trim(), room.requiresPassword ? prompt('Enter room password:') : null));
			roomList.appendChild(roomElement);
		});
		if (rooms.length === 0) {
			const noRoomsElement = document.createElement('div');
			noRoomsElement.classList.add('room');
			noRoomsElement.innerText = 'No rooms available';
			roomList.appendChild(noRoomsElement);
		}
	});
}

export function showError(message, duration = 1000) {
	try {
		const el = document.getElementById('errorBanner');
		if (!el) return;
		el.textContent = message;
		el.classList.add('show');
		setTimeout(() => {
			el.classList.remove('show');
		}, duration);
	} catch (e) {
		console.error('showError failed', e);
	}
}

export function refreshPlayerList(players) {
	const playerList = document.getElementById('playerList');
	playerList.innerHTML = '';
	players.forEach((player) => {
		const playerElement = document.createElement('li');
		playerElement.classList.add('player');
		playerElement.innerText = player;
		playerList.appendChild(playerElement);
	});
}

export function updateLeaderboard(state) {
	if (state.settings.mode !== 'race') {
		document.getElementById('raceLeaderboard').style.display = 'none';
		return;
	}
	document.getElementById('raceLeaderboard').style.display = 'block';
	const leaderboardList = document.getElementById('leaderboardList');
	leaderboardList.innerHTML = '';
	let players = state.players || [];

	const lastRingIndex = typeof state.totalRings === 'number' ? Math.max(0, state.totalRings - 1) : null;
	const sorted = [...players].sort((a, b) => {
		const aRing = typeof a.currentRing === 'number' ? a.currentRing : -1;
		const bRing = typeof b.currentRing === 'number' ? b.currentRing : -1;
		if (aRing !== bRing) return bRing - aRing;

		if (lastRingIndex !== null && aRing === lastRingIndex && bRing === lastRingIndex) {
			const at = typeof a.raceTime === 'number' ? a.raceTime : Infinity;
			const bt = typeof b.raceTime === 'number' ? b.raceTime : Infinity;
			if (at !== bt) return at - bt;
		}

		// fallback
		return String(a.name || '').localeCompare(String(b.name || ''));
	});

	sorted.forEach((player) => {
		const playerElement = document.createElement('li');
		playerElement.classList.add('player');
		if (player.finished) {
			playerElement.classList.add('finished');
		}
		playerElement.innerText = `${player.name} - ${formatTime(player.raceTime)} - ${player.currentRing}/${state.totalRings}`;
		leaderboardList.appendChild(playerElement);
	});
}

function formatTime(time) {
	if (time === null || typeof time === 'undefined') return '--:--.--';
	let ms = Number(time);
	if (isNaN(ms)) return '--:--.--';
	if (Math.abs(ms) < 1000) {
		ms = Math.round(ms * 1000);
	} else {
		ms = Math.round(ms);
	}

	const totalSeconds = Math.floor(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	const centis = Math.floor((ms % 1000) / 10);
	return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
}
