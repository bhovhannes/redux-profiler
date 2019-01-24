import babel from 'rollup-plugin-babel'

export default {
	input: 'src/index.js',
	output: [
		{
			file: './dist/redux-profiler.umd.js',
			format: 'umd',
			name: 'ReduxProfiler'
		},
		{
			file: './dist/redux-profiler.esm.js',
			format: 'esm'
		}
	],
	plugins: [
		babel({
			exclude: 'node_modules/**'
		})
	]
}
