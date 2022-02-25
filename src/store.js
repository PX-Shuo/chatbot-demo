// import dependencies
import { createStore, applyMiddleware } from 'redux'
import thunk from 'redux-thunk'
import combineReducers from './reducers'

// connect to redux devtool
import { composeWithDevTools } from 'redux-devtools-extension'

// setup initial state
const initialState = {}

// import middleware
const middleware = [thunk]

// setup store
const store = createStore(
  combineReducers,
  initialState,
  composeWithDevTools(applyMiddleware(...middleware))
)

// export store
export default store