/**
 * Based on the discussion at https://github.com/expressive-code/expressive-code/issues/153#issuecomment-2282218684
 */
import { definePlugin } from "@expressive-code/core";

export function pluginLanguageBadge() {
	return definePlugin({
		name: "Language Badge",
		baseStyles: () => `
      /* 语言标签放在左上角，避开行号栏（--lnWidth 由 expressive-code 写在 frame 上）；
         常驻显示，与右上角的复制按钮错开，两者可以同时看到 */
      [data-language]::before {
        position: absolute;
        z-index: 2;
        left: calc(var(--lnWidth, 0ch) + 1rem);
        top: 0.5rem;
        padding: 0.1rem 0.5rem;
        content: attr(data-language);
        font-family: "JetBrains Mono Variable", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        font-size: 0.75rem;
        font-weight: bold;
        text-transform: uppercase;
        color: oklch(0.75 0.1 var(--hue));
        background: oklch(0.33 0.035 var(--hue));
        border-radius: 0.5rem;
        pointer-events: none;
        transition: opacity 0.3s;
        opacity: 0.9;
      }
    `,
	});
}
