/*
 * Copyright (c) 2024 Hemang Parmar
 */

import Editor, { type OnMount } from '@monaco-editor/react';
import { useCallback, useRef } from 'react';

interface CodeEditorProps {
  value: string;
  language: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string | number;
  readOnly?: boolean;
}

export function CodeEditor({ value, language, onChange, height = '320px', readOnly = false }: CodeEditorProps) {
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);

  const handleMount = useCallback<OnMount>((editor, monaco) => {
    editorRef.current = editor;
    monaco.editor.defineTheme('devassist-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#0f172a',
        'editor.lineHighlightBackground': '#1e293b',
      },
    });
    monaco.editor.setTheme('devassist-dark');
  }, []);

  return (
    <div className="rounded-lg overflow-hidden border border-white/10 bg-[#0f172a]">
      <Editor
        value={value}
        language={normaliseLanguage(language)}
        onChange={(v) => onChange(v ?? '')}
        height={height}
        onMount={handleMount}
        options={{
          readOnly,
          fontFamily: 'JetBrains Mono, Menlo, monospace',
          fontSize: 13,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          wordWrap: 'on',
          tabSize: 2,
          renderLineHighlight: 'line',
          padding: { top: 10, bottom: 10 },
        }}
      />
    </div>
  );
}

function normaliseLanguage(lang: string): string {
  const map: Record<string, string> = {
    ts: 'typescript',
    js: 'javascript',
    py: 'python',
    rb: 'ruby',
    rs: 'rust',
    'go-test': 'go',
  };
  return map[lang] ?? lang;
}
