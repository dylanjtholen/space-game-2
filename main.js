
import {render, initRenderer} from './renderer';
import {tick} from './game';

window.addEventListener('DOMContentLoaded', async () => {
	const canvas = document.getElementById('gameCanvas');
	await initRenderer(canvas);
	// You can now call render() as needed
});
