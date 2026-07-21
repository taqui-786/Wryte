'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { AiMessageStreaming, AIMessage, StreamingPart, AIMessageChunkStream } from '@/components/agent/agent-sidebar/types'
import { MessageBubble } from '@/components/agent/agent-sidebar/messageBubble'
import { sampleAiStreamingResponse } from './sample-streaming-data'

function buildAIMessage(chunks: AiMessageStreaming[]): AIMessage | null {
  if (chunks.length === 0) return null

  const aiChunks = chunks
    .map((c) => c.message)
    .filter((m): m is AIMessageChunkStream => m.type === 'AIMessageChunk')
  const fullContent = aiChunks.map((c) => c.content).join('')

  const rawParts: StreamingPart[] = []
  for (const chunk of aiChunks) {
    if (chunk.additional_kwargs?.reasoning_content) {
      rawParts.push({
        type: 'reasoning',
        content: chunk.additional_kwargs.reasoning_content as string,
      })
    }
    if (chunk.content) {
      rawParts.push({ type: 'content', content: chunk.content })
    }
    if (chunk.tool_calls?.length) {
      for (const tc of chunk.tool_calls) {
        rawParts.push({ type: 'tool_call', toolCall: tc })
      }
    }
  }

  const mergedParts: StreamingPart[] = []
  for (const p of rawParts) {
    const last = mergedParts[mergedParts.length - 1]
    if (last && last.type === p.type && last.type !== 'tool_call') {
      ;(last as { content: string }).content += (p as { content: string }).content
    } else {
      mergedParts.push({ ...p })
    }
  }

  const lastWithToolCalls = [...aiChunks].reverse().find((c) => c.tool_calls?.length)
  const lastWithUsage = [...aiChunks].reverse().find((c) => c.usage_metadata)
  const lastChunk = aiChunks[aiChunks.length - 1]
  const isReasoning =
    !!lastChunk?.additional_kwargs?.reasoning_content && !lastChunk?.content

  return {
    type: 'ai',
    data: {
      content: fullContent,
      additional_kwargs: {
        reasoning_content: isReasoning ? lastChunk.additional_kwargs.reasoning_content : undefined,
        isReasoning,
      },
      response_metadata: {
        finish_reason: lastWithUsage?.usage_metadata ? 'stop' : 'unknown',
        model_name: 'gpt-4o',
      },
      type: 'ai',
      name: null,
      id: 'test-msg-1',
      tool_calls: lastWithToolCalls?.tool_calls ?? [],
      invalid_tool_calls: [],
      usage_metadata: lastWithUsage?.usage_metadata ?? {
        input_tokens: 0,
        output_tokens: 0,
        total_tokens: 0,
      },
    },
    parts: mergedParts,
  }
}

