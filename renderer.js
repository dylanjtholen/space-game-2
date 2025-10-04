import {mat4, vec3, quat} from 'lib/gl-matrix-min.js';

let gl;
let shaderProgram;

async function loadShaderSource(url) {
	const response = await fetch(url);
	return await response.text();
}

function compileShader(gl, source, type) {
	const shader = gl.createShader(type);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		const info = gl.getShaderInfoLog(shader);
		gl.deleteShader(shader);
		throw new Error('Could not compile shader: ' + info);
	}
	return shader;
}

export async function initRenderer(canvas) {
	gl = canvas.getContext('webgl');
	if (!gl) throw new Error('WebGL not supported');

	const vertSrc = await loadShaderSource('vert.glsl');
	const fragSrc = await loadShaderSource('frag.glsl');

	const vertShader = compileShader(gl, vertSrc, gl.VERTEX_SHADER);
	const fragShader = compileShader(gl, fragSrc, gl.FRAGMENT_SHADER);

	shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertShader);
	gl.attachShader(shaderProgram, fragShader);
	gl.linkProgram(shaderProgram);
	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		throw new Error('Could not link program: ' + gl.getProgramInfoLog(shaderProgram));
	}
	gl.useProgram(shaderProgram);
}

export function render(scene) {
	if (!gl) throw new Error('initRenderer has not been called');
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	const camera = scene.camera;
	const viewMatrix = mat4.create();
	const projectionMatrix = mat4.create();
	const vpMatrix = mat4.create();

	const cameraQuat = quat.create();
	quat.fromEuler(cameraQuat, camera.rotation.x, camera.rotation.y, camera.rotation.z);
	const cameraPos = vec3.fromValues(camera.position.x, camera.position.y, camera.position.z);
	const cameraTarget = vec3.create();
	vec3.add(cameraTarget, cameraPos, vec3.transformQuat(vec3.create(), [0, 0, -1], cameraQuat));
	const up = vec3.transformQuat(vec3.create(), [0, 1, 0], cameraQuat);
	mat4.lookAt(viewMatrix, cameraPos, cameraTarget, up);
	mat4.perspective(projectionMatrix, (camera.fov * Math.PI) / 180, gl.canvas.width / gl.canvas.height, 0.1, 1000);
	mat4.multiply(vpMatrix, projectionMatrix, viewMatrix);

	scene.objects.forEach((obj) => {
		const modelMatrix = mat4.create();
		mat4.translate(modelMatrix, modelMatrix, [obj.position.x, obj.position.y, obj.position.z]);
		const objQuat = quat.create();
		quat.fromEuler(objQuat, obj.rotation.x, obj.rotation.y, obj.rotation.z);
		mat4.fromQuat(modelMatrix, objQuat);
		mat4.scale(modelMatrix, modelMatrix, [obj.scale.x, obj.scale.y, obj.scale.z]);

		const mvpMatrix = mat4.create();
		mat4.multiply(mvpMatrix, vpMatrix, modelMatrix);
		const mvpLocation = gl.getUniformLocation(shaderProgram, 'uMVPMatrix');
		gl.uniformMatrix4fv(mvpLocation, false, mvpMatrix);

		// Assume obj has vertex buffer and draw method
		let vertexBuffer = gl.createBuffer();

		gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
		let vSpread = [];
		obj.vertices.forEach((v) => vSpread.push(v.x, v.y, v.z));
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vSpread), gl.STATIC_DRAW);

		const positionLocation = gl.getAttribLocation(shaderProgram, 'aPosition');
		gl.enableVertexAttribArray(positionLocation);
		gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);

		gl.drawArrays(gl.TRIANGLES, 0, obj.vertices.length);
	});
}
