import { useCallback, useEffect, useRef, useState } from 'react'

function useProctoring() {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [connectionId, setConnectionId] = useState(0)
  const [error, setError] = useState('')

  const stopMonitoring = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsMonitoring(false)
  }, [])

  useEffect(() => {
    const stream = streamRef.current
    const video = videoRef.current

    if (isMonitoring && stream && video) {
      video.srcObject = stream
    }

    const videoTrack = stream?.getVideoTracks()[0]
    const handleTrackEnded = () => {
      streamRef.current = null
      setIsMonitoring(false)
      setError('The camera connection ended. Reconnect your camera to continue.')
    }

    videoTrack?.addEventListener('ended', handleTrackEnded)
    return () => videoTrack?.removeEventListener('ended', handleTrackEnded)
  }, [isMonitoring])

  const startMonitoring = useCallback(async () => {
    setError('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera access is not available in this browser.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      streamRef.current = stream
      setConnectionId((currentId) => currentId + 1)
      setIsMonitoring(true)
    } catch (cameraError) {
      setError(cameraError instanceof Error ? cameraError.message : 'Unable to access the camera.')
    }
  }, [])

  useEffect(() => stopMonitoring, [stopMonitoring])

  return { videoRef, isMonitoring, connectionId, error, startMonitoring, stopMonitoring }
}

export default useProctoring
