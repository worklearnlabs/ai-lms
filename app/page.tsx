import React from 'react';
import BlueprintResearch from './components/blueprints/BlueprintResearch';

export default function Home() {
  return (
    <main className="min-h-screen p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-6 text-center">Adaptive Learning System</h1>
      
      <div className="max-w-7xl mx-auto">
        <BlueprintResearch />
      </div>
    </main>
  );
} 