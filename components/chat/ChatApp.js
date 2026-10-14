"use client";

import { useEffect, useRef, useState } from "react";
import Header from "./Header";
import Message from "./Message";
import Composer from "./Composer";
import EmptyState from "./EmptyState";
import { auth, chatStream, warmup } from "@/lib/services";

let nextId = 1;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default function ChatApp() {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    warmup();
    auth
      .me()
      .then(setSession)
      .catch(() => setSession(null))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const patch = (id, fn) => setMessages((m) => m.map((x) => (x.id === id ? { ...x, ...fn(x) } : x)));

  async function send(text = input, base = messages) {
    const question = text.trim();
    if (!question || streaming) return;
    setInput("");

    // The model only sees the recent, successful turns.
    const history = base
      .filter((m) => m.text && !m.error)
      .slice(-12)
      .map((m) => ({ role: m.role, text: m.text }));

    const userId = nextId++;
    const botId = nextId++;
    setMessages([...base, { id: userId, role: "user", text: question }, { id: botId, role: "assistant", text: "", sources: [] }]);

    const controller = new AbortController();
    abortRef.current = controller;
    setStreaming(true);

    // Providers send text in a few big chunks. Reveal it at a steady pace instead, faster
    // when there is a lot waiting, so it always reads like typing.
    let pending = "";
    const timer = setInterval(() => {
      if (!pending) return;
      const n = Math.max(2, Math.ceil(pending.length * 0.1));
      const piece = pending.slice(0, n);
      pending = pending.slice(n);
      patch(botId, (m) => ({ text: m.text + piece }));
    }, 30);

    try {
      for await (const { event, data } of chatStream({ message: question, history, signal: controller.signal })) {
        if (event === "meta") patch(botId, () => ({ sources: data.sources, denied: data.denied, inspector: data.inspector }));
        else if (event === "token") pending += data.t;
        else if (event === "done") patch(botId, () => ({ provider: data.provider, totalMs: data.totalMs }));
        else if (event === "error") patch(botId, () => ({ error: data.code }));
      }
      while (pending && !controller.signal.aborted) await sleep(30); // let the typing finish
    } finally {
      clearInterval(timer); // Stop drops whatever hasn't been shown yet
      setStreaming(false);
    }
  }

  function retry(failedId) {
    const i = messages.findIndex((m) => m.id === failedId);
    const question = messages[i - 1]?.text;
    if (question) send(question, messages.slice(0, i - 1));
  }

  function newChat() {
    abortRef.current?.abort();
    setMessages([]);
    setInput("");
    setStreaming(false);
  }

  async function signOut() {
    await auth.logout();
    setSession(null);
    newChat();
  }

  const last = messages[messages.length - 1];

  return (
    <div className="flex h-dvh flex-col bg-white">
      <Header session={session} ready={ready} onSignOut={signOut} onNewChat={messages.length ? newChat : undefined} />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto h-full w-full max-w-3xl px-4 sm:px-8">
          {messages.length === 0 ? (
            <EmptyState session={session} onPick={send} />
          ) : (
            <div className="space-y-8 py-8 sm:py-10" aria-live="polite">
              {messages.map((m) => (
                <Message key={m.id} message={m} streaming={streaming && m === last} onRetry={() => retry(m.id)} />
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </div>

      <Composer value={input} onChange={setInput} onSend={() => send()} onStop={() => abortRef.current?.abort()} streaming={streaming} />
    </div>
  );
}
