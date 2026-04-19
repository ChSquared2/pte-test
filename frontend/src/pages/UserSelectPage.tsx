import { useUser, USER_LABELS } from '../context/UserContext';
import type { UserId } from '../context/UserContext';

export default function UserSelectPage() {
  const { setCurrentUser } = useUser();

  const pick = (u: UserId) => setCurrentUser(u);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#003057] to-[#0072CE] flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-2">PTE Academic Simulator</h1>
          <p className="text-lg text-gray-200">Who's practicing today?</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {(['nicole', 'asly', 'ch'] as UserId[]).map((u) => (
            <button
              key={u}
              onClick={() => pick(u)}
              className="bg-white hover:bg-[#F2A900] hover:text-[#003057] text-[#003057] rounded-2xl p-8 shadow-xl transition-all transform hover:scale-105 border-4 border-transparent hover:border-[#F2A900]"
            >
              <div className="text-6xl mb-4">{u === 'nicole' ? '💖' : u === 'asly' ? '🌟' : '🚀'}</div>
              <div className="text-2xl font-bold">{USER_LABELS[u]}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
