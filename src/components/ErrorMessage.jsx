import { AlertCircle } from "lucide-react";

export default function ErrorMessage({ message }) {
  return (
    <div className="mx-auto max-w-md rounded-lg border border-red-200 bg-red-50 p-4 text-center">
      <AlertCircle className="mx-auto mb-2 h-6 w-6 text-red-500" />
      <p className="text-sm text-red-700">{message}</p>
    </div>
  );
}
