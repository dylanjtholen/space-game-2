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
const lastChatAt = new Map();
const CHAT_MIN_INTERVAL = 300;
const CHAT_MAX_LENGTH = 512;

io.on('connection', (socket) => {
	socket.on('createRoom', (info) => {
		info.username = validateUsername(info.username);
		let roomId = generateRoomId();
		while (rooms[roomId]) {
			roomId = generateRoomId();
		}
		const userUUID = getUUID();
		clientInfo[socket.id] = {roomId: roomId, userUUID: userUUID, username: info.username || 'Guest'};
		socket.join(roomId);
		// Create room state and record the creator as the owner (by UUID)
		rooms[roomId] = initGame();
		rooms[roomId].owner = userUUID;
		rooms[roomId].name = info.name || 'Unnamed Room';
		rooms[roomId].password = info.password || null;
		const playerIndex = addPlayer(rooms[roomId], userUUID, info.username || 'Guest');
		socket.emit('joinedRoom', {success: true, roomId: roomId, playerIndex: playerIndex});
		sendPlayerListUpdate(roomId);
		sendMessageToRoom(roomId, 'System', `${info.username || 'Guest'} has joined the room.`);
	});
	socket.on('joinRoom', ({roomId, username, password}) => {
		username = validateUsername(username);
		if (rooms[roomId]) {
			const userUUID = getUUID();
			if (rooms[roomId].password && rooms[roomId].password !== (password || null)) {
				socket.emit('joinedRoom', {success: false, message: 'Invalid password'});
				return;
			}
			clientInfo[socket.id] = {roomId: roomId, userUUID: userUUID, username: username || 'Guest'};
			socket.join(roomId);
			const playerIndex = addPlayer(rooms[roomId], userUUID, username);
			socket.emit('joinedRoom', {success: true, roomId: roomId, playerIndex: playerIndex});
			sendPlayerListUpdate(roomId);
			sendMessageToRoom(roomId, 'System', `${username || 'Guest'} has joined the room.`);
		} else {
			socket.emit('joinedRoom', {success: false, message: 'Room not found'});
		}
	});
	socket.on('startGame', () => {
		const info = clientInfo[socket.id];
		if (!info || !rooms[info.roomId]) {
			socket.emit('startFailure', {success: false, message: 'Not in a room'});
			return;
		}
		const state = rooms[info.roomId];
		// Only the room creator can start the game
		if (state.owner && state.owner !== info.userUUID) {
			socket.emit('startFailure', {success: false, message: 'Only the room creator can start the game'});
			return;
		}
		startTickLoop(info.roomId);
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
	socket.on('getRooms', (callback) => {
		const roomList = [];
		for (const [roomId, state] of Object.entries(rooms)) {
			roomList.push({
				id: roomId,
				name: state.name || 'Unnamed Room',
				requiresPassword: state.password ? true : false,
			});
		}
		callback(roomList);
	});
	socket.on('leaveRoom', () => {
		const info = clientInfo[socket.id];
		if (info && rooms[info.roomId]) {
			const state = rooms[info.roomId];
			state.players = state.players.filter((p) => p.uuid !== info.userUUID);
			if (state.players.length === 0) {
				delete rooms[info.roomId];
				clearInterval(roomTickIntervals[info.roomId]);
				delete roomTickIntervals[info.roomId];
			}
		}
	});
	socket.on('chatMessage', (message) => {
		const info = clientInfo[socket.id];
		if (!info || !rooms[info.roomId]) return;
		if (typeof message !== 'string') return;
		const now = Date.now();
		const last = lastChatAt.get(socket.id) || 0;
		if (now - last < CHAT_MIN_INTERVAL) return;
		lastChatAt.set(socket.id, now);
		let text = message.replace(/\0/g, '').slice(0, CHAT_MAX_LENGTH).trim();
		if (!text) return;
		const username = info.username || 'Guest';
		sendMessageToRoom(info.roomId, username, text);
	});
	socket.on('leaveRoom', () => {
		const info = clientInfo[socket.id];
		if (info && rooms[info.roomId]) {
			const state = rooms[info.roomId];
			state.players = state.players.filter((p) => p.uuid !== info.userUUID);
			if (state.players.length === 0) {
				delete rooms[info.roomId];
				clearInterval(roomTickIntervals[info.roomId]);
				delete roomTickIntervals[info.roomId];
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
				clearInterval(roomTickIntervals[info.roomId]);
				delete roomTickIntervals[info.roomId];
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

const roomTickIntervals = {};
const roomSeq = {};
function startTickLoop(roomId) {
	let state = rooms[roomId];
	io.to(roomId).emit('gameStarted');
	roomTickIntervals[roomId] = setInterval(() => {
		state = tick(state, 1 / 60);
		roomSeq[roomId] = (roomSeq[roomId] || 0) + 1;
		const payload = {seq: roomSeq[roomId], serverTime: Date.now(), state: serialize(state)};
		io.to(roomId).emit('gameState', payload);
	}, 1000 / 60);
}

function serialize(value) {
	const seen = new WeakMap();
	function clone(v) {
		if (v === null || v === undefined) return v;

		if (typeof v !== 'object') return v;

		if (ArrayBuffer.isView(v)) return Array.from(v);

		if (Array.isArray(v)) {
			if (seen.has(v)) return null;
			const out = [];
			seen.set(v, out);
			for (let i = 0; i < v.length; i++) out[i] = clone(v[i]);
			return out;
		}

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

function sendMessageToRoom(roomId, username, message) {
	const payload = {username, text: message, ts: Date.now()};
	io.to(roomId).emit('chatMessage', payload);
}

function sendPlayerListUpdate(roomId) {
	const state = rooms[roomId];
	const playerList = state.players.map((p) => p.name);
	io.to(roomId).emit('playerListUpdate', {players: playerList});
}

//scary
const TEXT_SANITIZE_REGEX = /[^\w\s!@#$%^&*()\-_=+[\]{};:'",.<>/?\\|`~]/g;

function validateUsername(username) {
	if (typeof username !== 'string') return 'Guest';
	username = username.replace(/\0/g, '').trim().slice(0, 32);
	username = username.replace(TEXT_SANITIZE_REGEX, '');
	if (username.length === 0) return 'Guest';
	return username;
}
