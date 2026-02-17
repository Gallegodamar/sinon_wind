import React, { useCallback, useEffect, useRef, useState } from 'react';
import { WordData } from '../../types';
import { AppShell } from '../layout/AppShell';
import { fetchDictionaryDefinitionsByWord } from '../../lib/supabaseRepo';

type ReviewScreenProps = {
  playedWordData: WordData[];
  onBack: () => void;
  topRightControl?: React.ReactNode;
};

type FlyoutPosition = {
  top: number;
  left: number;
};

const FLYOUT_MAX_WIDTH = 360;
const FLYOUT_SIDE_GAP = 10;
const FLYOUT_EDGE_GAP = 12;
const DICTIONARY_LOOKUP_TIMEOUT_MS = 6_000;

const normalizeWordKey = (word: string): string => word.trim().toLowerCase();

const buildOnlineDictionaryUrl = (word: string): string =>
  `https://hiztegiak.elhuyar.eus/eu/${encodeURIComponent(word)}`;

export const ReviewScreen: React.FC<ReviewScreenProps> = ({
  playedWordData,
  onBack,
  topRightControl,
}) => {
  const [definitionsByWord, setDefinitionsByWord] = useState<Record<string, string[]>>({});
  const [isLoadingByWord, setIsLoadingByWord] = useState<Record<string, boolean>>({});
  const [errorByWord, setErrorByWord] = useState<Record<string, string | null>>({});
  const [activeWordKey, setActiveWordKey] = useState<string | null>(null);
  const [activeWordLabel, setActiveWordLabel] = useState<string | null>(null);
  const [flyoutPosition, setFlyoutPosition] = useState<FlyoutPosition | null>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const flyoutRef = useRef<HTMLDivElement | null>(null);
  const isMountedRef = useRef(true);
  const definitionsByWordRef = useRef<Record<string, string[]>>({});
  const isLoadingByWordRef = useRef<Record<string, boolean>>({});
  const errorByWordRef = useRef<Record<string, string | null>>({});
  const activeRequestByWordRef = useRef<Record<string, string>>({});
  const lookupTimeoutByWordRef = useRef<
    Record<string, ReturnType<typeof setTimeout>>
  >({});
  const requestCounterRef = useRef(0);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      Object.values(lookupTimeoutByWordRef.current).forEach((timeoutHandle) => {
        clearTimeout(timeoutHandle);
      });
      lookupTimeoutByWordRef.current = {};
    };
  }, []);

  useEffect(() => {
    definitionsByWordRef.current = definitionsByWord;
  }, [definitionsByWord]);

  useEffect(() => {
    isLoadingByWordRef.current = isLoadingByWord;
  }, [isLoadingByWord]);

  useEffect(() => {
    errorByWordRef.current = errorByWord;
  }, [errorByWord]);

  const loadDefinitionsForWord = useCallback((word: string) => {
    const key = normalizeWordKey(word);
    if (!key) return;

    const hasCached = Object.prototype.hasOwnProperty.call(
      definitionsByWordRef.current,
      key
    );
    const hasPreviousError = Boolean(errorByWordRef.current[key]);
    if (hasCached && !hasPreviousError) return;
    if (isLoadingByWordRef.current[key]) return;

    const requestId = `${Date.now()}-${requestCounterRef.current++}`;
    activeRequestByWordRef.current[key] = requestId;
    isLoadingByWordRef.current = {
      ...isLoadingByWordRef.current,
      [key]: true,
    };
    errorByWordRef.current = {
      ...errorByWordRef.current,
      [key]: null,
    };

    setIsLoadingByWord((previous) => ({ ...previous, [key]: true }));
    setErrorByWord((previous) => ({ ...previous, [key]: null }));

    const finalize = (definitions: string[], errorMessage: string | null) => {
      if (!isMountedRef.current) return;
      if (activeRequestByWordRef.current[key] !== requestId) return;
      const timeoutHandle = lookupTimeoutByWordRef.current[key];
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
        delete lookupTimeoutByWordRef.current[key];
      }

      delete activeRequestByWordRef.current[key];
      definitionsByWordRef.current = {
        ...definitionsByWordRef.current,
        [key]: definitions,
      };
      errorByWordRef.current = {
        ...errorByWordRef.current,
        [key]: errorMessage,
      };
      isLoadingByWordRef.current = {
        ...isLoadingByWordRef.current,
        [key]: false,
      };

      setDefinitionsByWord((previous) => ({
        ...previous,
        [key]: definitions,
      }));
      setErrorByWord((previous) => ({
        ...previous,
        [key]: errorMessage,
      }));
      setIsLoadingByWord((previous) => ({
        ...previous,
        [key]: false,
      }));
    };

    lookupTimeoutByWordRef.current[key] = setTimeout(() => {
      finalize(
        [],
        'Datu-baseko kontsulta luzeegia izan da. Erabili online bilaketa.'
      );
    }, DICTIONARY_LOOKUP_TIMEOUT_MS);

    void fetchDictionaryDefinitionsByWord(word)
      .then((definitions) => {
        finalize(definitions, null);
      })
      .catch(() => {
        finalize([], 'Errorea datu-baseko definizioak bilatzean.');
      });
  }, []);

  const updateFlyoutPosition = useCallback((wordKey: string) => {
    const trigger = triggerRefs.current[wordKey];
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const flyoutWidth = Math.min(FLYOUT_MAX_WIDTH, window.innerWidth - FLYOUT_EDGE_GAP * 2);

    let left = rect.right + FLYOUT_SIDE_GAP;
    if (left + flyoutWidth > window.innerWidth - FLYOUT_EDGE_GAP) {
      left = rect.left - flyoutWidth - FLYOUT_SIDE_GAP;
    }
    if (left < FLYOUT_EDGE_GAP) left = FLYOUT_EDGE_GAP;

    let top = rect.top - 8;
    const maxTop = window.innerHeight - 230;
    if (top > maxTop) top = maxTop;
    if (top < FLYOUT_EDGE_GAP) top = FLYOUT_EDGE_GAP;

    setFlyoutPosition({ top, left });
  }, []);

  const toggleDefinitionFlyout = useCallback(
    (word: string) => {
      const wordKey = normalizeWordKey(word);
      if (!wordKey) return;

      if (activeWordKey === wordKey) {
        setActiveWordKey(null);
        setActiveWordLabel(null);
        return;
      }

      setActiveWordKey(wordKey);
      setActiveWordLabel(word.trim());
      updateFlyoutPosition(wordKey);
      void loadDefinitionsForWord(word);
    },
    [activeWordKey, loadDefinitionsForWord, updateFlyoutPosition]
  );

  useEffect(() => {
    if (!activeWordKey) return;

    const handleReposition = () => updateFlyoutPosition(activeWordKey);
    handleReposition();

    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [activeWordKey, updateFlyoutPosition]);

  useEffect(() => {
    if (!activeWordKey) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveWordKey(null);
        setActiveWordLabel(null);
      }
    };

    const handleOutsideClick = (event: MouseEvent) => {
      const targetNode = event.target as Node;
      const trigger = triggerRefs.current[activeWordKey];

      if (flyoutRef.current?.contains(targetNode)) return;
      if (trigger?.contains(targetNode)) return;
      setActiveWordKey(null);
      setActiveWordLabel(null);
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [activeWordKey]);

  const activeDefinitions = activeWordKey
    ? definitionsByWord[activeWordKey] ?? []
    : [];
  const activeLookupLoaded = activeWordKey
    ? Object.prototype.hasOwnProperty.call(definitionsByWord, activeWordKey)
    : false;
  const activeLookupLoading = activeWordKey
    ? Boolean(isLoadingByWord[activeWordKey])
    : false;
  const activeLookupError = activeWordKey ? errorByWord[activeWordKey] : null;

  return (
    <AppShell
      topRightControl={topRightControl}
      header={
        <div className="flex w-full items-center justify-between gap-3">
          <button onClick={onBack} className="btn-ghost">
            Atzera
          </button>
          <div className="text-center">
            <h2 className="font-display text-lg font-semibold text-slate-900 md:text-xl">
              Partidako Hitzak
            </h2>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
            {playedWordData.length}
          </span>
        </div>
      }
    >
      <section className="space-y-3">
        {playedWordData.length === 0 ? (
          <div className="surface-card surface-card--muted p-10 text-center">
            <p className="font-display text-2xl font-semibold text-slate-700">
              Ez dago hitzik berrikusteko
            </p>
          </div>
        ) : (
          playedWordData.map((data, index) => (
            <article
              key={`${data.hitza}-${index}`}
              className="surface-card p-4 md:p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-bold text-sky-700">
                    #{index + 1}
                  </span>
                  <button
                    type="button"
                    ref={(node) => {
                      triggerRefs.current[normalizeWordKey(data.hitza)] = node;
                    }}
                    onClick={() => toggleDefinitionFlyout(data.hitza)}
                    className="font-display text-2xl font-semibold text-slate-900 transition hover:text-sky-700"
                    aria-expanded={activeWordKey === normalizeWordKey(data.hitza)}
                  >
                    {data.hitza}
                  </button>
                </div>
                <a
                  href={buildOnlineDictionaryUrl(data.hitza)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary !py-2 !text-xs"
                >
                  Bilatu online
                </a>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {data.sinonimoak.map((synonym, synonymIndex) => (
                  <button
                    key={`${synonym}-${synonymIndex}`}
                    type="button"
                    ref={(node) => {
                      triggerRefs.current[normalizeWordKey(synonym)] = node;
                    }}
                    onClick={() => toggleDefinitionFlyout(synonym)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-sky-300 hover:text-sky-700"
                    aria-expanded={activeWordKey === normalizeWordKey(synonym)}
                  >
                    {synonym}
                  </button>
                ))}
              </div>
            </article>
          ))
        )}
      </section>

      {activeWordKey && activeWordLabel && flyoutPosition ? (
        <div
          ref={flyoutRef}
          className="dictionary-flyout"
          style={{
            top: flyoutPosition.top,
            left: flyoutPosition.left,
          }}
          role="dialog"
          aria-label={`Definizioak: ${activeWordLabel}`}
        >
          <div className="dictionary-flyout__header">
            <p className="font-display text-sm font-semibold text-slate-900">
              {activeWordLabel}
            </p>
            <button
              type="button"
              onClick={() => {
                setActiveWordKey(null);
                setActiveWordLabel(null);
              }}
              className="dictionary-flyout__close"
              aria-label="Itxi definizioak"
            >
              x
            </button>
          </div>

          <div className="dictionary-flyout__body">
            {activeLookupLoading ? (
              <p>Definizioak kargatzen...</p>
            ) : activeLookupError ? (
              <p className="text-rose-600">{activeLookupError}</p>
            ) : activeDefinitions.length > 0 ? (
              <ul className="space-y-2">
                {activeDefinitions.map((definition, definitionIndex) => (
                  <li
                    key={`${activeWordLabel}-${definitionIndex}`}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm"
                  >
                    {definition}
                  </li>
                ))}
              </ul>
            ) : activeLookupLoaded ? (
              <>
                <p>Ez da definiziorik aurkitu datu-basean.</p>
                <a
                  href={buildOnlineDictionaryUrl(activeWordLabel)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="dictionary-flyout__link"
                >
                  Bilatu online
                </a>
              </>
            ) : (
              <>
                <p>Emaitzarik ez. Saiatu berriro edo bilatu online.</p>
                <a
                  href={buildOnlineDictionaryUrl(activeWordLabel)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="dictionary-flyout__link"
                >
                  Bilatu online
                </a>
              </>
            )}
          </div>
        </div>
      ) : null}
    </AppShell>
  );
};
