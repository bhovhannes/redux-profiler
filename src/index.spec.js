import { describe, it, expect } from '@jest/globals'
import profileStore from './index'

function createStoreShape() {
	return {
		dispatch: jest.fn(),
		subscribe: jest.fn()
	}
}

function createPerformanceStub() {
	return {
		mark: jest.fn(),
		measure: jest.fn(),
		clearMarks: jest.fn(),
		clearMeasures: jest.fn()
	}
}

function createProfiledStore() {
	const baseStore = createStoreShape()
	const createStore = () => baseStore
	const profiledStore = profileStore({
		performance: createPerformanceStub()
	})(createStore)()
	profiledStore.base = baseStore

	return profiledStore
}

describe('profileStore()', () => {
	it('returns a new store if a valid performance object is passed', () => {
		const baseStore = createStoreShape()
		const createStore = () => baseStore
		const profiledStore = profileStore({
			performance: createPerformanceStub()
		})(createStore)()
		expect(profiledStore).not.toBe(baseStore)
		expect(typeof profiledStore.dispatch).toBe('function')
		expect(typeof profiledStore.subscribe).toBe('function')
	})

	it('is a noop (returns the same store) if invalid performance object is passed', () => {
		const baseStore = createStoreShape()
		const createStore = () => baseStore
		const profiledStore1 = profileStore({
			performance: {
				print: () => {}
			}
		})(createStore)()
		expect(profiledStore1).toBe(baseStore)

		const profiledStore2 = profileStore({
			performance: {
				mark: () => {}
			}
		})(createStore)()
		expect(profiledStore2).toBe(baseStore)

		const profiledStore3 = profileStore({
			performance: {
				mark: () => {},
				measure: false,
				clearMarks: () => {},
				clearMeasures: () => {}
			}
		})(createStore)()
		expect(profiledStore3).toBe(baseStore)
	})

	it('batch callback executes listeners', () => {
		const subscribeCallbackSpy = jest.fn()
		const store = createProfiledStore()

		store.subscribe(subscribeCallbackSpy)
		store.dispatch({ type: 'foo' })

		expect(store.base.subscribe).not.toHaveBeenCalled()
		expect(subscribeCallbackSpy).toHaveBeenCalledTimes(1)
	})

	it('unsubscribes batch callbacks', () => {
		const subscribeCallbackSpy = jest.fn()
		const store = createProfiledStore()
		const unsubscribe = store.subscribe(subscribeCallbackSpy)

		unsubscribe()

		store.dispatch({ type: 'foo' })

		expect(subscribeCallbackSpy).not.toHaveBeenCalled()
	})

	it('supports removing a subscription within a subscription', () => {
		const store = createProfiledStore()

		const listenerA = jest.fn()
		const listenerB = jest.fn()
		const listenerC = jest.fn()

		store.subscribe(listenerA)
		const unSubB = store.subscribe(() => {
			listenerB()
			unSubB()
		})
		store.subscribe(listenerC)

		store.dispatch({})
		store.dispatch({})

		expect(listenerA).toHaveBeenCalledTimes(2)
		expect(listenerB).toHaveBeenCalledTimes(1)
		expect(listenerC).toHaveBeenCalledTimes(2)
	})

	it('only removes listener once when unsubscribe is called', () => {
		const store = createProfiledStore()
		const listenerA = jest.fn().mockReturnValue({})
		const listenerB = jest.fn().mockReturnValue({})

		const unsubscribeA = store.subscribe(listenerA)
		store.subscribe(listenerB)

		unsubscribeA()
		unsubscribeA()

		store.dispatch({ type: 'foo' })
		expect(listenerA).not.toHaveBeenCalled()
		expect(listenerB).toHaveBeenCalledTimes(1)
	})

	it('delays unsubscribe until the end of current dispatch', () => {
		const store = createProfiledStore()

		const unsubscribeHandles = []
		const doUnsubscribeAll = () => unsubscribeHandles.forEach((unsubscribe) => unsubscribe())

		const listener1 = jest.fn().mockReturnValue({})
		const listener2 = jest.fn().mockReturnValue({})
		const listener3 = jest.fn().mockReturnValue({})

		unsubscribeHandles.push(store.subscribe(() => listener1()))
		unsubscribeHandles.push(
			store.subscribe(() => {
				listener2()
				doUnsubscribeAll()
			})
		)

		unsubscribeHandles.push(store.subscribe(() => listener3()))

		store.dispatch({ type: 'foo' })
		expect(listener1).toHaveBeenCalledTimes(1)
		expect(listener2).toHaveBeenCalledTimes(1)
		expect(listener3).toHaveBeenCalledTimes(1)

		store.dispatch({ type: 'foo' })
		expect(listener1).toHaveBeenCalledTimes(1)
		expect(listener2).toHaveBeenCalledTimes(1)
		expect(listener3).toHaveBeenCalledTimes(1)
	})

	it('delays subscribe until the end of current dispatch', () => {
		const store = createProfiledStore()

		const listener1 = jest.fn().mockReturnValue({})
		const listener2 = jest.fn().mockReturnValue({})
		const listener3 = jest.fn().mockReturnValue({})

		let listener3Added = false
		const maybeAddThirdListener = () => {
			if (!listener3Added) {
				listener3Added = true
				store.subscribe(() => listener3())
			}
		}

		store.subscribe(() => listener1())
		store.subscribe(() => {
			listener2()
			maybeAddThirdListener()
		})

		store.dispatch({ type: 'foo' })
		expect(listener1).toHaveBeenCalledTimes(1)
		expect(listener2).toHaveBeenCalledTimes(1)
		expect(listener3).toHaveBeenCalledTimes(0)

		store.dispatch({ type: 'foo' })
		expect(listener1).toHaveBeenCalledTimes(2)
		expect(listener2).toHaveBeenCalledTimes(2)
		expect(listener3).toHaveBeenCalledTimes(1)
	})

	it('uses the last snapshot of subscribers during nested dispatch', () => {
		const store = createProfiledStore()

		const listener1 = jest.fn().mockReturnValue({})
		const listener2 = jest.fn().mockReturnValue({})
		const listener3 = jest.fn().mockReturnValue({})
		const listener4 = jest.fn().mockReturnValue({})

		let unsubscribe4
		const unsubscribe1 = store.subscribe(() => {
			listener1()
			expect(listener1).toHaveBeenCalledTimes(1)
			expect(listener2).not.toHaveBeenCalled()
			expect(listener3).not.toHaveBeenCalled()
			expect(listener4).not.toHaveBeenCalled()

			unsubscribe1()
			unsubscribe4 = store.subscribe(listener4)
			store.dispatch({ type: 'foo' })

			expect(listener1).toHaveBeenCalledTimes(1)
			expect(listener2).toHaveBeenCalledTimes(1)
			expect(listener3).toHaveBeenCalledTimes(1)
			expect(listener4).toHaveBeenCalledTimes(1)
		})

		store.subscribe(listener2)
		store.subscribe(listener3)

		store.dispatch({ type: 'foo' })
		expect(listener1).toHaveBeenCalledTimes(1)
		expect(listener2).toHaveBeenCalledTimes(2)
		expect(listener3).toHaveBeenCalledTimes(2)
		expect(listener4).toHaveBeenCalledTimes(1)

		unsubscribe4()
		store.dispatch({ type: 'foo' })
		expect(listener1).toHaveBeenCalledTimes(1)
		expect(listener2).toHaveBeenCalledTimes(3)
		expect(listener3).toHaveBeenCalledTimes(3)
		expect(listener4).toHaveBeenCalledTimes(1)
	})

	it('throws if listener is not a function', () => {
		const store = createProfiledStore()

		expect(() => store.subscribe()).toThrow()

		expect(() => store.subscribe('')).toThrow()

		expect(() => store.subscribe(null)).toThrow()

		expect(() => store.subscribe(undefined)).toThrow()
	})
})
