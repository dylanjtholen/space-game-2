import {render, initRenderer} from './renderer.js';
import {tick, initGame, Player, addPlayer} from './game.js';
import {loadAllAssets} from './assetLoader.js';
import {vec3, quat} from 'gl-matrix';
import Model from './model.js';
import {lerp3} from './utils.js';
import {CONSTANTS} from './consts.js';

let gameState;
let currentPlayer = 0;

const socket = io();

socket.on('joinedRoom', (data) => {
	if (data.success) {
		currentPlayer = data.playerIndex;
		gameState = data.state;
		console.log('room code is ' + data.roomId);
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

window.addEventListener('DOMContentLoaded', async () => {
	const canvas = document.getElementById('gameCanvas');
	await initRenderer(canvas);
	await loadAllAssets();
	if (socket.connected) {
		const searchParams = new URLSearchParams(window.location.search);
		const roomId = searchParams.get('room');
		if (roomId) {
			socket.emit('joinRoom', roomId);
		} else {
			socket.emit('createRoom');
		}
	} else {
		startLocalGame();
	}
	requestAnimationFrame(drawLoop);
	setInterval(tickLoop, 1000 / 60);
});

function startLocalGame() {
	gameState = initGame();
	addPlayer(gameState);
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
	keys[keymap[e.key.toLowerCase()]] = true;
	keyEvent();
});
window.addEventListener('keyup', (e) => {
	keys[keymap[e.key.toLowerCase()]] = false;
	keyEvent();
});

function keyEvent() {
	if (socket.connected) {
		//check if online later
		socket.emit('playerInput', {...keys});
	} else {
		//offline, only 1 player
		const player = gameState.players[currentPlayer];
		if (!player) return;
		player.keys = {...keys};
	}
}
