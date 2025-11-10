import {render, initRenderer, cleanupRenderable} from './renderer.js';
import {tick, initGame, Player, addPlayer, loadMap} from './game.js';
import {loadAllAssets} from './assetLoader.js';
import {vec3, quat} from 'gl-matrix';
import {menuInit, refreshPlayerList, showError, showMenuTab, updateLeaderboard} from './menu.js';
import Model from './model.js';
import {cube, ship, Ring} from './premadeModels.js';
import {lerp3} from './utils.js';
import {CONSTANTS} from './consts.js';

// Server tick rate (Hz). Used for fixed-timestep local simulation.
const TICK_RATE = 20;
const TICK_DT = 1 / TICK_RATE;
let accumulator = 0;
let lastRAF = null;
let loopRunning = false;

let lastServerStateTime = 0;
let serverIntervalEstimate = TICK_DT;
const snapshotBuffer = [];
// How far behind real time the client renders (seconds) to allow snapshot buffering/interpolation.
const RENDER_DELAY = 0.1;
let gameState;
let currentPlayer = 0;

let serverTimeOffset = 0;
let lastServerSeq = 0;

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
		console.log('room code is ' + data.roomId);
		showMenuTab('lobby');
	} else {
		console.error(data.message);
	}
});

let playerList = [];
socket.on('playerListUpdate', (data) => {
	playerList = data.players;
	refreshPlayerList(playerList);
});

socket.on('gameState', (data) => {
	try {
		let payload = null;
		if (!data) return;
		if (data.state && typeof data.serverTime !== 'undefined') {
			payload = {seq: data.seq, serverTime: data.serverTime, state: data.state};
		} else {
			payload = {seq: null, serverTime: Date.now(), state: data};
		}

		if (!gameState) {
			gameState = payload.state;
			snapshotPrevState(gameState);
			lastServerStateTime = Date.now();
		}

		if (payload.seq != null) {
			if (payload.seq <= lastServerSeq) {
				return;
			}
			lastServerSeq = payload.seq;
		}

		normalizeStateForInterp(payload.state);

		const MAX_SNAPSHOTS = 10;
		snapshotBuffer.push({seq: payload.seq, serverTime: payload.serverTime, state: payload.state});
		if (snapshotBuffer.length > MAX_SNAPSHOTS) {
			const old = snapshotBuffer.shift();
			cleanupSnapshot(old);
		}

		const recvTime = Date.now();
		if (lastServerStateTime) {
			const interval = recvTime - lastServerStateTime;
			serverIntervalEstimate = (serverIntervalEstimate + interval / 1000) / 2;
		}
		lastServerStateTime = recvTime;
		const sampleOffset = payload.serverTime - recvTime;
		serverTimeOffset = serverTimeOffset * 0.9 + sampleOffset * 0.1;

		applyPrevFromOldToNew(gameState, payload.state);
		gameState = payload.state;
	} catch (e) {
		console.error('Failed to process gameState payload', e);
	}
});

socket.on('chatMessage', (payload) => {
	try {
		if (!payload || typeof payload !== 'object') return;
		const {username, text, ts} = payload;
		const display = `[${new Date(ts).toLocaleTimeString()}] ${username}: ${text}`;
		const chatEl = document.getElementById('chatMessages');
		if (chatEl) {
			// Only auto-scroll if the user was already at (or near) the bottom.
			const wasNearBottom = chatEl.scrollTop + chatEl.clientHeight >= chatEl.scrollHeight - 20;
			const line = document.createElement('div');
			line.textContent = display;
			chatEl.appendChild(line);
			if (wasNearBottom) {
				chatEl.scrollTop = chatEl.scrollHeight;
			}
		} else {
			console.log(display);
		}
	} catch (e) {}
});

socket.on('startFailure', (data) => {
	showError(data.message);
});

socket.on('gameStarted', () => {
	showMenuTab('gameMenu');
	gameState = initGame();
	startGameLoop();
});

