import Model from './model.js';
import {vec3, quat} from 'gl-matrix';
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
			{color: '#FF0000', indices: [3, 1, 4]},
			{color: '#00FF00', indices: [3, 0, 4]},
			{color: '#0000FF', indices: [2, 0, 4]},
			{color: '#FFFF00', indices: [2, 1, 4]},
			{color: '#00FFFF', indices: [5, 1, 2]},
			{color: '#FF00FF', indices: [5, 0, 2]},
		],
		position: {x: 0, y: 0, z: 0},
		scale: {x: 0.5, y: 0.5, z: 0.5},
	});
	//velocity for players
	m.velocity = {x: 0, y: 0, z: 0};
	return m;
}

export class Ring extends Model {
	constructor({position = {x: 0, y: 0, z: 0}, rotation = [0, 0, 0, 1], scale = {x: 1, y: 1, z: 1}}) {
		const color = '#FFFFFF';
		super({
			vertices: [
				{x: 1.53, y: 0, z: 0.25},
				{x: 1.08, y: 1.08, z: 0.25},
				{x: 0, y: 1.53, z: 0.25},
				{x: -1.08, y: 1.08, z: 0.25},
				{x: -1.53, y: 0, z: 0.25},
				{x: -1.08, y: -1.08, z: 0.25},
				{x: 0, y: -1.53, z: 0.25},
				{x: 1.08, y: -1.08, z: 0.25},
				{x: 1.53, y: 0, z: -0.25},
				{x: 1.08, y: 1.08, z: -0.25},
				{x: 0, y: 1.53, z: -0.25},
				{x: -1.08, y: 1.08, z: -0.25},
				{x: -1.53, y: 0, z: -0.25},
				{x: -1.08, y: -1.08, z: -0.25},
				{x: 0, y: -1.53, z: -0.25},
				{x: 1.08, y: -1.08, z: -0.25},
				{x: 1.9125, y: 0, z: 0.25},
				{x: 1.35, y: 1.35, z: 0.25},
				{x: 0, y: 1.9125, z: 0.25},
				{x: -1.35, y: 1.35, z: 0.25},
				{x: -1.9125, y: 0, z: 0.25},
				{x: -1.35, y: -1.35, z: 0.25},
				{x: 0, y: -1.9125, z: 0.25},
				{x: 1.35, y: -1.35, z: 0.25},
				{x: 1.9125, y: 0, z: -0.25},
				{x: 1.35, y: 1.35, z: -0.25},
				{x: 0, y: 1.9125, z: -0.25},
				{x: -1.35, y: 1.35, z: -0.25},
				{x: -1.9125, y: 0, z: -0.25},
				{x: -1.35, y: -1.35, z: -0.25},
				{x: 0, y: -1.9125, z: -0.25},
				{x: 1.35, y: -1.35, z: -0.25},
			],
			faces: [
				{indices: [0, 1, 8, 9], color: color},
				{indices: [1, 2, 9, 10], color: color},
				{indices: [2, 3, 10, 11], color: color},
				{indices: [3, 4, 11, 12], color: color},
				{indices: [4, 5, 12, 13], color: color},
				{indices: [5, 6, 13, 14], color: color},
				{indices: [6, 7, 14, 15], color: color},
				{indices: [0, 7, 8, 15], color: color},
				{indices: [16, 17, 24, 25], color: color},
				{indices: [17, 18, 25, 26], color: color},
				{indices: [18, 19, 26, 27], color: color},
				{indices: [19, 20, 27, 28], color: color},
				{indices: [20, 21, 28, 29], color: color},
				{indices: [21, 22, 29, 30], color: color},
				{indices: [22, 23, 30, 31], color: color},
				{indices: [16, 23, 24, 31], color: color},
				{indices: [10, 11, 26, 27], color: color},
				{indices: [11, 12, 27, 28], color: color},
				{indices: [12, 13, 28, 29], color: color},
				{indices: [13, 14, 29, 30], color: color},
				{indices: [14, 15, 30, 31], color: color},
				{indices: [15, 8, 31, 24], color: color},
				{indices: [8, 31, 24, 25], color: color},
				{indices: [8, 9, 24, 25], color: color},
				{indices: [9, 24, 25, 26], color: color},
				{indices: [9, 10, 25, 26], color: color},
				{indices: [10, 25, 26, 27], color: color},
				{indices: [2, 3, 18, 19], color: color},
				{indices: [3, 18, 19, 20], color: color},
				{indices: [3, 4, 19, 20], color: color},
				{indices: [4, 19, 20, 21], color: color},
				{indices: [4, 5, 20, 21], color: color},
				{indices: [5, 20, 21, 22], color: color},
				{indices: [5, 6, 21, 22], color: color},
				{indices: [6, 21, 22, 23], color: color},
				{indices: [6, 7, 22, 23], color: color},
				{indices: [7, 22, 23, 16], color: color},
				{indices: [7, 0, 23, 16], color: color},
				{indices: [0, 23, 16, 17], color: color},
				{indices: [0, 1, 16, 17], color: color},
				{indices: [1, 16, 17, 18], color: color},
				{indices: [1, 2, 17, 18], color: color},
				{indices: [2, 17, 18, 19], color: color},
			],
			position: position,
			rotation: rotation,
			scale: scale,
		});
	}
	pointCollide(point) {
		const local = vec3.create();
		vec3.subtract(local, [point.x, point.y, point.z], [this.position.x, this.position.y, this.position.z]);
		const invRot = quat.create();
		quat.invert(invRot, this.rotation);
		vec3.transformQuat(local, local, invRot);
		local[0] /= this.scale.x;
		local[1] /= this.scale.y;
		local[2] /= this.scale.z;

		const r = Math.sqrt(local[0] * local[0] + local[1] * local[1]);
		const radius = 2;
		const halfThickness = 0.25; // 0.5 * 0.5
		return r <= radius && Math.abs(local[2]) <= halfThickness;
	}
}
