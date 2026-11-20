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
    <div className="fixed inset-[0px] z-50 flex items-center justify-center p-[16px] bg-[color:var(--color-well)] backdrop-blur-sm">
      <div className="bg-[color:var(--color-well)] border border-[color:var(--color-hairline)] rounded-2xl w-full max-w-md overflow-hidden relative">
        <div className="p-[20px] border-b border-[color:var(--color-hairline)] flex items-center justify-between">
          <h2 className="text-lg text-[color:var(--color-text)] font-medium">Add Extra Income</h2>
          <button onClick={onClose} className="p-[8px] text-[color:var(--color-text-dim)] hover:text-[color:var(--color-text)] rounded-lg hover:bg-[color:var(--color-well)]">
            <X className="w-[20px] h-[20px]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-[20px] space-y-[16px]">
          {error && <div className="p-[12px] bg-[color:var(--color-well)] border border-[color:var(--color-hairline-strong)] text-[color:var(--color-text-dim)] rounded-lg text-sm">{error}</div>}

          <div>
            <label className="block text-xs text-[color:var(--color-text-dim)] uppercase tracking-wider mb-[8px]">Title / Reason</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[color:var(--color-well)] border border-[color:var(--color-hairline)] rounded-lg px-[16px] py-[12px] text-[color:var(--color-text)] placeholder:text-[color:var(--color-text-faint)] focus:outline-none focus:border-[color:var(--color-accent-border)]"
              placeholder="e.g. Summer Camp Fees"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-[color:var(--color-text-dim)] uppercase tracking-wider mb-[8px]">Amount (₹)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-[color:var(--color-well)] border border-[color:var(--color-hairline)] rounded-lg px-[16px] py-[12px] text-[color:var(--color-text)] placeholder:text-[color:var(--color-text-faint)] focus:outline-none focus:border-[color:var(--color-accent-border)] font-sans"
              placeholder="500"
              min="1"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-[color:var(--color-text-dim)] uppercase tracking-wider mb-[8px]">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[color:var(--color-well)] border border-[color:var(--color-hairline)] rounded-lg px-[16px] py-[12px] text-[color:var(--color-text)] placeholder:text-[color:var(--color-text-faint)] focus:outline-none focus:border-[color:var(--color-accent-border)] min-h-[80px]"
              placeholder="Additional details..."
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-[12px] rounded-lg flex items-center justify-center gap-[8px]"
          >
            {loading ? <div className="spinner w-[20px] h-[20px]" /> : <Plus className="w-[20px] h-[20px]" />}
            {loading ? "Adding..." : "Add Income"}
          </button>
        </form>
      </div>
    </div>
  );
}
