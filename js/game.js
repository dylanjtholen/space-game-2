const {quat, vec3} = glMatrix;
import {cube, ship} from './premadeModels.js';

// keys holds current pressed keys (populated by event listeners below)
const keys = {};
window.addEventListener('keydown', (e) => {
	keys[e.key.toLowerCase()] = true;
});
window.addEventListener('keyup', (e) => {
	keys[e.key.toLowerCase()] = false;
});

export function tick(scene, dt = 1 / 60) {
	// dt is in seconds
	const moveSpeed = 3.0;
	const rotSpeed = Math.PI / 2;

	const player = scene.players[scene.currentPlayer];

	// compute forward and right vectors from camera rotation
	const forward = vec3.transformQuat(vec3.create(), [0, 0, -1], player.rotation);
	const right = vec3.transformQuat(vec3.create(), [1, 0, 0], player.rotation);
	const up = vec3.transformQuat(vec3.create(), [0, 1, 0], player.rotation);

	let moveX = 0;
	let moveZ = 0;
	let moveY = 0;

	if (keys['w']) moveZ += 1;
	if (keys['s']) moveZ -= 1;
	if (keys['a']) moveX -= 1;
	if (keys['d']) moveX += 1;
	if (keys['shift']) moveY -= 1;
	if (keys[' ']) moveY += 1;
	// build movement vector in world space
	const moveVec = vec3.create();
	if (moveZ !== 0) {
		vec3.scaleAndAdd(moveVec, moveVec, forward, moveZ);
	}
	if (moveX !== 0) {
		vec3.scaleAndAdd(moveVec, moveVec, right, moveX);
	}

	if (moveY !== 0) {
		vec3.scaleAndAdd(moveVec, moveVec, up, moveY);
	}

	if (vec3.length(moveVec) > 0) {
		vec3.normalize(moveVec, moveVec);
		vec3.scale(moveVec, moveVec, moveSpeed * dt);
		player.position.x += moveVec[0];
		player.position.y += moveVec[1];
		player.position.z += moveVec[2];
	}

	let yaw = 0;
	if (keys['arrowleft']) yaw += 1;
	if (keys['arrowright']) yaw -= 1;
	if (yaw !== 0) {
		const angle = yaw * rotSpeed * dt;
		const q = quat.setAxisAngle(quat.create(), [0, 1, 0], angle);
		quat.multiply(player.rotation, player.rotation, q);
	}
	let pitch = 0;
	if (keys['arrowup']) pitch += 1;
	if (keys['arrowdown']) pitch -= 1;
	if (pitch !== 0) {
		const angle = pitch * rotSpeed * dt;
		const right = vec3.transformQuat(vec3.create(), [1, 0, 0], player.rotation);
		const q = quat.setAxisAngle(quat.create(), right, angle);
		quat.multiply(player.rotation, q, player.rotation);
	}
	let roll = 0;
	if (keys['q']) roll += 1;
	if (keys['e']) roll -= 1;
	if (roll !== 0) {
		const angle = roll * rotSpeed * dt;
		const forward = vec3.transformQuat(vec3.create(), [0, 0, -1], player.rotation);
		const q = quat.setAxisAngle(quat.create(), forward, angle);
		quat.multiply(player.rotation, q, player.rotation);
	}

	// Normalize quaternion to prevent drift
	quat.normalize(player.rotation, player.rotation);

	return scene;
}

export function initGame() {
	return {
		players: [ship()],
		currentPlayer: 0,
		objects: [cube('soup')],
	};
}
