'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { Send, Loader2, MessageCircle } from 'lucide-react'
import axios from 'axios'
import { sendAssistantMessage } from '@/lib/api/assistant'
import { handleApiError } from '@/lib/api/client'

export type MessageRole = 'user' | 'assistant'

export interface Message {
  id: string
  role: MessageRole
  content: string
  timestamp: Date
}

export const QUICK_PROMPTS = [
  "What's my current cash position?",
  'Summarize pending approvals',
  'What do I need to do today?',
  'How is our budget utilization?',
  'Give me a brief financial summary',
]

interface AssistantChatProps {
  /** Compact layout for floating panel (smaller header, less padding) */
  compact?: boolean
  /** Optional class for the messages container */
  className?: string
}

function AssistantChatInner({ compact = false, className = '' }: AssistantChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const handleSend = useCallback(async (text?: string) => {
    const messageText = (text ?? input).trim()
    if (!messageText || loading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const { reply } = await sendAssistantMessage(messageText)
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: reply,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (err) {
      const description =
        axios.isAxiosError(err) && err.response?.status === 429
          ? 'Too many requests. Please wait a moment and try again.'
          : handleApiError(err)
      toast({
        title: 'Error',
        description,
        variant: 'destructive',
      })
      const errorMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I could not get a response. Please try again.',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }, [input, loading, toast])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  const messagesHeight = compact ? 'min-h-[220px] max-h-[300px]' : 'min-h-0'
  const padding = compact ? 'px-3 py-3' : 'px-4 py-4'

  return (
    <div className={`flex flex-col h-full min-h-0 ${className}`}>
      <div className={`flex-1 overflow-y-auto min-h-0 ${padding} space-y-2 ${messagesHeight}`}>
        {messages.length === 0 && (
          <div className={`flex flex-col items-center justify-center text-center min-h-[200px] ${compact ? 'py-6' : 'py-10'}`}>
            <div className="rounded-full bg-gray-100/80 p-4 mb-5">
              <MessageCircle className="h-7 w-7 text-gray-500" strokeWidth={1.5} />
            </div>
            <p className="text-base font-medium text-gray-800 mb-1.5">
              How can I help with your finances today?
            </p>
            <p className="text-sm text-gray-500 max-w-xs mb-6">
              Type your question below or choose a suggestion.
            </p>
            <div className="flex flex-wrap justify-center gap-2 max-w-md">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleSend(prompt)}
                  disabled={loading}
                  className="rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[82%] px-4 py-3 ${
                compact ? 'text-xs' : 'text-sm leading-relaxed'
              } ${
                msg.role === 'user'
                  ? 'bg-[#dcf8c6] text-gray-800 rounded-2xl rounded-tr-sm shadow-sm'
                  : 'bg-white text-gray-900 rounded-2xl rounded-tl-sm border border-gray-100 shadow-sm'
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-tl-sm border border-gray-100 bg-white px-4 py-3 flex items-center gap-3 shadow-sm">
              <Loader2 className="animate-spin text-gray-400 shrink-0 h-4 w-4" />
              <span className="text-sm text-gray-500">Analyzing your data…</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className={`shrink-0 border-t border-gray-100 bg-gray-50/80 ${compact ? 'px-3 py-3' : 'px-4 py-4'}`}>
        <div className="flex gap-3 items-end rounded-2xl border border-gray-200 bg-white px-3 py-2 shadow-sm focus-within:ring-[0.5px] focus-within:ring-ring focus-within:border-slate-300 transition-shadow">
          <Textarea
            placeholder="Type your message…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            className="min-h-[44px] max-h-[120px] resize-none text-sm border-0 bg-transparent py-2.5 px-0 focus-visible:ring-[0.5px] focus-visible:ring-ring focus-visible:ring-offset-0 placeholder:text-gray-400"
            disabled={loading}
          />
          <Button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            size="icon"
            className="shrink-0 rounded-full h-9 w-9 bg-primary hover:bg-primary-dark"
            title="Send (Enter)"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary-foreground" />
            ) : (
              <Send className="h-4 w-4 text-primary-foreground" />
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-400 mt-2 px-1">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}

export const AssistantChat = React.memo(AssistantChatInner)
