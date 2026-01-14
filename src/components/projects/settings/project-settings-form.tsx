'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDebouncedSave } from '@/lib/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ChevronDown, Save, Tags, FileText, Wand2, Layers } from 'lucide-react';
import { HelpTooltip } from '@/components/ui/help-tooltip';
import {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  type LanguageCode,
} from '@/lib/constants/languages';
import { MetadataFieldsManager, MetadataForm } from '@/components/metadata';
import { SaveAsPresetDialog } from './save-as-preset-dialog';
import { ApplyPresetDialog } from './apply-preset-dialog';

interface ProjectSettingsFormProps {
  projectId: string;
  workspaceId: string;
  initialData: {
    name: string;
    description: string | null;
    language: string;
    projectType?: string | null;
    goals?: string | null;
    context?: string | null;
    deadline?: Date | null;
    stakeholder?: string | null;
    researchQuestions?: string | null;
    targetParticipants?: number | null;
    recruitmentCriteria?: string | null;
    // AI Prompt Configuration
    sourceSummaryPrompt?: string | null;
    projectSummaryPrompt?: string | null;
    themeNamingPrompt?: string | null;
    autoTaggingPrompt?: string | null;
    autoTaggingEnabled?: boolean;
    // Transcription Configuration
    transcriptionVocabulary?: string | null;
    transcriptionContext?: string | null;
  };
}

