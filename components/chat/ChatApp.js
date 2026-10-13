"use client";

import { useEffect, useRef, useState } from "react";
import Header from "./Header";
import Message from "./Message";
import Composer from "./Composer";
import EmptyState from "./EmptyState";
import { answerQuestion } from "@/lib/mockKnowledge";
import { clearSession, getSession } from "@/lib/mockSession";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// MOCK ONLY: simulates the token stream the Flask SSE endpoint will provide.
async function* mockStream(text, signal) {
  await sleep(700); // "retrieving + thinking"
  for (const word of text.split(/(\s+)/)) {
    if (signal.aborted) return;
    yield word;
    await sleep(35);
  }
}

export default function ChatApp() {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    setSession(getSession());
    setReady(true);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  async function send(text = input) {
    const question = text.trim();
    if (!question || streaming) return;
    setInput("");

    const id = Date.now();
    const answer = answerQuestion(question, session?.role ?? "guest");
    setMessages((m) => [
      ...m,
      { id, role: "user", text: question },
      { id: id + 1, role: "assistant", text: "", sources: answer.sources, denied: answer.denied },
    ]);

    const controller = new AbortController();
    abortRef.current = controller;
    setStreaming(true);
    for await (const chunk of mockStream(answer.text, controller.signal)) {
      setMessages((m) =>
        m.map((msg) => (msg.id === id + 1 ? { ...msg, text: msg.text + chunk } : msg)),
      );
    }
    setStreaming(false);
  }

  function signOut() {
    clearSession();
    setSession(null);
    setMessages([]);
  }

  const last = messages[messages.length - 1];

  return (
    <div className="flex h-dvh flex-col bg-white">
      <Header session={session} ready={ready} onSignOut={signOut} />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto h-full w-full max-w-3xl px-4 sm:px-8">
          {messages.length === 0 ? (
            <EmptyState session={session} onPick={send} />
          ) : (
            <div className="space-y-8 py-8 sm:py-10" aria-live="polite">
              {messages.map((m) => (
                <Message key={m.id} message={m} streaming={streaming && m === last} />
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </div>

      <Composer
        value={input}
        onChange={setInput}
        onSend={() => send()}
        onStop={() => abortRef.current?.abort()}
        streaming={streaming}
      />
    </div>
  );
}
