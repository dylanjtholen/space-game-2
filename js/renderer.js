import {getAsset} from './assetLoader.js';
import {hexToRgb} from './utils.js';

const {mat4, vec3, quat} = glMatrix;

let gl;
let shaderProgram;
// Cache uniform and attribute locations
const glLocations = {
	mvp: null,
	position: null,
	texcoord: null,
	useTexture: null,
	color: null,
	texture: null,
};
const textureCache = new Map();

// Resize the canvas drawing buffer to match its displayed size (handles devicePixelRatio)
function resizeCanvasToDisplaySize(canvas) {
	const dpr = window.devicePixelRatio || 1;
	const displayWidth = Math.round(canvas.clientWidth * dpr);
	const displayHeight = Math.round(canvas.clientHeight * dpr);
	if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
		canvas.width = displayWidth;
		canvas.height = displayHeight;
		return true;
	}
	return false;
}

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

function isPowerOfTwo(value) {
	return (value & (value - 1)) === 0;
}

// Create and configure a WebGL texture from an ImageBitmap or HTMLImageElement
function createGLTextureFromImage(img) {
	const tex = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, tex);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

	const width = img.width;
	const height = img.height;
	const pot = isPowerOfTwo(width) && isPowerOfTwo(height);

	if (pot) {
		// power-of-two: allow repeat and mipmaps
		gl.generateMipmap(gl.TEXTURE_2D);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
	} else {
		// non-power-of-two: must use clamp-to-edge and no mipmaps
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	}

	const ext = gl.getExtension('EXT_texture_filter_anisotropic') || gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic') || gl.getExtension('MOZ_EXT_texture_filter_anisotropic');
	if (ext) {
		const max = gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
		const amount = Math.min(4, max);
		gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, amount);
	}

	return tex;
}

export async function initRenderer(canvas) {
	gl = canvas.getContext('webgl');
	if (!gl) throw new Error('WebGL not supported');

	const vertSrc = await loadShaderSource('shaders/vert.glsl');
	const fragSrc = await loadShaderSource('shaders/frag.glsl');

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
	gl.enable(gl.DEPTH_TEST);
	gl.clearColor(0, 0, 0, 1);

	// Cache uniform and attribute locations after linking
	glLocations.mvp = gl.getUniformLocation(shaderProgram, 'uMVPMatrix');
	glLocations.position = gl.getAttribLocation(shaderProgram, 'aPosition');
	glLocations.texcoord = gl.getAttribLocation(shaderProgram, 'aTexcoord');
	glLocations.useTexture = gl.getUniformLocation(shaderProgram, 'uUseTexture');
	glLocations.color = gl.getUniformLocation(shaderProgram, 'uColor');
	glLocations.texture = gl.getUniformLocation(shaderProgram, 'uTexture');

	// make sure the drawing buffer matches the displayed size on init
	resizeCanvasToDisplaySize(canvas);
	gl.viewport(0, 0, canvas.width, canvas.height);
}

export function render(camera, scene) {
	if (!gl) throw new Error('initRenderer has not been called');
	// Resize each frame if the canvas was resized (or devicePixelRatio changed)
	if (resizeCanvasToDisplaySize(gl.canvas)) {
		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
	}

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	const viewMatrix = mat4.create();
	const projectionMatrix = mat4.create();
	const vpMatrix = mat4.create();

	const cameraQuat = camera.rotation;
	const cameraPos = vec3.fromValues(camera.position.x, camera.position.y, camera.position.z);
	const cameraTarget = vec3.create();
	vec3.add(cameraTarget, cameraPos, vec3.transformQuat(vec3.create(), [0, 0, -1], cameraQuat));
	const up = vec3.transformQuat(vec3.create(), [0, 1, 0], cameraQuat);
	mat4.lookAt(viewMatrix, cameraPos, cameraTarget, up);
	// use the drawing buffer width/height (already scaled by devicePixelRatio)
	mat4.perspective(projectionMatrix, (camera.fov * Math.PI) / 180, gl.canvas.width / gl.canvas.height, 0.1, 1000);
	mat4.multiply(vpMatrix, projectionMatrix, viewMatrix);

	const batches = new Map();
	[...scene.objects, ...scene.players].forEach((object) => {
		const obj = object.getRenderable();
		(obj.faces || []).forEach((face) => {
			const key = face.texture || (face.color ? face.color.toString() : 'default');
			if (!batches.has(key)) batches.set(key, []);
			batches.get(key).push({obj, face});
		});
	});

	for (const [key, group] of batches.entries()) {
		// Bind texture or set color once per batch
		let tex = null;
		let useTexture = false;
		let color = [1, 1, 1, 1];
		if (group[0].face.texture) {
			const img = getAsset(group[0].face.texture);
			if (img) {
				tex = textureCache.get(group[0].face.texture);
				if (!tex) {
					tex = createGLTextureFromImage(img);
					textureCache.set(group[0].face.texture, tex);
				}
				gl.bindTexture(gl.TEXTURE_2D, tex);
				gl.activeTexture(gl.TEXTURE0);
				gl.uniform1i(glLocations.useTexture, 1);
				gl.uniform1i(glLocations.texture, 0);
				useTexture = true;
			} else {
				gl.uniform1i(glLocations.useTexture, 0);
				if (group[0].face.color) color = group[0].face.color;
				gl.uniform4fv(glLocations.color, color);
			}
		} else {
			gl.uniform1i(glLocations.useTexture, 0);
			color = group[0].face.color ? hexToRgb(group[0].face.color) : [1, 1, 1, 1];
			gl.uniform4fv(glLocations.color, color);
		}

		// Draw all faces
		for (const {obj, face} of group) {
			// model transform: compose rotation, translation and scale
			const modelMatrix = mat4.create();
			const objQuat = obj.rotation;
			mat4.fromRotationTranslationScale(modelMatrix, objQuat, [obj.position.x, obj.position.y, obj.position.z], [obj.scale.x, obj.scale.y, obj.scale.z]);

			const mvpMatrix = mat4.create();
			mat4.multiply(mvpMatrix, vpMatrix, modelMatrix);
			gl.uniformMatrix4fv(glLocations.mvp, false, mvpMatrix);

			const positionLocation = glLocations.position;
			const texLocation = glLocations.texcoord;

			if (!face._posBuf) {
				face._posBuf = gl.createBuffer();
				gl.bindBuffer(gl.ARRAY_BUFFER, face._posBuf);
				gl.bufferData(gl.ARRAY_BUFFER, face.positions, gl.STATIC_DRAW);
			} else {
				gl.bindBuffer(gl.ARRAY_BUFFER, face._posBuf);
			}
			gl.enableVertexAttribArray(positionLocation);
			gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);

			if (face.texcoords) {
				if (!face._texBuf) {
					face._texBuf = gl.createBuffer();
					gl.bindBuffer(gl.ARRAY_BUFFER, face._texBuf);
					gl.bufferData(gl.ARRAY_BUFFER, face.texcoords, gl.STATIC_DRAW);
				} else {
					gl.bindBuffer(gl.ARRAY_BUFFER, face._texBuf);
				}
				gl.enableVertexAttribArray(texLocation);
				gl.vertexAttribPointer(texLocation, 2, gl.FLOAT, false, 0, 0);
			} else {
				gl.disableVertexAttribArray(texLocation);
				gl.vertexAttrib2f(texLocation, 0, 0);
			}

			gl.drawArrays(gl.TRIANGLES, 0, 3);
		}
	}
}
