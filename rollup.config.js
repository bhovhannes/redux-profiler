/*eslint-env node*/
const babel = require('@rollup/plugin-babel')

module.exports = {
	input: 'src/index.js',
	output: [
		{
			file: './dist/redux-profiler.umd.js',
			format: 'umd',
			name: 'ReduxProfiler',
		},
		{
			file: './dist/redux-profiler.esm.js',
			format: 'esm',
		},
	],
	plugins: [
		babel({
			exclude: 'node_modules/**',
			babelHelpers: 'bundled',
		}),
	],
}
