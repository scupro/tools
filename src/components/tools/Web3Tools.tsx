import React, { useState } from 'react';
import { useAppConfig } from '../../utils/useAppConfig';
import { i18n, fmt } from '../../utils/i18n';
import { ArrowLeft } from 'lucide-react';
import { keccak256 } from 'js-sha3';
import bs58 from 'bs58';
import { encodeBase64 } from '../../utils/crypto';

type Tab = 'hash' | 'unit' | 'sig' | 'encode';

function formatUnits(value: bigint, decimals: number): string {
  const raw = value.toString().padStart(decimals + 1, '0');
  const int = raw.slice(0, -decimals);
  const frac = raw.slice(-decimals).replace(/0+$/, '');
  return frac ? `${int}.${frac}` : int;
}

export function Web3Tools({ onBack }: { onBack: () => void }) {
  const { lang } = useAppConfig();
  const dict = i18n[lang];
  const t = dict.s;

  const [activeTab, setActiveTab] = useState<Tab>('hash');

  const [hashInput, setHashInput] = useState('');
  const [keccakOut, setKeccakOut] = useState('');

  const [wei, setWei] = useState('');
  const [gwei, setGwei] = useState('');
  const [ether, setEther] = useState('');

  const [encInput, setEncInput] = useState('');
  const [decFormat, setDecFormat] = useState<'hex' | 'base64'>('hex');
  const [encOutput, setEncOutput] = useState('');

  const [addrInput, setAddrInput] = useState('');
  const [addrType, setAddrType] = useState('');

  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleHash = () => {
    try {
      let bytes: Uint8Array | string = hashInput;
      if (hashInput.startsWith('0x')) {
        const hex = hashInput.slice(2);
        if (!/^[0-9a-fA-F]*$/.test(hex) || hex.length % 2 !== 0) throw new Error(t['web3.error']);
        bytes = new Uint8Array(hex.match(/.{1,2}/g)?.map((b) => parseInt(b, 16)) ?? []);
      }
      setKeccakOut('0x' + keccak256(bytes));
    } catch {
      setKeccakOut(t['web3.error']);
    }
  };

  const updateUnits = (val: string, from: 'wei' | 'gwei' | 'ether') => {
    try {
      if (val === '') {
        setWei('');
        setGwei('');
        setEther('');
        return;
      }

      let weiVal = 0n;
      if (from === 'wei') weiVal = BigInt(val);
      if (from === 'gwei') {
        const [int, frac = ''] = val.split('.');
        weiVal = BigInt(int || '0') * 1000000000n + BigInt(frac.padEnd(9, '0').slice(0, 9) || '0');
      }
      if (from === 'ether') {
        const [int, frac = ''] = val.split('.');
        weiVal = BigInt(int || '0') * 1000000000000000000n + BigInt(frac.padEnd(18, '0').slice(0, 18) || '0');
      }

      setWei(weiVal.toString());
      setGwei(formatUnits(weiVal, 9));
      setEther(formatUnits(weiVal, 18));
    } catch {
      // Ignore partial or invalid input while typing.
    }
  };

  const checkAddress = () => {
    const value = addrInput.trim();
    if (/^0x[0-9a-fA-F]{40}$/.test(value)) {
      setAddrType(t['web3.evmValid']);
      return;
    }
    try {
      const decoded = bs58.decode(value);
      if (decoded.length === 32) {
        setAddrType(t['web3.solValid']);
      } else {
        setAddrType(t['web3.unknown']);
      }
    } catch {
      setAddrType(t['web3.invalid']);
    }
  };

  const handleEncode = () => {
    try {
      setEncOutput(decFormat === 'base64' ? encodeBase64(encInput) : Array.from(new TextEncoder().encode(encInput)).map((b) => b.toString(16).padStart(2, '0')).join(''));
    } catch (e: unknown) {
      setEncOutput(e instanceof Error ? e.message : String(e));
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'hash', label: t['web3.tab.hash'] },
    { id: 'unit', label: t['web3.tab.units'] },
    { id: 'sig', label: t['web3.tab.address'] },
    { id: 'encode', label: t['web3.tab.encode'] },
  ];

  return (
    <div className="space-y-6 bg-[#0a0e17] border border-slate-800 rounded-2xl p-6 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">{dict.tools.web3.name}</h2>
          <p className="text-slate-400">{dict.tools.web3.desc}</p>
        </div>
        <button onClick={onBack} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors text-sm font-medium">
          <ArrowLeft size={18} />{t['common.back']}
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6">
        {activeTab === 'hash' && (
          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-300 mb-1">{t['web3.input']}</label>
            <input
              type="text"
              className="w-full bg-[#0a0e17] border border-slate-800 rounded-lg p-3 text-sm font-mono text-slate-300"
              value={hashInput}
              onChange={(e) => setHashInput(e.target.value)}
            />
            <button onClick={handleHash} className="px-4 py-2 rounded-lg font-medium transition-colors text-white text-sm bg-blue-600 hover:bg-blue-500">
              {t['web3.hash']}
            </button>
            {keccakOut && (
              <div
                className="p-4 bg-slate-900/80 border border-slate-800 rounded-lg font-mono text-blue-400 break-all cursor-pointer"
                onClick={() => copyToClipboard(keccakOut)}
                title={t['common.copy']}
              >
                {keccakOut}
              </div>
            )}
          </div>
        )}

        {activeTab === 'unit' && (
          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-300 mb-1">{t['web3.wei']}</label>
            <input
              type="number"
              className="w-full bg-[#0a0e17] border border-slate-800 rounded-lg p-3 text-sm font-mono text-slate-300"
              value={wei}
              onChange={(e) => {
                setWei(e.target.value);
                updateUnits(e.target.value, 'wei');
              }}
            />
            <label className="block text-sm font-medium text-slate-300 mb-1">{t['web3.gwei']}</label>
            <input
              type="number"
              step="any"
              className="w-full bg-[#0a0e17] border border-slate-800 rounded-lg p-3 text-sm font-mono text-slate-300"
              value={gwei}
              onChange={(e) => {
                setGwei(e.target.value);
                updateUnits(e.target.value, 'gwei');
              }}
            />
            <label className="block text-sm font-medium text-slate-300 mb-1">{t['web3.ether']}</label>
            <input
              type="number"
              step="any"
              className="w-full bg-[#0a0e17] border border-slate-800 rounded-lg p-3 text-sm font-mono text-slate-300"
              value={ether}
              onChange={(e) => {
                setEther(e.target.value);
                updateUnits(e.target.value, 'ether');
              }}
            />
          </div>
        )}

        {activeTab === 'sig' && (
          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-300 mb-1">{t['web3.address']}</label>
            <input
              type="text"
              className="w-full bg-[#0a0e17] border border-slate-800 rounded-lg p-3 text-sm font-mono text-slate-300"
              value={addrInput}
              onChange={(e) => setAddrInput(e.target.value)}
            />
            <button onClick={checkAddress} className="px-4 py-2 rounded-lg font-medium transition-colors text-white text-sm bg-blue-600 hover:bg-blue-500">
              {t['web3.validate']}
            </button>
            {addrType && (
              <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-lg font-mono text-blue-400">
                {addrType}
              </div>
            )}
          </div>
        )}

        {activeTab === 'encode' && (
          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-300 mb-1">{t['web3.textInput']}</label>
            <textarea
              className="w-full h-32 bg-[#0a0e17] border border-slate-800 rounded-lg p-3 text-sm font-mono text-slate-300"
              value={encInput}
              onChange={(e) => setEncInput(e.target.value)}
            />
            <div className="flex gap-4">
              <button onClick={handleEncode} className="px-4 py-2 rounded-lg font-medium transition-colors text-white text-sm bg-blue-600 hover:bg-blue-500">
                {fmt(t['web3.encodeTo'], { format: decFormat })}
              </button>
              <select
                className="bg-slate-800 border-slate-700 text-slate-300 rounded px-2"
                value={decFormat}
                onChange={(e) => setDecFormat(e.target.value as 'hex' | 'base64')}
              >
                <option value="hex">Hex</option>
                <option value="base64">Base64</option>
              </select>
            </div>
            {encOutput && (
              <textarea
                className="w-full h-32 bg-[#0a0e17] border border-slate-800 rounded-lg p-3 text-sm font-mono text-blue-400"
                value={encOutput}
                readOnly
              />
            )}
            {copied && <span className="text-green-400 text-xs">{t['common.copied']}</span>}
          </div>
        )}
      </div>
    </div>
  );
}