export default function TestPage() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(150)
  const [accumulatedChunks, setAccumulatedChunks] = useState<AiMessageStreaming[]>([])
  const [inputText, setInputText] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const accumulatedMessage = buildAIMessage(accumulatedChunks)

  // Timer-based chunk feeding
  useEffect(() => {
    if (!isPlaying) return
    if (currentIndex >= sampleAiStreamingResponse.length) {
      setIsPlaying(false)
      return
    }

    timerRef.current = setTimeout(() => {
      setAccumulatedChunks((prev) => [...prev, sampleAiStreamingResponse[currentIndex]])
      setCurrentIndex((prev) => prev + 1)
    }, speed)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [isPlaying, currentIndex, speed])

  const handlePlay = useCallback(() => setIsPlaying(true), [])
  const handlePause = useCallback(() => setIsPlaying(false), [])

  const handleReset = useCallback(() => {
    setIsPlaying(false)
    setCurrentIndex(0)
    setAccumulatedChunks([])
  }, [])

  // Jump to a specific chunk
  const handleJump = useCallback(
    (targetIndex: number) => {
      setIsPlaying(false)
      setCurrentIndex(targetIndex)
      setAccumulatedChunks(sampleAiStreamingResponse.slice(0, targetIndex))
    },
    [],
  )

  const handleSendUserMessage = useCallback(() => {
    if (!inputText.trim()) return
    handleReset()
    setInputText('')
  }, [inputText, handleReset])

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Streaming Test Playground</h1>
        <p className="text-sm text-muted-foreground">
          Feeds sample streaming chunks into <code>MessageBubble</code> one by
          one
        </p>
      </div>

      {/* User input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded-md border px-3 py-2"
          onKeyDown={(e) => e.key === 'Enter' && handleSendUserMessage()}
        />
        <button
          onClick={handleSendUserMessage}
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          Send
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap rounded-lg border p-3">
        <button
          onClick={handlePlay}
          disabled={isPlaying || currentIndex >= sampleAiStreamingResponse.length}
          className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground disabled:opacity-40"
        >
          {isPlaying ? 'Playing…' : '▶ Play'}
        </button>
        <button
          onClick={handlePause}
          disabled={!isPlaying}
          className="rounded bg-muted px-4 py-1.5 text-sm disabled:opacity-40"
        >
          ⏸ Pause
        </button>
        <button
          onClick={handleReset}
          className="rounded bg-destructive px-4 py-1.5 text-sm text-destructive-foreground"
        >
          ↺ Reset
        </button>

        <label className="flex items-center gap-1.5 text-sm">
          Speed:
          <select
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="rounded border px-2 py-1 text-sm"
          >
            <option value={50}>50ms</option>
            <option value={150}>150ms</option>
            <option value={300}>300ms</option>
            <option value={1000}>1s</option>
          </select>
        </label>

        <span className="text-sm text-muted-foreground">
          chunk {currentIndex}/{sampleAiStreamingResponse.length}
        </span>
      </div>

      {/* Render via MessageBubble */}
      <div className="rounded-lg border p-4">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          MessageBubble output
        </h2>
        {accumulatedMessage ? (
          <MessageBubble message={accumulatedMessage} node={[]} />
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Press Play to start streaming chunks into MessageBubble
          </p>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-150"
          style={{
            width: `${(currentIndex / sampleAiStreamingResponse.length) * 100}%`,
          }}
        />
      </div>

      {/* Chunk navigation */}
      <div className="flex flex-wrap gap-1.5">
        {sampleAiStreamingResponse.map((chunk, i) => {
          const msg = chunk.message
          const isAIMessage = msg.type === 'AIMessageChunk'
          const hasReasoning =
            isAIMessage &&
            !!(msg as AIMessageChunkStream).additional_kwargs?.reasoning_content
          const isToolCall =
            isAIMessage && (msg as AIMessageChunkStream).tool_call_chunks?.length > 0
          return (
            <button
              key={i}
              onClick={() => handleJump(i + 1)}
              className={`rounded px-2 py-0.5 text-[11px] font-mono transition-colors ${
                i < currentIndex
                  ? hasReasoning
                    ? 'bg-orange-200 text-orange-800'
                    : isToolCall
                      ? 'bg-blue-200 text-blue-800'
                      : msg.type === 'tool'
                        ? 'bg-green-200 text-green-800'
                        : 'bg-muted text-muted-foreground'
                  : 'bg-muted/50 text-muted-foreground/50'
              }`}
              title={JSON.stringify(
                isAIMessage
                  ? (msg as AIMessageChunkStream).content || (msg as AIMessageChunkStream).additional_kwargs?.reasoning_content
                  : msg.name,
              )}
            >
              {i + 1}
            </button>
          )
        })}
      </div>

      {/* Raw chunks panel */}
      <details className="rounded-lg border">
        <summary className="cursor-pointer p-3 text-sm font-medium">
          Raw accumulated chunks ({accumulatedChunks.length})
        </summary>
        <div className="max-h-96 space-y-2 overflow-y-auto p-3 pt-0">
          {accumulatedChunks.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No chunks yet
            </p>
          ) : (
            accumulatedChunks.map((chunk, i) => (
              <pre
                key={i}
                className="overflow-x-auto rounded bg-muted p-2 text-[11px] leading-relaxed"
              >
                {JSON.stringify(chunk, null, 2)}
              </pre>
            ))
          )}
        </div>
      </details>
    </div>
  )
}
