
'use client';

import * as React from 'react';
import Editor, { OnChange } from '@monaco-editor/react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { CodeLanguage } from '@/lib/types';
import { Loader2 } from 'lucide-react';

interface CodeBlockProps {
  value: string;
  onChange?: OnChange;
  language?: CodeLanguage;
  readOnly?: boolean;
  className?: string;
  height?: string;
}

export function CodeBlock({ value, onChange, language = 'text', readOnly = false, className, height = '300px' }: CodeBlockProps) {
  const { resolvedTheme } = useTheme();
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const editorTheme = resolvedTheme === 'dark' || resolvedTheme === 'glass' ? 'vs-dark' : 'light';
  
  const options: import('monaco-editor').editor.IStandaloneEditorConstructionOptions = {
    readOnly,
    minimap: { enabled: false },
    fontSize: 14,
    automaticLayout: true,
    scrollBeyondLastLine: false,
    wordWrap: 'on',
    wrappingIndent: 'indent',
  };

  if (!isMounted) {
    return (
        <div className={cn("relative w-full rounded-md border bg-muted flex items-center justify-center", className)} style={{ height }}>
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className={cn("relative w-full rounded-md border overflow-hidden", className)} style={{ height }}>
       <Editor
        height="100%"
        width="100%"
        language={language}
        value={value}
        theme={editorTheme}
        onChange={onChange}
        options={options}
        loading={<Loader2 className="h-8 w-8 animate-spin text-primary" />}
      />
    </div>
  );
}
