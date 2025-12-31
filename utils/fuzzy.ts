export interface FuzzyMatch {
	score: number;
	matches: number[];
}

export function fuzzyMatch(pattern: string, text: string): FuzzyMatch | null {
	if (!pattern) return { score: 1, matches: [] };

	const patternLower = pattern.toLowerCase();
	const textLower = text.toLowerCase();

	let patternIdx = 0;
	let textIdx = 0;
	const matches: number[] = [];
	let score = 0;
	let consecutiveBonus = 0;

	while (patternIdx < patternLower.length && textIdx < textLower.length) {
		if (patternLower[patternIdx] === textLower[textIdx]) {
			matches.push(textIdx);

			if (
				textIdx === 0 ||
				text[textIdx - 1] === " " ||
				text[textIdx - 1] === "_" ||
				text[textIdx - 1] === "-"
			) {
				score += 10;
			}

			if (matches.length > 1 && matches[matches.length - 2] === textIdx - 1) {
				consecutiveBonus += 5;
				score += consecutiveBonus;
			} else {
				consecutiveBonus = 0;
				score += 1;
			}

			patternIdx++;
		}
		textIdx++;
	}

	if (patternIdx !== patternLower.length) {
		return null;
	}

	const lengthPenalty = (text.length - pattern.length) * 0.1;
	score = Math.max(0, score - lengthPenalty);

	return { score, matches };
}

export function fuzzySearch<T>(
	items: T[],
	pattern: string,
	getText: (item: T) => string,
): Array<{ item: T; match: FuzzyMatch }> {
	if (!pattern.trim()) {
		return items.map((item) => ({ item, match: { score: 1, matches: [] } }));
	}

	const results: Array<{ item: T; match: FuzzyMatch }> = [];

	for (const item of items) {
		const text = getText(item);
		const match = fuzzyMatch(pattern, text);
		if (match) {
			results.push({ item, match });
		}
	}

	results.sort((a, b) => b.match.score - a.match.score);

	return results;
}
