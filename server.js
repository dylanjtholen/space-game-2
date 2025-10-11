import {initGame, tick} from './js/game.js';
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
	res.sendFile(path.resolve(__dirname, 'game.html'));
});

server.listen(3000, () => {
	console.log('Server listening on http://localhost:3000');
});
