import babel from 'rollup-plugin-babel'

export default {
	input: 'src/index.js',
	output: [
		{
			dir: './dist',
			file: 'redux-profiler.umd.js',
			format: 'umd',
			name: 'ReduxProfiler'
		},
		{
			dir: './dist',
			file: 'redux-profiler.esm.js',
			format: 'esm'
		}
	],
	plugins: [
		babel({
			exclude: 'node_modules/**'
		})
	]
}
