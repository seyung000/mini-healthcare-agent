"use client";

import { FormEvent, useState } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export default function HomePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "안녕하세요. 증상이나 질병명을 입력해 주세요.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function sendMessage(message: string) {
    const trimmed = message.trim();

    if (!trimmed || isLoading) {
      return;
    }

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: trimmed },
    ];

    setMessages(nextMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmed,
          language: "ko",
        }),
      });

      const payload = (await response.json()) as { response?: string; error?: string };

      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content:
            payload.response ??
            payload.error ??
            "응답을 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.",
        },
      ]);
    } catch {
      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: "네트워크 오류가 발생했습니다. 서버 상태를 확인해 주세요.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  return (
    <main className="page-shell">
      <section className="chat-card">
        <header className="chat-header">
          <div className="brand-mark" aria-hidden="true">
            H
          </div>
          <div>
            <h1>Healthcare Agent</h1>
            <p>간단한 데모 챗봇</p>
          </div>
        </header>

        <div className="chat-log">
          {messages.map((message, index) => (
            <article
              key={`${message.role}-${index}`}
              className={`message-bubble ${message.role}`}
            >
              <span className="message-role">
                {message.role === "user" ? "나" : "에이전트"}
              </span>
              <p>{message.content}</p>
            </article>
          ))}

          {isLoading ? (
            <article className="message-bubble assistant pending">
              <span className="message-role">에이전트</span>
              <p>응답을 생성하고 있습니다...</p>
            </article>
          ) : null}
        </div>

        <form className="composer" onSubmit={handleSubmit}>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="증상을 입력해 주세요"
            rows={2}
          />
          <div className="composer-footer">
            <button type="submit" disabled={isLoading || input.trim().length === 0}>
              {isLoading ? "분석 중..." : "보내기"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
