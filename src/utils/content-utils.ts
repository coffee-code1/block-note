import { type CollectionEntry, getCollection } from "astro:content";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { getCategoryUrl } from "@utils/url-utils.ts";

// // Retrieve posts and sort them by publication date
async function getRawSortedPosts() {
	const allBlogPosts = await getCollection("posts", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});

	const sorted = allBlogPosts.sort((a, b) => {
		const dateA = new Date(a.data.published);
		const dateB = new Date(b.data.published);
		return dateA > dateB ? -1 : 1;
	});
	return sorted;
}

export async function getSortedPosts() {
	const sorted = await getRawSortedPosts();

	for (let i = 1; i < sorted.length; i++) {
		sorted[i].data.nextSlug = sorted[i - 1].slug;
		sorted[i].data.nextTitle = sorted[i - 1].data.title;
	}
	for (let i = 0; i < sorted.length - 1; i++) {
		sorted[i].data.prevSlug = sorted[i + 1].slug;
		sorted[i].data.prevTitle = sorted[i + 1].data.title;
	}

	return sorted;
}
export type PostForList = {
	slug: string;
	data: CollectionEntry<"posts">["data"];
};
export async function getSortedPostsList(): Promise<PostForList[]> {
	const sortedFullPosts = await getRawSortedPosts();

	// delete post.body
	const sortedPostsList = sortedFullPosts.map((post) => ({
		slug: post.slug,
		data: post.data,
	}));

	return sortedPostsList;
}
export type Tag = {
	name: string;
	count: number;
};

export async function getTagList(): Promise<Tag[]> {
	const allBlogPosts = await getCollection<"posts">("posts", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});

	const countMap: { [key: string]: number } = {};
	allBlogPosts.forEach((post: { data: { tags: string[] } }) => {
		post.data.tags.forEach((tag: string) => {
			if (!countMap[tag]) countMap[tag] = 0;
			countMap[tag]++;
		});
	});

	// sort tags
	const keys: string[] = Object.keys(countMap).sort((a, b) => {
		return a.toLowerCase().localeCompare(b.toLowerCase());
	});

	return keys.map((key) => ({ name: key, count: countMap[key] }));
}

/**
 * 统计一个 markdown 正文的字数：
 * 中日韩按「字」计，英文/数字按「词」计；代码块、行内代码、图片与链接地址不计入。
 */
function countWords(markdown: string): number {
	const text = markdown
		.replace(/```[\s\S]*?```/g, "") // 围栏代码块
		.replace(/~~~[\s\S]*?~~~/g, "") // 另一种围栏写法
		.replace(/`[^`\n]*`/g, "") // 行内代码
		.replace(/!\[[^\]]*\]\([^)]*\)/g, "") // 图片
		.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // 链接只保留文字
		.replace(/^\s{0,3}>\s?/gm, "") // 引用符号
		.replace(/[#*_~|-]+/g, " "); // 常见标记符号

	const cjk =
		text.match(/[\u3400-\u4dbf\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g) ?? [];
	const latin = text.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) ?? [];
	return cjk.length + latin.length;
}

export type SiteStats = {
	postCount: number;
	tagCount: number;
	wordCount: number;
	categoryCount: number;
	firstActive: Date | null;
	lastActive: Date | null;
};

/** 站点统计：文章数、标签数、分类数、总字数、最早/最后活跃时间。全部在构建期算好，运行时零开销。 */
export async function getSiteStats(): Promise<SiteStats> {
	const allBlogPosts = await getCollection<"posts">("posts", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});

	const tagSet = new Set<string>();
	const categorySet = new Set<string>();
	let wordCount = 0;
	let firstActive: Date | null = null;
	let lastActive: Date | null = null;

	// 忽略未来日期（置顶占位，如 2099-12-30）
	const now = new Date();
	now.setHours(0, 0, 0, 0);

	allBlogPosts.forEach((post) => {
		post.data.tags.forEach((tag) => {
			tagSet.add(tag.trim());
		});
		if (post.data.category) {
			categorySet.add(String(post.data.category).trim());
		}
		wordCount += countWords(post.body ?? "");

		const d = post.data.published ?? post.data.updated;
		if (d instanceof Date && d <= now) {
			if (!firstActive || d < firstActive) firstActive = d;
			if (!lastActive || d > lastActive) lastActive = d;
		}
	});

	return {
		postCount: allBlogPosts.length,
		tagCount: tagSet.size,
		categoryCount: categorySet.size,
		wordCount,
		firstActive,
		lastActive,
	};
}

export type Category = {
	name: string;
	count: number;
	url: string;
};

export async function getCategoryList(): Promise<Category[]> {
	const allBlogPosts = await getCollection<"posts">("posts", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});
	const count: { [key: string]: number } = {};
	allBlogPosts.forEach((post: { data: { category: string | null } }) => {
		if (!post.data.category) {
			const ucKey = i18n(I18nKey.uncategorized);
			count[ucKey] = count[ucKey] ? count[ucKey] + 1 : 1;
			return;
		}

		const categoryName =
			typeof post.data.category === "string"
				? post.data.category.trim()
				: String(post.data.category).trim();

		count[categoryName] = count[categoryName] ? count[categoryName] + 1 : 1;
	});

	const lst = Object.keys(count).sort((a, b) => {
		return a.toLowerCase().localeCompare(b.toLowerCase());
	});

	const ret: Category[] = [];
	for (const c of lst) {
		ret.push({
			name: c,
			count: count[c],
			url: getCategoryUrl(c),
		});
	}
	return ret;
}
