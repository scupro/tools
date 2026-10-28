import React, { useState, useRef, useEffect } from 'react';
import { useAppConfig } from '../../utils/useAppConfig';
import { i18n } from '../../utils/i18n';
import { ArrowLeft, ZoomIn, ZoomOut, Upload } from 'lucide-react';

export function Magnifier({ onBack }: { onBack: () => void }) {
  const { lang } = useAppConfig();
  const dict = i18n[lang];
  const t = dict.s;

  const [image, setImage] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (image) URL.revokeObjectURL(image);
    };
  }, [image]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (image) URL.revokeObjectURL(image);
    setImage(URL.createObjectURL(file));
    setZoom(1);
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.5, 5));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.5, 0.5));

  const chooseAnother = () => {
    if (image) URL.revokeObjectURL(image);
    setImage(null);
    setZoom(1);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="bg-[#0f172a]/60 border border-slate-800 rounded-3xl p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-serif text-slate-100 mb-2">{dict.tools.magnifier.name}</h2>
          <p className="text-slate-400 text-lg">{dict.tools.magnifier.desc}</p>
        </div>
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors text-lg"
        >
          <ArrowLeft size={24} />{t['common.back']}
        </button>
      </div>

      {!image ? (
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-700 rounded-2xl bg-slate-800/20">
          <Upload size={64} className="text-sky-500 mb-6" />
          <p className="text-2xl text-slate-300 font-medium mb-6 text-center">{t['magnifier.intro']}</p>
          <input type="file" accept="image/*" onChange={handleImageUpload} ref={fileInputRef} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-10 py-5 bg-sky-600 hover:bg-sky-500 text-white rounded-full text-2xl font-bold transition-colors"
          >
            {t['magnifier.choose']}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex justify-center gap-4">
            <button
              onClick={handleZoomOut}
              className="flex items-center gap-2 px-8 py-4 bg-slate-700 hover:bg-slate-600 text-white rounded-2xl text-xl font-bold transition-colors"
            >
              <ZoomOut size={32} />
              {t['magnifier.out']}
            </button>
            <button
              onClick={handleZoomIn}
              className="flex items-center gap-2 px-8 py-4 bg-sky-600 hover:bg-sky-500 text-white rounded-2xl text-xl font-bold transition-colors"
            >
              <ZoomIn size={32} />
              {t['magnifier.in']}
            </button>
          </div>

          <div className="relative w-full h-[60vh] overflow-auto bg-black rounded-2xl border border-slate-700 p-4 custom-scrollbar flex items-center justify-center">
            <img
              src={image}
              alt={t['magnifier.alt']}
              style={{ transform: `scale(${zoom})`, transformOrigin: 'center center', transition: 'transform 0.2s ease-out' }}
              className="max-w-none cursor-move"
            />
          </div>

          <button onClick={chooseAnother} className="w-full py-4 text-slate-400 hover:text-white text-xl transition-colors mt-4">
            {t['magnifier.another']}
          </button>
        </div>
      )}
    </div>
  );
}