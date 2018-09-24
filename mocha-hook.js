/*eslint-env node*/
const babelConfig = require('./babel.config')

require('@babel/register')(
	Object.assign({}, babelConfig, {
		plugins: [
			"@babel/plugin-proposal-object-rest-spread",
			"@babel/plugin-transform-modules-commonjs"
		],
		"exclude": [
			'babel.config.js',
			'mocha-hook.js'
		]
	}
))
