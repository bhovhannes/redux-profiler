/*eslint-env mocha */
import profileStore from './index'
import should from 'should'
import sinon from 'sinon'


function createStoreShape() {
	return {
		dispatch: sinon.spy(),
		subscribe: sinon.spy()
	}
}

function createPerformanceStub() {
	return {
		mark: sinon.spy(),
		measure: sinon.spy(),
		clearMarks: sinon.spy(),
		clearMeasures: sinon.spy()
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
	it('batch callback executes listeners', () => {
		const subscribeCallbackSpy = sinon.spy()
		const store = createProfiledStore()

		store.subscribe(subscribeCallbackSpy)
		store.dispatch({ type: 'foo' })

		should(store.base.subscribe.called).false()
		should(subscribeCallbackSpy.callCount).equal(1)
	})

	it('unsubscribes batch callbacks', () => {
		const subscribeCallbackSpy = sinon.spy()
		const store = createProfiledStore()
		const unsubscribe = store.subscribe(subscribeCallbackSpy)

		unsubscribe()

		store.dispatch({ type: 'foo' })

		should(subscribeCallbackSpy.called).false()
	})

	it('should support removing a subscription within a subscription', () => {
		const store = createProfiledStore()

		const listenerA = sinon.spy()
		const listenerB = sinon.spy()
		const listenerC = sinon.spy()

		store.subscribe(listenerA)
		const unSubB = store.subscribe(() => {
			listenerB()
			unSubB()
		})
		store.subscribe(listenerC)

		store.dispatch({})
		store.dispatch({})

		should(listenerA.callCount).equal(2)
		should(listenerB.callCount).equal(1)
		should(listenerC.callCount).equal(2)
	})

	it('only removes listener once when unsubscribe is called', () => {
		const store = createProfiledStore()
		const listenerA = sinon.stub().returns({})
		const listenerB = sinon.stub().returns({})

		const unsubscribeA = store.subscribe(listenerA)
		store.subscribe(listenerB)

		unsubscribeA()
		unsubscribeA()

		store.dispatch({ type: 'foo' })
		should(listenerA.called).false()
		should(listenerB.callCount).equal(1)
	})

	it('delays unsubscribe until the end of current dispatch', () => {
		const store = createProfiledStore()

		const unsubscribeHandles = []
		const doUnsubscribeAll = () => unsubscribeHandles.forEach(
			unsubscribe => unsubscribe()
		)

		const listener1 = sinon.stub().returns({})
		const listener2 = sinon.stub().returns({})
		const listener3 = sinon.stub().returns({})

		unsubscribeHandles.push(store.subscribe(() => listener1()))
		unsubscribeHandles.push(store.subscribe(() => {
			listener2()
			doUnsubscribeAll()
		}))

		unsubscribeHandles.push(store.subscribe(() => listener3()))

		store.dispatch({ type: 'foo' })
		should(listener1.callCount).equal(1)
		should(listener2.callCount).equal(1)
		should(listener3.callCount).equal(1)

		store.dispatch({ type: 'foo' })
		should(listener1.callCount).equal(1)
		should(listener2.callCount).equal(1)
		should(listener3.callCount).equal(1)
	})

	it('delays subscribe until the end of current dispatch', () => {
		const store = createProfiledStore()

		const listener1 = sinon.stub().returns({})
		const listener2 = sinon.stub().returns({})
		const listener3 = sinon.stub().returns({})

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
		should(listener1.callCount).equal(1)
		should(listener2.callCount).equal(1)
		should(listener3.callCount).equal(0)

		store.dispatch({ type: 'foo' })
		should(listener1.callCount).equal(2)
		should(listener2.callCount).equal(2)
		should(listener3.callCount).equal(1)
	})

	it('uses the last snapshot of subscribers during nested dispatch', () => {
		const store = createProfiledStore()

		const listener1 = sinon.stub().returns({})
		const listener2 = sinon.stub().returns({})
		const listener3 = sinon.stub().returns({})
		const listener4 = sinon.stub().returns({})

		let unsubscribe4
		const unsubscribe1 = store.subscribe(() => {
			listener1()
			should(listener1.callCount).equal(1)
			should(listener2.callCount).equal(0)
			should(listener3.callCount).equal(0)
			should(listener4.callCount).equal(0)

			unsubscribe1()
			unsubscribe4 = store.subscribe(listener4)
			store.dispatch({ type: 'foo' })

			should(listener1.callCount).equal(1)
			should(listener2.callCount).equal(1)
			should(listener3.callCount).equal(1)
			should(listener4.callCount).equal(1)
		})

		store.subscribe(listener2)
		store.subscribe(listener3)

		store.dispatch({ type: 'foo' })
		should(listener1.callCount).equal(1)
		should(listener2.callCount).equal(2)
		should(listener3.callCount).equal(2)
		should(listener4.callCount).equal(1)

		unsubscribe4()
		store.dispatch({ type: 'foo' })
		should(listener1.callCount).equal(1)
		should(listener2.callCount).equal(3)
		should(listener3.callCount).equal(3)
		should(listener4.callCount).equal(1)
	})

	it('throws if listener is not a function', () => {
		const store = createProfiledStore()

		should(() =>
			store.subscribe()
		).throw()

		should(() =>
			store.subscribe('')
		).throw()

		should(() =>
			store.subscribe(null)
		).throw()

		should(() =>
			store.subscribe(undefined)
		).throw()
	})
})