import {render, initRenderer} from './renderer.js';
import {tick, initGame, Player, addPlayer} from './game.js';
import {loadAllAssets} from './assetLoader.js';
import {vec3, quat} from 'gl-matrix';
import {menuInit, showError, showMenuTab} from './menu.js';
import Model from './model.js';
import {lerp3} from './utils.js';
import {CONSTANTS} from './consts.js';

let gameState;
let currentPlayer = 0;

const socket = io();
export let serverConnected = false;
export let localGame = false;

socket.on('connect', () => {
	console.log('connected to server');
	serverConnected = true;
});

socket.on('joinedRoom', (data) => {
	if (data.success) {
		localGame = false;
		currentPlayer = data.playerIndex;
		gameState = data.state;
		console.log('room code is ' + data.roomId);
		showMenuTab('gameMenu');
		requestAnimationFrame(drawLoop);
		setInterval(tickLoop, 1000 / 60);
	} else {
		console.error(data.message);
	}
});

socket.on('gameState', (state) => {
	for (let i = 0; i < state.players.length; i++) {
		if (gameState.players[i]) {
			//if close enough ignore difference
			if (Math.hypot(state.players[i].position.x - gameState.players[i].position.x, state.players[i].position.y - gameState.players[i].position.y, state.players[i].position.z - gameState.players[i].position.z) < 5) continue;
			state.players[i].position = lerp3(gameState.players[i].position, state.players[i].position, 0.5);
		}
	}
	gameState = state;
});

socket.on('chatMessage', (payload) => {
	try {
		if (!payload || typeof payload !== 'object') return;
		const {username, text, ts} = payload;
		const display = `[${new Date(ts).toLocaleTimeString()}] ${username}: ${text}`;
		const chatEl = document.getElementById('chatMessages');
		if (chatEl) {
			const line = document.createElement('div');
			line.textContent = display;
			chatEl.appendChild(line);
			chatEl.scrollTop = chatEl.scrollHeight;
		} else {
			console.log(display);
		}
	} catch (e) {}
});

export function sendMessage(message) {
	if (!serverConnected) return;
	socket.emit('chatMessage', message);
}

export async function getRooms() {
	if (!serverConnected) return [];
	return new Promise((resolve, reject) => {
		let done = false;
		const timeout = setTimeout(() => {
			if (!done) {
				done = true;
				reject(new Error('getRooms timeout'));
			}
		}, 5000);

		socket.emit('getRooms', (response) => {
			if (done) return;
			done = true;
			clearTimeout(timeout);
			resolve(response);
		});
	});
}

export function joinRoom(roomId, username, password) {
	if (!serverConnected) return;
	if (!username) username = 'Guest';
	socket.emit('joinRoom', {roomId, username, password});
}

export function createRoom(name, password, username) {
	if (!name) {
		showError('Room name cannot be empty');
		return;
	}
	if (!serverConnected) return;
	socket.emit('createRoom', {
		name: name,
		password: password || null,
		username: username || 'Guest',
	});
}

function quitGame() {
	gameState = null;
	showMenuTab('mainMenu');
	if (!localGame) {
		socket.emit('leaveRoom');
	}
}

window.addEventListener('DOMContentLoaded', async () => {
	menuInit();
	const canvas = document.getElementById('gameCanvas');
	await initRenderer(canvas);
	await loadAllAssets();
});

export function startLocalGame() {
	localGame = true;
	gameState = initGame();
	addPlayer(gameState);
	requestAnimationFrame(drawLoop);
	setInterval(tickLoop, 1000 / 60);
}

let camera = {
	position: {x: 0, y: 0, z: 4},
	rotation: quat.create(),
	fov: 60,
};

let lastTime = null;
function tickLoop() {
	if (!gameState) return;
	let time = performance.now();
	if (!lastTime) lastTime = time;
	const dt = (time - lastTime) / 1000; // dt is in seconds
	lastTime = time;
	gameState = tick(gameState, dt);
	camera = cameraTransform(camera, gameState);
}

function drawLoop(time) {
	requestAnimationFrame(drawLoop);
	if (!gameState) return;
	render(camera, gameState);
}

function cameraTransform(cam, state) {
	const player = state.players[currentPlayer];
	if (!player) return cam;

	//target behind and above player
	const offset = {x: 0, y: 0.25, z: 5};
	const rotOffset = quat.fromEuler(quat.create(), -10, 0, 0);
	quat.multiply(rotOffset, player.rotation, rotOffset);
	const offsetRotated = vec3.transformQuat(vec3.create(), [offset.x, offset.y, offset.z], rotOffset);
	const targetPos = {
		x: player.position.x + offsetRotated[0],
		y: player.position.y + offsetRotated[1],
		z: player.position.z + offsetRotated[2],
	};

	const speed = Math.sqrt(player.velocity.x * player.velocity.x + player.velocity.y * player.velocity.y + player.velocity.z * player.velocity.z);
	const targetFov = 60 + (speed / CONSTANTS.SHIPS.MAX_SPEED) * 20;
	cam.fov += (targetFov - cam.fov) * 0.1;

	cam.position = lerp3(cam.position, targetPos, 0.15);
	cam.rotation = quat.slerp(quat.create(), cam.rotation, player.rotation, 0.1);
	return cam;
}

const keymap = {
	w: 'look_up',
	s: 'look_down',
	a: 'look_left',
	d: 'look_right',
	arrowup: 'look_up',
	arrowdown: 'look_down',
	arrowleft: 'look_left',
	arrowright: 'look_right',
	q: 'roll_left',
	e: 'roll_right',
	shift: 'boost',
	' ': 'brake',
};
const keys = {};
window.addEventListener('keydown', (e) => {
	if (e.repeat) return;
	if (e.key == 'Escape') {
		quitGame();
		return;
	}
	if (e.key == 'Enter') {
		const chatInput = document.getElementById('chatInput');
		if (!document.activeElement.isEqualNode(chatInput)) {
			chatInput.focus();
			e.preventDefault();
			return;
		}
	}
	keys[keymap[e.key.toLowerCase()]] = true;
	keyEvent();
});
window.addEventListener('keyup', (e) => {
	keys[keymap[e.key.toLowerCase()]] = false;
	keyEvent();
});

function keyEvent() {
	if (!gameState) return;
	if (!localGame) {
		socket.emit('playerInput', {...keys});
	} else {
		//offline, only 1 player
		const player = gameState.players[currentPlayer];
		if (!player) return;
		player.keys = {...keys};
	}
}
