import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision'
import { useEffect, useRef, useState } from 'react'

const WASM_ASSET_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm'
const DETECTION_INTERVAL_MS = 250
const NO_FACE_THRESHOLD_MS = 3000
const EVENT_COOLDOWN_MS = 15000

function useFaceDetection(videoRef, enabled, connectionId, onProctoringEvent) {
  const [model, setModel] = useState({ status: 'loading', detector: null, error: '' })
  const [frame, setFrame] = useState({ connectionId: 0, faceCount: 0, status: 'idle', error: '' })
  const onProctoringEventRef = useRef(onProctoringEvent)

  useEffect(() => {
    onProctoringEventRef.current = onProctoringEvent
  }, [onProctoringEvent])

  useEffect(() => {
    let active = true
    let detector

    async function loadDetector() {
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_ASSET_PATH)
        detector = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `${import.meta.env.BASE_URL}models/blaze_face_short_range.tflite`,
          },
          runningMode: 'VIDEO',
        })

        if (active) {
          setModel({ status: 'ready', detector, error: '' })
        } else {
          detector.close()
        }
      } catch (modelError) {
        if (active) {
          setModel({
            status: 'error',
            detector: null,
            error: modelError instanceof Error ? modelError.message : 'Unable to load the Face Detector model.',
          })
        }
      }
    }

    loadDetector()

    return () => {
      active = false
      detector?.close()
    }
  }, [])

  useEffect(() => {
    const detector = model.detector
    const video = videoRef.current
    if (!enabled || !detector || !video) {
      return undefined
    }

    let active = true
    let animationFrameId
    let lastDetectionTime = 0
    let lastVideoTime = -1
    let noFaceStartedAt = null
    let lastNoFaceEventAt = Number.NEGATIVE_INFINITY
    let multipleFacesActive = false
    let lastMultipleFacesEventAt = Number.NEGATIVE_INFINITY

    function reportEvent(type, title, detail, now) {
      onProctoringEventRef.current?.({
        type,
        title,
        detail,
        occurredAt: new Date(),
      })
      return now
    }

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
          const result = detector.detectForVideo(video, now)
          const faceCount = result.detections.length
          setFrame((currentFrame) => (
            currentFrame.connectionId === connectionId && currentFrame.faceCount === faceCount
              ? currentFrame
              : { connectionId, faceCount, status: 'running', error: '' }
          ))

          if (faceCount === 0) {
            if (noFaceStartedAt === null) {
              noFaceStartedAt = now
            } else if (
              now - noFaceStartedAt >= NO_FACE_THRESHOLD_MS
              && now - lastNoFaceEventAt >= EVENT_COOLDOWN_MS
            ) {
              lastNoFaceEventAt = reportEvent(
                'no-face',
                'Face not detected',
                'No face was detected in the camera frame for at least 3 seconds.',
                now,
              )
            }
          } else {
            noFaceStartedAt = null
          }

          if (faceCount > 1) {
            if (
              !multipleFacesActive
              || now - lastMultipleFacesEventAt >= EVENT_COOLDOWN_MS
            ) {
              lastMultipleFacesEventAt = reportEvent(
                'multiple-faces',
                'Multiple faces detected',
                `${faceCount} faces were detected in the camera frame.`,
                now,
              )
            }
            multipleFacesActive = true
          } else {
            multipleFacesActive = false
          }
        } catch (detectionError) {
          if (active) {
            setFrame({
              connectionId,
              faceCount: 0,
              status: 'error',
              error: detectionError instanceof Error ? detectionError.message : 'Face detection failed.',
            })
          }
          return
        }
      }

      animationFrameId = window.requestAnimationFrame(detectFrame)
    }

    animationFrameId = window.requestAnimationFrame(detectFrame)

    return () => {
      active = false
      window.cancelAnimationFrame(animationFrameId)
    }
  }, [connectionId, enabled, model.detector, videoRef])

  const currentFrame = enabled && frame.connectionId === connectionId
    ? frame
    : {
        faceCount: 0,
        status: enabled ? (model.status === 'ready' ? 'running' : model.status) : 'idle',
        error: model.error,
      }

  return {
    faceCount: currentFrame.faceCount,
    status: currentFrame.status,
    error: currentFrame.error,
  }
}

export default useFaceDetection
