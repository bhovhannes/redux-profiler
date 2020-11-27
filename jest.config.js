/*eslint-env node*/
module.exports = {
	clearMocks: true,
	restoreMocks: true,
	coverageDirectory: './coverage',
	coverageReporters: ['lcov', 'html', 'text-summary'],
	collectCoverageFrom: ['./src/**/*.js'],
}
