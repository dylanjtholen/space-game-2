import {render, initRenderer} from './renderer.js';
import {tick, initGame} from './game.js';
import {loadAllAssets} from './assetLoader.js';
const {quat} = glMatrix;
import Model from './model.js';
import {lerp3} from './utils.js';

let gameState;

window.addEventListener('DOMContentLoaded', async () => {
	const canvas = document.getElementById('gameCanvas');
	await initRenderer(canvas);
	gameState = initGame();
	await loadAllAssets();
	drawLoop();
});

let camera = {
	position: {x: 0, y: 0, z: 4},
	rotation: quat.create(),
	fov: 60,
};

let lastTime = null;
function drawLoop(time) {
	if (!lastTime) lastTime = time;
	const dt = (time - lastTime) / 1000; // convert ms to s
	lastTime = time;

	gameState = tick(gameState, dt);
	camera = cameraTransform(camera, gameState);
	render(camera, gameState);
	requestAnimationFrame(drawLoop);
}

function cameraTransform(cam, state) {
	const player = state.players[state.currentPlayer];
	if (!player) return cam;

	cam.position = lerp3(cam.position, player.position, 0.1);
	cam.rotation = quat.slerp(quat.create(), cam.rotation, player.rotation, 0.1);
	return cam;
}
