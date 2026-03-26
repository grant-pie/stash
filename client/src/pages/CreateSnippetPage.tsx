import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '@/lib/axios';
import type { CreateSnippetPayload } from '@/types';
import Navbar from '@/components/Navbar';

const LANGUAGES = [
  'typescript', 'javascript', 'python', 'rust', 'go',
  'css', 'html', 'sql', 'bash', 'other',
];

const EMPTY_FORM: CreateSnippetPayload = {
  title: '',
  description: '',
  language: 'typescript',
  content: '',
  tags: [],
  isPublic: false,
};

export default function CreateSnippetPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  const [form, setForm] = useState<CreateSnippetPayload>(EMPTY_FORM);
  const [tagInput, setTagInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditing);

  useEffect(() => {
    if (!id) return;
    api.get(`/snippets/${id}`)
      .then(({ data }) => {
        setForm({
          title: data.title,
          description: data.description ?? '',
          language: data.language,
          content: data.content,
          tags: data.tags ?? [],
          isPublic: data.isPublic,
        });
      })
      .catch(() => setError('Failed to load snippet.'))
      .finally(() => setFetching(false));
  }, [id]);

  function set(field: keyof CreateSnippetPayload, value: unknown) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function addTag() {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !form.tags?.includes(tag)) {
      set('tags', [...(form.tags ?? []), tag]);
    }
    setTagInput('');
  }

  function removeTag(tag: string) {
    set('tags', (form.tags ?? []).filter((t) => t !== tag));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isEditing) {
        await api.patch(`/snippets/${id}`, form);
        navigate(`/snippets/${id}`);
      } else {
        const { data } = await api.post('/snippets', form);
        navigate(`/snippets/${data.id}`);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message ?? `Failed to ${isEditing ? 'update' : 'create'} snippet`);
    } finally {
      setLoading(false);
    }
  }

  if (fetching) {
    return <p className="p-8 text-sm text-gray-500">Loading…</p>;
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-6 text-xl font-bold">
          {isEditing ? 'Edit snippet' : 'New snippet'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <p className="rounded bg-red-950 px-3 py-2 text-sm text-red-400">{error}</p>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <label className="block text-xs text-gray-400">Title *</label>
              <input
                type="text"
                className="input"
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                required
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="block text-xs text-gray-400">Description</label>
              <textarea
                className="input resize-none"
                rows={2}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs text-gray-400">Language *</label>
              <select
                className="input"
                value={form.language}
                onChange={(e) => set('language', e.target.value)}
              >
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs text-gray-400">Tags</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input flex-1"
                  placeholder="Add tag…"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                />
                <button type="button" onClick={addTag} className="btn-ghost shrink-0">
                  Add
                </button>
              </div>
              {(form.tags ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {form.tags?.map((tag) => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 rounded-full bg-indigo-950 px-2 py-0.5 text-xs text-indigo-300"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="text-indigo-400 hover:text-white"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs text-gray-400">Code *</label>
            <textarea
              className="input font-mono resize-y"
              rows={16}
              value={form.content}
              onChange={(e) => set('content', e.target.value)}
              required
              spellCheck={false}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-gray-800 bg-surface-2 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-200">
                {form.isPublic ? 'Public' : 'Private'}
              </p>
              <p className="text-xs text-gray-500">
                {form.isPublic
                  ? 'Anyone can discover this snippet in the feed.'
                  : 'Only you can see this snippet.'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.isPublic}
              onClick={() => set('isPublic', !form.isPublic)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-surface-2 ${
                form.isPublic ? 'bg-indigo-600' : 'bg-gray-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${
                  form.isPublic ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex justify-end gap-3">
            <Link to={isEditing ? `/snippets/${id}` : '/my-snippets'} className="btn-ghost">
              Cancel
            </Link>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Saving…' : isEditing ? 'Save changes' : 'Save snippet'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
