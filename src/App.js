import './App.css';
import { useRef, useEffect } from 'react'

import io from 'socket.io-client'

const socket = io('https://1010-2607-fea8-bde2-400-d953-3179-37f8-9a82.ngrok.io/remote-ctrl')

function App() {
  const videoRef = useRef()

  const rtcPeerConnection = useRef(new RTCPeerConnection({
    'iceServers': [
      { 'urls': 'stun:stun.services.mozilla.com' },
      { 'urls': 'stun:stun.l.google.com:19302' },
    ]
  }))

  const handleStream = (stream) => {
    // const { width, height } = stream.getVideoTracks()[0].getSettings()

    // window.electronAPI.setSize({ width, height })

    // videoRef.current.srcObject = stream
    rtcPeerConnection.current.addStream(stream)
    // videoRef.current.onloadedmetadata = (e) => videoRef.current.play()
  }

  const getUserMedia = async (constraints) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints)

      // rtcPeerConnection.current.addTransceiver('video')
      // rtcPeerConnection.current.getTransceivers().forEach(t => t.direction = 'recvonly')

      rtcPeerConnection.current.createOffer({
        offerToReceiveVideo: 1
      }).then(sdp => {
        rtcPeerConnection.current.setLocalDescription(sdp)
        console.log('sending offer')
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

    (window.electronAPI && window.electronAPI.getScreenId((event, screenId) => {
      console.log('Renderer...', screenId)
      getStream(screenId)
    })) || getUserMedia({ video: true, audio: false })

    socket.on('offer', offerSDP => {
      console.log('received offer')
      rtcPeerConnection.current.setRemoteDescription(
        new RTCSessionDescription(offerSDP)
      ).then(() => {
        rtcPeerConnection.current.createAnswer().then(sdp => {
          rtcPeerConnection.current.setLocalDescription(sdp)

          console.log('sending answer')
          socket.emit('answer', sdp)
        })
      })
    })

    socket.on('anwer', answerSDP => {
      console.log('received answer')
      rtcPeerConnection.current.setRemoteDescription(
        new RTCSessionDescription(answerSDP)
      )
    })

    socket.on('icecandidate', icecandidate => {
      rtcPeerConnection.current.addIceCandidate(
        new RTCIceCandidate(icecandidate)
      )
    })

    rtcPeerConnection.current.onicecandidate = (e) => {
      if (e.icecandidate)
        socket.emit('icecandidate', e.icecandidate)
    }

    rtcPeerConnection.current.oniceconnectionstatechange = (e) => {
      console.log(e)
    }

    rtcPeerConnection.current.ontrack = (e) => {
      videoRef.current.srcObject = e.streams[0]
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