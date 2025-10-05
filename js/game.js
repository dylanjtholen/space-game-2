const {quat, vec3} = glMatrix;

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

	const cam = scene.camera;

	// compute forward and right vectors from camera rotation
	const forward = vec3.transformQuat(vec3.create(), [0, 0, -1], cam.rotation);
	const right = vec3.transformQuat(vec3.create(), [1, 0, 0], cam.rotation);

	let moveX = 0;
	let moveZ = 0;

	if (keys['w']) moveZ += 1;
	if (keys['s']) moveZ -= 1;
	if (keys['a']) moveX -= 1;
	if (keys['d']) moveX += 1;
	// build movement vector in world space
	const moveVec = vec3.create();
	if (moveZ !== 0) {
		vec3.scaleAndAdd(moveVec, moveVec, forward, moveZ);
	}
	if (moveX !== 0) {
		vec3.scaleAndAdd(moveVec, moveVec, right, moveX);
	}

	if (vec3.length(moveVec) > 0) {
		vec3.normalize(moveVec, moveVec);
		vec3.scale(moveVec, moveVec, moveSpeed * dt);
		cam.position.x += moveVec[0];
		cam.position.y += moveVec[1];
		cam.position.z += moveVec[2];
	}

	let yaw = 0;
	if (keys['arrowleft']) yaw += 1;
	if (keys['arrowright']) yaw -= 1;
	if (yaw !== 0) {
		const angle = yaw * rotSpeed * dt;
		const q = quat.setAxisAngle(quat.create(), [0, 1, 0], angle);
		quat.multiply(cam.rotation, cam.rotation, q);
	}
	let pitch = 0;
	if (keys['arrowup']) pitch += 1;
	if (keys['arrowdown']) pitch -= 1;
	if (pitch !== 0) {
		const angle = pitch * rotSpeed * dt;
		const right = vec3.transformQuat(vec3.create(), [1, 0, 0], cam.rotation);
		const q = quat.setAxisAngle(quat.create(), right, angle);
		quat.multiply(cam.rotation, q, cam.rotation);
	}
	let roll = 0;
	if (keys['q']) roll += 1;
	if (keys['e']) roll -= 1;
	if (roll !== 0) {
		const angle = roll * rotSpeed * dt;
		const forward = vec3.transformQuat(vec3.create(), [0, 0, -1], cam.rotation);
		const q = quat.setAxisAngle(quat.create(), forward, angle);
		quat.multiply(cam.rotation, q, cam.rotation);
	}

	// Normalize quaternion to prevent drift
	quat.normalize(cam.rotation, cam.rotation);

	return scene;
}

export function initGame() {}
