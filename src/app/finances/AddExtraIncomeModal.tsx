import { useState } from "react";
import { Plus, X } from "lucide-react";
import { addExtraIncome } from "@/lib/api";
import { getCurrentFeeYear } from "@/lib/fee-year";

export function AddExtraIncomeModal({
  isOpen,
  onClose,
  branch,
  month,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  branch: string;
  month: number;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const feeYear = getCurrentFeeYear();

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !amount) {
      setError("Title and Amount are required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await addExtraIncome(branch, month, title, Number(amount), description, feeYear);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add extra income.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden relative">
        <div className="p-5 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-lg text-white font-medium">Add Extra Income</h2>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">{error}</div>}

          <div>
            <label className="block text-xs text-zinc-400 uppercase tracking-wider mb-2">Title / Reason</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50"
              placeholder="e.g. Summer Camp Fees"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 uppercase tracking-wider mb-2">Amount (₹)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 font-[family-name:var(--font-space)]"
              placeholder="500"
              min="1"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 uppercase tracking-wider mb-2">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 min-h-[80px]"
              placeholder="Additional details..."
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-3 rounded-lg flex items-center justify-center gap-2"
          >
            {loading ? <div className="spinner w-5 h-5" /> : <Plus className="w-5 h-5" />}
            {loading ? "Adding..." : "Add Income"}
          </button>
        </form>
      </div>
    </div>
  );
}
