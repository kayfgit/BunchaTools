import React, { useMemo } from "react";
import {
  Replace,
  Type,
  Braces,
  Copy,
  Check,
} from "lucide-react";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";

interface Match {
  text: string;
  index: number;
  groups: string[];
}

interface RegexFlags {
  g: boolean;
  i: boolean;
  m: boolean;
  s: boolean;
}

interface RegexTesterProps {
  pattern: string;
  setPattern: (pattern: string) => void;
  testText: string;
  setTestText: (text: string) => void;
  replacement: string;
  setReplacement: (replacement: string) => void;
  flags: RegexFlags;
  setFlags: (flags: RegexFlags) => void;
  activeTab: "matches" | "groups" | "replace";
  setActiveTab: (tab: "matches" | "groups" | "replace") => void;
  copiedItem: string | null;
  setCopiedItem: (item: string | null) => void;
  onDragStart: (e: React.MouseEvent) => void;
}

// Quick reference patterns
const QUICK_REFERENCE = [
  { pattern: ".", description: "Any character" },
  { pattern: "\\d", description: "Digit (0-9)" },
  { pattern: "\\w", description: "Word char" },
  { pattern: "\\s", description: "Whitespace" },
  { pattern: "^", description: "Start of string" },
  { pattern: "$", description: "End of string" },
  { pattern: "*", description: "0 or more" },
  { pattern: "+", description: "1 or more" },
  { pattern: "?", description: "0 or 1" },
  { pattern: "{n}", description: "Exactly n" },
  { pattern: "[abc]", description: "Character class" },
  { pattern: "(group)", description: "Capture group" },
];

