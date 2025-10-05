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
					[0, 0.667],
					[0.25, 0.667],
					[0.25, 0.333],
				],
				texture: texture,
			},
			{
				indices: [2, 3, 0],
				texcoords: [
					[0.25, 0.333],
					[0, 0.333],
					[0, 0.667],
				],
				texture: texture,
			},
			{
				indices: [1, 5, 6],
				texcoords: [
					[0.25, 0.667],
					[0.5, 0.667],
					[0.5, 0.333],
				],
				texture: texture,
			},
			{
				indices: [6, 2, 1],
				texcoords: [
					[0.5, 0.333],
					[0.25, 0.333],
					[0.25, 0.667],
				],
				texture: texture,
			},
			{
				indices: [5, 4, 7],
				texcoords: [
					[0.5, 0.667],
					[0.75, 0.667],
					[0.75, 0.333],
				],
				texture: texture,
			},
			{
				indices: [7, 6, 5],
				texcoords: [
					[0.75, 0.333],
					[0.5, 0.333],
					[0.5, 0.667],
				],
				texture: texture,
			},
			{
				indices: [4, 0, 3],
				texcoords: [
					[0.75, 0.667],
					[1, 0.667],
					[1, 0.333],
				],
				texture: texture,
			},
			{
				indices: [3, 7, 4],
				texcoords: [
					[1, 0.333],
					[0.75, 0.333],
					[0.75, 0.667],
				],
				texture: texture,
			},
			{
				indices: [3, 2, 6],
				texcoords: [
					[0.25, 0.333],
					[0.5, 0.333],
					[0.5, 0],
				],
				texture: texture,
			},
			{
				indices: [6, 7, 3],
				texcoords: [
					[0.5, 0],
					[0.25, 0],
					[0.25, 0.333],
				],
				texture: texture,
			},
			{
				indices: [4, 5, 1],
				texcoords: [
					[0.5, 0.667],
					[0.25, 0.667],
					[0.25, 1],
				],
				texture: texture,
			},
			{
				indices: [1, 0, 4],
				texcoords: [
					[0.25, 1],
					[0, 0.667],
					[0, 1],
				],
				texture: texture,
			},
		],
		position: {x: 0, y: 0, z: 0},
	});
}
