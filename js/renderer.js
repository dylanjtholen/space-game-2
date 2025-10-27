import {getAsset} from './assetLoader.js';
import {hexToRgb} from './utils.js';
import {Player} from './game.js';
import Model from './model.js';
import {cube, ship, Ring} from './premadeModels.js';

import {mat4, vec3, quat} from 'gl-matrix';

let gl;
let shaderProgram;

const glLocations = {
	mvp: null,
	position: null,
	texcoord: null,
	useTexture: null,
	color: null,
	texture: null,
};
const textureCache = new Map();
const geometryCache = new Map();

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

function createGLTextureFromImage(img) {
	const tex = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, tex);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

	const width = img.width;
	const height = img.height;
	const pot = isPowerOfTwo(width) && isPowerOfTwo(height);

	if (pot) {
		gl.generateMipmap(gl.TEXTURE_2D);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
	} else {
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

	glLocations.mvp = gl.getUniformLocation(shaderProgram, 'uMVPMatrix');
	glLocations.position = gl.getAttribLocation(shaderProgram, 'aPosition');
	glLocations.texcoord = gl.getAttribLocation(shaderProgram, 'aTexcoord');
	glLocations.useTexture = gl.getUniformLocation(shaderProgram, 'uUseTexture');
	glLocations.color = gl.getUniformLocation(shaderProgram, 'uColor');
	glLocations.texture = gl.getUniformLocation(shaderProgram, 'uTexture');

	resizeCanvasToDisplaySize(canvas);
	gl.viewport(0, 0, canvas.width, canvas.height);

	if (_shipRenderable && _shipRenderable.faces) prewarmRenderable(_shipRenderable, true);
}

export function prewarmRenderable(renderable) {
	if (!gl || !renderable || !renderable.faces) return;

	let totalVerts = 0;
	for (const f of renderable.faces) {
		const verts = f.positions ? f.positions.length / 3 : 0;
		totalVerts += verts;
	}
	if (totalVerts === 0) return;

	const combinedPos = new Float32Array(totalVerts * 3);
	let combinedTex = null;
	let hasTex = false;
	for (const f of renderable.faces) {
		if (f.texcoords) {
			hasTex = true;
			break;
		}
	}
	if (hasTex) combinedTex = new Float32Array(totalVerts * 2);

	let vertOffset = 0;
	for (const f of renderable.faces) {
		const pos = f.positions;
		const vCount = pos ? pos.length / 3 : 0;

		for (let i = 0; i < vCount * 3; i++) combinedPos[vertOffset * 3 + i] = pos[i];

		if (hasTex) {
			if (f.texcoords) {
				const tc = f.texcoords;
				for (let i = 0; i < vCount * 2; i++) combinedTex[vertOffset * 2 + i] = tc[i] || 0;
			} else {
				for (let i = 0; i < vCount * 2; i++) combinedTex[vertOffset * 2 + i] = 0;
			}
		}
		f._vertexOffset = vertOffset;
		f._vertexCount = vCount;
		vertOffset += vCount;
	}

	try {
		renderable._combinedPosBuf = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, renderable._combinedPosBuf);
		gl.bufferData(gl.ARRAY_BUFFER, combinedPos, gl.STATIC_DRAW);
		if (hasTex) {
			renderable._combinedTexBuf = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, renderable._combinedTexBuf);
			gl.bufferData(gl.ARRAY_BUFFER, combinedTex, gl.STATIC_DRAW);
		}
		if (arguments[1]) renderable._shared = true;
	} catch (e) {
		console.warn('prewarmRenderable failed', e);
	}
}

export function cleanupRenderable(renderable) {
	if (!gl || !renderable || !renderable.faces) return;

	if (renderable._shared) return;
	if (renderable._combinedPosBuf) {
		try {
			gl.deleteBuffer(renderable._combinedPosBuf);
		} catch (e) {}
		delete renderable._combinedPosBuf;
	}
	if (renderable._combinedTexBuf) {
		try {
			gl.deleteBuffer(renderable._combinedTexBuf);
		} catch (e) {}
		delete renderable._combinedTexBuf;
	}

	for (const face of renderable.faces) {
		if (face._posBuf) {
			try {
				gl.deleteBuffer(face._posBuf);
			} catch (e) {}
			delete face._posBuf;
		}
		if (face._texBuf) {
			try {
				gl.deleteBuffer(face._texBuf);
			} catch (e) {}
			delete face._texBuf;
		}
	}
}

