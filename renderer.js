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
}