export function ProjectSettingsForm({
  projectId,
  workspaceId,
  initialData,
}: ProjectSettingsFormProps) {
  const router = useRouter();

  // Collapsible sections state (Basic Info always expanded by default)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basicInfo: true,
    researchSetup: true,
    projectManagement: false,
    aiPrompts: false,
    transcriptionHints: false,
  });

  // Preset dialogs
  const [saveAsPresetOpen, setSaveAsPresetOpen] = useState(false);
  const [applyPresetOpen, setApplyPresetOpen] = useState(false);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Basic Info
  const [name, setName] = useState(initialData.name);
  const [description, setDescription] = useState(initialData.description || '');
  const [language, setLanguage] = useState<LanguageCode>(
    (initialData.language as LanguageCode) || DEFAULT_LANGUAGE
  );
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);

  // Research Setup
  const [projectType, setProjectType] = useState(initialData.projectType || '');
  const [goals, setGoals] = useState(initialData.goals || '');
  const [context, setContext] = useState(initialData.context || '');
  const [researchQuestions, setResearchQuestions] = useState(initialData.researchQuestions || '');

  // Project Management
  const [deadline, setDeadline] = useState(
    initialData.deadline ? new Date(initialData.deadline).toISOString().split('T')[0] : ''
  );
  const [stakeholder, setStakeholder] = useState(initialData.stakeholder || '');
  const [targetParticipants, setTargetParticipants] = useState(
    initialData.targetParticipants?.toString() || ''
  );
  const [recruitmentCriteria, setRecruitmentCriteria] = useState(
    initialData.recruitmentCriteria || ''
  );

  // AI Prompt Configuration
  const [sourceSummaryPrompt, setSourceSummaryPrompt] = useState(
    initialData.sourceSummaryPrompt || ''
  );
  const [projectSummaryPrompt, setProjectSummaryPrompt] = useState(
    initialData.projectSummaryPrompt || ''
  );
  const [themeNamingPrompt, setThemeNamingPrompt] = useState(initialData.themeNamingPrompt || '');
  const [autoTaggingPrompt, setAutoTaggingPrompt] = useState(initialData.autoTaggingPrompt || '');
  const [autoTaggingEnabled, setAutoTaggingEnabled] = useState(
    initialData.autoTaggingEnabled || false
  );

  // Transcription Configuration
  const [transcriptionVocabulary, setTranscriptionVocabulary] = useState(
    initialData.transcriptionVocabulary || ''
  );
  const [transcriptionContext, setTranscriptionContext] = useState(
    initialData.transcriptionContext || ''
  );

  // Save function (called by useDebouncedSave hook)
  const saveSettings = useCallback(async () => {
    if (!name.trim()) {
      throw new Error('Project name is required');
    }

    const response = await fetch(`/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description: description || null,
        language,
        projectType: projectType || null,
        goals: goals || null,
        context: context || null,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        stakeholder: stakeholder || null,
        researchQuestions: researchQuestions || null,
        targetParticipants: targetParticipants ? parseInt(targetParticipants, 10) : null,
        recruitmentCriteria: recruitmentCriteria || null,
        sourceSummaryPrompt: sourceSummaryPrompt || null,
        projectSummaryPrompt: projectSummaryPrompt || null,
        themeNamingPrompt: themeNamingPrompt || null,
        autoTaggingPrompt: autoTaggingPrompt || null,
        autoTaggingEnabled,
        transcriptionVocabulary: transcriptionVocabulary || null,
        transcriptionContext: transcriptionContext || null,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to update project');
    }

    router.refresh();
  }, [
    projectId,
    name,
    description,
    language,
    projectType,
    goals,
    context,
    deadline,
    stakeholder,
    researchQuestions,
    targetParticipants,
    recruitmentCriteria,
    sourceSummaryPrompt,
    projectSummaryPrompt,
    themeNamingPrompt,
    autoTaggingPrompt,
    autoTaggingEnabled,
    transcriptionVocabulary,
    transcriptionContext,
    router,
  ]);

  // Auto-save with debounce - hook handles toast notifications
  useDebouncedSave(saveSettings, [
    name,
    description,
    language,
    projectType,
    goals,
    context,
    deadline,
    stakeholder,
    researchQuestions,
    targetParticipants,
    recruitmentCriteria,
    sourceSummaryPrompt,
    projectSummaryPrompt,
    themeNamingPrompt,
    autoTaggingPrompt,
    autoTaggingEnabled,
    transcriptionVocabulary,
    transcriptionContext,
  ]);

  const inputClass =
    'w-full rounded-lg border border-gray-800 bg-gray-950 px-4 py-2.5 text-white placeholder-gray-500 transition-colors outline-none focus:border-accent-primary';
  const labelClass = 'mb-2 block text-sm font-medium text-white';

  return (
    <div className="space-y-6 pb-8">
      {/* Basic Information Card */}
      <Card className="border-gray-800 bg-gray-900">
        <CardHeader
          className="cursor-pointer select-none"
          onClick={() => toggleSection('basicInfo')}
        >
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center text-white">
                Basic Information
                <HelpTooltip>Project name, description, and default language</HelpTooltip>
              </CardTitle>
            </div>
            <ChevronDown
              size={20}
              className={`text-gray-400 transition-transform ${expandedSections.basicInfo ? 'rotate-180' : ''}`}
            />
          </div>
        </CardHeader>
        {expandedSections.basicInfo && (
          <CardContent className="space-y-4">
            {/* Name Input */}
            <div>
              <label htmlFor="name" className={labelClass}>
                Project Name *
              </label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., User Research Q1 2024"
                required
                className={inputClass}
              />
            </div>

            {/* Description Input */}
            <div>
              <label htmlFor="description" className={labelClass}>
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of your research project..."
                rows={3}
                className={inputClass}
              />
            </div>

            {/* Language Dropdown */}
            <div>
              <label htmlFor="language" className={labelClass}>
                Default Language
                <HelpTooltip>Language for transcribing sources in this project</HelpTooltip>
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setLanguageDropdownOpen(!languageDropdownOpen)}
                  className={`${inputClass} flex items-center justify-between`}
                >
                  <span>
                    {SUPPORTED_LANGUAGES.find((l) => l.code === language)?.name ||
                      'Select language'}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`text-gray-400 transition-transform ${languageDropdownOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {languageDropdownOpen && (
                  <div className="absolute right-0 left-0 z-10 mt-1 max-h-60 overflow-auto rounded-lg border border-gray-800 bg-gray-950 py-1 shadow-lg">
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => {
                          setLanguage(lang.code);
                          setLanguageDropdownOpen(false);
                        }}
                        className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors ${
                          language === lang.code
                            ? 'bg-accent-primary/20 text-white'
                            : 'text-gray-300 hover:bg-gray-800'
                        }`}
                      >
                        {lang.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Research Setup Card */}
      <Card className="border-gray-800 bg-gray-900">
        <CardHeader
          className="cursor-pointer select-none"
          onClick={() => toggleSection('researchSetup')}
        >
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center text-white">
                Research Setup
                <HelpTooltip>Define your research methodology and objectives</HelpTooltip>
              </CardTitle>
            </div>
            <ChevronDown
              size={20}
              className={`text-gray-400 transition-transform ${expandedSections.researchSetup ? 'rotate-180' : ''}`}
            />
          </div>
        </CardHeader>
        {expandedSections.researchSetup && (
          <CardContent className="space-y-4">
            {/* Project Type */}
            <div>
              <label htmlFor="projectType" className={labelClass}>
                Project Type / Methodology
              </label>
              <Input
                id="projectType"
                type="text"
                value={projectType}
                onChange={(e) => setProjectType(e.target.value)}
                placeholder="e.g., Usability Testing, JTBD Interview, Diary Study"
                className={inputClass}
              />
            </div>

            {/* Goals */}
            <div>
              <label htmlFor="goals" className={labelClass}>
                Research Goals
              </label>
              <textarea
                id="goals"
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                placeholder="What do you want to achieve with this research?"
                rows={3}
                className={inputClass}
              />
            </div>

            {/* Context */}
            <div>
              <label htmlFor="context" className={labelClass}>
                Study Context
              </label>
              <textarea
                id="context"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Background information, business context, previous findings..."
                rows={3}
                className={inputClass}
              />
            </div>

            {/* Research Questions */}
            <div>
              <label htmlFor="researchQuestions" className={labelClass}>
                Key Research Questions
              </label>
              <textarea
                id="researchQuestions"
                value={researchQuestions}
                onChange={(e) => setResearchQuestions(e.target.value)}
                placeholder="The main questions this research aims to answer..."
                rows={4}
                className={inputClass}
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Project Management Card */}
      <Card className="border-gray-800 bg-gray-900">
        <CardHeader
          className="cursor-pointer select-none"
          onClick={() => toggleSection('projectManagement')}
        >
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center text-white">
                Project Management
                <HelpTooltip>Timeline, stakeholders, and participant targets</HelpTooltip>
              </CardTitle>
            </div>
            <ChevronDown
              size={20}
              className={`text-gray-400 transition-transform ${expandedSections.projectManagement ? 'rotate-180' : ''}`}
            />
          </div>
        </CardHeader>
        {expandedSections.projectManagement && (
          <CardContent className="space-y-4">
            {/* Stakeholder */}
            <div>
              <label htmlFor="stakeholder" className={labelClass}>
                Stakeholder / Client
              </label>
              <Input
                id="stakeholder"
                type="text"
                value={stakeholder}
                onChange={(e) => setStakeholder(e.target.value)}
                placeholder="e.g., Product Team, CEO, Client: Acme Corp"
                className={inputClass}
              />
            </div>

            {/* Deadline */}
            <div>
              <label htmlFor="deadline" className={labelClass}>
                Deadline
              </label>
              <Input
                id="deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className={inputClass}
              />
            </div>

            {/* Target Participants */}
            <div>
              <label htmlFor="targetParticipants" className={labelClass}>
                Target Participants
              </label>
              <Input
                id="targetParticipants"
                type="number"
                min="1"
                value={targetParticipants}
                onChange={(e) => setTargetParticipants(e.target.value)}
                placeholder="Number of participants needed"
                className={inputClass}
              />
            </div>

            {/* Recruitment Criteria */}
            <div>
              <label htmlFor="recruitmentCriteria" className={labelClass}>
                Recruitment Criteria
              </label>
              <textarea
                id="recruitmentCriteria"
                value={recruitmentCriteria}
                onChange={(e) => setRecruitmentCriteria(e.target.value)}
                placeholder="Who should participate? What criteria must they meet?"
                rows={4}
                className={inputClass}
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* AI Guidelines Card */}
      <Card className="border-gray-800 bg-gray-900">
        <CardHeader
          className="cursor-pointer select-none"
          onClick={() => toggleSection('aiPrompts')}
        >
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center text-white">
                AI Guidelines
                <HelpTooltip>
                  Provide additional instructions for AI tasks. These guidelines augment the system
                  prompts, which automatically include your Research Setup context.
                </HelpTooltip>
              </CardTitle>
            </div>
            <ChevronDown
              size={20}
              className={`text-gray-400 transition-transform ${expandedSections.aiPrompts ? 'rotate-180' : ''}`}
            />
          </div>
        </CardHeader>
        {expandedSections.aiPrompts && (
          <CardContent className="space-y-4">
            {/* Source Summary Guidelines */}
            <div>
              <label htmlFor="sourceSummaryPrompt" className={labelClass}>
                Source Summary Guidelines
                <HelpTooltip>
                  Additional instructions for how AI should summarize individual sources
                  (interviews, recordings).
                </HelpTooltip>
              </label>
              <textarea
                id="sourceSummaryPrompt"
                value={sourceSummaryPrompt}
                onChange={(e) => setSourceSummaryPrompt(e.target.value)}
                placeholder="e.g., Focus on pain points and feature requests. Highlight mentions of competitor products."
                rows={4}
                className={inputClass}
              />
            </div>

            {/* Project Summary Guidelines */}
            <div>
              <label htmlFor="projectSummaryPrompt" className={labelClass}>
                Project Summary Guidelines
                <HelpTooltip>
                  Additional instructions for how AI should synthesize insights across all sources.
                </HelpTooltip>
              </label>
              <textarea
                id="projectSummaryPrompt"
                value={projectSummaryPrompt}
                onChange={(e) => setProjectSummaryPrompt(e.target.value)}
                placeholder="e.g., Prioritize findings related to mobile experience. Group insights by user segment."
                rows={4}
                className={inputClass}
              />
            </div>

            {/* Theme Naming Guidelines */}
            <div>
              <label htmlFor="themeNamingPrompt" className={labelClass}>
                Theme Naming Guidelines (Magic Clusters)
                <HelpTooltip>
                  Additional instructions for how AI should name and describe theme clusters.
                </HelpTooltip>
              </label>
              <textarea
                id="themeNamingPrompt"
                value={themeNamingPrompt}
                onChange={(e) => setThemeNamingPrompt(e.target.value)}
                placeholder="e.g., Use action-oriented names. Include sentiment in descriptions."
                rows={3}
                className={inputClass}
              />
            </div>

            {/* Auto-tagging (future feature - disabled) */}
            <div className="opacity-50">
              <label htmlFor="autoTaggingPrompt" className={labelClass}>
                Auto-tagging Guidelines (Coming Soon)
                <HelpTooltip>Additional instructions for automatic highlight tagging.</HelpTooltip>
              </label>
              <textarea
                id="autoTaggingPrompt"
                value={autoTaggingPrompt}
                onChange={(e) => setAutoTaggingPrompt(e.target.value)}
                placeholder="Feature coming soon..."
                rows={3}
                disabled
                className={`${inputClass} cursor-not-allowed`}
              />
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoTaggingEnabled"
                  checked={autoTaggingEnabled}
                  onChange={(e) => setAutoTaggingEnabled(e.target.checked)}
                  disabled
                  className="h-4 w-4 cursor-not-allowed"
                />
                <label htmlFor="autoTaggingEnabled" className="text-sm text-gray-400">
                  Enable auto-tagging
                </label>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Transcription Configuration Card */}
      <Card className="border-gray-800 bg-gray-900">
        <CardHeader
          className="cursor-pointer select-none"
          onClick={() => toggleSection('transcriptionHints')}
        >
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center text-white">
                Transcription Hints
                <HelpTooltip>
                  Help improve transcription accuracy with domain-specific vocabulary and context.
                </HelpTooltip>
              </CardTitle>
            </div>
            <ChevronDown
              size={20}
              className={`text-gray-400 transition-transform ${expandedSections.transcriptionHints ? 'rotate-180' : ''}`}
            />
          </div>
        </CardHeader>
        {expandedSections.transcriptionHints && (
          <CardContent className="space-y-4">
            {/* Vocabulary */}
            <div>
              <label htmlFor="transcriptionVocabulary" className={labelClass}>
                Domain Vocabulary
                <HelpTooltip>
                  Comma-separated list of domain terms, product names, or jargon that may appear in
                  transcripts.
                </HelpTooltip>
              </label>
              <textarea
                id="transcriptionVocabulary"
                value={transcriptionVocabulary}
                onChange={(e) => setTranscriptionVocabulary(e.target.value)}
                placeholder="e.g., Figma, wireframe, user flow, A/B test, sprint..."
                rows={3}
                className={inputClass}
              />
            </div>

            {/* Context */}
            <div>
              <label htmlFor="transcriptionContext" className={labelClass}>
                Transcription Context
                <HelpTooltip>
                  Brief context to help the AI understand the content (e.g., industry, topic).
                </HelpTooltip>
              </label>
              <textarea
                id="transcriptionContext"
                value={transcriptionContext}
                onChange={(e) => setTranscriptionContext(e.target.value)}
                placeholder="e.g., UX research interviews for a fintech mobile app..."
                rows={3}
                className={inputClass}
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Project Custom Metadata (defined at workspace level) */}
      <MetadataForm
        entityType="PROJECT"
        entityId={projectId}
        parentId={workspaceId}
        title="Custom Project Fields"
        description="Additional fields defined at the workspace level"
        configureUrl={`/settings/workspace?expand=${workspaceId}`}
      />

      {/* Source Metadata Fields Manager (defines fields for sources in this project) */}
      <div id="source-metadata">
        <MetadataFieldsManager
          entityType="SOURCE"
          parentId={projectId}
          title="Source Metadata Fields"
          description="Define custom fields that can be filled for each source in this project"
        />
      </div>

      {/* Apply Preset Card */}
      <Card className="border-gray-800 bg-gray-900">
        <CardHeader>
          <CardTitle className="flex items-center text-white">
            Apply Preset
            <HelpTooltip>
              Add tags, metadata fields, and AI prompts from a preset to this project
            </HelpTooltip>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-2 text-xs text-gray-400">
            <span className="flex items-center gap-1 rounded bg-gray-800 px-2 py-1">
              <Tags size={12} />
              Tags (merged)
            </span>
            <span className="flex items-center gap-1 rounded bg-gray-800 px-2 py-1">
              <FileText size={12} />
              Metadata fields (merged)
            </span>
            <span className="flex items-center gap-1 rounded bg-gray-800 px-2 py-1">
              <Wand2 size={12} />
              AI prompts (overwritten)
            </span>
          </div>
          <button
            type="button"
            onClick={() => setApplyPresetOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-700"
          >
            <Layers size={16} />
            Apply Preset
          </button>
        </CardContent>
      </Card>

      {/* Save as Preset Card */}
      <Card className="border-gray-800 bg-gray-900">
        <CardHeader>
          <CardTitle className="flex items-center text-white">
            Save as Preset
            <HelpTooltip>
              Save this project&apos;s configuration as a reusable preset for new projects
            </HelpTooltip>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-2 text-xs text-gray-400">
            <span className="flex items-center gap-1 rounded bg-gray-800 px-2 py-1">
              <Tags size={12} />
              Tags
            </span>
            <span className="flex items-center gap-1 rounded bg-gray-800 px-2 py-1">
              <FileText size={12} />
              Metadata fields
            </span>
            <span className="flex items-center gap-1 rounded bg-gray-800 px-2 py-1">
              <Wand2 size={12} />
              AI prompts
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSaveAsPresetOpen(true)}
            className="bg-accent-primary hover:bg-accent-primary/90 flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors"
          >
            <Save size={16} />
            Save as Preset
          </button>
        </CardContent>
      </Card>

      {/* Apply Preset Dialog */}
      <ApplyPresetDialog
        projectId={projectId}
        isOpen={applyPresetOpen}
        onClose={() => setApplyPresetOpen(false)}
        onApplied={() => window.location.reload()}
      />

      {/* Save as Preset Dialog */}
      <SaveAsPresetDialog
        projectId={projectId}
        projectName={name}
        isOpen={saveAsPresetOpen}
        onClose={() => setSaveAsPresetOpen(false)}
      />
    </div>
  );
}
