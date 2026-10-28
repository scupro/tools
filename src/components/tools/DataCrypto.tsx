import React, { useState } from 'react';
import { useAppConfig } from '../../utils/useAppConfig';
import { i18n } from '../../utils/i18n';
import { Card, Button, Label } from '../ui';
import { Hash, Binary, Copy, ArrowLeft, KeySquare, Shield } from 'lucide-react';
import { encodeBase64, decodeBase64, calculateHash, encodeFileBase64 } from '../../utils/crypto';

type CryptoError = { message: string };

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String((e as CryptoError)?.message ?? e);
}

/** JWT uses base64url without padding. */
function decodeBase64Url(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  return decodeBase64(padded);
}

export function DataCrypto({ onBack }: { onBack: () => void }) {
  const { lang } = useAppConfig();
  const dict = i18n[lang];
  const t = dict.s;

  const [activeTab, setActiveTab] = useState<'passphrase' | 'base64' | 'jwt' | 'hash'>('passphrase');

  // Base64 state
  const [b64Input, setB64Input] = useState('');
  const [b64Output, setB64Output] = useState('');
  const [b64Mode, setB64Mode] = useState<'encode' | 'decode'>('encode');

  // Hash state
  const [hashInputText, setHashInputText] = useState('');
  const [hashInputFile, setHashInputFile] = useState<File | null>(null);
  const [hashOutput, setHashOutput] = useState('');
  const [hashAlgo, setHashAlgo] = useState<'SHA-256' | 'SHA-512' | 'MD5'>('SHA-256');

  // JWT state
  const [jwtInput, setJwtInput] = useState('');
  const [jwtHeader, setJwtHeader] = useState('');
  const [jwtPayload, setJwtPayload] = useState('');

  // Password state
  const [password, setPassword] = useState('');
  const [passLength, setPassLength] = useState(16);
  const [useUpper, setUseUpper] = useState(true);
  const [useNumbers, setUseNumbers] = useState(true);
  const [useSymbols, setUseSymbols] = useState(true);

  const handleBase64 = () => {
    try {
      setB64Output(b64Mode === 'encode' ? encodeBase64(b64Input) : decodeBase64(b64Input));
    } catch (e: unknown) {
      setB64Output(`${t['common.error']}: ${errorMessage(e)}`);
    }
  };

  const handleBase64File = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const b64 = await encodeFileBase64(file);
      setB64Output(b64);
      setB64Input(`[File: ${file.name}]`);
    } catch (e: unknown) {
      setB64Output(`${t['common.error']}: ${errorMessage(e)}`);
    }
  };

  const handleHash = async () => {
    try {
      const input = hashInputFile || hashInputText;
      if (!input) return;
      setHashOutput(await calculateHash(input, hashAlgo));
    } catch (e: unknown) {
      setHashOutput(`${t['common.error']}: ${errorMessage(e)}`);
    }
  };

  const handleJwtDecode = () => {
    try {
      const parts = jwtInput.trim().split('.');
      if (parts.length !== 3) throw new Error(t['crypto.invalidJwt']);
      setJwtHeader(JSON.stringify(JSON.parse(decodeBase64Url(parts[0])), null, 2));
      setJwtPayload(JSON.stringify(JSON.parse(decodeBase64Url(parts[1])), null, 2));
    } catch (e: unknown) {
      setJwtHeader(t['common.error']);
      setJwtPayload(`${t['common.error']}: ${errorMessage(e)}`);
    }
  };

  const generatePassword = () => {
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const nums = '0123456789';
    const syms = '!@#$%^&*()_+~`|}{[]:;?><,./-=';

    let chars = lower;
    if (useUpper) chars += upper;
    if (useNumbers) chars += nums;
    if (useSymbols) chars += syms;

    const array = new Uint32Array(passLength);
    window.crypto.getRandomValues(array);

    let result = '';
    for (let i = 0; i < passLength; i++) {
      result += chars[array[i] % chars.length];
    }
    setPassword(result);
  };

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
  };

  const tabs = [
    { id: 'passphrase' as const, label: t['crypto.tab.pass'], icon: KeySquare },
    { id: 'hash' as const, label: t['crypto.tab.hash'], icon: Hash },
    { id: 'jwt' as const, label: t['crypto.tab.jwt'], icon: Shield },
    { id: 'base64' as const, label: t['crypto.tab.base64'], icon: Binary },
  ];

  return (
    <div className="space-y-6 bg-[#0b1329] border border-slate-800 rounded-2xl p-6 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">{dict.tools.crypto.name}</h2>
          <p className="text-slate-400">{dict.tools.crypto.desc}</p>
        </div>
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors text-sm font-medium whitespace-nowrap"
        >
          <ArrowLeft size={18} />{t['common.back']}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 p-1 bg-slate-900/50 rounded-lg w-fit border border-slate-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      <Card className="bg-slate-900/40 border-slate-800">
        {activeTab === 'passphrase' && (
          <div className="space-y-6 max-w-2xl">
            <div className="flex flex-col gap-4">
              <Label>{t['crypto.pass.length']}</Label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="8"
                  max="64"
                  value={passLength}
                  onChange={(e) => setPassLength(parseInt(e.target.value))}
                  className="w-full accent-blue-500"
                />
                <span className="text-slate-400 text-sm font-mono w-12">{passLength}</span>
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input type="checkbox" checked={useUpper} onChange={(e) => setUseUpper(e.target.checked)} className="accent-blue-500" />
                  {t['crypto.pass.upper']}
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input type="checkbox" checked={useNumbers} onChange={(e) => setUseNumbers(e.target.checked)} className="accent-blue-500" />
                  {t['crypto.pass.numbers']}
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input type="checkbox" checked={useSymbols} onChange={(e) => setUseSymbols(e.target.checked)} className="accent-blue-500" />
                  {t['crypto.pass.symbols']}
                </label>
              </div>

              <Button onClick={generatePassword} className="w-full bg-blue-600 hover:bg-blue-500">{t['crypto.pass.generate']}</Button>
            </div>
            {password && (
              <div className="space-y-2 pt-4 border-t border-slate-800">
                <div className="flex justify-between items-center">
                  <Label>{t['crypto.pass.generated']}</Label>
                  <button className="text-slate-400 hover:text-slate-200" onClick={() => copyToClipboard(password)} title={t['common.copy']}>
                    <Copy size={16} />
                  </button>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-6 font-mono text-xl text-blue-400 text-center tracking-wider break-all">
                  {password}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'jwt' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <Label>{t['crypto.jwt.input']}</Label>
              <textarea
                className="w-full h-[320px] bg-[#0b1329] border border-slate-800 rounded-lg p-3 text-sm font-mono text-slate-300 focus:outline-none focus:border-blue-500 custom-scrollbar break-all"
                value={jwtInput}
                onChange={(e) => setJwtInput(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              />
              <Button onClick={handleJwtDecode} className="w-full bg-blue-600 hover:bg-blue-500 mt-2">{t['crypto.jwt.decode']}</Button>
            </div>
            <div className="flex flex-col gap-4">
              <div className="space-y-2">
                <Label>{t['crypto.jwt.header']}</Label>
                <textarea
                  className="w-full h-24 bg-[#0b1329] border border-slate-800 rounded-lg p-3 text-sm font-mono text-slate-300 focus:outline-none custom-scrollbar"
                  value={jwtHeader}
                  readOnly
                />
              </div>
              <div className="space-y-2 flex-1 flex flex-col">
                <Label>{t['crypto.jwt.payload']}</Label>
                <textarea
                  className="w-full flex-1 bg-[#0b1329] border border-slate-800 rounded-lg p-3 text-sm font-mono text-slate-300 focus:outline-none custom-scrollbar min-h-[160px]"
                  value={jwtPayload}
                  readOnly
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'base64' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-4">
              <div className="flex gap-2 p-1 bg-slate-900/80 rounded-lg w-fit border border-slate-800">
                <button
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${b64Mode === 'encode' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
                  onClick={() => setB64Mode('encode')}
                >
                  {t['crypto.b64.encode']}
                </button>
                <button
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${b64Mode === 'decode' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
                  onClick={() => setB64Mode('decode')}
                >
                  {t['crypto.b64.decode']}
                </button>
              </div>

              <div className="space-y-2">
                <Label>{t['crypto.b64.input']}</Label>
                <textarea
                  className="w-full h-32 bg-[#0b1329] border border-slate-800 rounded-lg p-3 text-sm font-mono text-slate-300 focus:outline-none focus:border-blue-500 custom-scrollbar"
                  value={b64Input}
                  onChange={(e) => setB64Input(e.target.value)}
                />
              </div>

              {b64Mode === 'encode' && (
                <div className="space-y-2">
                  <Label>{t['crypto.b64.orFile']}</Label>
                  <input
                    type="file"
                    onChange={handleBase64File}
                    className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-900/30 file:text-blue-400 hover:file:bg-blue-900/50"
                  />
                </div>
              )}

              <Button onClick={handleBase64} className="bg-blue-600 hover:bg-blue-500">{t['crypto.b64.process']}</Button>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <Label>{t['crypto.b64.output']}</Label>
                <button className="text-slate-400 hover:text-slate-200" onClick={() => copyToClipboard(b64Output)} title={t['common.copy']}>
                  <Copy size={16} />
                </button>
              </div>
              <textarea
                className="w-full h-[280px] bg-[#0b1329] border border-slate-800 rounded-lg p-3 text-sm font-mono text-slate-300 focus:outline-none custom-scrollbar break-all"
                value={b64Output}
                readOnly
              />
            </div>
          </div>
        )}

        {activeTab === 'hash' && (
          <div className="space-y-6 max-w-2xl">
            <div className="flex gap-4">
              <div className="flex-1">
                <Label>{t['crypto.hash.algo']}</Label>
                <select
                  className="w-full bg-[#0b1329] border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  value={hashAlgo}
                  onChange={(e) => setHashAlgo(e.target.value as 'SHA-256' | 'SHA-512' | 'MD5')}
                >
                  <option value="SHA-256">SHA-256</option>
                  <option value="SHA-512">SHA-512</option>
                  <option value="MD5">MD5</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t['crypto.hash.input']}</Label>
                <textarea
                  className="w-full h-24 bg-[#0b1329] border border-slate-800 rounded-lg p-3 text-sm font-mono text-slate-300 focus:outline-none focus:border-blue-500 custom-scrollbar"
                  value={hashInputText}
                  onChange={(e) => {
                    setHashInputText(e.target.value);
                    setHashInputFile(null);
                  }}
                  disabled={!!hashInputFile}
                />
              </div>

              <div className="space-y-2">
                <Label>{t['crypto.hash.orFile']}</Label>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setHashInputFile(e.target.files[0]);
                        setHashInputText('');
                      }
                    }}
                    className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-900/30 file:text-blue-400 hover:file:bg-blue-900/50"
                  />
                  {hashInputFile && (
                    <button className="text-sm text-red-400 hover:text-red-300 shrink-0" onClick={() => setHashInputFile(null)}>
                      {t['crypto.hash.clearFile']}
                    </button>
                  )}
                </div>
              </div>

              <Button onClick={handleHash} className="w-full bg-blue-600 hover:bg-blue-500">{t['crypto.hash.generate']}</Button>
            </div>

            <div className="space-y-2 pt-4 border-t border-slate-800">
              <div className="flex justify-between items-center">
                <Label>{t['crypto.hash.output']}</Label>
                <button className="text-slate-400 hover:text-slate-200" onClick={() => copyToClipboard(hashOutput)} title={t['common.copy']}>
                  <Copy size={16} />
                </button>
              </div>
              <div className="bg-[#0b1329] border border-slate-800 rounded-lg p-4 font-mono text-sm text-blue-400 break-all min-h-[60px] flex items-center">
                {hashOutput || t['crypto.hash.placeholder']}
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}