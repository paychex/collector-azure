const { nodeResolve } = require("@rollup/plugin-node-resolve");
const commonjs = require('@rollup/plugin-commonjs');

module.exports = [
    // ESM and CJS
    {
        input: 'index.mjs',
        external: ['lodash-es'],
        plugins: [
            nodeResolve({
                preferBuiltins: true,
            }),
            commonjs({
                include: /node_modules/,
            })
        ],
        output: [
            {
                dir: "dist/esm",
                format: "esm",
                exports: "named",
                sourcemap: true,
            },
            {
                dir: "dist/cjs",
                format: "cjs",
                exports: "named",
                sourcemap: true,
            },
        ],
    },
];