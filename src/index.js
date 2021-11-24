/*eslint-env browser*/
const PROFILER_MARK_TYPE_REDUCE = 'reduce'
const PROFILER_MARK_TYPE_NOTIFY = 'notify'

const MARK_NAME_DELIMITER = ':'
const START = MARK_NAME_DELIMITER + 'start'
const END = MARK_NAME_DELIMITER + 'end'

function getMarkInfo(action) {
	let name = 'UNKNOWN_ACTION'
	let type = 'unknown'
	if (isReduxAction(action)) {
		name = action.type
		type = ''
	} else if (isReduxThunkAction(action)) {
		type = 'thunk'
		if (action.name) {
			name = action.name
		} else {
			name = 'anonymous'
		}
	}
	return {
		name,
		type
	}
}

function getMarkLabel(markInfo, profilerMarkType) {
	return `\u267B ${markInfo.name} (${markInfo.type.length > 0 ? markInfo.type : profilerMarkType})`
}

function isReduxThunkAction(action) {
	return typeof action === 'function'
}

function isReduxAction(action) {
	return action !== null && typeof action === 'object' && action.type
}

export default function profileStore(options = {}) {
	let performance
	if (options.performance) {
		performance = options.performance
	} else if (typeof window !== 'undefined') {
		performance = window.performance
	}

	const performProfiledOperation = (() => {
		let counter = {}

		function getMarkName(markInfo) {
			let markName = markInfo.name + MARK_NAME_DELIMITER + counter[markInfo.name]
			if (markInfo.type.length > 0) {
				markName += MARK_NAME_DELIMITER + markInfo.type
			}
			return markName
		}

		return function (markInfo, markType, op) {
			counter[markInfo.name] = counter[markInfo.name] === undefined ? 0 : counter[markInfo.name] + 1
			const markName = getMarkName(markInfo)
			performance.mark(markName + START)
			const res = op()
			performance.mark(markName + END)

			performance.measure(getMarkLabel(markInfo, markType), markName + START, markName + END)
			performance.clearMarks(markName + START)
			performance.clearMarks(markName + END)
			performance.clearMeasures(getMarkLabel(markInfo, markType))
			counter[markInfo.name]--
			if (!counter[markInfo.name]) {
				delete counter[markInfo.name]
			}

			return res
		}
	})()

	let currentListeners = []
	let nextListeners = currentListeners

	function ensureCanMutateNextListeners() {
		if (nextListeners === currentListeners) {
			nextListeners = currentListeners.slice()
		}
	}

	function subscribe(listener) {
		if (typeof listener !== 'function') {
			throw new Error('Expected listener to be a function.')
		}

		let isSubscribed = true

		ensureCanMutateNextListeners()
		nextListeners.push(listener)

		return function unsubscribe() {
			if (!isSubscribed) {
				return
			}

			isSubscribed = false

			ensureCanMutateNextListeners()
			const index = nextListeners.indexOf(listener)
			nextListeners.splice(index, 1)
		}
	}

	function notifyListeners() {
		const listeners = (currentListeners = nextListeners)
		listeners.forEach((listener) => listener())
	}

	return (next) =>
		(...args) => {
			const store = next(...args)

			if (typeof performance === 'undefined') {
				return store
			}

			function dispatch(action) {
				const info = getMarkInfo(action)
				const res = performProfiledOperation(getMarkInfo(action), PROFILER_MARK_TYPE_REDUCE, () => {
					if (info.type === 'thunk') {
						const reduxThunkExtraArgument = store.dispatch((d, s, extraArgument) => extraArgument)
						return action(dispatch, store.getState, reduxThunkExtraArgument)
					} else {
						return store.dispatch(action)
					}
				})

				// thunk should not notify listeners but rather just dispatch other actions
				if (info.type !== 'thunk') {
					performProfiledOperation(getMarkInfo(action), PROFILER_MARK_TYPE_NOTIFY, () =>
						notifyListeners()
					)
				}

				return res
			}

			return {
				...store,
				dispatch,
				subscribe
			}
		}
}
