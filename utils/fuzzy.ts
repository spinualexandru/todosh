export interface FuzzyMatch {
	score: number;
	matches: number[];
}

// Allow one insertion, deletion, substitution, or adjacent transposition.
function isOneEditAway(pattern: string, word: string): boolean {
	if (Math.abs(pattern.length - word.length) > 1) return false;

	let index = 0;
	while (index < pattern.length && pattern[index] === word[index]) index++;

	if (pattern.length < word.length) {
		return pattern.slice(index) === word.slice(index + 1);
	}
	if (pattern.length > word.length) {
		return pattern.slice(index + 1) === word.slice(index);
	}
	return (
		pattern.slice(index + 1) === word.slice(index + 1) ||
		(pattern[index] === word[index + 1] &&
			pattern[index + 1] === word[index] &&
			pattern.slice(index + 2) === word.slice(index + 2))
	);
}

export function fuzzyMatch(pattern: string, text: string): FuzzyMatch | null {
	const terms = pattern.toLowerCase().trim().split(/\s+/).filter(Boolean);
	if (terms.length === 0) return { score: 1, matches: [] };

	const textLower = text.toLowerCase();
	const matches = new Set<number>();
	let score = 0;

	for (const term of terms) {
		let index = textLower.indexOf(term);
		let length = term.length;
		if (index !== -1) {
			score += 100;
		} else {
			// Short terms such as GPU and XDG must match literally. Longer terms
			// may have one typo, but must match a single word, never scattered
			// letters across a title, description, or tags.
			if (term.length < 5) return null;
			const word = [...textLower.matchAll(/[\p{L}\p{N}]+/gu)].find(
				(candidate) => isOneEditAway(term, candidate[0]),
			);
			if (!word) return null;
			index = word.index;
			length = word[0].length;
			score += 50;
		}

		for (let offset = 0; offset < length; offset++) {
			matches.add(index + offset);
		}
	}

	// Prefer the complete phrase, without penalizing a relevant task for
	// having a long description. All terms are required, in any order.
	if (textLower.includes(terms.join(" "))) score += 25;

	return { score, matches: [...matches].sort((a, b) => a - b) };
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
