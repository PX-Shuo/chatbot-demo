// import dependencies
import React, { useEffect } from 'react';
import './App.css';

// import redux components
import store from './store'

// import chat component
import Chat from './components/chat/Chat'

// import action
import { createSession } from './actions/watson';

// import axios
import axios from 'axios';

if (localStorage.session) {
  delete axios.defaults.headers.common['session_id']
  axios.defaults.headers.common['session_id'] = localStorage.session
} else {
  delete axios.defaults.headers.common['session_id']
}

const App = () => {
  useEffect(() => {
    // check if session already exist
    if (!localStorage.session) {
      // create session
      store.dispatch(createSession())
    }
  }, [])

  return (
    <div className="container">
      <Chat />
    </div>
  );
}

export default App;
