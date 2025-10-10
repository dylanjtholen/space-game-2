import {render, initRenderer} from './renderer.js';
import {tick, initGame} from './game.js';
import {loadAllAssets} from './assetLoader.js';
const {quat, vec3} = glMatrix;
import Model from './model.js';
import {lerp3} from './utils.js';

let gameState;

window.addEventListener('DOMContentLoaded', async () => {
	const canvas = document.getElementById('gameCanvas');
	await initRenderer(canvas);
	gameState = initGame();
	await loadAllAssets();
	requestAnimationFrame(drawLoop);
	setInterval(tickLoop, 1000 / 60);
});

let camera = {
	position: {x: 0, y: 0, z: 4},
	rotation: quat.create(),
	fov: 60,
};

let lastTime = null;
function tickLoop() {
	let time = performance.now();
	if (!lastTime) lastTime = time;
	const dt = (time - lastTime) / 1000; // dt is in seconds
	lastTime = time;
	gameState = tick(gameState, dt);
}

function drawLoop(time) {
	camera = cameraTransform(camera, gameState);
	render(camera, gameState);
	requestAnimationFrame(drawLoop);
}

function cameraTransform(cam, state) {
	const player = state.players[state.currentPlayer];
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

	cam.position = lerp3(cam.position, targetPos, 0.15);
	cam.rotation = quat.slerp(quat.create(), cam.rotation, player.rotation, 0.1);
	return cam;
}
