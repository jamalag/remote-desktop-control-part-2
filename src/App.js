import './App.css';
import { useRef, useEffect, useState } from 'react'

import io from 'socket.io-client'

const socket = io('https://e8e6-2607-fea8-bde2-400-755b-a04e-53f6-19fa.ngrok.io/remote-ctrl')

function App() {
  const videoRef = useRef()

  const rtcPeerConnection = useRef(new RTCPeerConnection({
    'iceServers': [
      { 'urls': 'stun:stun.services.mozilla.com' },
      { 'urls': 'stun:stun.l.google.com:19302' },
    ]
  }))

  const [selectedScreen, _setSelectedScreen] = useState(1)
  const selectedScreenRef = useRef(selectedScreen)

  const setSelectedScreen = newSelectedScreen => {
    selectedScreenRef.current = newSelectedScreen
    _setSelectedScreen(newSelectedScreen)
  }

  const handleStream = (selectedScreen, stream) => {

    setSelectedScreen(selectedScreen)

    socket.emit('selectedScreen', selectedScreen)
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

    const getStream = async (selectedScreen) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: selectedScreen.id,
            }
          }
        })

        handleStream(selectedScreen, stream)

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

    socket.on('answer', answerSDP => {
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
      if (e.candidate)
        socket.emit('icecandidate', e.candidate)
    }

    rtcPeerConnection.current.oniceconnectionstatechange = (e) => {
      console.log(e)
    }

    rtcPeerConnection.current.ontrack = (e) => {
      videoRef.current.srcObject = e.streams[0]
      videoRef.current.onloadedmetadata = (e) => videoRef.current.play()
    }

    socket.on('selectedScreen', selectedScreen => {
      setSelectedScreen(selectedScreen)
    })

  }, [])

  const handleMouseClick = (e) => socket.emit('mouse_click', {})

  const handleMouseMove = ({
    clientX, clientY
  }) => {
    socket.emit('mouse_move', {
      clientX, clientY,
      clientWidth: window.innerWidth,
      clientHeight: window.innerHeight,
    })
  }

  return (
    <div className="App">
      <>
        <div
          style={{
            display: 'block',
            backgroundColor: 'black',
            margin: 0,
          }}
          onMouseMove={handleMouseMove}
          onClick={handleMouseClick}
        >
          <video ref={videoRef} className="video">video not available</video>
        </div>
      </>
    </div>
  );
}

export default App;
