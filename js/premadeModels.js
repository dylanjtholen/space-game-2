import Model from './model.js';
export function cube(texture) {
	return new Model({
		vertices: [
			{x: -1, y: -1, z: 1},
			{x: 1, y: -1, z: 1},
			{x: 1, y: 1, z: 1},
			{x: -1, y: 1, z: 1},
			{x: -1, y: -1, z: -1},
			{x: 1, y: -1, z: -1},
			{x: 1, y: 1, z: -1},
			{x: -1, y: 1, z: -1},
		],
		faces: [
			{
				indices: [0, 1, 2],
				texcoords: [
					[0, 2 / 3],
					[0.25, 2 / 3],
					[0.25, 1 / 3],
				],
				texture: texture,
			},
			{
				indices: [2, 3, 0],
				texcoords: [
					[0.25, 1 / 3],
					[0, 1 / 3],
					[0, 2 / 3],
				],
				texture: texture,
			},
			{
				indices: [1, 5, 6],
				texcoords: [
					[0.25, 2 / 3],
					[0.5, 2 / 3],
					[0.5, 1 / 3],
				],
				texture: texture,
			},
			{
				indices: [6, 2, 1],
				texcoords: [
					[0.5, 1 / 3],
					[0.25, 1 / 3],
					[0.25, 2 / 3],
				],
				texture: texture,
			},
			{
				indices: [5, 4, 7],
				texcoords: [
					[0.5, 2 / 3],
					[0.75, 2 / 3],
					[0.75, 1 / 3],
				],
				texture: texture,
			},
			{
				indices: [7, 6, 5],
				texcoords: [
					[0.75, 1 / 3],
					[0.5, 1 / 3],
					[0.5, 2 / 3],
				],
				texture: texture,
			},
			{
				indices: [4, 0, 3],
				texcoords: [
					[0.75, 2 / 3],
					[1, 2 / 3],
					[1, 1 / 3],
				],
				texture: texture,
			},
			{
				indices: [3, 7, 4],
				texcoords: [
					[1, 1 / 3],
					[0.75, 1 / 3],
					[0.75, 2 / 3],
				],
				texture: texture,
			},
			{
				indices: [3, 2, 6],
				texcoords: [
					[0.25, 1 / 3],
					[0.5, 1 / 3],
					[0.5, 0],
				],
				texture: texture,
			},
			{
				indices: [6, 7, 3],
				texcoords: [
					[0.5, 0],
					[0.25, 0],
					[0.25, 1 / 3],
				],
				texture: texture,
			},
			{
				indices: [4, 5, 1],
				texcoords: [
					[0.5, 2 / 3],
					[0.25, 2 / 3],
					[0.25, 1],
				],
				texture: texture,
			},
			{
				indices: [1, 0, 4],
				texcoords: [
					[0.25, 1],
					[0.5, 1],
					[0.5, 2 / 3],
				],
				texture: texture,
			},
		],
		position: {x: 0, y: 0, z: 0},
	});
}

export function ship() {
	//just a triangle for now
	let m = new Model({
		vertices: [
			{x: -1, y: -0.5, z: 2},
			{x: 1, y: -0.5, z: 2},
			{x: 0, y: -1.0, z: 1},
			{x: 0, y: -0.5, z: -1},
			{x: 0, y: -0.5, z: 1},
			{x: 0, y: -0.5, z: -1},
		],
		faces: [
			{color: [1, 0, 0, 1], indices: [3, 1, 4]},
			{color: [0, 1, 0, 1], indices: [3, 0, 4]},
			{color: [0, 0, 1, 1], indices: [2, 0, 4]},
			{color: [1, 1, 0, 1], indices: [2, 1, 4]},
			{color: [0, 1, 1, 1], indices: [5, 1, 2]},
			{color: [1, 0, 1, 1], indices: [5, 0, 2]},
		],
		position: {x: 0, y: 0, z: 0},
		scale: {x: 0.5, y: 0.5, z: 0.5},
	});
	//velocity for players
	m.velocity = {x: 0, y: 0, z: 0};
	return m;
}
