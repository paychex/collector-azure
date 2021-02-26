const { nodeResolve } = require("@rollup/plugin-node-resolve");
const commonjs = require('@rollup/plugin-commonjs');

module.exports = [
    // ESM
    {
        input: 'index.mjs',
        external: ['lodash-es', '@azure/event-hubs'],
        plugins: [
            nodeResolve({
                preferBuiltins: true
            }),
            commonjs({
                include: /node_modules/,
            })
        ],
        output: {
            dir: "dist/esm",
            format: "esm",
            exports: "named",
            sourcemap: true,
        },
    },
    // CJS
    {
        input: 'index.mjs',
        external: ['lodash-es', '@azure/event-hubs'],
        plugins: [
            nodeResolve({
                preferBuiltins: true,
            }),
            commonjs({
                include: /node_modules/,
            })
        ],
        output: {
            dir: "dist/cjs",
            format: "cjs",
            exports: "named",
            sourcemap: true,
            paths: {
                'lodash-es': 'lodash'
            }
        },
    },
];