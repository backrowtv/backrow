"use client";

import { addWordToBlacklist, removeWordFromBlacklist } from "@/app/actions/clubs";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "@phosphor-icons/react";

interface WordBlacklistProps {
  clubId: string;
  words: Array<{ id: string; word: string }>;
}

export function WordBlacklist({ clubId, words: initialWords }: WordBlacklistProps) {
  const [words, _setWords] = useState(initialWords);
  const [newWord, setNewWord] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleAddWord() {
    if (!newWord.trim()) return;

    startTransition(async () => {
      const result = await addWordToBlacklist(clubId, newWord.trim());
      if (result && "error" in result && result.error) {
        setError(result.error);
      } else {
        setNewWord("");
        setError(null);
        router.refresh();
      }
    });
  }

  async function handleRemoveWord(wordId: string) {
    startTransition(async () => {
      const result = await removeWordFromBlacklist(clubId, wordId);
      if (result && "error" in result && result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Word Blacklist</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            placeholder="Enter word to blacklist"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddWord();
              }
            }}
          />
          <Button onClick={handleAddWord} disabled={isPending || !newWord.trim()}>
            Add
          </Button>
        </div>

        {error && (
          <p
            className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1"
            role="alert"
          >
            <span aria-hidden="true">⚠</span>
            {error}
          </p>
        )}

        {words.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No words in blacklist.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {words.map((word) => (
              <div
                key={word.id}
                className="flex items-center gap-2 px-3 py-1 bg-[var(--surface-2)] rounded-lg border"
              >
                <span className="text-sm">{word.word}</span>
                <button
                  onClick={() => handleRemoveWord(word.id)}
                  disabled={isPending}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
