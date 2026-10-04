/**
 * 由字符串稳定地派生出一个色相值（0-359），用于给标签等元素分配稳定的配色。
 * 同一个标签在任何页面、任何设备上都会得到相同的颜色。
 */
export function hueFromString(text: string): number {
	let hash = 0;
	for (let i = 0; i < text.length; i++) {
		hash = (hash * 31 + text.charCodeAt(i)) % 360;
	}
	return hash;
}
