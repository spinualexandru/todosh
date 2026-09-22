import { describe, expect, test } from "bun:test";

import { fuzzyMatch, fuzzySearch } from "./fuzzy";

const titles = [
	"Create XDG storage and SQLite persistence",
	"Create PR for rustdown dependency update",
	"Create workspaces, run setup, and capture output",
	"Evaluate GPU-accelerated transcription",
	"Strengthen modernization checks and evaluation",
	"Add model download and cache management",
];

function search(pattern: string, items = titles) {
	return fuzzySearch(items, pattern, (item) => item).map(({ item }) => item);
}

describe("task search relevance", () => {
	test("only returns relevant titles for the reported queries", () => {
		expect(search("Evaluate GPU")).toEqual([titles[3]!]);
		expect(search("create xdg")).toEqual([titles[0]!]);
	});

	test("rejects scattered letters even in long descriptions", () => {
		const unrelated =
			"Create PR for dependency update " +
			"Check releases and ensure all tests execute. " +
			"Document guidance for maintainers.";
		expect(fuzzyMatch("create xdg", unrelated)).toBeNull();
		expect(
			fuzzyMatch(
				"Evaluate GPU",
				"Every version adds logs; users ask to extend generic project utilities.",
			),
		).toBeNull();
	});

	test("requires every term and accepts case, whitespace, and any word order", () => {
		expect(search("  GPU\t EVALUATE  ")).toEqual([titles[3]!]);
		expect(search("evaluate sqlite")).toEqual([]);
		expect(search("eval gpu")).toEqual([titles[3]!]);
	});

	test.each(["evalute", "evaaluate", "evaluete", "evalaute"])(
		"tolerates a single typo in a longer word: %s",
		(term) => {
			expect(search(`${term} gpu`)).toEqual([titles[3]!]);
		},
	);

	test("does not fuzz short terms or accept multiple typos", () => {
		expect(search("evaluate gup")).toEqual([]);
		expect(search("create xdg", ["Create XML storage"])).toEqual([]);
		expect(search("evlute gpu")).toEqual([]);
	});

	test("prefers a literal phrase over reordered terms and typo matches", () => {
		const items = [
			"Evalute GPU transcription",
			"GPU transcription to evaluate",
			"Evaluate GPU transcription " + "Long description. ".repeat(100),
		];
		expect(search("evaluate gpu", items)).toEqual([
			items[2]!,
			items[1]!,
			items[0]!,
		]);
	});

	test("still finds literal matches in descriptions and tags", () => {
		const tasks = [
			{
				title: "Research",
				description: "Evaluate transcription",
				tags: ["gpu"],
			},
			{
				title: "Research",
				description: "Evaluate transcription",
				tags: ["cpu"],
			},
		];
		expect(
			fuzzySearch(tasks, "evaluate gpu", (task) =>
				[task.title, task.description, ...task.tags].join(" "),
			).map(({ item }) => item),
		).toEqual([tasks[0]!]);
	});

	test("empty queries preserve input order and missing matches stay empty", () => {
		expect(search(" \t ")).toEqual(titles);
		expect(search("nonexistent")).toEqual([]);
		expect(search("gpu", [])).toEqual([]);
	});

	test("reports sorted match positions for reordered terms", () => {
		expect(fuzzyMatch("gpu evaluate", "Evaluate GPU")?.matches).toEqual([
			0, 1, 2, 3, 4, 5, 6, 7, 9, 10, 11,
		]);
	});
});
