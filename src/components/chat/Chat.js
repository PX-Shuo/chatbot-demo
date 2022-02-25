import React, { useState } from 'react'
import { connect } from 'react-redux'

// import actions
import { userMessage, sendMessage } from '../../actions/watson'

const Chat = ({ chat, userMessage, sendMessage }) => {
  const [message, setMessage] = useState('')

  // function to handle user submission
  const handleSubmit = async (e) => {
    const code = e.keyCode || e.which
    if (code === 13) {
      console.log(message)
      userMessage(message)
      sendMessage(message)
      setMessage('')
    }
  }

  return (
    <div className='chat'>
      <h1 className='heading'>IBM Watson Assistant - API v2</h1>
      <div className='history'>
        {chat.length === 0 ? ''
          : chat.map((msg, i) => <div className={msg.type} key={i}>{msg.message}</div>)
        }
      </div>
      <input
        className='chatBox'
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={handleSubmit}
      />
    </div>
  )
}

const mapStateToProps = (state) => ({
  chat: state.watson.messages
})

export default connect(mapStateToProps, { userMessage, sendMessage })(Chat)