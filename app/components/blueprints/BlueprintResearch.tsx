'use client';

import React, { useState } from 'react';
import { BlueprintResearchService, ResearchResult } from '../../../src/lib/blueprints/researchService';
import { UserProfile, BlueprintRequest } from '../../../src/lib/blueprints/promptBuilder';

export default function BlueprintResearch() {
  // Mock user profile - in a real app, this would come from auth context or user state
  const [profile, setProfile] = useState<UserProfile>({
    skillLevel: 'intermediate',
    learningObjectives: 'Build practical AI applications and improve technical skills',
    preferredLearningStyle: 'hands-on tutorials',
    industryExperience: 'web development'
  });

  // Blueprint request form state
  const [blueprintRequest, setBlueprintRequest] = useState<BlueprintRequest>({
    title: '',
    description: '',
    tags: [],
    complexity: 'moderate'
  });

  // Research result state
  const [researchResult, setResearchResult] = useState<ResearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tag input state
  const [tagInput, setTagInput] = useState('');

  // Handle form input changes
  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleBlueprintChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setBlueprintRequest(prev => ({ ...prev, [name]: value }));
  };

  // Handle tag addition
  const handleAddTag = () => {
    if (tagInput.trim() && !blueprintRequest.tags?.includes(tagInput.trim())) {
      setBlueprintRequest(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  // Handle tag removal
  const handleRemoveTag = (tag: string) => {
    setBlueprintRequest(prev => ({
      ...prev,
      tags: prev.tags?.filter(t => t !== tag) || []
    }));
  };

  // Handle form submission to conduct research
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Make sure title and description are provided
      if (!blueprintRequest.title || !blueprintRequest.description) {
        throw new Error('Title and description are required');
      }

      // Conduct research using our service
      const result = await BlueprintResearchService.conductResearch(
        profile,
        blueprintRequest
      );

      setResearchResult(result);
    } catch (err: any) {
      console.error('Research error:', err);
      setError(err.message || 'Failed to conduct research');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Blueprint Research</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column: Form inputs */}
        <div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white p-4 rounded-lg border shadow-sm">
              <h2 className="text-lg font-semibold mb-3">User Profile</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Skill Level</label>
                  <select
                    name="skillLevel"
                    value={profile.skillLevel}
                    onChange={handleProfileChange}
                    className="w-full p-2 border rounded"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Learning Objectives</label>
                  <textarea
                    name="learningObjectives"
                    value={profile.learningObjectives}
                    onChange={handleProfileChange}
                    className="w-full p-2 border rounded"
                    rows={2}
                  ></textarea>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Preferred Learning Style</label>
                  <input
                    type="text"
                    name="preferredLearningStyle"
                    value={profile.preferredLearningStyle || ''}
                    onChange={handleProfileChange}
                    className="w-full p-2 border rounded"
                    placeholder="e.g., hands-on, video tutorials, documentation"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Industry Experience</label>
                  <input
                    type="text"
                    name="industryExperience"
                    value={profile.industryExperience || ''}
                    onChange={handleProfileChange}
                    className="w-full p-2 border rounded"
                    placeholder="e.g., web development, data science"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border shadow-sm">
              <h2 className="text-lg font-semibold mb-3">Blueprint Details</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={blueprintRequest.title}
                    onChange={handleBlueprintChange}
                    className="w-full p-2 border rounded"
                    placeholder="e.g., RAG System with Vector Database"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description *</label>
                  <textarea
                    name="description"
                    value={blueprintRequest.description}
                    onChange={handleBlueprintChange}
                    className="w-full p-2 border rounded"
                    rows={3}
                    placeholder="Describe what you want to build..."
                    required
                  ></textarea>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Complexity</label>
                  <select
                    name="complexity"
                    value={blueprintRequest.complexity || 'moderate'}
                    onChange={handleBlueprintChange}
                    className="w-full p-2 border rounded"
                  >
                    <option value="simple">Simple</option>
                    <option value="moderate">Moderate</option>
                    <option value="complex">Complex</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Tags</label>
                  <div className="flex">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      className="flex-1 p-2 border rounded-l"
                      placeholder="Add technology or concept"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-3 py-2 bg-blue-100 text-blue-600 rounded-r border-y border-r"
                    >
                      Add
                    </button>
                  </div>

                  {blueprintRequest.tags && blueprintRequest.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {blueprintRequest.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-1 text-blue-600 hover:text-blue-800"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded disabled:opacity-50"
            >
              {isLoading ? 'Researching...' : 'Research Blueprint'}
            </button>
          </form>
        </div>

        {/* Right column: Research results */}
        <div>
          <div className="bg-white p-4 rounded-lg border shadow-sm h-full">
            <h2 className="text-lg font-semibold mb-3">Research Results</h2>
            
            {error && (
              <div className="p-3 bg-red-100 text-red-800 rounded mb-4">
                {error}
              </div>
            )}
            
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-3"></div>
                <p className="text-gray-500">Conducting research...</p>
              </div>
            ) : researchResult ? (
              <div className="prose max-w-none overflow-y-auto max-h-[700px]">
                <div className="mb-4 text-sm text-gray-500">
                  Researched at: {new Date(researchResult.timestamp).toLocaleString()}
                </div>
                <div className="whitespace-pre-wrap">{researchResult.content}</div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                Research results will appear here
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 