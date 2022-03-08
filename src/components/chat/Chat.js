import React, { useState, useEffect } from 'react'
import { connect } from 'react-redux'
import axios from 'axios'
import mic from 'microphone-stream'
import { EventStreamMarshaller } from '@aws-sdk/eventstream-marshaller'
import { fromUtf8, toUtf8 } from '@aws-sdk/util-utf8-node'
import { pcmEncode, downsampleBuffer } from '../../lib/audioUtils'

// import actions
import { userMessage, sendMessage } from '../../actions/watson'

const Chat = ({ chat, userMessage, sendMessage }) => {
  const [message, setMessage] = useState([])
  let inputString = ''
  const [inputDisplay, setInputDisplay] = useState('')



  const eventStreamMarshaller = new EventStreamMarshaller(toUtf8, fromUtf8)

  let socket
  const [transcribeException, setTranscribeException] = useState(false)
  const [socketError, setSocketError] = useState(false)

  const [sampleRate, setSampleRate] = useState(44100)


  const [inputSampleRate, setInputSampleRate] = useState()
  let micStream
  const [stream, setStream] = useState()

  const [isRecording, setIsRecording] = useState(false)

  useEffect(() => {
    if (message.length !== 0)
      message.map((msg) => (
        inputString += msg
      ))
    console.log('Input String: ', inputString)
    setInputDisplay(inputString)
  }, [message])

  useEffect(() => {
    console.log('Chat content: ', chat)
    console.log('Last item in Chat: ', chat[chat.length - 1])
    const insert = async () => {
      await axios.post('http://localhost:5000/api/dynamodb/insert', {
        category: chat[chat.length - 1]?.type,
        content: chat[chat.length - 1]?.message
      })
    }
    if(chat.length !== 0) {
      insert()
    }
  }, [chat])


  const getAudioEventMessage = (buffer) => {
    return {
      headers: {
        ':message-type': {
          type: 'string',
          value: 'event'
        },
        ':event-type': {
          type: 'string',
          value: 'AudioEvent'
        }
      },
      body: buffer
    }
  }

  const convertAudioToBinaryMessage = (audioChunk) => {
    let raw = mic.toRaw(audioChunk)

    if (raw == null)
      return;

    let downsampledBuffer = downsampleBuffer(raw, inputSampleRate, sampleRate)
    let pcmEncodedBuffer = pcmEncode(downsampledBuffer)

    let audioEventMessage = getAudioEventMessage(Buffer.from(pcmEncodedBuffer))

    let binary = eventStreamMarshaller.marshall(audioEventMessage)

    return binary
  }

  const handleEventStreamMessage = (messageJson) => {
    let results = messageJson.Transcript.Results

    if (results.length > 0) {
      if (results[0].Alternatives.length > 0) {
        let outPut = results[0].Alternatives[0].Transcript
        outPut = decodeURIComponent(escape(outPut))

        // setTranscription(transcription => ([...transcription, outPut + '\n']))

        if (!results[0].IsPartial) {
          // setTranscription(transcription => ([...transcription, outPut + '\n']))
          // setMessage(message => ([...message, outPut + '\n']))
          // setMessage([...message, outPut])
          setMessage(oldArray => [...oldArray, outPut])
          // message.map((msg) => {
          //   console.log(msg)
          // })
          // console.log(outPut)
          // setMessage(message + outPut + ' ')
          // console.log(message)
          // message.map((msg) => {
          //   inputString += msg
          // })
          // setInputDisplay(inputString)
        }
      }
    }
  }

  const streamAudioToWebSocket = async (userMediaStream) => {
    micStream = new mic()
    micStream.on('format', data => {
      setInputSampleRate(data.sampleRate)
    })
    micStream.setStream(userMediaStream)

    const preSignedURL = await axios.post('https://chatbottranscribeapi.transcribestreamingapp.store/api/transcribe/generateurl', {
      sampleR: sampleRate
    })
    console.log(preSignedURL.data)

    socket = new WebSocket(preSignedURL.data)
    socket.binaryType = 'arraybuffer'

    // setSampleRate(0)

    socket.onopen = function () {
      micStream.on('data', function (rawAudioChunk) {
        let binary = convertAudioToBinaryMessage(rawAudioChunk)

        if (socket.readyState === socket.OPEN) {
          socket.send(binary)
        }
      })
    }
    // console.log('Socket ready state: ', socket)

    // wireSocketEvents()
    socket.onmessage = function (message) {
      let messageWrapper = eventStreamMarshaller.unmarshall(Buffer(message.data))
      let messageBody = JSON.parse(String.fromCharCode.apply(String, messageWrapper.body))
      if (messageWrapper.headers[":message-type"].value === "event") {
        handleEventStreamMessage(messageBody)
      } else {
        setTranscribeException(true)
        console.log(messageBody.Message)
      }
    }

    socket.onerror = function () {
      setSocketError(true)
      console.log('WebSocket connection error. Try again.')
    }

    socket.onclose = function (closeEvent) {
      micStream.stop()

      if (!socketError && !transcribeException) {
        if (closeEvent.code !== 1000) {
          console.log('</i><strong>Streaming Exception</strong><br>', closeEvent.reason)
        }
      }
    }
  }









  const handleRecord = async () => {
    if (isRecording) {
      console.log('closing stream', stream)
      stream.getTracks().forEach(function (track) {
        if (track.readyState === 'live' && track.kind === 'audio') {
          track.stop();
          setIsRecording(false)
        }
      });
      // stream.stop()
      // setIsRecording(false)
    } else {
      console.log('Record started!')

      try {
        window.navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true
        })
          .then(setIsRecording(true))
          .then(userMediaStream => {
            setStream(userMediaStream)
            // stream = userMediaStream
            // userMediaStream.getTracks().forEach(function (track) {
            //   if (track.readyState === 'live' && track.kind === 'audio') {
            //     track.stop();
            //     setIsRecording(false)
            //   }
            // });
            streamAudioToWebSocket(userMediaStream)
          })

        // stream = await window.navigator.mediaDevices.getUserMedia({
        //   video: false,
        //   audio: true
        // })
        // console.log(stream)
        // setIsRecording(true)
        // streamAudioToWebSocket(stream)

      } catch (err) {
        console.log('Error. ', err)
      }
    }
  }

  // function to handle user submission
  const handleSubmit = async (e) => {
    const code = e.keyCode || e.which
    if (code === 13) {
      console.log(message)
      // userMessage(message)
      // sendMessage(message)
      userMessage(inputDisplay)
      sendMessage(inputDisplay)

      setMessage([])
    }
  }

  const handleOnChange = (e) => {
    console.log(e.target.value)
    setInputDisplay(e.target.value)
  }

  return (
    <div className='chat'>
      <h1 className='heading'>IBM Watson Assistant - API v2</h1>
      <div className='history'>
        {chat.length === 0 ? ''
          : chat.map((msg, i) => <div className={msg.type} key={i}>{msg.message}</div>)
        }
      </div>

      <div className='chatBox'>
        <input
          className='inputBar'
          type='text'
          // value={message}
          value={inputDisplay}
          // onChange={(e) => setMessage(e.target.value)}
          onChange={handleOnChange}
          onKeyPress={handleSubmit}
        />
        <button onClick={handleRecord}>Record</button>
      </div>

    </div>
  )
}

const mapStateToProps = (state) => ({
  chat: state.watson.messages
})

export default connect(mapStateToProps, { userMessage, sendMessage })(Chat)