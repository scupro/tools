import React, { useState, useEffect } from 'react';
import { useAppConfig } from '../../utils/useAppConfig';
import { i18n } from '../../utils/i18n';
import { VolumeX, ArrowLeft, Play, Square, Pause } from 'lucide-react';

const SPEECH_LANG: Record<'ES' | 'EN' | 'ZH', string> = {
  ES: 'es-ES',
  EN: 'en-US',
  ZH: 'zh-TW',
};

export function TextReader({ onBack }: { onBack: () => void }) {
  const { lang } = useAppConfig();
  const dict = i18n[lang];
  const t = dict.s;

  const [text, setText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      setSupported(false);
    }

    return () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  const handlePlay = () => {
    if (!text.trim()) return;

    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsSpeaking(true);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = SPEECH_LANG[lang];
    utterance.rate = 0.9;

    const reset = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };
    utterance.onend = reset;
    utterance.onerror = reset;

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    window.speechSynthesis.pause();
    setIsPaused(true);
    setIsSpeaking(false);
  };

  const handleStop = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  };

  if (!supported) {
    return (
      <div className="bg-[#0f172a]/60 border border-slate-800 rounded-3xl p-8 text-center">
        <VolumeX size={64} className="mx-auto text-rose-500 mb-6" />
        <h2 className="text-3xl font-serif text-slate-100 mb-4">{dict.tools.reader.name}</h2>
        <p className="text-xl text-slate-400 mb-8">{t['reader.unsupported']}</p>
        <button onClick={onBack} className="px-8 py-4 rounded-2xl bg-slate-800 text-white text-xl">
          {t['common.back']}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#0f172a]/60 border border-slate-800 rounded-3xl p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-serif text-slate-100 mb-2">{t['reader.title']}</h2>
          <p className="text-slate-400 text-lg">{dict.tools.reader.desc}</p>
        </div>
        <button
          onClick={() => {
            handleStop();
            onBack();
          }}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors text-lg"
        >
          <ArrowLeft size={24} />{t['common.back']}
        </button>
      </div>

      <div className="flex flex-col gap-6">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t['reader.placeholder']}
          className="w-full h-64 p-6 bg-slate-900 border border-slate-700 rounded-2xl text-2xl text-slate-200 placeholder-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-sky-500 custom-scrollbar"
        />

        <div className="flex gap-4">
          {!isSpeaking && !isPaused ? (
            <button
              onClick={handlePlay}
              disabled={!text.trim()}
              className="flex-1 flex items-center justify-center gap-3 py-6 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white text-2xl font-bold transition-colors disabled:opacity-50"
            >
              <Play size={32} />
              {t['reader.listen']}
            </button>
          ) : (
            <>
              {isSpeaking ? (
                <button
                  onClick={handlePause}
                  className="flex-1 flex items-center justify-center gap-3 py-6 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white text-2xl font-bold transition-colors"
                >
                  <Pause size={32} />
                  {t['reader.pause']}
                </button>
              ) : (
                <button
                  onClick={handlePlay}
                  className="flex-1 flex items-center justify-center gap-3 py-6 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white text-2xl font-bold transition-colors"
                >
                  <Play size={32} />
                  {t['reader.resume']}
                </button>
              )}
              <button
                onClick={handleStop}
                className="flex-1 flex items-center justify-center gap-3 py-6 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-2xl font-bold transition-colors max-w-[200px]"
              >
                <Square size={32} />
                {t['reader.stop']}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}