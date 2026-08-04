await Bun.build({
	entrypoints: ["./index.tsx"],
	compile: {
		outfile: "dist/todosh",
	},
	// Pin the libc branch so Bun embeds only the matching OpenTUI native package
	// instead of retaining both runtime selection branches.
	define: {
		"process.env.OPENTUI_LIBC": JSON.stringify("glibc"),
	},
});
