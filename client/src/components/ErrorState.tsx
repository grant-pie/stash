interface Props {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({
  message = 'Could not reach the server. Check your connection and try again.',
  onRetry,
}: Props) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-950/60 text-red-400 text-xl font-bold">
        !
      </div>
      <p className="text-sm text-red-400 max-w-xs">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-ghost text-sm mt-1">
          Try again
        </button>
      )}
    </div>
  );
}
