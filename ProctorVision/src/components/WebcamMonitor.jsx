import { AlertTriangle, Camera, CameraOff, Download, ShieldCheck } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import useFaceDetection from '../hooks/useFaceDetection.js'
import useFaceLandmarkDetection from '../hooks/useFaceLandmarkDetection.js'
import usePhoneDetection from '../hooks/usePhoneDetection.js'
import useProctoring from '../hooks/useProctoring.js'

function WebcamMonitor({
  onConnectionChange,
  onFaceDetectedChange,
  onFaceStatusChange,
  onProctoringEvent,
  locked = false,
}) {
  const [blinkSnapshot, setBlinkSnapshot] = useState(null)
  const [latestDetectionAlert, setLatestDetectionAlert] = useState(null)
  const { videoRef, isMonitoring, connectionId, error, startMonitoring, stopMonitoring } = useProctoring()
  const captureBlinkSnapshot = useCallback((snapshot) => {
    setBlinkSnapshot({ ...snapshot, connectionId })
  }, [connectionId])
  const recordDetectionEvent = useCallback((event) => {
    setLatestDetectionAlert(event)
    onProctoringEvent?.(event)
  }, [onProctoringEvent])
  const { faceCount, status: faceStatus, error: faceError } = useFaceDetection(
    videoRef,
    isMonitoring,
    connectionId,
    recordDetectionEvent,
  )
  const { error: landmarkError } = useFaceLandmarkDetection(
    videoRef,
    isMonitoring,
    connectionId,
    captureBlinkSnapshot,
    recordDetectionEvent,
  )
  const { status: phoneDetectionStatus, error: phoneDetectionError, phoneScore } = usePhoneDetection(
    videoRef,
    isMonitoring,
    connectionId,
    recordDetectionEvent,
  )
  const faceDetected = faceCount > 0

  useEffect(() => {
    onConnectionChange?.(isMonitoring)
  }, [isMonitoring, onConnectionChange])

  useEffect(() => {
    onFaceDetectedChange?.(faceDetected)
  }, [faceDetected, onFaceDetectedChange])

  useEffect(() => {
    onFaceStatusChange?.(faceStatus)
  }, [faceStatus, onFaceStatusChange])

  function toggleCamera() {
    setBlinkSnapshot(null)
    setLatestDetectionAlert(null)
    if (isMonitoring) {
      stopMonitoring()
    } else {
      void startMonitoring()
    }
  }

  const faceStatusText = {
    idle: 'Face detection starts after camera connects',
    loading: 'Loading face detector model…',
    ready: 'Face detector ready',
    running: 'Detecting faces…',
    error: 'Face detection unavailable',
  }[faceStatus]
  const phoneStatusText = {
    idle: 'Phone detection starts after camera connects',
    loading: 'Loading phone detection model…',
    ready: 'Phone detection model ready',
    running: phoneScore === null
      ? 'Scanning frames for phones (30% confidence threshold)'
      : `Possible phone detected · ${Math.round(phoneScore * 100)}% confidence`,
    error: 'Phone detection unavailable',
  }[phoneDetectionStatus]

  return (
    <section aria-label="Webcam preview" className="panel webcam-panel">
      <div className="webcam-heading">
        <div><span className="eyebrow">CAMERA CHECK</span><h2>Webcam preview</h2></div>
        <div className="webcam-indicators">
          <span className={`face-count-badge${faceCount > 0 ? ' detected' : ''}`} aria-live="polite">
            Faces: {faceCount}
          </span>
          <span className={`camera-status${isMonitoring ? ' connected' : ''}`}>
            <span className="status-dot" /> {isMonitoring ? 'Connected' : 'Not connected'}
          </span>
        </div>
      </div>
      {isMonitoring ? (
        <video ref={videoRef} autoPlay className="webcam-video" muted playsInline />
      ) : (
        <div className="webcam-placeholder">
          <div className="camera-placeholder-icon"><CameraOff size={25} /></div>
          <strong>Your camera preview will appear here</strong>
          <span>Allow camera access to preview your setup</span>
        </div>
      )}
      <div className="webcam-controls">
        <div className="webcam-status-copy">
          <span className="monitor-icon">{faceDetected ? <ShieldCheck size={17} /> : <Camera size={17} />}</span>
          <div>
            <strong>{isMonitoring ? 'Camera preview active' : 'Monitoring ready'}</strong>
            <span className={`monitor-description face-status${faceDetected ? ' detected' : ''}`} role="status">
              {isMonitoring ? faceStatusText : 'Enable your camera when you are ready.'}
            </span>
          </div>
        </div>
        {!locked && (
          <button
            className={`button camera-button${isMonitoring ? ' secondary' : ''}`}
            onClick={toggleCamera}
            type="button"
          >
            {isMonitoring ? 'Disconnect' : 'Connect / test camera'}
          </button>
        )}
      </div>
      {error && <p className="error-message" role="alert">{error}</p>}
      {faceError && <p className="error-message" role="alert">Face detector error: {faceError}</p>}
      {landmarkError && <p className="error-message" role="alert">Face landmark feature error: {landmarkError}</p>}
      {phoneDetectionError && (
        <p className="error-message" role="alert">
          Phone detection is unavailable: {phoneDetectionError}
        </p>
      )}
      {isMonitoring && (
        <p className="phone-monitor-status" role="status">{phoneStatusText}</p>
      )}
      {latestDetectionAlert && (
        <div className="face-detection-alert" role="alert">
          <AlertTriangle aria-hidden="true" size={16} />
          <span>
            <strong>{latestDetectionAlert.title}</strong>
            <span>{latestDetectionAlert.detail}</span>
          </span>
        </div>
      )}
      {isMonitoring && (
        <div className="blink-snapshot">
          {blinkSnapshot?.connectionId === connectionId ? (
            <>
              <img alt="Camera snapshot captured when you blinked" src={blinkSnapshot.dataUrl} />
              <div className="snapshot-details">
                <span className="snapshot-title">Blink snapshot</span>
                <time>{blinkSnapshot.capturedAt.toLocaleTimeString()}</time>
                <a
                  className="snapshot-download"
                  download={`proctorvision-blink-${blinkSnapshot.capturedAt.getTime()}.jpg`}
                  href={blinkSnapshot.dataUrl}
                >
                  <Download aria-hidden="true" size={14} /> Download
                </a>
              </div>
            </>
          ) : (
            <span className="snapshot-hint">Blink to capture a snapshot. It stays on this device.</span>
          )}
        </div>
      )}
    </section>
  )
}

export default WebcamMonitor
