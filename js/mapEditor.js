import {render} from './renderer.js';
import {vec3, quat} from 'gl-matrix';
import {CONSTANTS} from './consts.js';

const mapData = {
	name: 'New Map',
	objects: [],
};

let _running = false;
let _raf = null;

// a lot of the movement/camera stuff is re-programmed here, i know i could reuse code from game.js but that would make this project an even larger clusterfuck than it needs to be

// camera state for the editor
const camera = {
	position: {x: 0, y: 2, z: 10},
	rotation: quat.create(),
	fov: 60,
};

const keys = {};
let mouseDown = false;
let pointerLocked = false;
let lastTime = null;

const settings = {
	moveSpeed: 6, // per second
	boostMultiplier: 3,
	mouseSensitivity: 0.0025,
};

const objectKeybindings = {
	r: 'ring',
	c: 'cube',
};

let placingObject = null;

function onKeyDown(e) {
	keys[e.key.toLowerCase()] = true;

	for (const key in objectKeybindings) {
		if (e.key.toLowerCase() === key) {
			const type = objectKeybindings[key];
			let obj = null;
			if (type === 'ring') {
				obj = {
					type: 'ring',
					position: {...camera.position},
					rotation: quat.create(),
					scale: {x: 1, y: 1, z: 1},
				};
			} else if (type === 'cube') {
				obj = {
					type: 'cube',
					position: {...camera.position},
					rotation: quat.create(),
					scale: {x: 1, y: 1, z: 1},
				};
			}
			if (obj) {
				placingObject = obj;
			}
		}
	}
}

function onKeyUp(e) {
	keys[e.key.toLowerCase()] = false;
}

function onMouseMove(e) {
	if (!pointerLocked && !mouseDown) return;
	const dx = e.movementX || e.mozMovementX || e.webkitMovementX || 0;
	const dy = e.movementY || e.mozMovementY || e.webkitMovementY || 0;
	const yaw = -dx * settings.mouseSensitivity;
	const pitch = -dy * settings.mouseSensitivity;
	// apply yaw around world up, pitch around camera right
	const qYaw = quat.setAxisAngle(quat.create(), [0, 1, 0], yaw);
	quat.multiply(camera.rotation, qYaw, camera.rotation);
	// pitch
	const right = vec3.transformQuat(vec3.create(), [1, 0, 0], camera.rotation);
	const qPitch = quat.setAxisAngle(quat.create(), right, pitch);
	quat.multiply(camera.rotation, qPitch, camera.rotation);
	quat.normalize(camera.rotation, camera.rotation);
}

function onMouseDown() {
	if (placingObject) {
		mapData.objects.push(placingObject);
		placingObject = null;
	}
}

function onPointerLockChange() {
	pointerLocked = !!document.pointerLockElement;
}

function onCanvasMouseDown(e) {
	mouseDown = true;
	// attempt pointer lock on click
	if (e.target && e.target.requestPointerLock) {
		e.target.requestPointerLock();
	}
}

function onCanvasMouseUp() {
	mouseDown = false;
}

function mapTick(dt) {
	const forward = vec3.transformQuat(vec3.create(), [0, 0, -1], camera.rotation);
	const right = vec3.transformQuat(vec3.create(), [1, 0, 0], camera.rotation);
	const up = vec3.transformQuat(vec3.create(), [0, 1, 0], camera.rotation);

	let speed = settings.moveSpeed;
	if (keys['shift']) speed *= settings.boostMultiplier;

	const move = vec3.create();
	if (keys['w']) vec3.scaleAndAdd(move, move, forward, speed * dt);
	if (keys['s']) vec3.scaleAndAdd(move, move, forward, -speed * dt);
	if (keys['a']) vec3.scaleAndAdd(move, move, right, -speed * dt);
	if (keys['d']) vec3.scaleAndAdd(move, move, right, speed * dt);
	if (keys[' ']) vec3.scaleAndAdd(move, move, up, speed * dt); // space = up
	if (keys['control'] || keys['ctrl']) vec3.scaleAndAdd(move, move, up, -speed * dt);

	camera.position.x += move[0];
	camera.position.y += move[1];
	camera.position.z += move[2];

	if (placingObject) {
		//10 units in front of camera
		const offset = vec3.create();
		vec3.scale(offset, forward, 10);
		placingObject.position.x = camera.position.x + offset[0];
		placingObject.position.y = camera.position.y + offset[1];
		placingObject.position.z = camera.position.z + offset[2];

		if (keys['arrowleft']) {
			const rotSpeed = (Math.PI / 2) * dt;
			const q = quat.setAxisAngle(quat.create(), [0, 1, 0], rotSpeed);
			quat.multiply(placingObject.rotation, q, placingObject.rotation);
		}
		if (keys['arrowright']) {
			const rotSpeed = (-Math.PI / 2) * dt;
			const q = quat.setAxisAngle(quat.create(), [0, 1, 0], rotSpeed);
			quat.multiply(placingObject.rotation, q, placingObject.rotation);
		}
		if (keys['arrowup']) {
			const rotSpeed = (Math.PI / 2) * dt;
			const right = vec3.transformQuat(vec3.create(), [1, 0, 0], placingObject.rotation);
			const q = quat.setAxisAngle(quat.create(), right, rotSpeed);
			quat.multiply(placingObject.rotation, q, placingObject.rotation);
		}
		if (keys['arrowdown']) {
			const rotSpeed = (-Math.PI / 2) * dt;
			const right = vec3.transformQuat(vec3.create(), [1, 0, 0], placingObject.rotation);
			const q = quat.setAxisAngle(quat.create(), right, rotSpeed);
			quat.multiply(placingObject.rotation, q, placingObject.rotation);
		}
	}
}

