import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  ButtonHTMLAttributes,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from 'react'
import './App.css'
import { VirtualStar } from './components/VirtualStar'
import {
  captureNeonSelfie,
  downloadBlob,
  drawNeonSelfieFrame,
} from './utils/capture'

type CameraState = 'idle' | 'starting' | 'ready' | 'error'
type RecordingState = 'idle' | 'recording' | 'finishing' | 'ready'
type Language = 'ko' | 'en'

const MAX_RECORDING_SECONDS = 180
const RECORDING_FRAME_RATE = 30

const cameraConstraints: MediaStreamConstraints = {
  audio: false,
  video: {
    facingMode: { ideal: 'user' },
  },
}

const copy = {
  ko: {
    title: '싸인해주세요!',
    langKo: '한',
    langEn: 'EN',
    cameraStart: '카메라 시작',
    recordingStart: 'REC 시작',
    recordingStop: 'REC 중지',
    recordingAgain: '새 REC',
    recordingFinishing: '정리 중',
    recordingSave: '녹화 저장',
    sign: '싸인 받기',
    selfie: '셀카 찍기',
    retake: '다시 찍기',
    liveCamera: '라이브 셀피 카메라',
    capturePanel: '네온 스타 싸인 셀피 촬영',
    preview: '셀피 카메라 미리보기',
    signatureCanvas: '직접 그리는 싸인 캔버스',
    controls: '촬영 제어',
    recordingReady: '녹화 저장 가능',
    recordingUnsupported:
      '이 브라우저는 녹화 저장을 지원하지 않아요. 최신 Chrome 또는 Edge에서 다시 시도해 주세요.',
    recordingError: '녹화 중 문제가 생겼어요. 다시 녹화해 주세요.',
    recordingNotReady: '저장할 녹화 파일이 아직 없어요.',
    startCameraFirst: '먼저 카메라를 시작해 주세요.',
    cameraNotReady: '카메라가 준비된 뒤 찍을 수 있어요.',
    signFirst: '싸인을 먼저 받아 주세요.',
    savePhotoError: '사진 저장 중 문제가 생겼어요.',
    noCameraApi: '이 브라우저는 카메라 API를 지원하지 않아요.',
    pngSaving: 'PNG 저장 중',
    pngDone: 'PNG 저장 완료',
    signatureVisible: '네온 싸인 표시됨',
    cameraReady: '카메라 준비 완료',
    cameraStarting: '카메라 시작 중',
    cameraIdle: '카메라 대기 중',
    recordingStatus: '녹화 중',
    recordingDone: '녹화 저장 준비 완료',
    finishingRecording: '녹화 파일 정리 중',
    permissionDenied:
      '카메라 권한이 거부됐어요. 브라우저 권한을 허용한 뒤 다시 시도해 주세요.',
    cameraNotFound: '사용할 수 있는 카메라를 찾지 못했어요.',
    cameraBusy: '다른 앱이 카메라를 사용 중일 수 있어요.',
    secureContext: '카메라는 localhost 또는 HTTPS 환경에서만 사용할 수 있어요.',
    cameraUnknown: '카메라를 시작하지 못했어요. 권한과 장치 상태를 확인해 주세요.',
  },
  en: {
    title: 'Sign, please!',
    langKo: '한',
    langEn: 'EN',
    cameraStart: 'Start camera',
    recordingStart: 'Start REC',
    recordingStop: 'Stop REC',
    recordingAgain: 'New REC',
    recordingFinishing: 'Finishing',
    recordingSave: 'Save video',
    sign: 'Get sign',
    selfie: 'Take selfie',
    retake: 'Retake',
    liveCamera: 'Live selfie camera',
    capturePanel: 'Neon star sign selfie capture',
    preview: 'Selfie camera preview',
    signatureCanvas: 'Hand-drawn signature canvas',
    controls: 'Capture controls',
    recordingReady: 'Video ready to save',
    recordingUnsupported:
      'This browser cannot save recordings. Please try the latest Chrome or Edge.',
    recordingError: 'Something went wrong while recording. Please try again.',
    recordingNotReady: 'There is no recording to save yet.',
    startCameraFirst: 'Start the camera first.',
    cameraNotReady: 'You can take a selfie after the camera is ready.',
    signFirst: 'Please get a signature first.',
    savePhotoError: 'Something went wrong while saving the selfie.',
    noCameraApi: 'This browser does not support the camera API.',
    pngSaving: 'Saving PNG',
    pngDone: 'PNG saved',
    signatureVisible: 'Neon signature visible',
    cameraReady: 'Camera ready',
    cameraStarting: 'Starting camera',
    cameraIdle: 'Camera idle',
    recordingStatus: 'Recording',
    recordingDone: 'Recording ready to save',
    finishingRecording: 'Preparing recording file',
    permissionDenied:
      'Camera permission was denied. Allow camera access and try again.',
    cameraNotFound: 'No available camera was found.',
    cameraBusy: 'Another app may be using the camera.',
    secureContext: 'Camera access only works on localhost or HTTPS.',
    cameraUnknown: 'Could not start the camera. Check permission and device status.',
  },
} satisfies Record<Language, Record<string, string>>

