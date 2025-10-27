import {serverConnected, startLocalGame, getRooms, createRoom, joinRoom, sendMessage, startGame} from './main.js';

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
		showMenuTab('gameMenu');
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
	const backButtons = document.getElementsByClassName('backToMainButton');
	for (const button of backButtons) {
		button.addEventListener('click', () => {
			showMenuTab('mainMenu');
		});
	}
	const chatInput = document.getElementById('chatInput');
	chatInput.addEventListener('keydown', (e) => {
		if (e.key === 'Enter') {
			const message = chatInput.value.trim();
			if (message.length > 0 && serverConnected) {
				sendMessage(message);
				chatInput.value = '';
			}
		}
	});
	const startGameButton = document.getElementById('startGameButton');
	startGameButton.addEventListener('click', () => {
		startGame();
	});
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
