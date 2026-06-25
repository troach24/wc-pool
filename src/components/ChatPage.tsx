import { useState, useEffect, useRef } from 'react';
import { supabase, type Message } from '../lib/supabase';

const POOL_NAMES = [
  'Balze Heuga',
  'Johnny Futbol DiLivio',
  "Penrod Loves his friend's Balze",
  'Wilder',
  "Shmeeve's' FutBalzers",
  'K-19',
  'Linc',
  'McNutt',
  'Herr Wagner der Größte',
  'Justin',
  'Captain JARRR',
  'Messi all day',
  'Peter (Jenn Dumm Dumm)',
  'Anonymous Dumbo Octopus',
  'Tom Atwood',
  'Seattle Seleção',
  'Krafty Cole',
  'Franco',
  "The Pope's on Our Side. Knicks in Five.",
  'Mike Scigliano',
];

const AUTHOR_KEY = 'wc:chatAuthor';

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatDay(iso: string) {
  const d = new Date(iso);
  const today = new Date().toLocaleDateString();
  if (d.toLocaleDateString() === today) return 'Today';
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

export function ChatPage() {
  const [author, setAuthor] = useState<string>(() => {
    try { return localStorage.getItem(AUTHOR_KEY) ?? ''; } catch { return ''; }
  });
  const [picking, setPicking] = useState(!author);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load messages and subscribe to real-time updates
  useEffect(() => {
    supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true })
      .then(({ data }) => { if (data) setMessages(data); });

    const channel = supabase
      .channel('messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Scroll to bottom when messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function selectAuthor(name: string) {
    setAuthor(name);
    try { localStorage.setItem(AUTHOR_KEY, name); } catch { /* ignore */ }
    setPicking(false);
  }

  async function send() {
    const text = body.trim();
    if (!text || !author || sending) return;
    setSending(true);
    setBody('');
    await supabase.from('messages').insert({ author, body: text });
    setSending(false);
  }

  // Name picker overlay
  if (picking) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h2 className="mb-1 text-lg font-bold text-gray-900 dark:text-white">Who are you?</h2>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">Pick your pool name to join the chat.</p>
        <div className="flex flex-col gap-2">
          {POOL_NAMES.map((name) => (
            <button
              key={name}
              onClick={() => selectAuthor(name)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm font-medium text-gray-800 transition-colors hover:border-[#1a3a6b] hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
            >
              {name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Group messages by day
  const grouped: { day: string; msgs: Message[] }[] = [];
  for (const m of messages) {
    const day = formatDay(m.created_at);
    const last = grouped[grouped.length - 1];
    if (last?.day === day) last.msgs.push(m);
    else grouped.push({ day, msgs: [m] });
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col" style={{ height: 'calc(100dvh - 120px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2 dark:border-gray-700">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">💬 Smack Talk</span>
        <button
          onClick={() => setPicking(true)}
          className="text-xs text-gray-400 underline dark:text-gray-500"
        >
          {author}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {grouped.length === 0 && (
          <p className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">No messages yet. Start the trash talk.</p>
        )}
        {grouped.map(({ day, msgs }) => (
          <div key={day}>
            <div className="my-3 flex items-center gap-2">
              <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
              <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">{day}</span>
              <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
            </div>
            {msgs.map((m) => {
              const isMe = m.author === author;
              return (
                <div key={m.id} className={`mb-2 flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isMe && (
                    <span className="mb-0.5 ml-1 text-[10px] font-semibold text-gray-400 dark:text-gray-500">{m.author}</span>
                  )}
                  <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                    isMe
                      ? 'rounded-br-sm bg-[#1a3a6b] text-white'
                      : 'rounded-bl-sm bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                  }`}>
                    {m.body}
                  </div>
                  <span className="mt-0.5 px-1 text-[10px] text-gray-300 dark:text-gray-600">{formatTime(m.created_at)}</span>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Say something..."
            className="flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm outline-none focus:border-[#1a3a6b] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
          />
          <button
            onClick={send}
            disabled={!body.trim() || sending}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1a3a6b] text-white transition-opacity disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
              <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
