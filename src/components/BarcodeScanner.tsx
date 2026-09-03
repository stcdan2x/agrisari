import { useEffect, useRef, useState } from 'react'
import { btnSecondary } from './ui'

// Camera scanning through the browser's BarcodeDetector (decision 10: last step of P4,
// deferrable). Where the API is missing the picker's search field is the fallback: a
// hardware scanner types the code into it and a typed code matches the product's barcode.

interface Detector {
  detect(source: ImageBitmapSource): Promise<{ rawValue: string }[]>
}
type DetectorCtor = new (opts?: { formats?: string[] }) => Detector

export const canScan = () => typeof window !== 'undefined' && 'BarcodeDetector' in window && !!navigator.mediaDevices?.getUserMedia

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code']

export default function BarcodeScanner({ onDetect, onClose }: { onDetect: (code: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let stream: MediaStream | undefined
    let timer: number | undefined
    let done = false
    const stop = () => {
      done = true
      if (timer) window.clearInterval(timer)
      stream?.getTracks().forEach((t) => t.stop())
    }
    ;(async () => {
      try {
        const Ctor = (window as unknown as { BarcodeDetector: DetectorCtor }).BarcodeDetector
        const detector = new Ctor({ formats: FORMATS })
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
        if (done || !video.current) return
        video.current.srcObject = stream
        await video.current.play()
        timer = window.setInterval(async () => {
          if (done || !video.current || video.current.readyState < 2) return
          try {
            const codes = await detector.detect(video.current)
            const code = codes[0]?.rawValue.trim()
            if (code) {
              stop()
              onDetect(code)
            }
          } catch {
            // a frame that cannot be decoded is skipped
          }
        }, 250)
      } catch (e) {
        setError(e instanceof Error && e.name === 'NotAllowedError' ? 'Camera access was refused. Type the code instead.' : 'The camera could not be opened. Type the code instead.')
      }
    })()
    return stop
  }, [onDetect])

  return (
    <div className="mt-3 rounded-xl bg-slate-900 p-2 text-white">
      {error ? <p className="p-2 text-sm">{error}</p> : <video ref={video} className="mx-auto max-h-64 w-full rounded-lg" muted playsInline />}
      <div className="mt-2 flex items-center justify-between px-1 text-xs">
        <span>{error ? '' : 'Point the camera at the barcode'}</span>
        <button type="button" className={`${btnSecondary} text-xs`} onClick={onClose}>Close</button>
      </div>
    </div>
  )
}
