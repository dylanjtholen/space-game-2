const {quat, vec3} = glMatrix;
import {cube, ship, Ring} from './premadeModels.js';

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

// keys holds current pressed keys (populated by event listeners below)
const keys = {};
window.addEventListener('keydown', (e) => {
	keys[keymap[e.key.toLowerCase()]] = true;
});
window.addEventListener('keyup', (e) => {
	keys[keymap[e.key.toLowerCase()]] = false;
});

export function tick(scene, dt = 1 / 60) {
	// dt is in seconds

	for (const player of scene.players) {
		controls(dt, player);
	}

	return scene;
}

function controls(dt, player) {
	// get forward and right vectors from camera rotation
	const moveSpeed = 6.0 * (keys['boost'] ? 3 : 1);
	const rotSpeed = Math.PI / 2;
	const forward = vec3.transformQuat(vec3.create(), [0, 0, -1], player.rotation);
	const right = vec3.transformQuat(vec3.create(), [1, 0, 0], player.rotation);
	const up = vec3.transformQuat(vec3.create(), [0, 1, 0], player.rotation);
	const moveVec = vec3.scale(vec3.create(), forward, moveSpeed * dt);
	player.velocity.x += moveVec[0];
	player.velocity.y += moveVec[1];
	player.velocity.z += moveVec[2];

	//clamp
	const maxSpeed = 25;
	const speed = Math.sqrt(player.velocity.x * player.velocity.x + player.velocity.y * player.velocity.y + player.velocity.z * player.velocity.z);
	if (speed > maxSpeed) {
		const scale = maxSpeed / speed;
		player.velocity.x *= scale;
		player.velocity.y *= scale;
		player.velocity.z *= scale;
	}

	//apply more drag in directions not aligned with forward
	const forwardNorm = vec3.normalize(vec3.create(), forward);
	const velNorm = vec3.normalize(vec3.create(), [player.velocity.x, player.velocity.y, player.velocity.z]);
	const alignment = vec3.dot(forwardNorm, velNorm) ** 3; // 1 means aligned, -1 means opposite, 0 means perpendicular
	const drag = 1 - Math.abs(alignment); // 0 means no drag, 1 means full drag
	const dragFactor = 1 - drag * (keys['boost'] ? 0 : 0.05);
	player.velocity.x *= dragFactor;
	player.velocity.y *= dragFactor;
	player.velocity.z *= dragFactor;

	player.position.x += player.velocity.x * dt;
	player.position.y += player.velocity.y * dt;
	player.position.z += player.velocity.z * dt;
	let yaw = 0;
	if (keys['look_left']) yaw += 1;
	if (keys['look_right']) yaw -= 1;
	if (yaw !== 0) {
		const angle = yaw * rotSpeed * dt;
		const q = quat.setAxisAngle(quat.create(), [0, 1, 0], angle);
		quat.multiply(player.rotation, player.rotation, q);
	}
	let pitch = 0;
	if (keys['look_up']) pitch += 1;
	if (keys['look_down']) pitch -= 1;
	if (pitch !== 0) {
		const angle = pitch * rotSpeed * dt;
		const right = vec3.transformQuat(vec3.create(), [1, 0, 0], player.rotation);
		const q = quat.setAxisAngle(quat.create(), right, angle);
		quat.multiply(player.rotation, q, player.rotation);
	}
	let roll = 0;
	if (keys['roll_left']) roll += 1;
	if (keys['roll_right']) roll -= 1;
	if (roll !== 0) {
		const angle = roll * rotSpeed * dt;
		const forward = vec3.transformQuat(vec3.create(), [0, 0, -1], player.rotation);
		const q = quat.setAxisAngle(quat.create(), forward, angle);
		quat.multiply(player.rotation, q, player.rotation);
	}
	quat.normalize(player.rotation, player.rotation);
}

class Player {
	constructor({position = {x: 0, y: 0, z: 0}, rotation = quat.create()}) {
		this.position = position;
		this.rotation = rotation;
		this.velocity = {x: 0, y: 0, z: 0};
	}

	getRenderable() {
		const model = ship();
		model.position = this.position;
		model.rotation = this.rotation;
		return model.getRenderable();
	}
}

export function initGame() {
	return {
		players: [new Player({})],
		currentPlayer: 0,
		objects: [cube('soup'), new Ring({position: {x: 0, y: 0, z: -10}, scale: {x: 3, y: 3, z: 3}})],
	};
}
