import React, { useState, useRef, useEffect } from 'react';
import { useAppConfig } from '../../utils/useAppConfig';
import { i18n, fmt } from '../../utils/i18n';
import { Card, Button } from '../ui';
import { Upload, Download, ArrowLeft, Image as ImageIcon } from 'lucide-react';
import { compressImageSmart } from '../../utils/compress';

export function UniversalConverter({ onBack }: { onBack: () => void }) {
  const { lang } = useAppConfig();
  const dict = i18n[lang];
  const t = dict.s;

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [format, setFormat] = useState<'image/jpeg' | 'image/png'>('image/jpeg');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    setFile(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(f));
    setResultBlob(null);
  };

  const reset = () => {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl('');
    setResultBlob(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleProcess = async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      const result = await compressImageSmart(file, format, 0.8);
      setResultBlob(result);
    } catch (error) {
      console.error(error);
      alert(t['converter.error']);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultBlob) return;
    const ext = format === 'image/jpeg' ? 'jpg' : 'png';
    const url = URL.createObjectURL(resultBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `photo.${ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white text-lg">
        <ArrowLeft /> {t['common.back']}
      </button>

      <div>
        <h2 className="text-4xl font-serif text-slate-100 mb-4 flex items-center gap-3">
          <ImageIcon className="text-sky-400" size={40} /> {dict.tools.converter.name}
        </h2>
        <p className="text-xl text-slate-400">{t['converter.intro']}</p>
      </div>

      <Card className="flex flex-col items-center justify-center min-h-[500px] p-8">
        {!file ? (
          <div className="text-center w-full max-w-md">
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-24 text-2xl rounded-2xl bg-sky-600 hover:bg-sky-500 shadow-xl shadow-sky-900/20"
            >
              <Upload size={32} className="mr-3" /> {t['converter.choose']}
            </Button>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center">
            <div className="w-full max-w-lg bg-slate-900/50 rounded-3xl p-4 mb-8 text-center">
              <p className="text-xl text-slate-300 mb-4">
                {fmt(t['converter.chosen'], { name: file.name })}
              </p>

              {!resultBlob ? (
                <div className="space-y-4">
                  <p className="text-lg text-slate-400">{t['converter.formatLabel']}</p>
                  <div className="flex gap-4 justify-center mb-6">
                    <Button
                      variant={format === 'image/jpeg' ? 'primary' : 'outline'}
                      onClick={() => setFormat('image/jpeg')}
                      className="h-16 text-xl px-8 rounded-2xl"
                    >
                      {t['converter.jpg']}
                    </Button>
                    <Button
                      variant={format === 'image/png' ? 'primary' : 'outline'}
                      onClick={() => setFormat('image/png')}
                      className="h-16 text-xl px-8 rounded-2xl"
                    >
                      {t['converter.png']}
                    </Button>
                  </div>

                  <Button
                    onClick={handleProcess}
                    disabled={isProcessing}
                    className="w-full h-16 text-xl rounded-2xl bg-sky-600 hover:bg-sky-500"
                  >
                    {isProcessing ? t['converter.converting'] : t['converter.convert']}
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-emerald-900/20 p-6 rounded-2xl border border-emerald-500/30">
                    <p className="text-2xl text-emerald-400 mb-2">{t['converter.ready']}</p>
                    <p className="text-lg text-slate-300">
                      {fmt(t['converter.size'], {
                        from: (file.size / 1024 / 1024).toFixed(2),
                        to: (resultBlob.size / 1024 / 1024).toFixed(2),
                      })}
                    </p>
                  </div>
                  <Button
                    onClick={handleDownload}
                    className="w-full h-16 text-xl rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    <Download size={24} className="mr-2" /> {t['converter.download']}
                  </Button>
                </div>
              )}

              <Button
                variant="outline"
                className="w-full h-12 text-lg mt-8 border-slate-700 text-slate-400"
                onClick={reset}
              >
                {t['converter.another']}
              </Button>
            </div>
          </div>
        )}
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
      </Card>
    </div>
  );
}