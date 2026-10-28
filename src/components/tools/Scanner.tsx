import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useAppConfig } from '../../utils/useAppConfig';
import { i18n } from '../../utils/i18n';
import { Camera, FileDown, ArrowLeft, RefreshCw } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { downloadBlob } from '../../utils/image';

// A4 in PDF points. Using the camera's pixel size directly produced
// gigantic pages (e.g. 3000 x 4000 pt), so fit the photo onto A4 instead.
const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const MARGIN = 24;

export function Scanner({ onBack }: { onBack: () => void }) {
  const { lang } = useAppConfig();
  const dict = i18n[lang];
  const t = dict.s;

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const stopCamera = useCallback(() => {
    setStream((current) => {
      current?.getTracks().forEach((track) => track.stop());
      return null;
    });
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      setStream(mediaStream);
    } catch (err) {
      console.error(err);
      alert(t['scanner.cameraError']);
    }
  };

  // The <video> element only exists after `stream` is rendered, so attach here.
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => stopCamera, [stopCamera]);

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        setPhoto(canvas.toDataURL('image/jpeg', 0.9));
        stopCamera();
      }
    }
  };

  const saveAsPdf = async () => {
    if (!photo) return;
    setIsProcessing(true);
    try {
      const pdfDoc = await PDFDocument.create();
      const imageBytes = await fetch(photo).then((res) => res.arrayBuffer());
      const image = await pdfDoc.embedJpg(imageBytes);
      const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);

      const maxWidth = A4_WIDTH - MARGIN * 2;
      const maxHeight = A4_HEIGHT - MARGIN * 2;
      const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
      const width = image.width * scale;
      const height = image.height * scale;

      page.drawImage(image, {
        x: (A4_WIDTH - width) / 2,
        y: (A4_HEIGHT - height) / 2,
        width,
        height,
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
      downloadBlob(blob, `scan_${Date.now()}.pdf`);
    } catch (err) {
      console.error(err);
      alert(t['scanner.saveError']);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-[#0f172a]/60 border border-slate-800 rounded-3xl p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-serif text-slate-100 mb-2">{dict.tools.scanner.name}</h2>
          <p className="text-slate-400 text-lg">{dict.tools.scanner.desc}</p>
        </div>
        <button
          onClick={() => {
            stopCamera();
            onBack();
          }}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors text-lg"
        >
          <ArrowLeft size={24} />{t['common.back']}
        </button>
      </div>

      <div className="flex flex-col items-center gap-6">
        {!photo && !stream && (
          <button
            onClick={startCamera}
            className="w-full py-16 flex flex-col items-center justify-center gap-4 bg-sky-600 hover:bg-sky-500 rounded-2xl text-white transition-colors"
          >
            <Camera size={64} />
            <span className="text-3xl font-medium">{t['scanner.start']}</span>
          </button>
        )}

        <div className="relative w-full max-w-2xl rounded-2xl overflow-hidden bg-black flex justify-center">
          {stream && !photo && (
            <video ref={videoRef} autoPlay playsInline className="w-full h-auto max-h-[60vh] object-contain" />
          )}
          {photo && <img src={photo} alt={t['scanner.alt']} className="w-full h-auto max-h-[60vh] object-contain" />}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {stream && !photo && (
          <button
            onClick={takePhoto}
            className="px-12 py-6 bg-white text-black rounded-full font-bold text-2xl hover:scale-105 transition-transform"
          >
            {t['scanner.take']}
          </button>
        )}

        {photo && (
          <div className="flex gap-4 w-full max-w-2xl">
            <button
              onClick={() => {
                setPhoto(null);
                startCamera();
              }}
              className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-slate-800 text-white text-xl hover:bg-slate-700 transition-colors"
            >
              <RefreshCw size={28} />
              {t['scanner.repeat']}
            </button>
            <button
              onClick={saveAsPdf}
              disabled={isProcessing}
              className="flex-[2] flex items-center justify-center gap-2 py-4 rounded-2xl bg-emerald-600 text-white text-xl font-bold hover:bg-emerald-500 transition-colors disabled:opacity-50"
            >
              <FileDown size={28} />
              {isProcessing ? t['scanner.saving'] : t['scanner.save']}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}