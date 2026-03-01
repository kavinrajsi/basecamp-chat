import { AlertCircle } from "lucide-react";

export default function ErrorMessage({ message }) {
  return (
    <div className="mx-auto max-w-md rounded-lg border border-red-800 bg-red-900/30 p-4 text-center">
      <AlertCircle className="mx-auto mb-2 h-6 w-6 text-red-400" />
      <p className="text-sm text-red-300">{message}</p>
    </div>
  );
}
