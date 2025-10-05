const assets = {};
const assetList = [{name: 'soup', url: 'assets/cubemap.png'}];

export async function loadAsset(name, url) {
	const response = await fetch(url);
	const blob = await response.blob();
	const image = await createImageBitmap(blob);
	assets[name] = image;
	return image;
}

export async function loadAllAssets() {
	const promises = assetList.map((a) => loadAsset(a.name, a.url));
	await Promise.all(promises);
}

export function getAsset(name) {
	return assets[name];
}