const _viewMatrix = mat4.create();
const _projectionMatrix = mat4.create();
const _vpMatrix = mat4.create();
const _modelMatrix = mat4.create();
const _mvpMatrix = mat4.create();
const _cameraPos = vec3.create();
const _cameraTarget = vec3.create();
const _up = vec3.create();
const _tmpForward = vec3.create();
const FORWARD_VEC = vec3.fromValues(0, 0, -1);
const UP_VEC = vec3.fromValues(0, 1, 0);

const _shipTemplate = ship();
const _shipRenderable = _shipTemplate.getRenderable();

const _objPosArr = [0, 0, 0];
const _objScaleArr = [1, 1, 1];
export function render(camera, scene) {
	if (!gl) throw new Error('initRenderer has not been called');

	if (resizeCanvasToDisplaySize(gl.canvas)) {
		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
	}

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	const cameraQuat = camera.rotation;
	_cameraPos[0] = camera.position.x;
	_cameraPos[1] = camera.position.y;
	_cameraPos[2] = camera.position.z;
	vec3.transformQuat(_tmpForward, FORWARD_VEC, cameraQuat);
	vec3.add(_cameraTarget, _cameraPos, _tmpForward);
	vec3.transformQuat(_up, UP_VEC, cameraQuat);
	mat4.lookAt(_viewMatrix, _cameraPos, _cameraTarget, _up);
	mat4.perspective(_projectionMatrix, (camera.fov * Math.PI) / 180, gl.canvas.width / gl.canvas.height, 0.1, 1000);
	mat4.multiply(_vpMatrix, _projectionMatrix, _viewMatrix);

	if (!scene) return;
	const batches = new Map();
	const objs = Array.isArray(scene.objects) ? scene.objects : [];
	const players = Array.isArray(scene.players) ? scene.players : [];
	[...objs, ...players].forEach((object) => {
		const obj = getRenderable(object);
		(obj.faces || []).forEach((face) => {
			const key = face.texture || (face.color ? face.color.toString() : 'default');
			if (!batches.has(key)) batches.set(key, []);
			batches.get(key).push({obj, face});
		});
	});

	for (const [key, group] of batches.entries()) {
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

		let lastObj = null;
		for (const {obj, face} of group) {
			const objQuat = obj.rotation;

			_objPosArr[0] = obj.position.x;
			_objPosArr[1] = obj.position.y;
			_objPosArr[2] = obj.position.z;
			_objScaleArr[0] = obj.scale.x;
			_objScaleArr[1] = obj.scale.y;
			_objScaleArr[2] = obj.scale.z;
			mat4.fromRotationTranslationScale(_modelMatrix, objQuat, _objPosArr, _objScaleArr);
			mat4.multiply(_mvpMatrix, _vpMatrix, _modelMatrix);
			gl.uniformMatrix4fv(glLocations.mvp, false, _mvpMatrix);
			const positionLocation = glLocations.position;
			const texLocation = glLocations.texcoord;

			if (obj._combinedPosBuf) {
				if (obj !== lastObj) {
					gl.bindBuffer(gl.ARRAY_BUFFER, obj._combinedPosBuf);
					gl.enableVertexAttribArray(positionLocation);
					gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
					if (obj._combinedTexBuf) {
						gl.bindBuffer(gl.ARRAY_BUFFER, obj._combinedTexBuf);
						gl.enableVertexAttribArray(texLocation);
						gl.vertexAttribPointer(texLocation, 2, gl.FLOAT, false, 0, 0);
					} else {
						gl.disableVertexAttribArray(texLocation);
						gl.vertexAttrib2f(texLocation, 0, 0);
					}
					lastObj = obj;
				}
				const start = face._vertexOffset || 0;
				const count = face._vertexCount || 0;
				if (count > 0) gl.drawArrays(gl.TRIANGLES, start, count);
			} else {
				if (!face._posBuf) {
					face._posBuf = gl.createBuffer();
					gl.bindBuffer(gl.ARRAY_BUFFER, face._posBuf);
					gl.bufferData(gl.ARRAY_BUFFER, face.positions, gl.STATIC_DRAW);
				}
				gl.bindBuffer(gl.ARRAY_BUFFER, face._posBuf);
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
				const vcount = face.positions ? face.positions.length / 3 : 0;
				if (vcount > 0) gl.drawArrays(gl.TRIANGLES, 0, vcount);
			}
		}
	}
}

