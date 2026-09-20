import { AlertTriangle } from 'lucide-react';

export default function SetupScreen() {
  return (
    <div className="h-screen flex items-center justify-center bg-slate-50 px-6">
      <div className="max-w-sm w-full bg-white rounded-2xl border border-slate-200 p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-3">
          <AlertTriangle size={22} className="text-amber-500" />
        </div>
        <h1 className="text-lg font-bold text-slate-900">Firebase isn't configured yet</h1>
        <p className="text-sm text-slate-500 mt-2">
          Copy <code className="bg-slate-100 px-1 py-0.5 rounded text-xs">.env.example</code> to{' '}
          <code className="bg-slate-100 px-1 py-0.5 rounded text-xs">.env</code> and fill in your
          Firebase web app config (Project settings → General → Your apps), then restart the dev
          server.
        </p>
      </div>
    </div>
  );
}
