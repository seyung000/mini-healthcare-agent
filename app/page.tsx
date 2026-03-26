"use client";

import { FormEvent, useState } from "react";

type SkillTraceItem = {
  id: string;
  label: string;
  status: "completed" | "skipped" | "running";
  detail?: string;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  trace?: SkillTraceItem[];
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
  const hasConversation = messages.length > 1 || isLoading;

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

      const payload = (await response.json()) as {
        response?: string;
        error?: string;
        trace?: SkillTraceItem[];
      };

      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content:
            payload.response ??
            payload.error ??
            "응답을 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.",
          trace: payload.trace,
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
      {!hasConversation ? (
        <section className="hero-shell">
          <div className="topbar">
            <div className="brand-mark" aria-hidden="true">
              H
            </div>
            <span>Healthcare Agent</span>
          </div>

          <div className="hero-copy">
            <p className="hero-kicker">Healthcare Demo</p>
            <h1>증상이나 질병 정보를 물어보세요</h1>
          </div>

          <form className="hero-composer" onSubmit={handleSubmit}>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="예: 열이 나고 기침이랑 근육통이 있어요"
              rows={3}
            />
            <div className="hero-composer-footer">
              <span>증상 기반 후보 검색과 웹검색 폴백을 지원합니다.</span>
              <button type="submit" disabled={isLoading || input.trim().length === 0}>
                {isLoading ? "분석 중..." : "질문하기"}
              </button>
            </div>
          </form>
        </section>
      ) : (
        <section className="chat-shell">
          <div className="topbar compact">
            <div className="brand-mark" aria-hidden="true">
              H
            </div>
            <span>Healthcare Agent</span>
          </div>
        </section>
      )}

      {hasConversation ? (
        <section className="chat-card">
          <div className="chat-log">
            {messages.map((message, index) => (
              <article
                key={`${message.role}-${index}`}
                className={`message-bubble ${message.role}`}
              >
                {message.role === "assistant" && message.trace ? (
                  <details className="skill-trace">
                    <summary>사용한 스킬 보기</summary>
                    <ul>
                      {message.trace.map((item) => (
                        <li key={item.id}>
                          <strong>{item.label}</strong>
                          <span className={`trace-status ${item.status}`}>
                            {item.status === "completed"
                              ? "완료"
                              : item.status === "running"
                                ? "진행 중"
                                : "건너뜀"}
                          </span>
                          {item.detail ? <p>{item.detail}</p> : null}
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
                <span className="message-role">
                  {message.role === "user" ? "나" : "에이전트"}
                </span>
                <p>{message.content}</p>
              </article>
            ))}

            {isLoading ? (
              <article className="message-bubble assistant pending">
                <details className="skill-trace" open>
                  <summary>사용한 스킬 보기</summary>
                  <ul>
                    <li>
                      <strong>응급 표현 확인</strong>
                      <span className="trace-status completed">완료</span>
                    </li>
                    <li>
                      <strong>증상 감지</strong>
                      <span className="trace-status running">진행 중</span>
                    </li>
                    <li>
                      <strong>로컬 질병 후보 검색</strong>
                      <span className="trace-status running">대기</span>
                    </li>
                    <li>
                      <strong>웹 검색 또는 응답 생성</strong>
                      <span className="trace-status running">대기</span>
                    </li>
                  </ul>
                </details>
                <span className="message-role">에이전트</span>
                <p>응답을 생성하고 있습니다...</p>
              </article>
            ) : null}
          </div>
        </section>
      ) : null}

      {hasConversation ? (
        <div className="composer-dock">
          <form className="chat-composer" onSubmit={handleSubmit}>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="추가 증상이나 질병 정보를 입력해 주세요"
              rows={2}
            />
            <div className="chat-composer-footer">
              <button type="submit" disabled={isLoading || input.trim().length === 0}>
                {isLoading ? "분석 중..." : "보내기"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </main>
  );
}
