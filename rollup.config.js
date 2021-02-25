const { nodeResolve } = require("@rollup/plugin-node-resolve");
const { terser } = require("rollup-plugin-terser");
const polyfills = require('rollup-plugin-node-polyfills');
const commonjs = require('@rollup/plugin-commonjs');
const { babel } = require("@rollup/plugin-babel");

const pkg = require('./package.json');

module.exports = [
    {
        // UMD
        input: 'index.mjs',
        plugins: [
            nodeResolve({
                browser: true,
                preferBuiltins: false,
            }),
            commonjs({
                include: /node_modules/,
            }),
            babel({
                babelHelpers: "bundled",
            }),
            polyfills(),
            terser(),
        ],
        output: {
            file: `dist/paychex.collector-azure.min.js`,
            format: "umd",
            name: pkg.name,
            esModule: false,
            exports: "named",
            sourcemap: true,
        },
    },
    // ESM and CJS
    {
        input: 'index.mjs',
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