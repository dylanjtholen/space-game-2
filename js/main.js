import {render, initRenderer} from './renderer.js';
import {tick, initGame} from './game.js';
import {loadAllAssets} from './assetLoader.js';
const {quat} = glMatrix;
import Model from './model.js';

window.addEventListener('DOMContentLoaded', async () => {
	const canvas = document.getElementById('gameCanvas');
	await initRenderer(canvas);
	await initGame();
	await loadAllAssets();
	drawLoop();
});

// create a simple model: one colored triangle
const cube = new Model({
	vertices: [
		{x: -1, y: -1, z: 1},
		{x: 1, y: -1, z: 1},
		{x: 1, y: 1, z: 1},
		{x: -1, y: 1, z: 1},
		{x: -1, y: -1, z: -1},
		{x: 1, y: -1, z: -1},
		{x: 1, y: 1, z: -1},
		{x: -1, y: 1, z: -1},
	],
	faces: [
		{
			indices: [0, 1, 2],
			texcoords: [
				[0, 0.667],
				[0.25, 0.667],
				[0.25, 0.333],
			],
			texture: 'soup',
		},
		{
			indices: [2, 3, 0],
			texcoords: [
				[0.25, 0.333],
				[0, 0.333],
				[0, 0.667],
			],
			texture: 'soup',
		},
		{
			indices: [1, 5, 6],
			texcoords: [
				[0.25, 0.667],
				[0.5, 0.667],
				[0.5, 0.333],
			],
			texture: 'soup',
		},
		{
			indices: [6, 2, 1],
			texcoords: [
				[0.5, 0.333],
				[0.25, 0.333],
				[0.25, 0.667],
			],
			texture: 'soup',
		},
	],
	position: {x: 0, y: 0, z: 0},
});

// To use a texture, first load it with asset loader and then reference the texture name in a face.texture property.
// Example (requires assetLoader.loadAsset to be called before rendering):
// faces: [{ indices: [0,1,2], texcoords: [[0,0],[1,0],[0.5,1]], texture: 'crate' }]

let sampleScene = {
	camera: {
		position: {x: 0, y: 0, z: 4},
		rotation: quat.create(),
		fov: 60,
	},
	objects: [cube],
};

let lastTime = null;
function drawLoop(time) {
	if (!lastTime) lastTime = time;
	const dt = (time - lastTime) / 1000; // convert ms to s
	lastTime = time;

	sampleScene = tick(sampleScene, dt);
	render(sampleScene);
	requestAnimationFrame(drawLoop);
}
