import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import { useEffect, useRef, useState } from 'react'

const WASM_ASSET_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm'
const DETECTION_INTERVAL_MS = 80
const SUSTAINED_BEHAVIOR_MS = 5000
const BLINK_CLOSE_THRESHOLD = 0.55
const BLINK_OPEN_THRESHOLD = 0.25

function isLookingAway(landmarks) {
  if (landmarks.length < 478) {
    return false
  }

  const eyes = [
    { iris: 468, cornerA: 33, cornerB: 133, top: 159, bottom: 145 },
    { iris: 473, cornerA: 362, cornerB: 263, top: 386, bottom: 374 },
  ].map(({ iris, cornerA, cornerB, top, bottom }) => {
    const eyeWidth = Math.abs(landmarks[cornerB].x - landmarks[cornerA].x)
    const eyeHeight = Math.abs(landmarks[bottom].y - landmarks[top].y)

    if (eyeWidth === 0 || eyeHeight === 0) {
      return null
    }

    return {
      horizontal: (landmarks[iris].x - Math.min(landmarks[cornerA].x, landmarks[cornerB].x)) / eyeWidth,
      vertical: (landmarks[iris].y - Math.min(landmarks[top].y, landmarks[bottom].y)) / eyeHeight,
    }
  })

  if (eyes.some((eye) => eye === null)) {
    return false
  }

  const bothLookingLeft = eyes.every(({ horizontal }) => horizontal < 0.25)
  const bothLookingRight = eyes.every(({ horizontal }) => horizontal > 0.75)
  const bothLookingUp = eyes.every(({ vertical }) => vertical < 0.2)
  const bothLookingDown = eyes.every(({ vertical }) => vertical > 0.8)

  return bothLookingLeft || bothLookingRight || bothLookingUp || bothLookingDown
}

function useFaceLandmarkDetection(videoRef, enabled, connectionId, onBlink, onProctoringEvent) {
  const [detection, setDetection] = useState({ connectionId: 0, status: 'idle', error: '' })
  const onBlinkRef = useRef(onBlink)
  const onProctoringEventRef = useRef(onProctoringEvent)

  useEffect(() => {
    onBlinkRef.current = onBlink
  }, [onBlink])

  useEffect(() => {
    onProctoringEventRef.current = onProctoringEvent
  }, [onProctoringEvent])

  useEffect(() => {
    if (!enabled) {
      return undefined
    }

    let active = true
    let animationFrameId
    let lastDetectionTime = 0
    let lastVideoTime = -1
    let faceLandmarker
    let blinkInProgress = false
    let lookingAwayStartedAt = null
    let lookingAwayReported = false
    const video = videoRef.current

    function reportEvent(type, title, detail) {
      onProctoringEventRef.current?.({ type, title, detail, occurredAt: new Date() })
    }

    function updateDetection(status, error = '') {
      if (active) {
        setDetection((currentDetection) => (
          currentDetection.connectionId === connectionId
          && currentDetection.status === status
          && currentDetection.error === error
            ? currentDetection
            : { connectionId, status, error }
        ))
      }
    }

    async function initializeLandmarker() {
      try {
        if (!video) {
          throw new Error('The camera preview is not available.')
        }

        const vision = await FilesetResolver.forVisionTasks(WASM_ASSET_PATH)
        if (!active) {
          return
        }

        faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `${import.meta.env.BASE_URL}models/face_landmarker.task`,
          },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: true,
        })
        if (!active) {
          faceLandmarker.close()
          return
        }

        updateDetection('searching')

        function detectFrame(now) {
          if (!active) {
            return
          }

          if (
            video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
            && video.currentTime !== lastVideoTime
            && now - lastDetectionTime >= DETECTION_INTERVAL_MS
          ) {
            lastVideoTime = video.currentTime
            lastDetectionTime = now

            try {
              const result = faceLandmarker.detectForVideo(video, now)
              const faceDetected = result.faceLandmarks.length > 0
              updateDetection(faceDetected ? 'detected' : 'not-detected')

              if (!faceDetected) {
                blinkInProgress = false
                lookingAwayStartedAt = null
                lookingAwayReported = false
              } else {
                const landmarks = result.faceLandmarks[0]
                const nose = landmarks[1]
                const leftFaceEdge = landmarks[234]
                const rightFaceEdge = landmarks[454]
                const faceWidth = Math.abs(rightFaceEdge.x - leftFaceEdge.x)
                const faceCenterX = (leftFaceEdge.x + rightFaceEdge.x) / 2
                const horizontalTurnRatio = faceWidth > 0
                  ? Math.abs(nose.x - faceCenterX) / faceWidth
                  : 0
                const faceTurnedAway = horizontalTurnRatio > 0.2
                const lookingAway = faceTurnedAway || isLookingAway(landmarks)

                if (lookingAway) {
                  if (lookingAwayStartedAt === null) {
                    lookingAwayStartedAt = now
                  } else if (!lookingAwayReported && now - lookingAwayStartedAt >= SUSTAINED_BEHAVIOR_MS) {
                    lookingAwayReported = true
                    reportEvent('looking-away', 'Looking away from screen', 'Eye direction or head position suggested looking away for at least 5 seconds.')
                  }
                } else {
                  lookingAwayStartedAt = null
                  lookingAwayReported = false
                }

                const categories = result.faceBlendshapes[0]?.categories ?? []
                const leftEyeClosed = categories.find(({ categoryName }) => categoryName === 'eyeBlinkLeft')?.score ?? 0
                const rightEyeClosed = categories.find(({ categoryName }) => categoryName === 'eyeBlinkRight')?.score ?? 0
                const bothEyesClosed = leftEyeClosed >= BLINK_CLOSE_THRESHOLD && rightEyeClosed >= BLINK_CLOSE_THRESHOLD
                const bothEyesOpen = leftEyeClosed <= BLINK_OPEN_THRESHOLD && rightEyeClosed <= BLINK_OPEN_THRESHOLD

                if (bothEyesClosed && !blinkInProgress) {
                  blinkInProgress = true
                  const canvas = document.createElement('canvas')
                  canvas.width = video.videoWidth
                  canvas.height = video.videoHeight
                  const context = canvas.getContext('2d')

                  if (!context || canvas.width === 0 || canvas.height === 0) {
                    throw new Error('Unable to capture a camera snapshot.')
                  }

                  context.drawImage(video, 0, 0, canvas.width, canvas.height)
                  onBlinkRef.current?.({
                    dataUrl: canvas.toDataURL('image/jpeg', 0.9),
                    capturedAt: new Date(),
                  })
                } else if (bothEyesOpen) {
                  blinkInProgress = false
                }
              }
            } catch (detectionError) {
              updateDetection(
                'error',
                detectionError instanceof Error ? detectionError.message : 'Face landmark detection failed.',
              )
              return
            }
          }

          animationFrameId = window.requestAnimationFrame(detectFrame)
        }

        animationFrameId = window.requestAnimationFrame(detectFrame)
      } catch (initializationError) {
        updateDetection(
          'error',
          initializationError instanceof Error ? initializationError.message : 'Unable to initialize face landmark detection.',
        )
      }
    }

    initializeLandmarker()

    return () => {
      active = false
      window.cancelAnimationFrame(animationFrameId)
      faceLandmarker?.close()
    }
  }, [connectionId, enabled, videoRef])

  const currentDetection = enabled && detection.connectionId === connectionId
    ? detection
    : { status: enabled ? 'loading' : 'idle', error: '' }

  return { status: currentDetection.status, error: currentDetection.error }
}

export default useFaceLandmarkDetection
