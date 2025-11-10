import {CONSTANTS} from './consts.js';

const assets = {};
const imgList = [{name: 'soup', url: 'assets/img/cubemap.png'}];
const mapList = CONSTANTS.MAPS.map((mapName) => {
	return {name: mapName, url: `assets/maps/${mapName}.json`};
});

export async function loadAsset(name, url) {
	const response = await fetch(url);
	const blob = await response.blob();
	const image = await createImageBitmap(blob);
	assets[name] = image;
	return image;
}

export async function loadAllAssets() {
	const promises = [];
	for (const img of imgList) {
		promises.push(loadAsset(img.name, img.url));
	}
	for (const map of mapList) {
		const p = fetch(map.url)
			.then((response) => response.json())
			.then((data) => {
				CONSTANTS.MAPDATA[map.name] = data;
			});
		promises.push(p);
	}
	await Promise.all(promises);
}

export function getAsset(name) {
	return assets[name];
}