export function startGame() {
	if (!serverConnected) return;
	const gameType = document.getElementById('gameModeDropdown').value;
	const map = document.getElementById('mapDropdown').value;
	const settings = {mode: gameType, map: map};
	if (localGame) {
		gameState.settings = settings;
		gameState = loadMap(gameState, map);
		console.log(map);
		showMenuTab('gameMenu');
		startGameLoop();
	} else {
		socket.emit('startGame', settings);
	}
}

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
	if (!document.getElementById('netDebug')) {
		const dbg = document.createElement('div');
		dbg.id = 'netDebug';
		dbg.style.position = 'absolute';
		dbg.style.right = '8px';
		dbg.style.top = '8px';
		dbg.style.background = 'rgba(0,0,0,0.6)';
		dbg.style.color = 'white';
		dbg.style.fontSize = '12px';
		dbg.style.padding = '6px';
		dbg.style.zIndex = 9999;
		dbg.style.maxWidth = '240px';
		dbg.style.fontFamily = 'monospace';
		document.body.appendChild(dbg);
	}
});

export function startLocalGame() {
	localGame = true;
	gameState = initGame();
	const username = document.getElementById('usernameInput').value.trim();
	addPlayer(gameState, null, username);
}

let camera = {
	position: {x: 0, y: 0, z: 4},
	rotation: quat.create(),
	fov: 60,
};

const _camRotOffsetBase = quat.fromEuler(quat.create(), -10, 0, 0);
const _offsetRot = quat.create();
const _tmpOffsetVec = vec3.create();
const _offsetRotated = vec3.create();
// Copy current positions/rotations into prev* fields so interpolation has a previous reference.
function snapshotPrevState(state) {
	if (!state) return;
	for (const p of state.players || []) {
		p.prevPosition = {x: p.position.x, y: p.position.y, z: p.position.z};
		p.prevRotation = quat.clone(p.rotation || quat.create());
	}
	for (const o of state.objects || []) {
		if (o.position) o.prevPosition = {x: o.position.x, y: o.position.y, z: o.position.z};
		if (o.rotation) o.prevRotation = quat.clone(o.rotation || quat.create());
	}
}

function applyPrevFromOldToNew(oldState, newState) {
	if (!oldState || !newState) return;
	const minPlayers = Math.min((oldState.players || []).length, (newState.players || []).length);
	for (let i = 0; i < minPlayers; i++) {
		const oldP = oldState.players[i];
		const newP = newState.players[i];
		newP.prevPosition = {x: oldP.position.x, y: oldP.position.y, z: oldP.position.z};
		newP.prevRotation = quat.clone(oldP.rotation || quat.create());
	}
	const minObjects = Math.min((oldState.objects || []).length, (newState.objects || []).length);
	for (let i = 0; i < minObjects; i++) {
		const oldO = oldState.objects[i];
		const newO = newState.objects[i];
		if (oldO.position && newO.position) newO.prevPosition = {x: oldO.position.x, y: oldO.position.y, z: oldO.position.z};
		if (oldO.rotation && newO.rotation) newO.prevRotation = quat.clone(oldO.rotation || quat.create());
	}
}

// Normalize incoming network state for interpolation:
// - convert array coordinates back to {x,y,z}
// - convert rotation arrays to normalized quaternions
// - rebuild lightweight Model instances from server descriptors when necessary
function normalizeStateForInterp(state) {
	if (!state) return;
	for (const p of state.players || []) {
		if (!p) continue;
		if (Array.isArray(p.position)) p.position = {x: p.position[0], y: p.position[1], z: p.position[2]};
		if (p.prevPosition && Array.isArray(p.prevPosition)) p.prevPosition = {x: p.prevPosition[0], y: p.prevPosition[1], z: p.prevPosition[2]};
		if (p.rotation && Array.isArray(p.rotation) && p.rotation.length === 4) p.rotation = quat.normalize(quat.create(), new Float32Array(p.rotation));
		if (p.prevRotation && Array.isArray(p.prevRotation) && p.prevRotation.length === 4) p.prevRotation = quat.normalize(quat.create(), new Float32Array(p.prevRotation));
	}
	for (const o of state.objects || []) {
		if (!o) continue;
		if (Array.isArray(o.position)) o.position = {x: o.position[0], y: o.position[1], z: o.position[2]};
		if (o.prevPosition && Array.isArray(o.prevPosition)) o.prevPosition = {x: o.prevPosition[0], y: o.prevPosition[1], z: o.prevPosition[2]};
		if (o.rotation && Array.isArray(o.rotation) && o.rotation.length === 4) o.rotation = quat.normalize(quat.create(), new Float32Array(o.rotation));
		if (o.prevRotation && Array.isArray(o.prevRotation) && o.prevRotation.length === 4) o.prevRotation = quat.normalize(quat.create(), new Float32Array(o.prevRotation));
		if (o.type && typeof o.getRenderable === 'undefined') {
			try {
				let model = null;
				switch (o.type) {
					case 'cube':
						model = cube(o.texture);
						break;
					case 'ship':
						model = ship();
						break;
					case 'ring':
						model = new Ring({position: o.position || {x: 0, y: 0, z: 0}, rotation: o.rotation || quat.create(), scale: o.scale || {x: 1, y: 1, z: 1}});
						break;
					default:
						model = new Model({position: o.position || {x: 0, y: 0, z: 0}, scale: o.scale || {x: 1, y: 1, z: 1}, rotation: o.rotation || quat.create()});
				}
				if (!model) model = new Model({position: o.position || {x: 0, y: 0, z: 0}});

				if (o.position) model.position = o.position;
				if (o.scale) model.scale = o.scale;
				if (o.rotation) model.rotation = o.rotation;
				if (o.velocity) model.velocity = o.velocity;
				// Preserve descriptor metadata (id, finish, etc.) so client logic can reference it
				if (typeof o.id !== 'undefined') model.id = o.id;
				if (typeof o.finish !== 'undefined') model.finish = o.finish;

				const idx = state.objects.indexOf(o);
				if (idx !== -1) state.objects[idx] = model;
			} catch (e) {
				console.warn('Failed to reconstruct Model from descriptor', e);
			}
		}
	}
}

