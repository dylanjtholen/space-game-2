export function lerp(a, b, t) {
	return a + (b - a) * t;
}

export function lerp3(a, b, t) {
	return {
		x: lerp(a.x, b.x, t),
		y: lerp(a.y, b.y, t),
		z: lerp(a.z, b.z, t),
	};
}

export function hexToRgb(hex) {
	// Convert hex color to [r, g, b, a] array with values from 0 to 1
	if (hex.startsWith('#')) hex = hex.slice(1);
	const bigint = parseInt(hex, 16);
	const r = (bigint >> 16) & 255;
	const g = (bigint >> 8) & 255;
	const b = bigint & 255;
	return [r / 255, g / 255, b / 255, 1];
}
