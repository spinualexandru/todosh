await Bun.build({
    entrypoints: ["./index.tsx"],
    compile: {
        outfile: "dist/todosh"
    }
})