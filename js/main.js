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
const triangle = new Model({
	vertices: [
		{x: -1, y: -1, z: 0},
		{x: 1, y: -1, z: 0},
		{x: 0, y: 1, z: 0},
	],
	faces: [
		{
			indices: [0, 1, 2],
			color: [0.2, 0.8, 0.3, 1],
		},
	],
	position: {x: 0, y: 0, z: 0},
});

// To use a texture, first load it with asset loader and then reference the texture name in a face.texture property.
// Example (requires assetLoader.loadAsset to be called before rendering):
// faces: [{ indices: [0,1,2], texcoords: [[0,0],[1,0],[0.5,1]], texture: 'crate' }]

const sampleScene = {
	camera: {
		position: {x: 0, y: 0, z: 4},
		rotation: quat.create(),
		fov: 60,
	},
	objects: [triangle],
};

function drawLoop() {
	render(sampleScene);
	requestAnimationFrame(drawLoop);
}
