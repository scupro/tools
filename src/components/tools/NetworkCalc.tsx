import React, { useState } from 'react';
import { useAppConfig } from '../../utils/useAppConfig';
import { i18n } from '../../utils/i18n';
import { Card, Button, Label } from '../ui';
import { ArrowLeft } from 'lucide-react';

interface NetworkResult {
  network: string;
  mask: string;
  wildcard: string;
  broadcast: string;
  firstHost: string;
  lastHost: string;
  usableHosts: number;
  totalHosts: number;
}

export function NetworkCalc({ onBack }: { onBack: () => void }) {
  const { lang } = useAppConfig();
  const dict = i18n[lang];
  const t = dict.s;

  const [ipInput, setIpInput] = useState('192.168.1.0/24');
  const [result, setResult] = useState<NetworkResult | null>(null);
  const [error, setError] = useState('');

  const calculateSubnet = () => {
    try {
      setError('');
      const [ip, cidrStr] = ipInput.trim().split('/');
      if (!ip || !cidrStr) throw new Error(t['network.invalidFormat']);

      const cidr = parseInt(cidrStr, 10);
      if (Number.isNaN(cidr) || cidr < 0 || cidr > 32) throw new Error(t['network.invalidCidr']);

      const ipParts = ip.split('.').map(Number);
      if (
        ipParts.length !== 4 ||
        ipParts.some((p) => Number.isNaN(p) || p < 0 || p > 255)
      ) {
        throw new Error(t['network.invalidIp']);
      }

      const ipNum =
        ((ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3]) >>> 0;
      const maskNum = cidr === 0 ? 0 : (0xffffffff << (32 - cidr)) >>> 0;

      const networkNum = (ipNum & maskNum) >>> 0;
      const broadcastNum = (networkNum | ~maskNum) >>> 0;

      const numToIp = (num: number) =>
        [(num >>> 24) & 255, (num >>> 16) & 255, (num >>> 8) & 255, num & 255].join('.');

      const usableHosts = cidr >= 31 ? 0 : Math.pow(2, 32 - cidr) - 2;
      const totalHosts = Math.pow(2, 32 - cidr);

      const firstHost = cidr >= 31 ? 'N/A' : numToIp(networkNum + 1);
      const lastHost = cidr >= 31 ? 'N/A' : numToIp(broadcastNum - 1);

      setResult({
        mask: numToIp(maskNum),
        wildcard: numToIp(~maskNum),
        network: numToIp(networkNum),
        broadcast: numToIp(broadcastNum),
        usableHosts,
        totalHosts,
        firstHost,
        lastHost,
      });
    } catch (e: unknown) {
      setResult(null);
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const cells: { label: string; value: string; accent?: boolean }[] = result
    ? [
        { label: t['network.network'], value: result.network },
        { label: t['network.netmask'], value: result.mask },
        { label: t['network.wildcard'], value: result.wildcard },
        { label: t['network.broadcast'], value: result.broadcast },
        { label: t['network.first'], value: result.firstHost, accent: true },
        { label: t['network.last'], value: result.lastHost, accent: true },
      ]
    : [];

  return (
    <div className="space-y-6 bg-[#0a0e17] border border-slate-800 rounded-2xl p-6 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">{dict.tools.network.name}</h2>
          <p className="text-slate-400">{dict.tools.network.desc}</p>
        </div>
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors text-sm font-medium whitespace-nowrap"
        >
          <ArrowLeft size={18} />{t['common.back']}
        </button>
      </div>

      <Card className="bg-slate-900/40 border-slate-800">
        <div className="max-w-md space-y-4">
          <Label>{t['network.input']}</Label>
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 bg-[#0a0e17] border border-slate-800 rounded-lg p-3 text-sm font-mono text-slate-300 focus:outline-none focus:border-blue-500"
              value={ipInput}
              onChange={(e) => setIpInput(e.target.value)}
              placeholder="192.168.1.0/24"
              onKeyDown={(e) => e.key === 'Enter' && calculateSubnet()}
            />
            <Button onClick={calculateSubnet} className="bg-blue-600 hover:bg-blue-500 shrink-0">
              {t['network.calculate']}
            </Button>
          </div>
          {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
        </div>

        {result && (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {cells.map((cell) => (
              <div key={cell.label} className="bg-[#0a0e17] border border-slate-800 p-4 rounded-xl">
                <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">{cell.label}</span>
                <p className={`font-mono text-lg mt-1 ${cell.accent ? 'text-blue-400' : 'text-white'}`}>{cell.value}</p>
              </div>
            ))}
            <div className="bg-[#0a0e17] border border-slate-800 p-4 rounded-xl sm:col-span-2">
              <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">{t['network.hosts']}</span>
              <p className="font-mono text-lg text-white mt-1">{result.usableHosts} / {result.totalHosts}</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}