// Produce an interpolated copy of `state` for a given alpha in [0,1].
// Preserves prototypes for objects that have Model-like prototypes.
function interpolateState(state, alpha) {
	if (!state) return state;
	function clonePreserveProto(orig) {
		if (!orig || typeof orig !== 'object') return orig;
		const proto = Object.getPrototypeOf(orig);
		if (proto && proto !== Object.prototype) {
			const c = Object.create(proto);
			Object.assign(c, orig);
			return c;
		}
		return {...orig};
	}
	const s = {
		...state,
		players: (state.players || []).map((p) => {
			const prev = p.prevPosition || p.position;
			const cur = p.position;
			const interpPos = {
				x: prev.x + (cur.x - prev.x) * alpha,
				y: prev.y + (cur.y - prev.y) * alpha,
				z: prev.z + (cur.z - prev.z) * alpha,
			};
			const interpRot = quat.create();
			if (p.prevRotation) quat.slerp(interpRot, p.prevRotation, p.rotation, alpha);
			else quat.copy(interpRot, p.rotation);
			const out = clonePreserveProto(p);
			out.position = interpPos;
			out.rotation = interpRot;
			return out;
		}),
		objects: (state.objects || []).map((o) => {
			const prev = o.prevPosition || o.position || {x: 0, y: 0, z: 0};
			const cur = o.position || {x: 0, y: 0, z: 0};
			const interpPos = {
				x: prev.x + (cur.x - prev.x) * alpha,
				y: prev.y + (cur.y - prev.y) * alpha,
				z: prev.z + (cur.z - prev.z) * alpha,
			};
			const interpRot = quat.create();
			if (o.prevRotation) quat.slerp(interpRot, o.prevRotation, o.rotation, alpha);
			else if (o.rotation) quat.copy(interpRot, o.rotation);
			const out = clonePreserveProto(o);
			out.position = interpPos;
			out.rotation = interpRot;
			return out;
		}),
	};
	return s;
}

// Free GL resources referenced by a pruned snapshot's renderables.
// Called when old snapshots are dropped from the buffer.
function cleanupSnapshot(snapshot) {
	if (!snapshot || !snapshot.state) return;
	try {
		const st = snapshot.state;

		for (const o of st.objects || []) {
			if (!o) continue;
			if (o._renderable) {
				try {
					cleanupRenderable(o._renderable);
				} catch (e) {}
				delete o._renderable;
			}
		}

		for (const p of st.players || []) {
			if (!p) continue;
			if (p._renderable) {
				try {
					cleanupRenderable(p._renderable);
				} catch (e) {}
				delete p._renderable;
			}
		}
	} catch (e) {
		console.warn('cleanupSnapshot failed', e);
	}
}

