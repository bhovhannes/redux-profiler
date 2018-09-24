# redux-profiler
[![NPM version][npm-version-image]][npm-url] [![NPM downloads][npm-downloads-image]][npm-url] [![Dependencies][deps-image]][deps-url] [![Dev. Dependencies][dev-deps-image]][dev-deps-url] [![MIT License][license-image]][license-url] [![Build Status][travis-image]][travis-url] [![Coverage][codecov-image]][codecov-url]

A Redux [store enhancer](https://redux.js.org/glossary#store-enhancer) which uses User Timing API to profile Redux actions and time spent on notifying store listeners 


## How to install

```bash
npm install redux-profiler --save
```


## Usage

```javascript
import { createStore } from 'redux'
import { profileStore } from 'redux-profiler'
 
function todos(state = [], action) {
    switch (action.type) {
        case 'ADD_TODO':
            return state.concat([action.text])
        default:
            return state
    }
}
​
const store = createStore(todos, ['Use Redux'], profileStore())
```

You can also combine it with Redux middleware:
```javascript
import { createStore, compose } from 'redux'
import { thunk } from 'redux-thunk'
import { profileStore } from 'redux-profiler'
 
function todos(state = [], action) {
    switch (action.type) {
        case 'ADD_TODO':
            return state.concat([action.text])
        default:
            return state
    }
}
​
const store = createStore(
    todos, 
    ['Use Redux'], 
    compose(
        profileStore(),
        thunk
    )
)
```

or if you have multiple middlewares:
```javascript
import { createStore, applyMiddleware, compose } from 'redux'
import { thunk } from 'redux-thunk'
import { profileStore } from 'redux-profiler'
 
function todos(state = [], action) {
    switch (action.type) {
        case 'ADD_TODO':
            return state.concat([action.text])
        default:
            return state
    }
}

/**
 * Logs all actions and states after they are dispatched.
 */
const logger = store => next => action => {
    console.group(action.type)
    console.info('dispatching', action)
    let result = next(action)
    console.log('next state', store.getState())
    console.groupEnd()
    return result
}
​
const store = createStore(
    todos, 
    ['Use Redux'], 
    compose(
        profileStore(),
        applyMiddleware(
            thunk,
            logger
        )
    )
)
```


## License

MIT (http://www.opensource.org/licenses/mit-license.php)

[deps-image]: https://img.shields.io/david/bhovhannes/redux-profiler.svg
[deps-url]: https://david-dm.org/bhovhannes/redux-profiler

[dev-deps-image]: https://img.shields.io/david/dev/bhovhannes/redux-profiler.svg
[dev-deps-url]: https://david-dm.org/bhovhannes/redux-profiler#info=devDependencies

[license-image]: http://img.shields.io/badge/license-MIT-blue.svg?style=flat
[license-url]: LICENSE

[npm-url]: https://www.npmjs.org/package/redux-profiler
[npm-version-image]: https://img.shields.io/npm/v/redux-profiler.svg?style=flat
[npm-downloads-image]: https://img.shields.io/npm/dm/redux-profiler.svg?style=flat

[travis-url]: https://travis-ci.org/bhovhannes/redux-profiler
[travis-image]: https://img.shields.io/travis/bhovhannes/redux-profiler.svg?style=flat

[codecov-url]: https://codecov.io/gh/bhovhannes/redux-profiler
[codecov-image]: https://img.shields.io/codecov/c/github/bhovhannes/redux-profiler.svg
