export function getApiErrorMessage(err: any, fallback = 'Something went wrong.'): string {
  if (!err?.response) {
    return 'Could not reach the server. Check your connection and try again.';
  }

  const status = err.response.status as number;
  const message = err.response.data?.message;

  // Any 5xx with no readable message means the server is unavailable or crashed
  if (status >= 500 && !message) {
    return 'The server is currently unavailable. Please try again in a moment.';
  }

  if (Array.isArray(message)) return message.join(' · ');
  if (typeof message === 'string') return message;

  return fallback;
}
