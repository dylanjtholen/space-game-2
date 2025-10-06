const {quat} = glMatrix;

export default class Model {
	constructor({vertices = [], faces = [], position = {x: 0, y: 0, z: 0}, scale = {x: 1, y: 1, z: 1}, rotation = quat.create()} = {}) {
		// vertices: [{x,y,z}, ...]
		// faces: [{indices: [i0,i1,i2], texcoords: [[u,v],[u,v],[u,v]] (optional), texture: 'name' (optional), color: [r,g,b,a] (optional)}]
		this.vertices = vertices;
		this.faces = faces;
		this.position = position;
		this.scale = scale;
		this.rotation = rotation;
	}

	// Returns an array of face objects expanded for rendering
	getRenderable() {
		const faces = [];
		for (const f of this.faces) {
			const idx = f.indices;
			if (!idx || idx.length < 3) continue;

			const pushTriangle = (a, b, c, texcoordsArray) => {
				const posArr = new Float32Array(9);
				const verts = [a, b, c];
				for (let i = 0; i < 3; i++) {
					const v = this.vertices[verts[i]];
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
				// single triangle
				pushTriangle(idx[0], idx[1], idx[2], f.texcoords);
			} else if (idx.length === 4) {
				// quad: split into two triangles (0,1,2) and (0,2,3)
				const tc = f.texcoords || [];
				pushTriangle(idx[0], idx[1], idx[2], [tc[0], tc[1], tc[2]]);
				pushTriangle(idx[1], idx[2], idx[3], [tc[1], tc[2], tc[3]]);
			} else {
				// more than 4 indices: triangle fan
				const tc = f.texcoords || [];
				for (let i = 1; i < idx.length - 1; i++) {
					pushTriangle(idx[0], idx[i], idx[i + 1], [tc[0], tc[i], tc[i + 1]]);
				}
			}
		}
		return {
			position: this.position,
			rotation: this.rotation,
			scale: this.scale,
			faces: faces,
		};
	}
}
