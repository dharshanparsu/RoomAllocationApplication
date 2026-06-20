import { Settings2 } from 'lucide-react';

export function ConfigNeeded() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <Settings2 className="w-14 h-14 text-orange-500 mb-5" />
      <h1 className="text-xl font-bold text-gray-900 mb-2.5">Setup needed</h1>
      <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
        Add your Supabase <strong>anon key</strong> to the{' '}
        <code className="px-1 py-0.5 bg-gray-100 rounded">.env</code> file as{' '}
        <code className="px-1 py-0.5 bg-gray-100 rounded">
          VITE_SUPABASE_ANON_KEY
        </code>
        , then restart the dev server.
      </p>
    </div>
  );
}
