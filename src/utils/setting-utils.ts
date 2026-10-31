import {
	AUTO_MODE,
	DARK_MODE,
	DEFAULT_THEME,
	LIGHT_MODE,
} from "@constants/constants.ts";
import { expressiveCodeConfig } from "@/config";
import type { LIGHT_DARK_MODE } from "@/types/config";

export function getDefaultHue(): number {
	const fallback = "250";
	const configCarrier = document.getElementById("config-carrier");
	return Number.parseInt(configCarrier?.dataset.hue || fallback, 10);
}

export function getHue(): number {
	const stored = localStorage.getItem("hue");
	return stored ? Number.parseInt(stored, 10) : getDefaultHue();
}

export function setHue(hue: number): void {
	localStorage.setItem("hue", String(hue));
	const r = document.querySelector(":root") as HTMLElement;
	if (!r) {
		return;
	}
	r.style.setProperty("--hue", String(hue));
}

export function applyThemeToDocument(theme: LIGHT_DARK_MODE) {
	switch (theme) {
		case LIGHT_MODE:
			document.documentElement.classList.remove("dark");
			break;
		case DARK_MODE:
			document.documentElement.classList.add("dark");
			break;
		case AUTO_MODE:
			if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
				document.documentElement.classList.add("dark");
			} else {
				document.documentElement.classList.remove("dark");
			}
			break;
	}

	// Set the theme for Expressive Code
	document.documentElement.setAttribute(
		"data-theme",
		expressiveCodeConfig.theme,
	);
}

export function setTheme(theme: LIGHT_DARK_MODE): void {
	localStorage.setItem("theme", theme);
	applyThemeToDocument(theme);
}

export function getStoredTheme(): LIGHT_DARK_MODE {
	return (localStorage.getItem("theme") as LIGHT_DARK_MODE) || DEFAULT_THEME;
}

/** 背景粒子主题：sakura（樱花，默认）/ snow（雪花）/ leaf（美食）/ star（金币）；leaf/star 保留旧值兼容设置 */
export type ParticleTheme = "sakura" | "snow" | "leaf" | "star";

const PARTICLE_KEY = "bg-particles";
const PARTICLE_THEMES: ParticleTheme[] = ["sakura", "snow", "leaf", "star"];

export function getStoredParticleTheme(): ParticleTheme {
	const stored = localStorage.getItem(PARTICLE_KEY) as ParticleTheme | null;
	return stored && PARTICLE_THEMES.includes(stored) ? stored : "sakura";
}

export function setParticleTheme(theme: ParticleTheme): void {
	localStorage.setItem(PARTICLE_KEY, theme);
	applyParticleThemeToDocument(theme);
}

export function applyParticleThemeToDocument(theme: ParticleTheme): void {
	document.documentElement.setAttribute("data-bg-particles", theme);
}
