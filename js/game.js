const {quat, vec3} = glMatrix;
import {cube, ship, ring} from './premadeModels.js';

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
	const moveSpeed = 6.0;
	const rotSpeed = Math.PI / 2;

	for (const player of scene.players) {
		if (!player.velocity) player.velocity = {x: 0, y: 0, z: 0};
		controls(player);
	}

	/*	
	fps control mode
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
								}*/

	return scene;
}

function controls(player) {
	// get forward and right vectors from camera rotation
	const forward = vec3.transformQuat(vec3.create(), [0, 0, -1], player.rotation);
	const right = vec3.transformQuat(vec3.create(), [1, 0, 0], player.rotation);
	const up = vec3.transformQuat(vec3.create(), [0, 1, 0], player.rotation);
	const moveVec = vec3.scale(vec3.create(), forward, moveSpeed * dt);
	player.velocity.x += moveVec[0];
	player.velocity.y += moveVec[1];
	player.velocity.z += moveVec[2];

	//clamp
	const maxSpeed = 5;
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
	const alignment = vec3.dot(forwardNorm, velNorm); // 1 means aligned, -1 means opposite, 0 means perpendicular
	const drag = 1 - Math.abs(alignment); // 0 means no drag, 1 means full drag
	const dragFactor = 1 - drag * 0.1; // tweak 0.1 to adjust drag strength
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

export function initGame() {
	return {
		players: [ship()],
		currentPlayer: 0,
		objects: [cube('soup'), ring({x: 0, y: 0, z: -10}), ring({x: 0, y: 0, z: -15}), ring({x: 0, y: 0, z: -20})],
	};
}
