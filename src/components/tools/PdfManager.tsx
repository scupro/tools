import React, { useState, useRef } from 'react';
import { useAppConfig } from '../../utils/useAppConfig';
import { i18n, fmt } from '../../utils/i18n';
import { Card, Button } from '../ui';
import { FileDown, FilePlus, ArrowLeft, FileText, Trash2 } from 'lucide-react';
import { mergePdfs } from '../../utils/pdf';
import { downloadBlob } from '../../utils/image';

export function PdfManager({ onBack }: { onBack: () => void }) {
  const { lang } = useAppConfig();
  const dict = i18n[lang];
  const t = dict.s;

  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
    // Allow picking the same file again later.
    e.target.value = '';
  };

  const removeFile = (index: number) => setFiles((prev) => prev.filter((_, i) => i !== index));

  const handleProcess = async () => {
    if (files.length < 2) {
      alert(t['pdf.needTwo']);
      return;
    }

    setIsProcessing(true);
    try {
      const resultBlob = await mergePdfs(files);
      downloadBlob(resultBlob, 'merged.pdf');
      setFiles([]);
    } catch (error) {
      console.error(error);
      alert(t['pdf.error']);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white text-lg">
        <ArrowLeft /> {t['common.back']}
      </button>

      <div>
        <h2 className="text-4xl font-serif text-slate-100 mb-4 flex items-center gap-3">
          <FileText className="text-sky-400" size={40} /> {dict.tools.pdf.name}
        </h2>
        <p className="text-xl text-slate-400">{t['pdf.intro']}</p>
      </div>

      <Card className="flex flex-col min-h-[500px] p-8">
        <div className="flex gap-4 mb-8">
          <Button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 h-20 text-2xl rounded-2xl bg-sky-600 hover:bg-sky-500 shadow-xl shadow-sky-900/20"
          >
            <FilePlus size={32} className="mr-3" /> {t['pdf.add']}
          </Button>

          <Button
            onClick={handleProcess}
            disabled={isProcessing || files.length < 2}
            className="flex-1 h-20 text-2xl rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 shadow-xl"
          >
            <FileDown size={32} className="mr-3" /> {isProcessing ? t['pdf.merging'] : t['pdf.merge']}
          </Button>
        </div>

        <input type="file" ref={fileInputRef} className="hidden" accept="application/pdf" multiple onChange={handleFileChange} />

        <div className="bg-slate-900/50 rounded-3xl p-6 flex-1 border border-slate-800">
          <h3 className="text-2xl text-slate-300 mb-4">{fmt(t['pdf.added'], { n: files.length })}</h3>

          {files.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-slate-500">
              <FileText size={48} className="mb-4 opacity-50" />
              <p className="text-xl">{t['pdf.empty']}</p>
              <p className="text-lg">{t['pdf.emptyHint']}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {files.map((file, idx) => (
                <div key={`${file.name}-${idx}`} className="flex items-center justify-between p-4 bg-[#0a0d14] border border-slate-800 rounded-xl text-lg">
                  <span className="text-slate-200 truncate">{idx + 1}. {file.name}</span>
                  <button onClick={() => removeFile(idx)} className="text-red-400 hover:text-red-300 p-2" aria-label={t['common.delete']}>
                    <Trash2 size={24} />
                  </button>
                </div>
              ))}

              {files.length === 1 && (
                <p className="text-sky-400 text-lg mt-4 text-center">{t['pdf.oneMore']}</p>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}