function App() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const recordingCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const recordingChunksRef = useRef<Blob[]>([])
  const recordingBlobRef = useRef<Blob | null>(null)
  const recordingMimeTypeRef = useRef('video/webm')
  const recordingFrameRef = useRef<number | null>(null)
  const recordingLimitTimerRef = useRef<number | null>(null)
  const recordingClockTimerRef = useRef<number | null>(null)
  const photoFlashTimerRef = useRef<number | null>(null)

  const [language, setLanguage] = useState<Language>('ko')
  const [cameraState, setCameraState] = useState<CameraState>('idle')
  const [error, setError] = useState('')
  const [isSigning, setIsSigning] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [hasRecording, setHasRecording] = useState(false)
  const [recordingFileName, setRecordingFileName] = useState('')
  const [isPhotoFlashActive, setIsPhotoFlashActive] = useState(false)

  const t = copy[language]
  const isRecording = recordingState === 'recording'
  const isPreparingRecording = recordingState === 'finishing'

  const clearSignatureCanvas = useCallback(() => {
    const canvas = signatureCanvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) {
      return
    }

    context.clearRect(0, 0, canvas.width, canvas.height)
  }, [])

  const syncSignatureCanvas = useCallback(() => {
    const canvas = signatureCanvasRef.current
    const stage = stageRef.current
    if (!canvas || !stage) {
      return
    }

    const rect = stage.getBoundingClientRect()
    const pixelRatio = window.devicePixelRatio || 1
    const nextWidth = Math.max(1, Math.round(rect.width * pixelRatio))
    const nextHeight = Math.max(1, Math.round(rect.height * pixelRatio))

    if (canvas.width === nextWidth && canvas.height === nextHeight) {
      return
    }

    const previous = document.createElement('canvas')
    previous.width = canvas.width
    previous.height = canvas.height
    previous.getContext('2d')?.drawImage(canvas, 0, 0)

    canvas.width = nextWidth
    canvas.height = nextHeight
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`

    const context = canvas.getContext('2d')
    if (!context) {
      return
    }

    context.lineCap = 'round'
    context.lineJoin = 'round'

    if (previous.width && previous.height && hasSignature) {
      context.drawImage(previous, 0, 0, nextWidth, nextHeight)
    }
  }, [hasSignature])

  const stopRecordingTimers = useCallback(() => {
    if (recordingFrameRef.current !== null) {
      window.cancelAnimationFrame(recordingFrameRef.current)
      recordingFrameRef.current = null
    }

    if (recordingLimitTimerRef.current !== null) {
      window.clearTimeout(recordingLimitTimerRef.current)
      recordingLimitTimerRef.current = null
    }

    if (recordingClockTimerRef.current !== null) {
      window.clearInterval(recordingClockTimerRef.current)
      recordingClockTimerRef.current = null
    }
  }, [])

  const clearRecordingResult = useCallback(() => {
    recordingBlobRef.current = null
    setHasRecording(false)
    setRecordingFileName('')
  }, [])

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current
    if (!recorder || recorder.state === 'inactive') {
      return
    }

    stopRecordingTimers()
    setRecordingState('finishing')
    recorder.stop()
  }, [stopRecordingTimers])

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  useEffect(() => {
    return () => {
      stopRecordingTimers()
      stopStream()

      if (recorderRef.current?.state === 'recording') {
        recorderRef.current.stop()
      }

      if (photoFlashTimerRef.current !== null) {
        window.clearTimeout(photoFlashTimerRef.current)
      }
    }
  }, [stopRecordingTimers, stopStream])

  useEffect(() => {
    syncSignatureCanvas()

    const stage = stageRef.current
    if (!stage) {
      return
    }

    const observer = new ResizeObserver(() => syncSignatureCanvas())
    observer.observe(stage)
    window.addEventListener('orientationchange', syncSignatureCanvas)
    window.addEventListener('resize', syncSignatureCanvas)

    return () => {
      observer.disconnect()
      window.removeEventListener('orientationchange', syncSignatureCanvas)
      window.removeEventListener('resize', syncSignatureCanvas)
    }
  }, [syncSignatureCanvas])

  const startCamera = useCallback(async () => {
    if (cameraState === 'starting' || cameraState === 'ready') {
      return
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('error')
      setError(t.noCameraApi)
      return
    }

    setCameraState('starting')
    setError('')
    setDownloaded(false)
    setIsSigning(false)
    setHasSignature(false)
    lastPointRef.current = null
    clearSignatureCanvas()

    try {
      const stream = await navigator.mediaDevices.getUserMedia(cameraConstraints)
      streamRef.current = stream

      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        video.muted = true
        await video.play()
      }

      setCameraState('ready')
      window.requestAnimationFrame(syncSignatureCanvas)
    } catch (cameraError) {
      stopStream()
      setCameraState('error')
      setError(getCameraErrorMessage(cameraError, t))
    }
  }, [cameraState, clearSignatureCanvas, stopStream, syncSignatureCanvas, t])

  const requestSignature = useCallback(() => {
    if (cameraState !== 'ready') {
      setError(t.startCameraFirst)
      return
    }

    setError('')
    setDownloaded(false)
    setIsSigning(true)
    setHasSignature(false)
    lastPointRef.current = null
    clearSignatureCanvas()
    window.requestAnimationFrame(syncSignatureCanvas)
  }, [cameraState, clearSignatureCanvas, syncSignatureCanvas, t])

  const triggerPhotoFlash = useCallback(() => {
    if (photoFlashTimerRef.current !== null) {
      window.clearTimeout(photoFlashTimerRef.current)
    }

    setIsPhotoFlashActive(true)
    photoFlashTimerRef.current = window.setTimeout(() => {
      setIsPhotoFlashActive(false)
      photoFlashTimerRef.current = null
    }, 260)
  }, [])

  const savePhoto = useCallback(async () => {
    const video = videoRef.current
    const stage = stageRef.current

    if (cameraState !== 'ready' || !video || !stage) {
      setError(t.cameraNotReady)
      return
    }

    if (!hasSignature) {
      setError(t.signFirst)
      return
    }

    setIsSaving(true)
    setError('')

    try {
      const blob = await captureNeonSelfie({
        video,
        stage,
        signatureCanvas: signatureCanvasRef.current,
      })
      downloadBlob(blob, createPhotoFileName())
      setDownloaded(true)
      triggerPhotoFlash()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t.savePhotoError)
    } finally {
      setIsSaving(false)
    }
  }, [cameraState, hasSignature, t, triggerPhotoFlash])

  const startRecording = useCallback(() => {
    const video = videoRef.current
    const stage = stageRef.current

    if (cameraState !== 'ready' || !video || !stage) {
      setError(t.cameraNotReady)
      return
    }

    if (
      !('MediaRecorder' in window) ||
      typeof HTMLCanvasElement.prototype.captureStream !== 'function'
    ) {
      setError(t.recordingUnsupported)
      return
    }

    clearRecordingResult()
    stopRecordingTimers()
    setError('')
    setDownloaded(false)
    setRecordingSeconds(0)

    const canvas = document.createElement('canvas')
    recordingCanvasRef.current = canvas

    try {
      drawNeonSelfieFrame({
        video,
        stage,
        signatureCanvas: signatureCanvasRef.current,
        canvas,
        scale: 1,
      })
    } catch (recordingError) {
      setError(
        recordingError instanceof Error ? recordingError.message : t.recordingError,
      )
      return
    }

    const stream = canvas.captureStream(RECORDING_FRAME_RATE)
    const mimeType = getSupportedRecordingMimeType()
    let recorder: MediaRecorder

    try {
      recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)
    } catch {
      setError(t.recordingUnsupported)
      return
    }

    recordingMimeTypeRef.current = recorder.mimeType || mimeType || 'video/webm'
    recordingChunksRef.current = []
    recorderRef.current = recorder

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordingChunksRef.current.push(event.data)
      }
    }

    recorder.onerror = () => {
      setError(t.recordingError)
      if (recorder.state === 'recording') {
        stopRecording()
      }
    }

    recorder.onstop = () => {
      stopRecordingTimers()
      recorderRef.current = null
      recordingCanvasRef.current = null

      const chunks = recordingChunksRef.current
      if (!chunks.length) {
        setRecordingState('idle')
        setError(t.recordingError)
        return
      }

      const blob = new Blob(chunks, { type: recordingMimeTypeRef.current })
      recordingBlobRef.current = blob
      setHasRecording(true)
      setRecordingFileName(createRecordingFileName(recordingMimeTypeRef.current))
      setRecordingState('ready')
    }

    const drawFrame = () => {
      if (recorderRef.current?.state !== 'recording') {
        return
      }

      try {
        drawNeonSelfieFrame({
          video,
          stage,
          signatureCanvas: signatureCanvasRef.current,
          canvas,
          scale: 1,
        })
        recordingFrameRef.current = window.requestAnimationFrame(drawFrame)
      } catch (recordingError) {
        setError(
          recordingError instanceof Error
            ? recordingError.message
            : t.recordingError,
        )
        stopRecording()
      }
    }

    recorder.start(1000)
    setRecordingState('recording')
    recordingFrameRef.current = window.requestAnimationFrame(drawFrame)

    const startedAt = Date.now()
    recordingClockTimerRef.current = window.setInterval(() => {
      const elapsedSeconds = Math.min(
        MAX_RECORDING_SECONDS,
        Math.floor((Date.now() - startedAt) / 1000),
      )
      setRecordingSeconds(elapsedSeconds)
    }, 250)
    recordingLimitTimerRef.current = window.setTimeout(() => {
      stopRecording()
    }, MAX_RECORDING_SECONDS * 1000)
  }, [
    cameraState,
    clearRecordingResult,
    stopRecording,
    stopRecordingTimers,
    t,
  ])

  const saveRecording = useCallback(() => {
    const blob = recordingBlobRef.current
    if (!blob) {
      setError(t.recordingNotReady)
      return
    }

    downloadBlob(blob, recordingFileName || createRecordingFileName(blob.type))
  }, [recordingFileName, t])

  const retake = useCallback(() => {
    setError('')
    setDownloaded(false)
    setIsSigning(false)
    setHasSignature(false)
    lastPointRef.current = null
    clearSignatureCanvas()

    if (cameraState === 'error') {
      setCameraState('idle')
    }
  }, [cameraState, clearSignatureCanvas])

  const beginDrawing = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (!isSigning || cameraState !== 'ready') {
        return
      }

      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
      syncSignatureCanvas()
      const point = getCanvasPoint(event)
      const context = signatureCanvasRef.current?.getContext('2d')
      if (context) {
        paintNeonDot(context, point)
        setHasSignature(true)
        setDownloaded(false)
      }
      lastPointRef.current = point
    },
    [cameraState, isSigning, syncSignatureCanvas],
  )

  const drawSignature = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (!isSigning || cameraState !== 'ready' || !lastPointRef.current) {
        return
      }

      event.preventDefault()
      const canvas = signatureCanvasRef.current
      const context = canvas?.getContext('2d')
      if (!canvas || !context) {
        return
      }

      const nextPoint = getCanvasPoint(event)
      paintNeonLine(context, lastPointRef.current, nextPoint)
      lastPointRef.current = nextPoint

      if (!hasSignature) {
        setHasSignature(true)
      }
      if (downloaded) {
        setDownloaded(false)
      }
    },
    [cameraState, downloaded, hasSignature, isSigning],
  )

  const endDrawing = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    lastPointRef.current = null

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }, [])

  const recordingButtonLabel =
    recordingState === 'recording'
      ? t.recordingStop
      : recordingState === 'finishing'
        ? t.recordingFinishing
        : hasRecording
          ? t.recordingAgain
          : t.recordingStart

  const statusText = getStatusText({
    cameraState,
    downloaded,
    error,
    hasSignature,
    isSaving,
    recordingState,
    t,
  })

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>{t.title}</h1>
        <div className="language-toggle" aria-label="Language">
          <button
            type="button"
            className={`language-button ${language === 'ko' ? 'language-button--active' : ''}`}
            onClick={() => setLanguage('ko')}
            aria-pressed={language === 'ko'}
          >
            {t.langKo}
          </button>
          <button
            type="button"
            className={`language-button ${language === 'en' ? 'language-button--active' : ''}`}
            onClick={() => setLanguage('en')}
            aria-pressed={language === 'en'}
          >
            {t.langEn}
          </button>
        </div>
      </header>

      <section className="capture-panel" aria-label={t.capturePanel}>
        <div
          ref={stageRef}
          className={`camera-stage camera-stage--${cameraState} ${
            isSigning ? 'camera-stage--signing' : ''
          } ${isRecording ? 'camera-stage--recording' : ''}`}
          aria-label={t.preview}
        >
          <div className="stage-backdrop" aria-hidden="true" />
          <video
            ref={videoRef}
            className="camera-video"
            autoPlay
            muted
            playsInline
            aria-label={t.liveCamera}
          />
          <div className="stage-shine" aria-hidden="true" />
          <div className="viewfinder" aria-hidden="true" />
          <VirtualStar />
          {isRecording ? (
            <div className="recording-pill" aria-hidden="true">
              <span className="recording-dot" />
              <span>REC</span>
              <span>{formatDuration(recordingSeconds)} / 03:00</span>
            </div>
          ) : null}
          <div
            className={`photo-flash ${isPhotoFlashActive ? 'photo-flash--active' : ''}`}
            aria-hidden="true"
          />
          <canvas
            ref={signatureCanvasRef}
            className={`signature-canvas ${isSigning ? 'signature-canvas--active' : ''}`}
            aria-label={t.signatureCanvas}
            onPointerDown={beginDrawing}
            onPointerMove={drawSignature}
            onPointerUp={endDrawing}
            onPointerCancel={endDrawing}
            onPointerLeave={endDrawing}
          />
        </div>

        {error ? (
          <p className="error-message" role="alert">
            {error}
          </p>
        ) : null}

        {recordingState === 'ready' ? (
          <p className="recording-ready">{t.recordingReady}</p>
        ) : null}

        <div className="controls" aria-label={t.controls}>
          <ActionButton
            onClick={startCamera}
            disabled={cameraState === 'starting' || cameraState === 'ready'}
            variant="cyan"
            aria-busy={cameraState === 'starting'}
          >
            {t.cameraStart}
          </ActionButton>
          <ActionButton
            onClick={recordingState === 'recording' ? stopRecording : startRecording}
            disabled={cameraState !== 'ready' || isPreparingRecording}
            variant="red"
            aria-pressed={isRecording}
            aria-busy={isPreparingRecording}
          >
            {recordingButtonLabel}
          </ActionButton>
          <ActionButton
            onClick={requestSignature}
            disabled={cameraState !== 'ready'}
            variant="pink"
            aria-pressed={isSigning}
          >
            {t.sign}
          </ActionButton>
          <ActionButton
            onClick={savePhoto}
            disabled={cameraState !== 'ready' || !hasSignature || isSaving}
            variant="violet"
            aria-busy={isSaving}
          >
            {t.selfie}
          </ActionButton>
          {hasRecording ? (
            <ActionButton onClick={saveRecording} variant="green">
              {t.recordingSave}
            </ActionButton>
          ) : null}
          <ActionButton
            onClick={retake}
            disabled={cameraState === 'starting' || isRecording || isPreparingRecording}
            variant="ghost"
          >
            {t.retake}
          </ActionButton>
        </div>

        <span className="sr-only" aria-live="polite">
          {statusText}
        </span>
      </section>
    </main>
  )
}

function getCanvasPoint(event: ReactPointerEvent<HTMLCanvasElement>) {
  const canvas = event.currentTarget
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  }
}

function paintNeonLine(
  context: CanvasRenderingContext2D,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  const distance = Math.hypot(to.x - from.x, to.y - from.y)
  if (distance < 1) {
    return
  }

  context.save()
  context.lineCap = 'round'
  context.lineJoin = 'round'

  context.shadowColor = 'rgba(53, 231, 255, 0.95)'
  context.shadowBlur = 18
  context.strokeStyle = 'rgba(53, 231, 255, 0.8)'
  context.lineWidth = 16
  drawSegment(context, from, to)

  context.shadowColor = 'rgba(255, 79, 184, 0.95)'
  context.shadowBlur = 14
  context.strokeStyle = '#ff4fb8'
  context.lineWidth = 8
  drawSegment(context, from, to)

  context.shadowColor = 'rgba(255, 255, 255, 0.9)'
  context.shadowBlur = 4
  context.strokeStyle = '#fff3a8'
  context.lineWidth = 3
  drawSegment(context, from, to)

  context.restore()
}

function paintNeonDot(
  context: CanvasRenderingContext2D,
  point: { x: number; y: number },
) {
  context.save()
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.shadowColor = 'rgba(53, 231, 255, 0.95)'
  context.shadowBlur = 18
  context.fillStyle = '#ff4fb8'
  context.beginPath()
  context.arc(point.x, point.y, 4, 0, Math.PI * 2)
  context.fill()
  context.shadowColor = 'rgba(255, 255, 255, 0.9)'
  context.shadowBlur = 4
  context.fillStyle = '#fff3a8'
  context.beginPath()
  context.arc(point.x, point.y, 1.8, 0, Math.PI * 2)
  context.fill()
  context.restore()
}

function drawSegment(
  context: CanvasRenderingContext2D,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  context.beginPath()
  context.moveTo(from.x, from.y)
  context.lineTo(to.x, to.y)
  context.stroke()
}

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant: 'cyan' | 'pink' | 'violet' | 'ghost' | 'red' | 'green'
}

function ActionButton({
  children,
  className = '',
  variant,
  ...buttonProps
}: ActionButtonProps) {
  return (
    <button
      {...buttonProps}
      type="button"
      className={`action-button action-button--${variant} ${className}`}
    >
      {children}
    </button>
  )
}

function getCameraErrorMessage(error: unknown, t: (typeof copy)[Language]) {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') {
      return t.permissionDenied
    }

    if (error.name === 'NotFoundError') {
      return t.cameraNotFound
    }

    if (error.name === 'NotReadableError') {
      return t.cameraBusy
    }
  }

  if (!window.isSecureContext) {
    return t.secureContext
  }

  return t.cameraUnknown
}

function getStatusText({
  cameraState,
  downloaded,
  error,
  hasSignature,
  isSaving,
  recordingState,
  t,
}: {
  cameraState: CameraState
  downloaded: boolean
  error: string
  hasSignature: boolean
  isSaving: boolean
  recordingState: RecordingState
  t: (typeof copy)[Language]
}) {
  if (error) {
    return error
  }

  if (recordingState === 'recording') {
    return t.recordingStatus
  }

  if (recordingState === 'finishing') {
    return t.finishingRecording
  }

  if (recordingState === 'ready') {
    return t.recordingDone
  }

  if (isSaving) {
    return t.pngSaving
  }

  if (downloaded) {
    return t.pngDone
  }

  if (hasSignature) {
    return t.signatureVisible
  }

  if (cameraState === 'ready') {
    return t.cameraReady
  }

  if (cameraState === 'starting') {
    return t.cameraStarting
  }

  return t.cameraIdle
}

function getSupportedRecordingMimeType() {
  const mimeTypes = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ]

  return mimeTypes.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) ?? ''
}

function formatDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.min(MAX_RECORDING_SECONDS, totalSeconds))
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function createPhotoFileName() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  return `neon-star-selfie-${stamp}.png`
}

function createRecordingFileName(mimeType: string) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const extension = mimeType.includes('mp4') ? 'mp4' : 'webm'
  return `neon-star-rec-${stamp}.${extension}`
}

export default App
