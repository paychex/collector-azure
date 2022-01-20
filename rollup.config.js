const { nodeResolve } = require("@rollup/plugin-node-resolve");
const commonjs = require('@rollup/plugin-commonjs');
const pkg = require('./package.json');

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
            banner: `/* ${pkg.name} v${pkg.version} */`,
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
            banner: `/* ${pkg.name} v${pkg.version} */`,
            paths: {
                'lodash-es': 'lodash'
            }
        },
    },
];