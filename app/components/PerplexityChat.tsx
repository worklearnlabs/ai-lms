'use client';

import React, { useState } from 'react';
import { useChat } from '@ai-sdk/react';

export default function PerplexityChat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    maxSteps: 3, // Enable multi-step tool calls
  });

  return (
    <div className="flex flex-col w-full max-w-md py-8 mx-auto stretch">
      <h2 className="text-2xl font-bold mb-4">AI Research Assistant</h2>
      
      <div className="mb-4 p-4 border rounded-lg bg-gray-50">
        <p className="text-sm text-gray-600">
          Ask me to research any topic for your AI learning journey
        </p>
      </div>
      
      <div className="flex-1 overflow-y-auto mb-4 max-h-[400px]">
        {messages.map(m => (
          <div key={m.id} className={`p-3 rounded-lg mb-2 ${
            m.role === 'user' ? 'bg-blue-100' : 'bg-white border'
          }`}>
            <div className="font-semibold">{m.role === 'user' ? 'You' : 'AI'}</div>
            <div className="whitespace-pre-wrap mt-1">
              {m.content || (
                m.toolInvocations && (
                  <div className="text-xs text-gray-500">
                    <span>Researching: {
                      m.toolInvocations[0]?.params?.query || 'your query'
                    }</span>
                  </div>
                )
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="p-3 rounded-lg mb-2 bg-white border">
            <div className="font-semibold">AI</div>
            <div className="animate-pulse mt-1">Researching...</div>
          </div>
        )}
      </div>
      
      <form onSubmit={handleSubmit} className="sticky bottom-0 bg-white p-2 rounded-lg border">
        <div className="flex items-center">
          <input
            className="flex-1 p-2 border rounded-l-lg focus:outline-none"
            value={input}
            placeholder="Ask a research question..."
            onChange={handleInputChange}
          />
          <button 
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-r-lg"
          >
            {isLoading ? 'Researching...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
} 