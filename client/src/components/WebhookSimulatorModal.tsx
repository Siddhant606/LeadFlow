import React, { useState } from 'react';
import { Modal } from './Modal';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Send, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface WebhookSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WebhookSimulatorModal: React.FC<WebhookSimulatorModalProps> = ({ isOpen, onClose }) => {
  const { brokerage } = useAuth();

  const [externalId, setExternalId] = useState(`EXT-${Math.floor(1000 + Math.random() * 9000)}`);
  const [name, setName] = useState('Markus Hoffmann');
  const [email, setEmail] = useState('markus.hoffmann@gmx.de');
  const [phone, setPhone] = useState('0176 / 4433221');
  const [source, setSource] = useState('ImmoScout24');
  const [loanAmount, setLoanAmount] = useState('480000');
  const [city, setCity] = useState('Hamburg');

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await axios.post(
        '/api/webhooks/leads',
        {
          externalId,
          name,
          email,
          phone,
          source,
          metadata: {
            loanAmount: Number(loanAmount),
            city,
          },
        },
        {
          headers: {
            'x-api-key': brokerage?.apiKey || 'lf_hypotech_berlin_key_123',
          },
        }
      );

      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Webhook request failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePresetDuplicateWebhook = () => {
    setExternalId('EXT-BER-1001'); // Known existing externalId from seed
    setName('Hanna Schmidt');
    setEmail('hanna.schmidt@gmail.com');
    setPhone('+491701234567');
  };

  const handlePresetDuplicatePerson = () => {
    setExternalId(`EXT-${Date.now().toString().slice(-4)}`); // Brand new externalId
    setName('Hanna Schmidt (New Lead)');
    setEmail('HANNA.SCHMIDT@GMAIL.COM'); // Same email in uppercase to test normalization!
    setPhone('0170 123 4567'); // Same phone in German format
  };

  const generateNewExternalId = () => {
    setExternalId(`EXT-${Math.floor(1000 + Math.random() * 9000)}`);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="External Lead Webhook Simulator" maxWidth="lg">
      <div className="space-y-4">
        <p className="text-xs text-slate-500">
          Simulate incoming mortgage leads from external German portals (ImmoScout24, Check24, Interhyp)
          to verify API key authentication, normalization, deduplication, and live Socket.IO pipeline updates.
        </p>

        {/* Quick Test Presets */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handlePresetDuplicateWebhook}
            className="px-2.5 py-1 text-xs bg-amber-50 text-amber-800 rounded border border-amber-200 hover:bg-amber-100"
          >
            Preset: Duplicate ExternalId (Idempotency)
          </button>
          <button
            type="button"
            onClick={handlePresetDuplicatePerson}
            className="px-2.5 py-1 text-xs bg-purple-50 text-purple-800 rounded border border-purple-200 hover:bg-purple-100"
          >
            Preset: Existing Person (Duplicate Email/Phone)
          </button>
          <button
            type="button"
            onClick={generateNewExternalId}
            className="px-2.5 py-1 text-xs bg-slate-100 text-slate-700 rounded border border-slate-200 hover:bg-slate-200 flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> New ExternalId
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                externalId (Idempotency Key)
              </label>
              <input
                type="text"
                value={externalId}
                onChange={(e) => setExternalId(e.target.value)}
                required
                className="w-full text-xs px-3 py-2 border rounded-md focus:ring-1 focus:ring-primary-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Source Portal</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full text-xs px-3 py-2 border rounded-md focus:ring-1 focus:ring-primary-500"
              >
                <option value="ImmoScout24">ImmoScout24</option>
                <option value="Check24">Check24</option>
                <option value="Interhyp">Interhyp</option>
                <option value="Dr. Klein">Dr. Klein</option>
                <option value="Google Ads">Google Ads</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full text-xs px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full text-xs px-3 py-2 border rounded-md"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full text-xs px-3 py-2 border rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Loan Amount (€)</label>
              <input
                type="number"
                value={loanAmount}
                onChange={(e) => setLoanAmount(e.target.value)}
                className="w-full text-xs px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Property City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full text-xs px-3 py-2 border rounded-md"
              />
            </div>
          </div>

          <div className="p-2 bg-slate-50 border rounded text-[11px] text-slate-600 font-mono">
            Auth Header: x-api-key: {brokerage?.apiKey || 'lf_hypotech_berlin_key_123'}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium text-sm rounded-md transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
          >
            {isLoading ? (
              <span>Sending webhook...</span>
            ) : (
              <>
                <Send className="w-4 h-4" /> POST /api/webhooks/leads
              </>
            )}
          </button>
        </form>

        {/* Response Feedback */}
        {result && (
          <div
            className={`p-3 rounded-lg border text-xs space-y-1 ${
              result.deduplicated
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}
          >
            <div className="flex items-center gap-1.5 font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>{result.message}</span>
            </div>
            <div className="font-mono text-[11px] mt-1">
              <div>Deduplicated: {result.deduplicated ? 'YES (Idempotent 200)' : 'NO (Created 201)'}</div>
              <div>Duplicate Person Detected: {result.duplicatePersonDetected ? 'YES ⚠️' : 'NO'}</div>
              <div>Lead ID: {result.data?._id}</div>
              <div>Normalized Email: {result.data?.email}</div>
              <div>Normalized Phone: {result.data?.phone}</div>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </Modal>
  );
};