export function RegexTester({
  pattern,
  setPattern,
  testText,
  setTestText,
  replacement,
  setReplacement,
  flags,
  setFlags,
  activeTab,
  setActiveTab,
  copiedItem,
  setCopiedItem,
  onDragStart,
}: RegexTesterProps) {
  // Build regex from pattern and flags
  const buildRegex = (): RegExp | null => {
    try {
      const flagStr = Object.entries(flags)
        .filter(([_, v]) => v)
        .map(([k]) => k)
        .join("");
      return new RegExp(pattern, flagStr);
    } catch {
      return null;
    }
  };

  // Get all matches with indices
  const matches = useMemo((): Match[] => {
    const regex = buildRegex();
    if (!regex || !testText || !pattern) return [];
    const result: Match[] = [];
    try {
      let match;
      const searchRegex = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
      while ((match = searchRegex.exec(testText)) !== null) {
        result.push({ text: match[0], index: match.index, groups: match.slice(1) });
        if (!regex.flags.includes('g')) break;
        // Prevent infinite loop on zero-length matches
        if (match[0].length === 0) searchRegex.lastIndex++;
      }
    } catch {
      // Invalid regex
    }
    return result;
  }, [pattern, testText, flags]);

  // Get replaced text
  const replacedText = useMemo((): string => {
    const regex = buildRegex();
    if (!regex || !testText || !pattern) return testText;
    try {
      return testText.replace(regex, replacement);
    } catch {
      return testText;
    }
  }, [pattern, testText, replacement, flags]);

  // Check if regex is valid
  const isValidRegex = useMemo(() => {
    try {
      new RegExp(pattern);
      return true;
    } catch {
      return false;
    }
  }, [pattern]);

  const handleCopy = async (text: string, id: string) => {
    try {
      await writeText(text);
      setCopiedItem(id);
      setTimeout(() => setCopiedItem(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleCopyPatternWithFlags = async () => {
    const flagStr = Object.entries(flags)
      .filter(([_, v]) => v)
      .map(([k]) => k)
      .join("");
    const fullPattern = `/${pattern}/${flagStr}`;
    await handleCopy(fullPattern, "pattern");
  };

  // Highlight replacements in text
  const getReplacementHighlightedText = () => {
    const regex = buildRegex();
    if (!regex || !testText || !pattern || matches.length === 0) {
      return <span>{testText}</span>;
    }

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    matches.forEach((match, i) => {
      // Add text before match
      if (match.index > lastIndex) {
        parts.push(<span key={`text-${i}`}>{testText.slice(lastIndex, match.index)}</span>);
      }
      // Add highlighted replacement
      const replacementValue = match.text.replace(regex, replacement);
      parts.push(
        <span key={`replace-${i}`} className="bg-green-500/30 text-green-400 rounded px-0.5">
          {replacementValue}
        </span>
      );
      lastIndex = match.index + match.text.length;
    });

    // Add remaining text
    if (lastIndex < testText.length) {
      parts.push(<span key="text-end">{testText.slice(lastIndex)}</span>);
    }

    return <>{parts}</>;
  };

  return (
    <div className="bg-buncha-bg border border-buncha-border/30 rounded-2xl shadow-2xl overflow-hidden" onMouseDown={onDragStart}>
      {/* Header */}
      <div className="bg-buncha-surface/30 border-b border-buncha-border/30 px-4 py-3 flex items-center" data-drag-region>
        <div className="flex-1 text-center">
          <span className="text-sm font-medium text-buncha-text-muted">Regex Tester</span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Pattern Input */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-white flex items-center gap-2">
              <Braces className="w-4 h-4 text-buncha-accent" />
              Pattern
            </label>
            <button
              onClick={handleCopyPatternWithFlags}
              className="flex items-center gap-1 text-xs text-buncha-text-muted hover:text-buncha-text transition-colors cursor-pointer"
            >
              {copiedItem === "pattern" ? (
                <Check className="w-3 h-3 text-green-500" />
              ) : (
                  <Copy className="w-3 h-3" />
                )}
              Copy with flags
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center bg-buncha-surface/30 border border-buncha-border/30 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-buncha-accent/50 focus-within:border-buncha-accent transition-all">
              <span className="text-buncha-accent font-semibold pl-3">/</span>
              <input
                type="text"
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                placeholder="Enter regex pattern..."
                className={`flex-1 bg-transparent px-2 py-2.5 text-buncha-text placeholder:text-buncha-text-muted focus:outline-none font-mono text-sm ${!isValidRegex && pattern ? "text-red-400" : ""}`}
              />
              <span className="text-buncha-accent font-semibold pr-3">/</span>
            </div>
            {/* Flag toggles */}
            <div className="flex items-center gap-1 bg-buncha-surface/30 border border-buncha-border/30 rounded-xl px-2 py-1">
              {(["g", "i", "m", "s"] as const).map((flag) => (
                <button
                  key={flag}
                  onClick={() => setFlags({ ...flags, [flag]: !flags[flag] })}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-mono font-medium transition-all cursor-pointer ${
                    flags[flag]
                      ? "bg-buncha-accent text-white"
                      : "bg-buncha-surface/30 text-buncha-text-muted hover:bg-buncha-surface/50 border border-buncha-border/30"
                  }`}
                  title={
                    flag === "g" ? "Global" :
                    flag === "i" ? "Case insensitive" :
                    flag === "m" ? "Multiline" :
                    "Dot matches newline"
                  }
                >
                  {flag}
                </button>
              ))}
            </div>
          </div>
          {!isValidRegex && pattern && (
            <p className="text-xs text-red-400 mt-1">Invalid regex pattern</p>
          )}
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-2 gap-4">
          {/* Left Column - Inputs */}
          <div className="space-y-4">
            {/* Test String */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-white flex gap-2 items-center">
                  <Type className="w-4 h-4 text-buncha-accent" />
                  Test String
                </label>
                <span className="text-xs text-buncha-text-muted">{testText.length} chars</span>
              </div>
              <textarea
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                placeholder="Enter text to test against..."
                rows={5}
                className="w-full bg-buncha-surface/30 border border-buncha-border/30 rounded-xl px-4 py-3 text-buncha-text placeholder:text-buncha-text-muted focus:outline-none focus:ring-2 focus:ring-buncha-accent/50 focus:border-buncha-accent transition-all resize-none font-mono text-sm"
              />
            </div>

            {/* Replacement */}
            <div>
              <label className="text-sm font-medium text-white mb-2 flex gap-2 items-center">
                <Replace className="w-4 h-4 text-buncha-accent" />
                Replacement
              </label>
              <input
                type="text"
                value={replacement}
                onChange={(e) => setReplacement(e.target.value)}
                placeholder="Replacement text (use $1, $2 for groups)"
                className="w-full bg-buncha-surface/30 border border-buncha-border/30 rounded-xl px-4 py-3 text-buncha-text placeholder:text-buncha-text-muted focus:outline-none focus:ring-2 focus:ring-buncha-accent/50 focus:border-buncha-accent transition-all font-mono text-sm"
              />
            </div>
          </div>

          {/* Right Column - Results */}
          <div className="bg-buncha-surface/20 border border-buncha-border/30 rounded-xl overflow-hidden flex flex-col">
            {/* Tab Buttons */}
            <div className="flex border-b border-buncha-border/30">
              {(["matches", "groups", "replace"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 px-4 py-2.5 text-sm font-medium transition-all cursor-pointer ${
                    activeTab === tab
                      ? "bg-buncha-accent/10 text-buncha-accent border-b-2 border-buncha-accent"
                      : "text-buncha-text-muted hover:text-buncha-text hover:bg-buncha-surface/30"
                  }`}
                >
                  {tab === "matches" && `Matches (${matches.length})`}
                  {tab === "groups" && "Groups"}
                  {tab === "replace" && "Replace"}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 p-3 overflow-y-auto max-h-48">
              {activeTab === "matches" && (
                <div className="space-y-2">
                  {matches.length === 0 ? (
                    <p className="text-sm text-buncha-text-muted text-center py-4">
                      {pattern ? "No matches found" : "Enter a pattern to find matches"}
                    </p>
                  ) : (
                    matches.map((match, i) => (
                      <div
                        key={i}
                        className="border border-buncha-border/30 hover:border-buncha-accent flex items-center justify-between bg-buncha-surface/30 rounded-lg px-3 py-2"
                      >
                        <div className="flex items-center gap-3 ">
                          <span className="text-xs text-buncha-text-muted">@{match.index}</span>
                          <code className="text-sm text-buncha-accent font-mono">{match.text}</code>
                        </div>
                        <button
                          onClick={() => handleCopy(match.text, `match-${i}`)}
                          className="p-1 hover:bg-buncha-surface rounded transition-colors cursor-pointer"
                        >
                          {copiedItem === `match-${i}` ? (
                            <Check className="w-3.5 h-3.5 text-green-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-buncha-text-muted" />
                          )}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === "groups" && (
                <div className="space-y-3">
                  {matches.length === 0 ? (
                    <p className="text-sm text-buncha-text-muted text-center py-4">
                      {pattern ? "No matches found" : "Enter a pattern to find groups"}
                    </p>
                  ) : matches.every(m => m.groups.length === 0) ? (
                    <p className="text-sm text-buncha-text-muted text-center py-4">
                      No capture groups in pattern
                    </p>
                  ) : (
                    matches.map((match, matchIndex) => (
                      match.groups.length > 0 && (
                        <div key={matchIndex} className="bg-buncha-surface/30 rounded-lg p-3">
                          <div className="text-xs text-buncha-text-muted mb-2">Match {matchIndex + 1}</div>
                          <div className="space-y-1">
                            {match.groups.map((group, groupIndex) => (
                              <div key={groupIndex} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-buncha-accent">${groupIndex + 1}</span>
                                  <code className="text-sm text-buncha-text font-mono">{group || "(empty)"}</code>
                                </div>
                                {group && (
                                  <button
                                    onClick={() => handleCopy(group, `group-${matchIndex}-${groupIndex}`)}
                                    className="p-1 hover:bg-buncha-surface rounded transition-colors cursor-pointer"
                                  >
                                    {copiedItem === `group-${matchIndex}-${groupIndex}` ? (
                                      <Check className="w-3 h-3 text-green-500" />
                                    ) : (
                                      <Copy className="w-3 h-3 text-buncha-text-muted" />
                                    )}
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    ))
                  )}
                </div>
              )}

              {activeTab === "replace" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-buncha-text-muted">Preview Result</span>
                    <button
                      onClick={() => handleCopy(replacedText, "replaced")}
                      className="flex items-center gap-1 text-xs text-buncha-text-muted hover:text-buncha-text transition-colors cursor-pointer"
                    >
                      {copiedItem === "replaced" ? (
                        <Check className="w-3 h-3 text-green-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      Copy result
                    </button>
                  </div>
                  <div className="bg-buncha-bg/30 border border-buncha-border/30 rounded-lg p-3 font-mono text-sm text-white whitespace-pre-wrap break-all">
                    {getReplacementHighlightedText()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Reference */}
        <div className="mt-5 bg-buncha-surface/30 border border-buncha-border/30 rounded-xl p-4">
          <label className="text-sm font-medium text-white mb-2 block">Quick Reference</label>
          <div className="grid grid-cols-6 gap-2">
            {QUICK_REFERENCE.map((item) => (
              <button
                key={item.pattern}
                onClick={() => handleCopy(item.pattern, `ref-${item.pattern}`)}
                className="flex bg-buncha-bg/30 border border-buncha-border/30 rounded-lg px-2 py-1.5 text-left hover:bg-buncha-surface/50 hover:border-buncha-accent/50 transition-all cursor-pointer group"
                title={item.description}
              >
                <code className="text-xs text-buncha-accent font-bold mr-2">{item.pattern}</code>
                <p className="text-[10px] text-white/50 truncate">{item.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