function getRenderable(object) {
	if (object instanceof Player || object.uuid) {
		return {position: object.position, rotation: object.rotation, scale: _shipRenderable.scale || {x: 1, y: 1, z: 1}, faces: _shipRenderable.faces};
	}
	if (object.getRenderable) {
		if (object._renderable) return object._renderable;
		const r = object.getRenderable();
		object._renderable = r;
		prewarmRenderable(r);
		return r;
	}

	if (object && object.type && !object.getRenderable) {
		try {
			let model = null;
			switch (object.type) {
				case 'cube':
					model = cube(object.texture);
					break;
				case 'ship':
					model = ship();
					break;
				case 'ring':
					model = new Ring({position: object.position || {x: 0, y: 0, z: 0}, rotation: object.rotation || quat.create(), scale: object.scale || {x: 1, y: 1, z: 1}});
					break;
				default:
					model = new Model({position: object.position || {x: 0, y: 0, z: 0}, scale: object.scale || {x: 1, y: 1, z: 1}, rotation: object.rotation || quat.create()});
			}
			if (object.position) model.position = object.position;
			if (object.scale) model.scale = object.scale;
			if (object.rotation) model.rotation = object.rotation;
			if (object.velocity) model.velocity = object.velocity;
			const r = model.getRenderable();

			prewarmRenderable(r, true);
			object._renderable = r;
			return r;
		} catch (e) {
			console.warn('renderer: failed to reconstruct descriptor', e);
		}
	}
	if (object._renderable) return object._renderable;
	const faces = [];
	if (object.vertices && object.faces) {
		const key = geometryKey(object);
		const cached = geometryCache.get(key);
		if (cached) {
			return {position: object.position, rotation: object.rotation, scale: object.scale, faces: cached.faces};
		}
	}
	for (const f of object.faces || []) {
		const idx = f.indices;
		if (!idx || idx.length < 3) continue;

		const pushTriangle = (a, b, c, texcoordsArray) => {
			const posArr = new Float32Array(9);
			const verts = [a, b, c];
			for (let i = 0; i < 3; i++) {
				const v = object.vertices[verts[i]];
				posArr[i * 3 + 0] = v.x;
				posArr[i * 3 + 1] = v.y;
				posArr[i * 3 + 2] = v.z;
			}
			let tex = null;
			if (texcoordsArray) {
				tex = new Float32Array(6);
				for (let i = 0; i < 3; i++) {
					const t = texcoordsArray[i] || [0, 0];
					tex[i * 2 + 0] = t[0];
					tex[i * 2 + 1] = t[1];
				}
			}
			const texture = f.texture || null;
			const color = f.color || null;
			faces.push({positions: posArr, texcoords: tex, texture, color});
		};

		if (idx.length === 3) {
			pushTriangle(idx[0], idx[1], idx[2], f.texcoords);
		} else if (idx.length === 4) {
			const tc = f.texcoords || [];
			pushTriangle(idx[0], idx[1], idx[2], [tc[0], tc[1], tc[2]]);
			pushTriangle(idx[1], idx[2], idx[3], [tc[1], tc[2], tc[3]]);
		} else {
			const tc = f.texcoords || [];
			for (let i = 1; i < idx.length - 1; i++) {
				pushTriangle(idx[0], idx[i], idx[i + 1], [tc[0], tc[i], tc[i + 1]]);
			}
		}
	}
	const renderable = {position: object.position, rotation: object.rotation, scale: object.scale, faces};

	if (object.vertices && object.faces) {
		const key = geometryKey(object);
		geometryCache.set(key, renderable);
		prewarmRenderable(renderable, true);
		return {position: object.position, rotation: object.rotation, scale: object.scale, faces: renderable.faces};
	}
	object._renderable = renderable;
	prewarmRenderable(renderable);
	return renderable;
}

function geometryKey(object) {
	let h = 2166136261 >>> 0;
	const verts = object.vertices || [];
	const faces = object.faces || [];
	h = hashMix(h, verts.length);
	h = hashMix(h, faces.length);
	for (let i = 0; i < verts.length; i++) {
		const v = verts[i];
		h = hashMix(h, Math.floor((v.x || 0) * 1000));
		h = hashMix(h, Math.floor((v.y || 0) * 1000));
		h = hashMix(h, Math.floor((v.z || 0) * 1000));
		if (i > 20) break;
	}
	for (let i = 0; i < faces.length && i < 50; i++) {
		const f = faces[i];
		const idx = f.indices || [];
		h = hashMix(h, idx.length);
		if (idx.length > 0) h = hashMix(h, idx[0]);
	}
	return h.toString(16);
}

function hashMix(h, v) {
	h ^= v >>> 0;
	h = Math.imul(h, 16777619) >>> 0;
	return h;
}
