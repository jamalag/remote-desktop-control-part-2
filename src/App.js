import './App.css';
import { useEffect, useRef } from 'react'

import io from 'socket.io-client'

const socket = io('https://2ce6-2607-fea8-bde2-400-a5d9-55c7-bff0-727c.ngrok.io/remote-ctrl')

function App() {
  const videoRef = useRef()

  const rtcPeerConnection = useRef(new RTCPeerConnection({
    'iceServers': [
      { 'urls': 'stun:stun.services.mozilla.com' },
      { 'urls': 'stun:stun.l.google.com:19302' },
      { "urls": "stun:webrtconline.com:3478" },
    ]
  }))

  const handleStream = (stream) => {
    // const { width, height } = stream.getVideoTracks()[0].getSettings()

    // window.electronAPI.setSize({ width, height })

    videoRef.current.srcObject = stream
    videoRef.current.onloadedmetadata = (e) => videoRef.current.play()
  }

  const getUserMedia = async (constraints) => {
    try {
      // we are not adding stream to the peer connection
      // however, if I omit, connection seem not to work
      const stream = await navigator.mediaDevices.getUserMedia(constraints)

      // create an offer and send to the electron app
      rtcPeerConnection.current.createOffer().then(sdp => {
        rtcPeerConnection.current.setLocalDescription(sdp)

        console.log('Send Offer sdp', JSON.stringify(sdp))
        socket.emit('offer', sdp)
      })
    } catch (e) { console.log(e) }
  }

  useEffect(() => {

    const getStream = async (screenId) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: screenId,
            }
          }
        })

        handleStream(stream)

      } catch (e) {
        console.log(e)
      }
    }

    // event triggered from electron if running in an electron app & returns a screenId
    // otherwise we call getUserMedia() for the controller
    (window.electronAPI && window.electronAPI.getScreenId((event, screenId) => {
      console.log('Renderer...', screenId)
      getStream(screenId)
    })) || getUserMedia({ video: true, audio: false })

    socket.on('offer', offerSDP => {
      console.log('Got Offer sdp ...', JSON.stringify(offerSDP))
      rtcPeerConnection.current.setRemoteDescription(
        new RTCSessionDescription(offerSDP)
      ).then(() => {
        rtcPeerConnection.current.createAnswer().then(sdp => {
          rtcPeerConnection.current.setLocalDescription(sdp)
          console.log('Sent Answer sdp')

          // send back to the controller
          socket.emit('answer', sdp)
        }).catch(e => console.log(e))
      })
    })

    socket.on('answer', answerSDP => {
      console.log('Got Answer sdp ...', JSON.stringify(answerSDP))
      rtcPeerConnection.current.setRemoteDescription(
        new RTCSessionDescription(answerSDP)
      )
    })

    socket.on('icecandidate', icecandidate => {
      console.log('Got icecandidate ...', JSON.stringify(icecandidate))
      rtcPeerConnection.current.addIceCandidate(
        new RTCIceCandidate(icecandidate)
      )
    })

    rtcPeerConnection.current.onicecandidate = (e) => {
      console.log(e)

      if (e.candidate) {
        // send to the each other
        socket.emit('icecandidate', e.candidate)
      }
    }

    rtcPeerConnection.current.oniceconnectionstatechange = (e) => {
      console.log(e)
    }

    rtcPeerConnection.current.ontrack = (e) => {
      // when we receive tracks, 
      // we get the video stream and assign to the video element srcObject
      videoRef.current.srcObject = e.streams[0]

      // we then call the play() method when metadata is loaded
      // by this time media should have started to flow
      videoRef.current.onloadedmetadata = (e) => videoRef.current.play()
    }

  }, [])

  return (
    <div className="App">
      <>
        <span>800x600</span>
        <video ref={videoRef} className="video">video not available</video>
      </>
    </div>
  );
}

export default App;
