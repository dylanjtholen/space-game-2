export default class Model {
	constructor({vertices = [], faces = [], position = {x: 0, y: 0, z: 0}, scale = {x: 1, y: 1, z: 1}, rotation = {x: 0, y: 0, z: 0}} = {}) {
		// vertices: [{x,y,z}, ...]
		// faces: [{indices: [i0,i1,i2], texcoords: [[u,v],[u,v],[u,v]] (optional), texture: 'name' (optional), color: [r,g,b,a] (optional)}]
		this.vertices = vertices;
		this.faces = faces;
		this.position = position;
		this.scale = scale;
		this.rotation = rotation; // Euler degrees
	}

	// Returns an array of face objects expanded for rendering. Each item contains positions (Float32Array length 9), texcoords (Float32Array length 6 or null), texture (string|null), color (array|null)
	getRenderable() {
		const faces = [];
		for (const f of this.faces) {
			const idx = f.indices;
			if (!idx || idx.length < 3) continue;
			const posArr = new Float32Array(9);
			for (let i = 0; i < 3; i++) {
				const v = this.vertices[idx[i]];
				posArr[i * 3 + 0] = v.x;
				posArr[i * 3 + 1] = v.y;
				posArr[i * 3 + 2] = v.z;
			}
			let tex = null;
			if (f.texcoords) {
				tex = new Float32Array(6);
				for (let i = 0; i < 3; i++) {
					const t = f.texcoords[i] || [0, 0];
					tex[i * 2 + 0] = t[0];
					tex[i * 2 + 1] = t[1];
				}
			}
			const texture = f.texture || null;
			const color = f.color || null;
			faces.push({positions: posArr, texcoords: tex, texture, color});
		}
		return {
			position: this.position,
			rotation: this.rotation,
			scale: this.scale,
			faces: faces,
		};
	}
}
