const { nodeResolve } = require("@rollup/plugin-node-resolve");
const commonjs = require('@rollup/plugin-commonjs');
const typescript = require('@rollup/plugin-typescript');

const pkg = require('./package.json');

module.exports = [
    // ESM
    {
        input: 'index.ts',
        external: ['lodash', '@azure/event-hubs'],
        plugins: [
            typescript({
                tsconfig: './tsconfig.json',
            }),
            nodeResolve({
                preferBuiltins: true
            }),
            commonjs({
                include: /node_modules/,
            })
        ],
        output: {
            file: pkg.module,
            format: "esm",
            exports: "named",
            sourcemap: true,
            banner: `/*! ${pkg.name} v${pkg.version} */`,
        },
    },
    // CJS
    {
        input: 'index.ts',
        external: ['lodash', '@azure/event-hubs'],
        plugins: [
            typescript({
                tsconfig: './tsconfig.json',
            }),
            nodeResolve({
                preferBuiltins: true,
            }),
            commonjs({
                include: /node_modules/,
            })
        ],
        output: {
            file: pkg.main,
            format: "cjs",
            exports: "named",
            sourcemap: true,
            banner: `/*! ${pkg.name} v${pkg.version} */`,
        },
    },
];