import { useEffect, useRef, useState } from 'react'

const PHONE_DETECTION_INTERVAL_MS = 600
const PHONE_SCORE_THRESHOLD = 0.3
const PHONE_CONFIRMATION_WINDOW_MS = 2500
const PHONE_CONFIRMATION_HITS = 2
const PHONE_REARM_DELAY_MS = 3000

function usePhoneDetection(videoRef, enabled, connectionId, onProctoringEvent) {
  const [modelState, setModelState] = useState({ model: null, status: 'loading', error: '' })
  const [detection, setDetection] = useState({
    connectionId: 0,
    status: 'idle',
    error: '',
    phoneScore: null,
  })
  const onProctoringEventRef = useRef(onProctoringEvent)

  useEffect(() => {
    onProctoringEventRef.current = onProctoringEvent
  }, [onProctoringEvent])

  useEffect(() => {
    let active = true
    let model

    async function loadModel() {
      try {
        const [cocoSsd, tf] = await Promise.all([
          import('@tensorflow-models/coco-ssd'),
          import('@tensorflow/tfjs-core'),
        ])
        await Promise.all([
          import('@tensorflow/tfjs-backend-cpu'),
          import('@tensorflow/tfjs-backend-webgl'),
        ])
        await tf.ready()
        model = await cocoSsd.load({ base: 'mobilenet_v2' })
        if (active) {
          setModelState({ model, status: 'ready', error: '' })
        } else {
          model.dispose()
        }
      } catch (modelError) {
        if (active) {
          setModelState({
            model: null,
            status: 'error',
            error: modelError instanceof Error ? modelError.message : 'Unable to load the phone detection model.',
          })
        }
      }
    }

    loadModel()

    return () => {
      active = false
      model?.dispose()
    }
  }, [])

  useEffect(() => {
    const model = modelState.model
    const video = videoRef.current
    if (!enabled || !model || !video) {
      return undefined
    }

    let active = true
    let animationFrameId
    let lastDetectionTime = 0
    let lastVideoTime = -1
    let inferenceInProgress = false
    let phoneReported = false
    let phoneSightings = []
    let phoneAbsentSince = null

    setDetection({ connectionId, status: 'running', error: '', phoneScore: null })

    async function detectFrame(now) {
      if (!active) {
        return
      }

      if (
        !inferenceInProgress
        && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
        && video.currentTime !== lastVideoTime
        && now - lastDetectionTime >= PHONE_DETECTION_INTERVAL_MS
      ) {
        lastVideoTime = video.currentTime
        lastDetectionTime = now
        inferenceInProgress = true

        try {
          const predictions = await model.detect(video, 20, PHONE_SCORE_THRESHOLD)
          const phonePredictions = predictions.filter(({ class: label }) => (
            label.toLowerCase() === 'cell phone'
          ))
          const phoneScore = phonePredictions.reduce(
            (highest, prediction) => Math.max(highest, prediction.score),
            0,
          )
          const phoneVisible = phoneScore >= PHONE_SCORE_THRESHOLD

          setDetection((current) => (
            current.connectionId === connectionId
            && current.status === 'running'
            && current.phoneScore === (phoneVisible ? phoneScore : null)
              ? current
              : { connectionId, status: 'running', error: '', phoneScore: phoneVisible ? phoneScore : null }
          ))

          if (phoneVisible) {
            phoneSightings = phoneSightings.filter(
              (sightingAt) => now - sightingAt <= PHONE_CONFIRMATION_WINDOW_MS,
            )
            phoneSightings.push(now)
            phoneAbsentSince = null
            if (!phoneReported && phoneSightings.length >= PHONE_CONFIRMATION_HITS) {
              phoneReported = true
              onProctoringEventRef.current?.({
                type: 'phone-detected',
                title: 'Phone detected in view',
                detail: 'A visible object was classified as a cell phone in at least two recent camera frames. This estimate does not distinguish phone orientation.',
                occurredAt: new Date(),
              })
            }
          } else if (phoneReported) {
            phoneSightings = []
            if (phoneAbsentSince === null) {
              phoneAbsentSince = now
            } else if (now - phoneAbsentSince >= PHONE_REARM_DELAY_MS) {
              phoneReported = false
              phoneAbsentSince = null
            }
          } else {
            phoneSightings = phoneSightings.filter(
              (sightingAt) => now - sightingAt <= PHONE_CONFIRMATION_WINDOW_MS,
            )
          }
        } catch (detectionError) {
          if (active) {
            setDetection({
              connectionId,
              status: 'error',
              error: detectionError instanceof Error ? detectionError.message : 'Phone detection failed.',
              phoneScore: null,
            })
          }
          return
        } finally {
          inferenceInProgress = false
        }
      }

      if (active) {
        animationFrameId = window.requestAnimationFrame(detectFrame)
      }
    }

    animationFrameId = window.requestAnimationFrame(detectFrame)

    return () => {
      active = false
      window.cancelAnimationFrame(animationFrameId)
    }
  }, [connectionId, enabled, modelState.model, videoRef])

  const currentDetection = enabled && detection.connectionId === connectionId
    ? detection
    : { status: enabled ? modelState.status : 'idle', error: modelState.error, phoneScore: null }

  return {
    status: currentDetection.status,
    error: currentDetection.error,
    phoneScore: currentDetection.phoneScore,
  }
}

export default usePhoneDetection