function mainLoop(rafTime) {
	if (!lastRAF) lastRAF = rafTime;
	let frameDt = (rafTime - lastRAF) / 1000;
	lastRAF = rafTime;

	if (frameDt > 0.25) frameDt = 0.25;

	if (localGame) {
		accumulator += frameDt;
		while (accumulator >= TICK_DT) {
			snapshotPrevState(gameState);
			gameState = tick(gameState, TICK_DT);
			accumulator -= TICK_DT;
		}
		const alpha = accumulator / TICK_DT;
		const renderState = interpolateState(gameState, alpha);
		try {
			const pl = renderState.players && renderState.players[currentPlayer];
			renderState._localNextRingId = pl && typeof pl.nextRingId !== 'undefined' ? pl.nextRingId : null;
		} catch (e) {}
		camera = cameraTransform(camera, renderState);
		render(camera, renderState);
		updateLeaderboard(renderState);
	} else {
		const now = Date.now();
		const renderTime = now + serverTimeOffset - RENDER_DELAY * 1000;
		let renderState = gameState;

		const pruneBefore = renderTime - 5000;
		while (snapshotBuffer.length > 0 && snapshotBuffer[0].serverTime < pruneBefore) {
			const old = snapshotBuffer.shift();
			cleanupSnapshot(old);
		}

		if (snapshotBuffer.length >= 2) {
			let idx = snapshotBuffer.length - 2;
			for (let i = 0; i < snapshotBuffer.length - 1; i++) {
				const a = snapshotBuffer[i];
				const b = snapshotBuffer[i + 1];
				if (a.serverTime <= renderTime && renderTime <= b.serverTime) {
					idx = i;
					break;
				}
			}

			const s0 = snapshotBuffer[Math.max(0, idx)];
			const s1 = snapshotBuffer[Math.min(snapshotBuffer.length - 1, idx + 1)];

			applyPrevFromOldToNew(s0.state, s1.state);

			const denom = s1.serverTime - s0.serverTime;
			let alpha = 0;
			if (denom > 0) {
				alpha = (renderTime - s0.serverTime) / denom;
			}
			alpha = Math.max(0, Math.min(1, alpha));
			renderState = interpolateState(s1.state, alpha);

			// Provide renderer with local nextRingId for highlighting
			try {
				const pl = renderState.players && renderState.players[currentPlayer];
				renderState._localNextRingId = pl && typeof pl.nextRingId !== 'undefined' ? pl.nextRingId : null;
			} catch (e) {}

			const dbg = document.getElementById('netDebug');
			if (dbg) {
				const faceCount = ((rs) => (rs && rs.objects ? rs.objects.reduce((n, o) => n + (o.getRenderable ? (o.getRenderable().faces || []).length : (o.faces || []).length), 0) : 0))(renderState);
				dbg.textContent = `buf:${snapshotBuffer.length} s0:${s0.serverTime} s1:${s1.serverTime}\n` + `alpha:${alpha.toFixed(2)} offset:${serverTimeOffset.toFixed(0)}ms estInt:${(serverIntervalEstimate * 1000).toFixed(1)}ms\nfaces:${faceCount}`;
			}
		} else if (snapshotBuffer.length === 1) {
			renderState = snapshotBuffer[0].state;
			const dbg = document.getElementById('netDebug');
			if (dbg) dbg.textContent = `buf:1 s:${snapshotBuffer[0].serverTime} offset:${serverTimeOffset.toFixed(0)}ms`;
		} else if (gameState) {
			renderState = gameState;
			const dbg = document.getElementById('netDebug');
			if (dbg) dbg.textContent = `buf:0 offset:${serverTimeOffset.toFixed(0)}ms`;
		}

		camera = cameraTransform(camera, renderState);
		render(camera, renderState);
		updateLeaderboard(renderState);
	}

	requestAnimationFrame(mainLoop);
}

function startGameLoop() {
	if (loopRunning) return;
	loopRunning = true;
	accumulator = 0;
	lastRAF = null;
	requestAnimationFrame(mainLoop);
}

function cameraTransform(cam, state) {
	const player = state.players[currentPlayer];
	if (!player) return cam;

	const offset = {x: 0, y: 0.25, z: 5};
	quat.multiply(_offsetRot, player.rotation, _camRotOffsetBase);
	vec3.set(_tmpOffsetVec, offset.x, offset.y, offset.z);
	vec3.transformQuat(_offsetRotated, _tmpOffsetVec, _offsetRot);
	const targetPos = {
		x: player.position.x + _offsetRotated[0],
		y: player.position.y + _offsetRotated[1],
		z: player.position.z + _offsetRotated[2],
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
		const player = gameState.players[currentPlayer];
		if (!player) return;
		player.keys = {...keys};
	}
}
