'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Send, Sparkles, X } from 'lucide-react';

type Message = { role: 'user' | 'ai'; text: string };

export function FloatingAIChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: "Hi! I'm CareSense AI. Ask about your vitals, medication, or how to feel better today." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  async function sendMessage(text: string) {
    const t = text.trim();
    if (!t || loading) return;
    setMessages((prev) => [...prev, { role: 'user', text: t }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: t })
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'ai', text: data.reply ?? 'No reply.' }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'ai', text: 'Sorry, something went wrong. Please try again.' }
      ]);
    } finally {
      setLoading(false);
    }
  }

  function startListening() {
    const SR =
      (typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) || null;
    if (!SR) {
      alert('Voice input is not supported in this browser. Try Chrome or Edge.');
      return;
    }
    const recognition = new SR();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (event: any) => {
      const transcript: string = event.results[0][0].transcript;
      sendMessage(transcript);
    };
    recognitionRef.current = recognition;
    recognition.start();
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open CareSense AI chat"
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#1E3FBF] text-white shadow-lg transition hover:scale-105 hover:shadow-xl"
        >
          <Sparkles className="h-6 w-6" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-40 flex h-[28rem] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b bg-[#1E3FBF] px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-semibold">CareSense AI</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="rounded-md p-1 hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto bg-muted/30 px-3 py-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  m.role === 'user'
                    ? 'ml-auto bg-[#1E3FBF] text-white'
                    : 'bg-card text-foreground shadow-sm'
                }`}
              >
                {m.text}
              </div>
            ))}
            {loading && (
              <div className="max-w-[85%] rounded-2xl bg-card px-3 py-2 text-sm text-muted-foreground shadow-sm">
                Thinking…
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="flex items-center gap-2 border-t bg-background px-3 py-2"
          >
            <button
              type="button"
              onClick={listening ? stopListening : startListening}
              aria-label={listening ? 'Stop listening' : 'Start voice input'}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition ${
                listening ? 'animate-pulse border-red-300 bg-red-50 text-red-600' : 'hover:bg-muted'
              }`}
            >
              {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask CareSense…"
              className="flex-1 rounded-full border bg-background px-3 py-2 text-sm outline-none focus:border-[#1E3FBF]"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              aria-label="Send"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1E3FBF] text-white transition disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
