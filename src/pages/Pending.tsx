import { Clock, LogOut, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function Pending() {
  const { user, signOut, refreshProfile } = useAuth();

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gradient-to-b from-blue-50/60 to-white">
      <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mb-6">
        <Clock className="w-10 h-10 text-blue-600" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-3 tracking-tight">Awaiting Approval</h1>
      <p className="text-[15px] text-gray-500 leading-relaxed max-w-xs">
        You're signed in as <strong className="text-gray-700">{user?.email}</strong>.
        <br />
        <br />
        An admin needs to approve your account and assign you rooms before you
        can access anything.
      </p>

      <div className="mt-8 w-full max-w-xs flex flex-col gap-2.5">
        <button
          onClick={refreshProfile}
          className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-2xl font-semibold shadow-sm shadow-blue-600/20 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Check again
        </button>
        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-gray-100 hover:bg-gray-200 active:scale-[0.98] text-gray-700 rounded-2xl font-semibold transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}