function loop(t) {
	if (!_running) return;
	if (lastTime === null) lastTime = t;
	const dt = Math.min(0.1, (t - lastTime) / 1000);
	lastTime = t;

	mapTick(dt);

	if (placingObject) {
		render(camera, {objects: [...mapData.objects, placingObject], players: []});
	} else {
		render(camera, {objects: mapData.objects, players: []});
	}

	_raf = requestAnimationFrame(loop);
}

export function startMapEditor() {
	const canvas = document.getElementById('gameCanvas');
	if (_running) return;
	if (!canvas) throw new Error('canvas required');
	// show toolbar when editor starts (toolbar markup lives in index.html)
	const toolbar = document.getElementById('editorToolbar');
	if (toolbar) toolbar.hidden = false;
	window.addEventListener('keydown', onKeyDown);
	window.addEventListener('keyup', onKeyUp);
	window.addEventListener('mousemove', onMouseMove);
	window.addEventListener('mousedown', onMouseDown);
	document.addEventListener('pointerlockchange', onPointerLockChange);
	canvas.addEventListener('mousedown', onCanvasMouseDown);
	window.addEventListener('mouseup', onCanvasMouseUp);

	_running = true;
	lastTime = null;
	_raf = requestAnimationFrame(loop);
}

export function stopMapEditor() {
	const canvas = document.getElementById('gameCanvas');
	_running = false;
	if (_raf) cancelAnimationFrame(_raf);
	window.removeEventListener('keydown', onKeyDown);
	window.removeEventListener('keyup', onKeyUp);
	window.removeEventListener('mousemove', onMouseMove);
	window.removeEventListener('mousedown', onMouseDown);
	document.removeEventListener('pointerlockchange', onPointerLockChange);
	if (canvas) canvas.removeEventListener('mousedown', onCanvasMouseDown);
	window.removeEventListener('mouseup', onCanvasMouseUp);
	// hide toolbar when editor stops
	const toolbar = document.getElementById('editorToolbar');
	if (toolbar) toolbar.hidden = true;
}

export function exportMap() {
	const json = JSON.stringify(mapData, null, 2);
	const blob = new Blob([json], {type: 'application/json'});
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = 'map.json';
	a.click();
	URL.revokeObjectURL(url);
}

export async function loadMapByName(name) {
	if (!name) throw new Error('missing name');
	const url = `assets/maps/${name}`;
	const res = await fetch(url);
	if (!res.ok) throw new Error('failed to fetch ' + url);
	const json = await res.json();
	mapData.name = json.name || name;
	mapData.objects = Array.isArray(json.objects) ? json.objects : [];
}

export function setPlacingType(type) {
	if (!type) {
		placingObject = null;
		return;
	}
	const t = String(type).toLowerCase();
	if (t === 'ring') {
		placingObject = {type: 'ring', position: {...camera.position}, rotation: quat.create(), scale: {x: 1, y: 1, z: 1}};
	} else if (t === 'cube') {
		placingObject = {type: 'cube', position: {...camera.position}, rotation: quat.create(), scale: {x: 1, y: 1, z: 1}};
	} else if (t === 'ship') {
		placingObject = {type: 'ship', position: {...camera.position}, rotation: quat.create(), scale: {x: 1, y: 1, z: 1}};
	} else {
		placingObject = null;
	}
}

let _uiInited = false;
export function initEditorToolbar() {
	if (_uiInited) return;
	_uiInited = true;
	const mapSelect = document.getElementById('mapSelect');
	const loadBtn = document.getElementById('loadMapBtn');
	const exportBtn = document.getElementById('exportMapBtn');
	if (mapSelect) {
		// populate from CONSTANTS.MAPS (append .json)
		for (const m of CONSTANTS.MAPS || []) {
			const o = document.createElement('option');
			o.value = `${m}.json`;
			o.textContent = `${m}.json`;
			mapSelect.appendChild(o);
		}
	}
	if (loadBtn) {
		loadBtn.addEventListener('click', async () => {
			const name = mapSelect && mapSelect.value;
			if (!name) return;
			try {
				await loadMapByName(name);
				alert('Map loaded: ' + name);
			} catch (err) {
				console.error(err);
				alert('Failed to load map: ' + name);
			}
		});
	}
	if (exportBtn) {
		exportBtn.addEventListener('click', () => exportMap());
	}
}
