import {initGame, tick, addPlayer} from './js/game.js';
import {CONSTANTS} from './js/consts.js';

import express from 'express';
import {createServer} from 'http';

import path from 'path';
import {fileURLToPath} from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
app.use(express.static(__dirname));

app.get('/', (req, res) => {
	res.sendFile(path.resolve(__dirname, 'index.html'));
});

server.listen(3000, () => {
	console.log('Server listening on http://localhost:3000');
});

import {Server} from 'socket.io';
const io = new Server(server);

const rooms = {};
const clientInfo = {};

io.on('connection', (socket) => {
	socket.on('createRoom', () => {
		let roomId = generateRoomId();
		while (rooms[roomId]) {
			roomId = generateRoomId();
		}
		const userUUID = getUUID();
		clientInfo[socket.id] = {roomId: roomId, userUUID: userUUID};
		socket.join(roomId);
		rooms[roomId] = initGame();
		const playerIndex = addPlayer(rooms[roomId], userUUID);
		socket.emit('joinedRoom', {success: true, roomId: roomId, playerIndex: playerIndex, state: serialize(rooms[roomId])});
		startTickLoop(roomId);
	});
	socket.on('joinRoom', (roomId) => {
		if (rooms[roomId]) {
			const userUUID = getUUID();
			clientInfo[socket.id] = {roomId: roomId, userUUID: userUUID};
			socket.join(roomId);
			const playerIndex = addPlayer(rooms[roomId], userUUID);
			socket.emit('joinedRoom', {success: true, roomId: roomId, playerIndex: playerIndex, state: serialize(rooms[roomId])});
		} else {
			socket.emit('joinedRoom', {success: false, message: 'Room not found'});
		}
	});
	socket.on('playerInput', (input) => {
		const info = clientInfo[socket.id];
		if (info && rooms[info.roomId]) {
			const state = rooms[info.roomId];
			const player = state.players.find((p) => p.uuid === info.userUUID);
			if (player) {
				player.keys = input;
			}
		}
	});
	socket.on('disconnect', () => {
		const info = clientInfo[socket.id];
		if (info && rooms[info.roomId]) {
			const state = rooms[info.roomId];
			state.players = state.players.filter((p) => p.uuid !== info.userUUID);
			if (state.players.length === 0) {
				delete rooms[info.roomId];
			}
		}
		delete clientInfo[socket.id];
	});
});

function generateRoomId() {
	const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let result = '';
	for (let i = 0; i < 6; i++) {
		result += characters.charAt(Math.floor(Math.random() * characters.length));
	}
	return result;
}

function getUUID() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
		const r = (Math.random() * 16) | 0,
			v = c === 'x' ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

function startTickLoop(roomId) {
	let state = rooms[roomId];
	setInterval(() => {
		state = tick(state, 1 / 60);
		io.to(roomId).emit('gameState', serialize(state));
	}, 1000 / 60);
}

function serialize(value) {
	const seen = new WeakMap();
	function clone(v) {
		if (v === null || v === undefined) return v;
		// Primitive
		if (typeof v !== 'object') return v;
		// TypedArrays (Float32Array, Int32Array, etc.)
		if (ArrayBuffer.isView(v)) return Array.from(v);
		// Arrays
		if (Array.isArray(v)) {
			if (seen.has(v)) return null;
			const out = [];
			seen.set(v, out);
			for (let i = 0; i < v.length; i++) out[i] = clone(v[i]);
			return out;
		}
		// Plain object
		if (seen.has(v)) return null;
		const out = {};
		seen.set(v, out);
		for (const key of Object.keys(v)) {
			try {
				out[key] = clone(v[key]);
			} catch (e) {
				out[key] = null;
			}
		}
		return out;
	}
	return clone(value);
}
