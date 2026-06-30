import { useCallback, useEffect, useRef, useState } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import './App.css'
import { SignatureOverlay } from './components/SignatureOverlay'
import { VirtualStar } from './components/VirtualStar'
import { captureNeonSelfie, downloadBlob } from './utils/capture'

type CameraState = 'idle' | 'starting' | 'ready' | 'error'

const cameraConstraints: MediaStreamConstraints = {
  audio: false,
  video: {
    facingMode: 'user',
    width: { ideal: 1280 },
    height: { ideal: 1920 },
  },
}

function App() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [cameraState, setCameraState] = useState<CameraState>('idle')
  const [error, setError] = useState('')
  const [hasSignature, setHasSignature] = useState(false)
  const [signatureRun, setSignatureRun] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [downloaded, setDownloaded] = useState(false)

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  useEffect(() => stopStream, [stopStream])

  const startCamera = useCallback(async () => {
    if (cameraState === 'starting' || cameraState === 'ready') {
      return
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('error')
      setError('이 브라우저는 카메라 API를 지원하지 않아요.')
      return
    }

    setCameraState('starting')
    setError('')
    setDownloaded(false)
    setHasSignature(false)

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
    } catch (cameraError) {
      stopStream()
      setCameraState('error')
      setError(getCameraErrorMessage(cameraError))
    }
  }, [cameraState, stopStream])

  const requestSignature = useCallback(() => {
    if (cameraState !== 'ready') {
      setError('먼저 카메라를 시작해 주세요.')
      return
    }

    setError('')
    setDownloaded(false)
    setHasSignature(false)

    window.setTimeout(() => {
      setSignatureRun(Date.now())
      setHasSignature(true)
    }, 24)
  }, [cameraState])

  const savePhoto = useCallback(async () => {
    const video = videoRef.current
    const stage = stageRef.current

    if (cameraState !== 'ready' || !video || !stage) {
      setError('카메라가 준비된 뒤 저장할 수 있어요.')
      return
    }

    if (!hasSignature) {
      setError('싸인을 먼저 받아 주세요.')
      return
    }

    setIsSaving(true)
    setError('')

    try {
      const blob = await captureNeonSelfie({
        video,
        stage,
        includeSignature: hasSignature,
      })
      downloadBlob(blob, createFileName())
      setDownloaded(true)
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : '사진 저장 중 문제가 생겼어요.',
      )
    } finally {
      setIsSaving(false)
    }
  }, [cameraState, hasSignature])

  const retake = useCallback(() => {
    setError('')
    setDownloaded(false)
    setHasSignature(false)
    setSignatureRun((run) => run + 1)

    if (cameraState === 'error') {
      setCameraState('idle')
    }
  }, [cameraState])

  const statusText = getStatusText({
    cameraState,
    downloaded,
    error,
    hasSignature,
    isSaving,
  })

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>Neon Star Sign Selfie</h1>
      </header>

      <section className="capture-panel" aria-label="네온 스타 싸인 셀피 촬영">
        <div
          ref={stageRef}
          className={`camera-stage camera-stage--${cameraState}`}
          aria-label="셀피 카메라 미리보기"
        >
          <div className="stage-backdrop" aria-hidden="true" />
          <video
            ref={videoRef}
            className="camera-video"
            autoPlay
            muted
            playsInline
            aria-label="라이브 셀피 카메라"
          />
          <div className="stage-shine" aria-hidden="true" />
          <div className="viewfinder" aria-hidden="true" />
          <VirtualStar />
          <SignatureOverlay active={hasSignature} runId={signatureRun} />
        </div>

        {error ? (
          <p className="error-message" role="alert">
            {error}
          </p>
        ) : null}

        <div className="controls" aria-label="촬영 제어">
          <ActionButton
            onClick={startCamera}
            disabled={cameraState === 'starting' || cameraState === 'ready'}
            variant="cyan"
            aria-busy={cameraState === 'starting'}
          >
            카메라 시작
          </ActionButton>
          <ActionButton
            onClick={requestSignature}
            disabled={cameraState !== 'ready'}
            variant="pink"
          >
            싸인 받기
          </ActionButton>
          <ActionButton
            onClick={savePhoto}
            disabled={cameraState !== 'ready' || !hasSignature || isSaving}
            variant="violet"
            aria-busy={isSaving}
          >
            사진 저장
          </ActionButton>
          <ActionButton
            onClick={retake}
            disabled={cameraState === 'starting'}
            variant="ghost"
          >
            다시 찍기
          </ActionButton>
        </div>

        <span className="sr-only" aria-live="polite">
          {statusText}
        </span>
      </section>
    </main>
  )
}

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant: 'cyan' | 'pink' | 'violet' | 'ghost'
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

function getCameraErrorMessage(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') {
      return '카메라 권한이 거부됐어요. 브라우저 권한을 허용한 뒤 다시 시도해 주세요.'
    }

    if (error.name === 'NotFoundError') {
      return '사용할 수 있는 카메라를 찾지 못했어요.'
    }

    if (error.name === 'NotReadableError') {
      return '다른 앱이 카메라를 사용 중일 수 있어요.'
    }
  }

  if (!window.isSecureContext) {
    return '카메라는 localhost 또는 HTTPS 환경에서만 사용할 수 있어요.'
  }

  return '카메라를 시작하지 못했어요. 권한과 장치 상태를 확인해 주세요.'
}

function getStatusText({
  cameraState,
  downloaded,
  error,
  hasSignature,
  isSaving,
}: {
  cameraState: CameraState
  downloaded: boolean
  error: string
  hasSignature: boolean
  isSaving: boolean
}) {
  if (error) {
    return error
  }

  if (isSaving) {
    return 'PNG 저장 중'
  }

  if (downloaded) {
    return 'PNG 저장 완료'
  }

  if (hasSignature) {
    return '네온 싸인 표시됨'
  }

  if (cameraState === 'ready') {
    return '카메라 준비 완료'
  }

  if (cameraState === 'starting') {
    return '카메라 시작 중'
  }

  return '카메라 대기 중'
}

function createFileName() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  return `neon-star-sign-selfie-${stamp}.png`
}

export default App
