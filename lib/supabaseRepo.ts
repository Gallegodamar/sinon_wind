import { DifficultyLevel, Question, WordData } from '../types';
import {
  DailyLeaderboardEntry,
  DailyRunWithAnswers,
  GameAnswerRow,
  GameRun,
  FailedWordStat,
  PeriodLeaderboardEntry,
  SearchResultItem,
  DictionaryMeaning,
  UserAnswerStatRow,
  OrthographyPoolWord,
  FavoriteWordCard,
} from '../appTypes';
import { supabase } from '../supabase';
import { normalizeSynonyms } from './gameLogic';
import { formatLocalDate, getLocalDayUtcRange } from './dateUtils';

export const searchWords = async (term: string): Promise<SearchResultItem[]> => {
  const { data, error } = await supabase
    .from('syn_words')
    .select('source_id, hitza, sinonimoak, level')
    .ilike('search_text', `%${term}%`)
    .eq('active', true)
    .limit(50);

  if (error || !data) return [];

  const rows = data as Array<{
    source_id: string | number;
    hitza: string;
    sinonimoak: unknown;
    level: DifficultyLevel;
  }>;

  return rows.map((r) => ({
    id: r.source_id,
    hitza: r.hitza,
    sinonimoak: normalizeSynonyms(r.sinonimoak),
    level: r.level,
  }));
};

const DICTIONARY_WORD_COLUMN_CANDIDATES = [
  'hitza',
  'basque',
  'palabra',
  'word',
  'termino',
  'term',
  'lemma',
  'entry',
  'entrada',
  'vocablo',
];

const DICTIONARY_MEANING_COLUMN_CANDIDATES = [
  'esanahia',
  'spanish',
  'significado',
  'definition',
  'meaning',
  'definizioa',
  'azalpena',
  'deskribapena',
  'descripcion',
  'definicion',
  'glosa',
];

const DICTIONARY_DEFINITION_TABLE = 'diccionario_definiciones';

const DICTIONARY_DEFINITION_WORD_COLUMN_CANDIDATES = [
  ...DICTIONARY_WORD_COLUMN_CANDIDATES,
  'hitz',
  'word_text',
  'word_value',
  'lemma_text',
];

const DICTIONARY_DEFINITION_MEANING_COLUMN_CANDIDATES = [
  ...DICTIONARY_MEANING_COLUMN_CANDIDATES,
  'definition_text',
  'meaning_text',
  'desc',
  'description',
  'gloss',
];

let cachedDictionaryWordColumn: string | null = null;
let cachedDictionaryMeaningColumn: string | null = null;
let cachedDictionaryTextColumns: string[] | null = null;
let isDictionaryTableUnavailable = false;
const invalidDictionaryWordColumns = new Set<string>();
let cachedDictionaryDefinitionWordColumn: string | null = null;
let cachedDictionaryDefinitionMeaningColumns: string[] | null = null;
let isDictionaryDefinitionTableUnavailable = false;
const invalidDictionaryDefinitionWordColumns = new Set<string>();
const dictionaryDefinitionsCacheByWord = new Map<string, string[]>();

const DICTIONARY_WORD_KEY_HINTS = [
  'hitz',
  'basq',
  'palabr',
  'word',
  'term',
  'lemma',
  'entrad',
  'vocabl',
];

const DICTIONARY_MEANING_KEY_HINTS = [
  'esanah',
  'spani',
  'signific',
  'defini',
  'mean',
  'azalp',
  'deskrib',
  'descri',
  'glosa',
];

const DICTIONARY_DEFINITION_WORD_KEY_HINTS = [
  ...DICTIONARY_WORD_KEY_HINTS,
  'hitz',
  'entry',
  'lemma',
];

const DICTIONARY_DEFINITION_MEANING_KEY_HINTS = [
  ...DICTIONARY_MEANING_KEY_HINTS,
  'acepcion',
  'acepcio',
  'adiera',
  'sense',
  'desc',
  'defin',
  'gloss',
];

const ORTHOGRAPHY_DICTIONARY_FETCH_LIMIT = 12_000;

const normalizeDictionaryKey = (key: string): string =>
  key.toLowerCase().replace(/[\s_-]/g, '');

const normalizeOrthographyKey = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .trim();

const normalizeDictionaryLookupValue = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const runWithTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T | null> => {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<null>((resolve) => {
    timeoutHandle = setTimeout(() => resolve(null), timeoutMs);
  });

  const result = await Promise.race<[T | null, null]>([
    promise.then((value) => [value, null] as [T, null]),
    timeoutPromise.then(() => [null, null] as [null, null]),
  ]);

  if (timeoutHandle) clearTimeout(timeoutHandle);
  return result[0];
};

const clipText = (value: string, maxLength: number): string => {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trim()}...`;
};

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const maskWordInClue = (clue: string, word: string): string => {
  const normalizedWord = word.trim();
  if (!normalizedWord) return clue;

  let masked = clue;
  const exactPattern = new RegExp(escapeRegExp(normalizedWord), 'ig');
  masked = masked.replace(exactPattern, '_____');

  const accentless = normalizedWord
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (accentless && accentless !== normalizedWord) {
    const accentlessPattern = new RegExp(escapeRegExp(accentless), 'ig');
    masked = masked.replace(accentlessPattern, '_____');
  }

  return masked;
};

const buildSynonymClue = (hitza: string, sinonimoak: string[]): string => {
  const baseKey = normalizeOrthographyKey(hitza);
  const candidateSynonyms = Array.from(
    new Set(
      sinonimoak
        .map((synonym) => synonym.trim())
        .filter(Boolean)
        .filter((synonym) => normalizeOrthographyKey(synonym) !== baseKey)
    )
  );

  if (candidateSynonyms.length === 0) {
    return 'Sinonimoetan oinarritutako pista.';
  }

  return clipText(`Sinonimo pista: ${candidateSynonyms.slice(0, 4).join(', ')}`, 220);
};

const buildDictionaryClue = (hitza: string, meaning: string | null): string => {
  if (!meaning) return 'Hiztegiko pista.';
  const masked = maskWordInClue(meaning, hitza);
  return clipText(masked, 240);
};

const keyMatchesHints = (key: string, hints: string[]): boolean => {
  const normalized = normalizeDictionaryKey(key);
  return hints.some((hint) => normalized.includes(hint));
};

const findColumnKeyByCandidates = (
  keys: string[],
  exactCandidates: string[],
  hintCandidates: string[],
  excluded: string[] = []
): string | null => {
  const excludedSet = new Set(excluded.filter(Boolean));

  for (const key of keys) {
    if (excludedSet.has(key)) continue;
    if (exactCandidates.includes(key.toLowerCase())) return key;
  }

  for (const key of keys) {
    if (excludedSet.has(key)) continue;
    if (keyMatchesHints(key, hintCandidates)) return key;
  }

  return null;
};

const dedupeMeaningTexts = (values: string[]): string[] => {
  const deduped: string[] = [];
  const seen = new Set<string>();

  values.forEach((value) => {
    const normalized = value.replace(/\s+/g, ' ').trim();
    if (!normalized) return;

    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    deduped.push(normalized);
  });

  return deduped;
};

const DICTIONARY_DEFINITION_METADATA_KEYS = new Set([
  'id',
  'source_id',
  'word_id',
  'created_at',
  'updated_at',
  'deleted_at',
  'lang',
  'language',
  'nivel',
  'level',
]);

const splitDefinitionText = (text: string): string[] =>
  text
    .split(/\s*\/\/\s*|\r?\n+/)
    .map((item) => item.trim())
    .filter(Boolean);

const isDictionaryDefinitionMetadataKey = (key: string): boolean =>
  DICTIONARY_DEFINITION_METADATA_KEYS.has(normalizeDictionaryKey(key));

const isLikelyDictionaryDefinitionKey = (key: string): boolean => {
  const normalized = key.toLowerCase();
  if (
    DICTIONARY_DEFINITION_MEANING_COLUMN_CANDIDATES.includes(normalized) ||
    keyMatchesHints(key, DICTIONARY_DEFINITION_MEANING_KEY_HINTS)
  ) {
    return true;
  }
  return normalized.includes('acepcion') || normalized.includes('adiera');
};

const collectDefinitionTextsFromRow = (
  row: Record<string, unknown>,
  wordColumn: string,
  preferredMeaningColumns: string[]
): string[] => {
  const keys = Object.keys(row);
  const preferred = preferredMeaningColumns.filter(
    (key) =>
      key !== wordColumn &&
      keys.includes(key) &&
      !isDictionaryDefinitionMetadataKey(key)
  );

  const inferred = keys.filter(
    (key) =>
      key !== wordColumn &&
      !isDictionaryDefinitionMetadataKey(key) &&
      isLikelyDictionaryDefinitionKey(key)
  );

  const fallback = keys.filter(
    (key) =>
      key !== wordColumn &&
      !isDictionaryDefinitionMetadataKey(key) &&
      valueAsText(row[key]) != null
  );

  const orderedKeys = Array.from(new Set([...preferred, ...inferred, ...fallback]));
  const values = orderedKeys.flatMap((key) => {
    const rawText = valueAsText(row[key]);
    if (!rawText) return [];
    return splitDefinitionText(rawText);
  });

  return dedupeMeaningTexts(values);
};

const isDictionaryErrorForMissingTable = (message: string): boolean =>
  message.includes('relation') && message.includes('diccionario');

const isDictionaryDefinitionErrorForMissingTable = (message: string): boolean =>
  message.includes('relation') && message.includes(DICTIONARY_DEFINITION_TABLE);

const isDictionaryErrorForInvalidColumn = (message: string): boolean =>
  (message.includes('column') && message.includes('does not exist')) ||
  message.includes('operator does not exist') ||
  message.includes('operator ~~*');

const sanitizeSearchToken = (term: string): string =>
  term.replace(/[%_]/g, ' ').replace(/\s+/g, ' ').trim();

const buildDictionarySearchVariants = (term: string): string[] => {
  const stripOuterPunctuation = (value: string): string =>
    value.replace(
      /^[\s"'`´‘’“”«»‹›()[\]{}.,;:!?¿¡\-_/\\]+|[\s"'`´‘’“”«»‹›()[\]{}.,;:!?¿¡\-_/\\]+$/g,
      ''
    );

  const base = term.trim();
  const stripped = stripOuterPunctuation(base);
  const deAccented = stripped
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const candidates = [
    base,
    stripped,
    deAccented,
    stripped.slice(1),
    stripped.slice(0, -1),
    stripped.slice(1, -1),
  ];

  const unique = new Set<string>();
  for (const item of candidates) {
    const cleaned = sanitizeSearchToken(item);
    if (!cleaned || cleaned.length < 2) continue;
    unique.add(cleaned);
  }

  return Array.from(unique);
};

const valueAsText = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (Array.isArray(value)) {
    const parts = value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  }
  return null;
};

const findMeaningKey = (
  row: Record<string, unknown>,
  wordKey: string | null
): string | null => {
  if (cachedDictionaryMeaningColumn) {
    const cachedKey = cachedDictionaryMeaningColumn;
    if (cachedKey !== wordKey && valueAsText(row[cachedKey])) return cachedKey;
  }

  const keys = Object.keys(row);
  for (const key of keys) {
    if (key === wordKey) continue;
    const value = row[key];
    if (!valueAsText(value)) continue;

    if (
      DICTIONARY_MEANING_COLUMN_CANDIDATES.includes(key.toLowerCase()) ||
      keyMatchesHints(key, DICTIONARY_MEANING_KEY_HINTS)
    ) {
      cachedDictionaryMeaningColumn = key;
      return key;
    }
  }

  const fallback = keys.find((key) => {
    if (key === wordKey) return false;
    if (!valueAsText(row[key])) return false;
    return !keyMatchesHints(key, DICTIONARY_WORD_KEY_HINTS);
  });

  if (fallback) return fallback;

  const anyValue = keys.find(
    (key) => key !== wordKey && Boolean(valueAsText(row[key]))
  );
  return anyValue ?? null;
};

const findWordKey = (row: Record<string, unknown>): string | null => {
  if (cachedDictionaryWordColumn && valueAsText(row[cachedDictionaryWordColumn])) {
    return cachedDictionaryWordColumn;
  }

  for (const key of Object.keys(row)) {
    if (!valueAsText(row[key])) continue;
    if (
      DICTIONARY_WORD_COLUMN_CANDIDATES.includes(key.toLowerCase()) ||
      keyMatchesHints(key, DICTIONARY_WORD_KEY_HINTS)
    ) {
      return key;
    }
  }

  return (
    Object.keys(row).find((key) => Boolean(valueAsText(row[key]))) ?? null
  );
};

const probeDictionaryTextColumns = async (): Promise<string[]> => {
  if (isDictionaryTableUnavailable) return [];
  if (cachedDictionaryTextColumns) return cachedDictionaryTextColumns;

  const { data, error } = await supabase
    .from('diccionario')
    .select('*')
    .limit(1);

  if (error) {
    const message = error.message.toLowerCase();
    if (isDictionaryErrorForMissingTable(message)) {
      isDictionaryTableUnavailable = true;
    }
    cachedDictionaryTextColumns = [];
    return [];
  }

  const row = (data?.[0] ?? null) as Record<string, unknown> | null;
  if (!row) {
    cachedDictionaryTextColumns = [...DICTIONARY_WORD_COLUMN_CANDIDATES];
    return cachedDictionaryTextColumns;
  }

  const textKeys = Object.keys(row).filter((key) => {
    const value = row[key];
    return value == null || typeof value === 'string' || Array.isArray(value);
  });

  const ordered = [
    ...textKeys.filter((key) => keyMatchesHints(key, DICTIONARY_WORD_KEY_HINTS)),
    ...textKeys.filter((key) => !keyMatchesHints(key, DICTIONARY_WORD_KEY_HINTS)),
  ];

  if (!cachedDictionaryMeaningColumn) {
    const suggestedMeaningColumn = textKeys.find((key) =>
      keyMatchesHints(key, DICTIONARY_MEANING_KEY_HINTS)
    );
    if (suggestedMeaningColumn) {
      cachedDictionaryMeaningColumn = suggestedMeaningColumn;
    }
  }

  if (!cachedDictionaryWordColumn) {
    const suggestedWordColumn = ordered[0] ?? null;
    if (suggestedWordColumn) {
      cachedDictionaryWordColumn = suggestedWordColumn;
    }
  }

  cachedDictionaryTextColumns = ordered.length > 0
    ? ordered
    : [...DICTIONARY_WORD_COLUMN_CANDIDATES];

  return cachedDictionaryTextColumns;
};

const fetchDictionaryRowByColumn = async (
  column: string,
  terms: string[]
): Promise<Record<string, unknown> | null> => {
  if (isDictionaryTableUnavailable || invalidDictionaryWordColumns.has(column)) {
    return null;
  }

  const normalizeMatchText = (value: string): string =>
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');

  const queryByPattern = async (
    pattern: string,
    limit: number
  ): Promise<Array<Record<string, unknown>> | null> => {
    const { data, error } = await supabase
      .from('diccionario')
      .select('*')
      .ilike(column, pattern)
      .limit(limit);

    if (error) {
      const message = error.message.toLowerCase();
      if (isDictionaryErrorForMissingTable(message)) {
        isDictionaryTableUnavailable = true;
      }
      if (isDictionaryErrorForInvalidColumn(message)) {
        invalidDictionaryWordColumns.add(column);
      }
      return null;
    }

    return (data ?? []) as Array<Record<string, unknown>>;
  };

  for (const term of terms) {
    const exactRows = await queryByPattern(term, 1);
    if (exactRows === null) return null;
    if (exactRows.length > 0) return exactRows[0];
  }

  for (const term of terms) {
    const startsWithRows = await queryByPattern(`${term}%`, 8);
    if (startsWithRows === null) return null;
    if (startsWithRows.length > 0) return startsWithRows[0];
  }

  for (const term of terms) {
    const containsRows = await queryByPattern(`%${term}%`, 40);
    if (containsRows === null) return null;
    if (containsRows.length === 0) continue;

    const normalizedTerm = normalizeMatchText(term);
    let bestRow: Record<string, unknown> | null = null;
    let bestScore = Number.POSITIVE_INFINITY;
    let bestLength = Number.POSITIVE_INFINITY;

    for (const row of containsRows) {
      const candidateValue = valueAsText(row[column]);
      if (!candidateValue) continue;

      const normalizedCandidate = normalizeMatchText(candidateValue);
      if (!normalizedCandidate) continue;

      let score = Number.POSITIVE_INFINITY;
      if (normalizedCandidate === normalizedTerm) {
        score = 0;
      } else if (normalizedCandidate.startsWith(`${normalizedTerm} `)) {
        score = 1;
      } else if (normalizedCandidate.startsWith(normalizedTerm)) {
        score = 2;
      } else if (` ${normalizedCandidate} `.includes(` ${normalizedTerm} `)) {
        score = 3;
      } else {
        const index = normalizedCandidate.indexOf(normalizedTerm);
        if (index >= 0) score = 10 + index;
      }

      if (!Number.isFinite(score)) continue;

      const length = normalizedCandidate.length;
      if (score < bestScore || (score === bestScore && length < bestLength)) {
        bestScore = score;
        bestLength = length;
        bestRow = row;
      }
    }

    if (bestRow) return bestRow;
  }

  return null;
};

type DictionaryDefinitionColumns = {
  wordColumn: string;
  meaningColumns: string[];
};

const probeDictionaryDefinitionColumns = async (): Promise<DictionaryDefinitionColumns | null> => {
  if (isDictionaryDefinitionTableUnavailable) return null;
  if (cachedDictionaryDefinitionWordColumn && cachedDictionaryDefinitionMeaningColumns) {
    return {
      wordColumn: cachedDictionaryDefinitionWordColumn,
      meaningColumns: cachedDictionaryDefinitionMeaningColumns,
    };
  }

  const { data, error } = await supabase
    .from(DICTIONARY_DEFINITION_TABLE)
    .select('*')
    .limit(1);

  if (error) {
    const message = error.message.toLowerCase();
    if (isDictionaryDefinitionErrorForMissingTable(message)) {
      isDictionaryDefinitionTableUnavailable = true;
    }
    return null;
  }

  const row = (data?.[0] ?? null) as Record<string, unknown> | null;
  if (!row) {
    const wordColumn =
      cachedDictionaryDefinitionWordColumn ??
      DICTIONARY_DEFINITION_WORD_COLUMN_CANDIDATES[0];
    const meaningColumns =
      cachedDictionaryDefinitionMeaningColumns ??
      [...DICTIONARY_DEFINITION_MEANING_COLUMN_CANDIDATES];
    cachedDictionaryDefinitionWordColumn = wordColumn;
    cachedDictionaryDefinitionMeaningColumns = meaningColumns;
    return { wordColumn, meaningColumns };
  }

  const keys = Object.keys(row);
  const wordColumn =
    findColumnKeyByCandidates(
      keys,
      DICTIONARY_DEFINITION_WORD_COLUMN_CANDIDATES,
      DICTIONARY_DEFINITION_WORD_KEY_HINTS
    ) ??
    findColumnKeyByCandidates(
      keys,
      DICTIONARY_WORD_COLUMN_CANDIDATES,
      DICTIONARY_WORD_KEY_HINTS
    );
  if (!wordColumn) return null;

  const meaningColumns = keys.filter(
    (key) =>
      key !== wordColumn &&
      !isDictionaryDefinitionMetadataKey(key) &&
      isLikelyDictionaryDefinitionKey(key)
  );

  if (meaningColumns.length === 0) {
    meaningColumns.push(
      ...keys.filter(
        (key) =>
          key !== wordColumn &&
          !isDictionaryDefinitionMetadataKey(key) &&
          valueAsText(row[key]) != null
      )
    );
  }

  if (meaningColumns.length === 0) return null;

  cachedDictionaryDefinitionWordColumn = wordColumn;
  cachedDictionaryDefinitionMeaningColumns = meaningColumns;
  return { wordColumn, meaningColumns };
};

const fetchDictionaryDefinitionRowsByWord = async (
  columns: DictionaryDefinitionColumns,
  terms: string[]
): Promise<Array<Record<string, unknown>> | null> => {
  if (isDictionaryDefinitionTableUnavailable) return null;
  if (invalidDictionaryDefinitionWordColumns.has(columns.wordColumn)) return null;

  const queryByPattern = async (
    pattern: string,
    limit: number
  ): Promise<Array<Record<string, unknown>> | null> => {
    const { data, error } = await supabase
      .from(DICTIONARY_DEFINITION_TABLE)
      .select('*')
      .ilike(columns.wordColumn, pattern)
      .limit(limit);

    if (error) {
      const message = error.message.toLowerCase();
      if (isDictionaryDefinitionErrorForMissingTable(message)) {
        isDictionaryDefinitionTableUnavailable = true;
        return [];
      }

      if (isDictionaryErrorForInvalidColumn(message)) {
        invalidDictionaryDefinitionWordColumns.add(columns.wordColumn);
        return null;
      }

      return [];
    }

    return (data ?? []) as Array<Record<string, unknown>>;
  };

  const stages: Array<{
    patterns: string[];
    toQueryPattern: (term: string) => string;
    limit: number;
  }> = [
    {
      patterns: terms,
      toQueryPattern: (term) => term,
      limit: 60,
    },
    {
      patterns: terms,
      toQueryPattern: (term) => `${term}%`,
      limit: 80,
    },
    {
      patterns: terms,
      toQueryPattern: (term) => `%${term}%`,
      limit: 120,
    },
  ];

  for (const stage of stages) {
    const collectedRows: Array<Record<string, unknown>> = [];

    for (const term of stage.patterns) {
      const rows = await queryByPattern(stage.toQueryPattern(term), stage.limit);
      if (rows === null) return null;
      if (rows.length === 0) continue;
      collectedRows.push(...rows);
    }

    if (collectedRows.length > 0) return collectedRows;
  }

  return [];
};

const fetchDictionaryDefinitionsForWord = async (word: string): Promise<string[]> => {
  const normalizedWord = word.trim();
  if (!normalizedWord) return [];
  if (isDictionaryDefinitionTableUnavailable) return [];

  const cacheKey = normalizeDictionaryLookupValue(normalizedWord);
  if (!cacheKey) return [];

  const cached = dictionaryDefinitionsCacheByWord.get(cacheKey);
  if (cached) return cached;

  const terms = buildDictionarySearchVariants(normalizedWord);
  const fallbackTerms = terms.length > 0 ? terms : [normalizedWord];
  const normalizedTerms = new Set(
    [normalizedWord, ...fallbackTerms]
      .map(normalizeDictionaryLookupValue)
      .filter(Boolean)
  );

  const queryRows = async (
    allowRetry: boolean
  ): Promise<{
    rows: Array<Record<string, unknown>>;
    columns: DictionaryDefinitionColumns;
  } | null> => {
    const columns = await probeDictionaryDefinitionColumns();
    if (!columns) return null;

    const rows = await fetchDictionaryDefinitionRowsByWord(columns, fallbackTerms);
    if (rows !== null) return { rows, columns };
    if (!allowRetry) return null;

    cachedDictionaryDefinitionWordColumn = null;
    cachedDictionaryDefinitionMeaningColumns = null;
    return queryRows(false);
  };

  const result = await queryRows(true);
  if (!result) {
    return [];
  }

  const { rows, columns } = result;
  if (rows.length === 0) {
    return [];
  }

  const meanings = dedupeMeaningTexts(
    rows.flatMap((row) => {
        const candidateWord = valueAsText(row[columns.wordColumn]);
        if (candidateWord) {
          const normalizedCandidateWord = normalizeDictionaryLookupValue(candidateWord);
          const isDirectMatch = normalizedTerms.has(normalizedCandidateWord);
          const isLooseMatch = Array.from(normalizedTerms).some((term) => {
            if (!term) return false;
            return (
              normalizedCandidateWord === term ||
              normalizedCandidateWord.startsWith(`${term} `) ||
              normalizedCandidateWord.endsWith(` ${term}`) ||
              normalizedCandidateWord.includes(` ${term} `)
            );
          });

          if (!isDirectMatch && !isLooseMatch) return [];
        }

        return collectDefinitionTextsFromRow(
          row,
          columns.wordColumn,
          columns.meaningColumns
        );
      })
  );

  dictionaryDefinitionsCacheByWord.set(cacheKey, meanings);
  return meanings;
};

const fetchDictionaryDefinitionsByWords = async (
  words: string[]
): Promise<Map<string, string[]>> => {
  const definitionsByWord = new Map<string, string[]>();
  const uniqueWords = Array.from(
    new Set(
      words
        .map((word) => word.trim())
        .filter(Boolean)
    )
  );

  for (const word of uniqueWords) {
    const key = normalizeDictionaryLookupValue(word);
    if (!key) continue;
    const definitions = await fetchDictionaryDefinitionsForWord(word);
    definitionsByWord.set(key, definitions);
  }

  return definitionsByWord;
};

export const fetchDictionaryDefinitionsByWord = async (
  term: string
): Promise<string[]> => {
  const normalized = term.trim();
  if (!normalized) return [];

  const fromDefinitionsTable = await runWithTimeout(
    fetchDictionaryDefinitionsForWord(normalized),
    4_500
  );
  return fromDefinitionsTable ?? [];
};

export const lookupDictionaryMeaning = async (
  term: string
): Promise<DictionaryMeaning | null> => {
  const normalized = term.trim();
  if (!normalized) return null;
  if (isDictionaryTableUnavailable) return null;

  const searchVariants = buildDictionarySearchVariants(normalized);
  if (searchVariants.length === 0) return null;

  const probedColumns = await probeDictionaryTextColumns();

  const columnsToTry = [
    ...(cachedDictionaryWordColumn ? [cachedDictionaryWordColumn] : []),
    ...probedColumns,
    ...DICTIONARY_WORD_COLUMN_CANDIDATES,
  ];

  const visited = new Set<string>();
  for (const column of columnsToTry) {
    if (visited.has(column)) continue;
    visited.add(column);

    const row = await fetchDictionaryRowByColumn(column, searchVariants);
    if (!row) continue;

    const wordKey = findWordKey(row) ?? column;
    cachedDictionaryWordColumn = wordKey;

    const hitza = valueAsText(row[wordKey]) ?? normalized;
    const definitions = await fetchDictionaryDefinitionsForWord(hitza);
    if (definitions.length > 0) {
      return { hitza, esanahia: definitions[0] };
    }

    const meaningKey = findMeaningKey(row, wordKey);
    if (!meaningKey) continue;

    const esanahia = valueAsText(row[meaningKey]);
    if (!esanahia) continue;

    return { hitza, esanahia };
  }

  return null;
};

export const fetchWordsByLevel = async (
  level: DifficultyLevel
): Promise<WordData[]> => {
  const { data, error } = await supabase
    .from('syn_words')
    .select('source_id, hitza, sinonimoak')
    .eq('level', level)
    .eq('active', true);

  if (error) return [];

  const rows = (data ?? []) as Array<{
    source_id: string | number;
    hitza: string;
    sinonimoak: unknown;
  }>;

  return rows
    .map((r) => ({
      id: r.source_id,
      hitza: r.hitza,
      sinonimoak: normalizeSynonyms(r.sinonimoak),
    }))
    .filter((w) => w.hitza && w.sinonimoak.length > 0);
};

export const fetchAllActiveWords = async (): Promise<WordData[]> => {
  const { data, error } = await supabase
    .from('syn_words')
    .select('source_id, hitza, sinonimoak')
    .eq('active', true);

  if (error) return [];

  const rows = (data ?? []) as Array<{
    source_id: string | number;
    hitza: string;
    sinonimoak: unknown;
  }>;

  return rows
    .map((r) => ({
      id: r.source_id,
      hitza: r.hitza,
      sinonimoak: normalizeSynonyms(r.sinonimoak),
    }))
    .filter((w) => w.hitza && w.sinonimoak.length > 0);
};

const FAVORITE_FETCH_LIMIT = 1_200;

const FAVORITE_USER_COLUMN_CANDIDATES = [
  'user_id',
  'user_name',
  'username',
  'user',
  'name',
  'userid',
  'userId',
  'uid',
  'owner_id',
  'profile_id',
  'email',
];

const FAVORITE_WORD_COLUMN_CANDIDATES = [
  'hitza',
  'hitz',
  'word',
  'favorite_word',
  'word_text',
  'palabra',
  'lemma',
  'term',
  'entry',
  'title',
];

const FAVORITE_SYNONYM_COLUMN_CANDIDATES = [
  'sinonimoak',
  'sinonimo',
  'synonym',
  'synonyms',
  'synonym_list',
  'related_words',
  'sinonimos',
  'syns',
];

const FAVORITE_MEANING_COLUMN_CANDIDATES = [
  'esanahia',
  'esanahi',
  'meaning',
  'definition',
  'definition_text',
  'desc',
  'significado',
  'definicion',
  'descripcion',
  'azalpena',
];

const FAVORITE_WORD_KEY_HINTS = [
  'hitz',
  'word',
  'palabr',
  'lemm',
  'term',
  'entry',
  'title',
];

const FAVORITE_SYNONYM_KEY_HINTS = ['sinon', 'syn'];

const FAVORITE_MEANING_KEY_HINTS = [
  'esanah',
  'mean',
  'defini',
  'signific',
  'descri',
  'azalp',
];

let cachedFavoriteUserColumn: string | null = null;
let isFavoriteTableUnavailable = false;
const invalidFavoriteUserColumns = new Set<string>();

const isFavoriteErrorForMissingTable = (message: string): boolean =>
  message.includes('relation') && message.includes('user_favorite_words');

type FavoriteUserLookupInput = {
  userId: string;
  userEmail?: string | null;
  username?: string | null;
};

const buildFavoriteUserLookupValues = (
  params: FavoriteUserLookupInput
): string[] => {
  const values: string[] = [];
  const seen = new Set<string>();

  const addValue = (value: unknown) => {
    if (typeof value !== 'string') return;

    const trimmed = value.trim();
    if (!trimmed) return;

    const variants = [trimmed];
    const lower = trimmed.toLowerCase();
    if (lower !== trimmed) variants.push(lower);

    variants.forEach((variant) => {
      const dedupeKey = variant.toLowerCase();
      if (seen.has(dedupeKey)) return;
      seen.add(dedupeKey);
      values.push(variant);
    });
  };

  addValue(params.userId);
  addValue(params.userEmail);
  addValue(params.username);

  if (typeof params.userEmail === 'string') {
    const email = params.userEmail.trim();
    if (email) {
      const [localPart] = email.split('@');
      addValue(localPart);
    }
  }

  return values;
};

const parseFavoriteSynonyms = (value: unknown): string[] => {
  const normalizeToken = (token: string): string =>
    token
      .trim()
      .replace(/^["'{\s]+/, '')
      .replace(/["'}\s]+$/, '')
      .trim();

  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .map((item) => normalizeToken(String(item)))
          .filter(Boolean)
      )
    );
  }

  if (typeof value !== 'string') return [];
  const trimmed = value.trim();
  if (!trimmed) return [];

  if (
    (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
    (trimmed.startsWith('{') && trimmed.endsWith('}'))
  ) {
    try {
      return parseFavoriteSynonyms(JSON.parse(trimmed));
    } catch {
      // Ignore JSON parsing failures and continue with plain-text parsing.
    }

    // Postgres array string format: {one,two}
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const inside = trimmed.slice(1, -1).trim();
      if (!inside) return [];
      return Array.from(
        new Set(
          inside
            .split(/[,;|/\n]+/)
            .map(normalizeToken)
            .filter(Boolean)
        )
      );
    }
  }

  if (!/[,;|/\n]/.test(trimmed)) {
    const singleToken = normalizeToken(trimmed);
    return singleToken.length <= 80 ? [singleToken] : [];
  }

  return Array.from(
    new Set(
      trimmed
        .split(/[,;|/\n]+/)
        .map(normalizeToken)
        .filter(Boolean)
    )
  );
};

const findFavoriteColumnKey = (
  row: Record<string, unknown>,
  exactCandidates: string[],
  hintCandidates: string[],
  excluded: string[] = []
): string | null => {
  const excludedSet = new Set(excluded.filter(Boolean));
  const keys = Object.keys(row);

  for (const key of keys) {
    if (excludedSet.has(key)) continue;
    if (!valueAsText(row[key]) && !Array.isArray(row[key])) continue;
    if (exactCandidates.includes(key.toLowerCase())) return key;
  }

  for (const key of keys) {
    if (excludedSet.has(key)) continue;
    if (!valueAsText(row[key]) && !Array.isArray(row[key])) continue;
    if (keyMatchesHints(key, hintCandidates)) return key;
  }

  return null;
};

const mapFavoriteRow = (
  row: Record<string, unknown>,
  index: number
): FavoriteWordCard | null => {
  const wordKey = findFavoriteColumnKey(
    row,
    FAVORITE_WORD_COLUMN_CANDIDATES,
    FAVORITE_WORD_KEY_HINTS
  );
  if (!wordKey) return null;

  const hitza = valueAsText(row[wordKey])?.trim();
  if (!hitza) return null;

  const synonymKey = findFavoriteColumnKey(
    row,
    FAVORITE_SYNONYM_COLUMN_CANDIDATES,
    FAVORITE_SYNONYM_KEY_HINTS,
    [wordKey]
  );

  const meaningKey = findFavoriteColumnKey(
    row,
    FAVORITE_MEANING_COLUMN_CANDIDATES,
    FAVORITE_MEANING_KEY_HINTS,
    [wordKey, synonymKey ?? '']
  );

  const normalizedWord = hitza.toLowerCase();
  const sinonimoak = (synonymKey ? parseFavoriteSynonyms(row[synonymKey]) : []).filter(
    (synonym) => synonym.trim().toLowerCase() !== normalizedWord
  );
  const esanahia = meaningKey ? valueAsText(row[meaningKey]) : null;

  const idCandidate =
    row.id ??
    row.favorite_id ??
    row.source_id ??
    row.word_id ??
    `${wordKey}-${index}`;

  return {
    id: String(idCandidate),
    hitza,
    sinonimoak,
    esanahia,
  };
};

const queryFavoriteRowsByUserColumn = async (
  column: string,
  userValues: string[]
): Promise<Array<Record<string, unknown>> | null> => {
  if (isFavoriteTableUnavailable || invalidFavoriteUserColumns.has(column)) {
    return null;
  }

  if (userValues.length === 0) return [];

  const runQuery = async (userValue: string, orderByCreatedAt: boolean) => {
    let query = supabase
      .from('user_favorite_words')
      .select('*')
      .eq(column, userValue)
      .limit(FAVORITE_FETCH_LIMIT);

    if (orderByCreatedAt) {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;
    return { data, error };
  };

  const queryByValue = async (
    userValue: string
  ): Promise<Array<Record<string, unknown>> | null> => {
    const orderedResponse = await runQuery(userValue, true);
    if (!orderedResponse.error) {
      return (orderedResponse.data ?? []) as Array<Record<string, unknown>>;
    }

    const orderedMessage = orderedResponse.error.message.toLowerCase();
    if (isFavoriteErrorForMissingTable(orderedMessage)) {
      isFavoriteTableUnavailable = true;
      return [];
    }

    const shouldRetryWithoutOrder =
      isMissingColumnError(orderedMessage) && orderedMessage.includes('created_at');
    if (shouldRetryWithoutOrder) {
      const fallbackResponse = await runQuery(userValue, false);
      if (fallbackResponse.error) {
        const fallbackMessage = fallbackResponse.error.message.toLowerCase();
        if (isFavoriteErrorForMissingTable(fallbackMessage)) {
          isFavoriteTableUnavailable = true;
          return [];
        }
        if (isDictionaryErrorForInvalidColumn(fallbackMessage)) {
          invalidFavoriteUserColumns.add(column);
          return null;
        }
        return [];
      }

      return (fallbackResponse.data ?? []) as Array<Record<string, unknown>>;
    }

    if (isDictionaryErrorForInvalidColumn(orderedMessage)) {
      invalidFavoriteUserColumns.add(column);
      return null;
    }

    return [];
  };

  const mergedRows: Array<Record<string, unknown>> = [];
  const seenRows = new Set<string>();

  for (const userValue of userValues) {
    const rows = await queryByValue(userValue);
    if (rows === null) return null;

    rows.forEach((row, index) => {
      const rowId = row.id ?? row.favorite_id ?? row.source_id ?? row.word_id;
      const dedupeKey =
        rowId != null
          ? `id:${String(rowId)}`
          : `row:${index}:${JSON.stringify(row)}`;
      if (seenRows.has(dedupeKey)) return;
      seenRows.add(dedupeKey);
      mergedRows.push(row);
    });
  }

  return mergedRows;
};

export const fetchUserFavoriteWords = async (
  input: FavoriteUserLookupInput | string
): Promise<FavoriteWordCard[]> => {
  const params =
    typeof input === 'string'
      ? ({ userId: input } as FavoriteUserLookupInput)
      : input;
  const lookupValues = buildFavoriteUserLookupValues(params);
  if (lookupValues.length === 0) return [];
  if (isFavoriteTableUnavailable) return [];

  const columnsToTry = [
    ...(cachedFavoriteUserColumn ? [cachedFavoriteUserColumn] : []),
    ...FAVORITE_USER_COLUMN_CANDIDATES,
  ];
  const visited = new Set<string>();

  for (const column of columnsToTry) {
    if (!column || visited.has(column)) continue;
    visited.add(column);

    const rows = await queryFavoriteRowsByUserColumn(column, lookupValues);
    if (rows === null) continue;
    if (rows.length === 0) continue;

    const deduped = new Map<string, FavoriteWordCard>();
    rows.forEach((row, index) => {
      const card = mapFavoriteRow(row, index);
      if (!card) return;
      const dedupeKey = `${card.hitza.toLowerCase()}::${card.sinonimoak
        .join('|')
        .toLowerCase()}::${(card.esanahia ?? '').toLowerCase()}`;
      if (!deduped.has(dedupeKey)) {
        deduped.set(dedupeKey, card);
      }
    });

    if (deduped.size === 0) continue;

    const baseCards = Array.from(deduped.values());
    const definitionsByWord = await fetchDictionaryDefinitionsByWords(
      baseCards.map((card) => card.hitza)
    );

    const expandedCards = baseCards.flatMap((card) => {
      const definitionKey = normalizeDictionaryLookupValue(card.hitza);
      const dictionaryDefinitions = definitionsByWord.get(definitionKey) ?? [];
      const definitionRows = dedupeMeaningTexts([
        ...(card.esanahia ? [card.esanahia] : []),
        ...dictionaryDefinitions,
      ]);

      if (definitionRows.length === 0) return [card];

      return definitionRows.map((definition, definitionIndex) => ({
        ...card,
        id: `${card.id}:def-${definitionIndex + 1}`,
        esanahia: definition,
      }));
    });

    const expandedDeduped = new Map<string, FavoriteWordCard>();
    expandedCards.forEach((card) => {
      const dedupeKey = `${card.hitza.toLowerCase()}::${card.sinonimoak
        .join('|')
        .toLowerCase()}::${(card.esanahia ?? '').toLowerCase()}`;
      if (!expandedDeduped.has(dedupeKey)) {
        expandedDeduped.set(dedupeKey, card);
      }
    });

    if (expandedDeduped.size === 0) continue;

    cachedFavoriteUserColumn = column;
    return Array.from(expandedDeduped.values());
  }

  return [];
};

export const fetchOrthographyWordPool = async (): Promise<OrthographyPoolWord[]> => {
  const merged = new Map<string, OrthographyPoolWord>();

  const mergeWord = (candidate: OrthographyPoolWord) => {
    const normalizedWord = candidate.hitza.trim().toLowerCase();
    if (!normalizedWord || normalizedWord.length < 3) return;

    const existing = merged.get(normalizedWord);
    if (!existing) {
      merged.set(normalizedWord, candidate);
      return;
    }

    if (candidate.clue.length > existing.clue.length) {
      merged.set(normalizedWord, candidate);
    }
  };

  const synonymWords = await fetchAllActiveWords();
  synonymWords.forEach((word) => {
    mergeWord({
      sourceId: `syn-${word.id}`,
      hitza: word.hitza.trim().toLowerCase(),
      clue: buildSynonymClue(word.hitza, word.sinonimoak),
      source: 'synonyms',
    });
  });

  if (isDictionaryTableUnavailable) {
    return Array.from(merged.values());
  }

  const { data, error } = await supabase
    .from('diccionario')
    .select('*')
    .limit(ORTHOGRAPHY_DICTIONARY_FETCH_LIMIT);

  if (error) {
    const message = error.message.toLowerCase();
    if (isDictionaryErrorForMissingTable(message)) {
      isDictionaryTableUnavailable = true;
    }
    return Array.from(merged.values());
  }

  const dictionaryEntries = ((data ?? []) as Array<Record<string, unknown>>)
    .map((row, index) => {
      const wordKey = findWordKey(row);
      if (!wordKey) return null;

      const hitza = valueAsText(row[wordKey]);
      if (!hitza) return null;

      return { row, index, wordKey, hitza };
    })
    .filter(
      (
        entry
      ): entry is {
        row: Record<string, unknown>;
        index: number;
        wordKey: string;
        hitza: string;
      } => Boolean(entry)
    );

  const definitionsByWord = await fetchDictionaryDefinitionsByWords(
    dictionaryEntries.map((entry) => entry.hitza)
  );

  dictionaryEntries.forEach(({ row, index, wordKey, hitza }) => {
    const normalizedWord = normalizeDictionaryLookupValue(hitza);
    const dictionaryMeaning =
      definitionsByWord.get(normalizedWord)?.[0] ?? null;

    const fallbackMeaningKey = findMeaningKey(row, wordKey);
    const fallbackMeaning = fallbackMeaningKey
      ? valueAsText(row[fallbackMeaningKey])
      : null;

    mergeWord({
      sourceId: `dict-${index}`,
      hitza: hitza.trim().toLowerCase(),
      clue: buildDictionaryClue(hitza, dictionaryMeaning ?? fallbackMeaning),
      source: 'dictionary',
    });
  });

  return Array.from(merged.values());
};

export const fetchHistoryByUser = async (userId: string): Promise<GameRun[]> => {
  const { data, error } = await supabase
    .from('game_runs')
    .select('id, played_at, difficulty, total, correct, wrong, time_seconds')
    .eq('user_id', userId)
    .order('played_at', { ascending: false });

  if (error || !data) return [];
  return data as GameRun[];
};

export const fetchFailedWordsByUser = async (
  userId: string
): Promise<FailedWordStat[]> => {
  const { data, error } = await supabase
    .from('game_answers')
    .select('source_id, hitza, is_correct, level')
    .eq('user_id', userId);

  if (error) return [];

  const statsMap = new Map<
    string,
    {
      source_id: string | number;
      hitza: string;
      wrong: number;
      attempts: number;
      level: DifficultyLevel;
    }
  >();

  for (const r of (data ?? []) as GameAnswerRow[]) {
    const key = `${r.source_id}_${r.level}`;
    const cur = statsMap.get(key) || {
      source_id: r.source_id,
      hitza: r.hitza,
      wrong: 0,
      attempts: 0,
      level: r.level,
    };
    cur.attempts += 1;
    if (!r.is_correct) cur.wrong += 1;
    statsMap.set(key, cur);
  }

  return Array.from(statsMap.values())
    .map((v) => ({
      ...v,
      wrong_rate: v.attempts > 0 ? (v.wrong / v.attempts) * 100 : 0,
    }))
    .filter((v) => v.attempts > 1);
};

const mapStatRowsWithTimeColumn = (
  rows: Array<Record<string, unknown>>,
  timeColumn: 'created_at' | 'played_at'
): UserAnswerStatRow[] =>
  rows.map((row) => ({
    source_id: (row.source_id as string | number) ?? '',
    hitza: String(row.hitza ?? ''),
    is_correct: Boolean(row.is_correct),
    level: Number(row.level) as DifficultyLevel,
    event_at: (row[timeColumn] as string | null) ?? null,
  }));

const isMissingColumnError = (message: string): boolean =>
  message.includes('column') && message.includes('does not exist');

export const fetchUserAnswerStatsRows = async (
  userId: string
): Promise<UserAnswerStatRow[]> => {
  const queryByTimeColumn = async (
    timeColumn: 'created_at' | 'played_at'
  ): Promise<UserAnswerStatRow[] | null> => {
    const { data, error } = await supabase
      .from('game_answers')
      .select(`source_id, hitza, is_correct, level, ${timeColumn}`)
      .eq('user_id', userId)
      .order(timeColumn, { ascending: false });

    if (error) {
      const message = error.message.toLowerCase();
      if (isMissingColumnError(message)) return null;
      return [];
    }

    return mapStatRowsWithTimeColumn(
      (data ?? []) as Array<Record<string, unknown>>,
      timeColumn
    );
  };

  const withCreatedAt = await queryByTimeColumn('created_at');
  if (withCreatedAt) return withCreatedAt;

  const withPlayedAt = await queryByTimeColumn('played_at');
  if (withPlayedAt) return withPlayedAt;

  const { data, error } = await supabase
    .from('game_answers')
    .select('source_id, hitza, is_correct, level')
    .eq('user_id', userId);

  if (error) return [];

  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    source_id: (row.source_id as string | number) ?? '',
    hitza: String(row.hitza ?? ''),
    is_correct: Boolean(row.is_correct),
    level: Number(row.level) as DifficultyLevel,
    event_at: null,
  }));
};

export const insertGameAnswer = async (params: {
  userId: string;
  difficulty: DifficultyLevel;
  question: Question;
  answer: string;
  isCorrect: boolean;
}): Promise<void> => {
  const { userId, difficulty, question, answer, isCorrect } = params;
  await supabase.from('game_answers').insert({
    user_id: userId,
    level: difficulty,
    source_id: question.wordData.id,
    hitza: question.wordData.hitza,
    chosen: answer,
    correct: question.correctAnswer,
    is_correct: isCorrect,
  });
};

export const insertGameRun = async (params: {
  userId: string;
  difficulty: DifficultyLevel;
  total: number;
  correct: number;
  wrong: number;
  timeSeconds: number;
}): Promise<void> => {
  const { userId, difficulty, total, correct, wrong, timeSeconds } = params;
  await supabase.from('game_runs').insert({
    user_id: userId,
    played_at: new Date().toISOString(),
    difficulty,
    total,
    correct,
    wrong,
    time_seconds: timeSeconds,
  });
};

type DailyRunRow = {
  id: string;
  user_id: string;
  player_name: string | null;
  display_name?: string | null;
  challenge_date: string;
  played_at: string;
  score: number;
  correct: number;
  wrong: number;
  total: number;
  time_seconds: number;
};

type DailyAnswerRow = {
  run_id: string;
  question_index: number;
  source_id: string;
  hitza: string;
  chosen: string;
  correct: string;
  is_correct: boolean;
  response_ms: number;
  points: number;
};

const sortLeaderboardRows = <T extends { score: number; time_seconds: number }>(
  rows: T[]
): T[] =>
  [...rows].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.time_seconds - b.time_seconds;
  });

const mapRunWithName = (row: DailyRunRow): DailyRunRow & { player_name: string } => ({
  ...row,
  player_name: row.player_name || row.display_name || 'ANON',
});

const fetchLatestChallengeDate = async (): Promise<string | null> => {
  const { data, error } = await supabase
    .from('daily_challenge_runs')
    .select('challenge_date')
    .order('played_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return (data as { challenge_date: string }).challenge_date;
};

export const resolveActiveChallengeDate = async (): Promise<string> => {
  const todayLocal = formatLocalDate(new Date());
  const { data, error } = await supabase
    .from('daily_challenge_settings')
    .select('active_challenge_date')
    .eq('id', 1)
    .single();

  if (error || !data) return todayLocal;
  const activeDate = (data as { active_challenge_date?: string }).active_challenge_date;
  if (!activeDate) return todayLocal;
  // Safety: if backend date is behind client local day, use local day for eligibility.
  return activeDate < todayLocal ? todayLocal : activeDate;
};

export const hasPlayedDailyChallenge = async (
  userId: string,
  challengeDate: string
): Promise<boolean> => {
  const { data: byChallengeDate, error: byChallengeDateError } = await supabase
    .from('daily_challenge_runs')
    .select('id')
    .eq('user_id', userId)
    .eq('challenge_date', challengeDate)
    .limit(1);
  const { startIso, endIso } = getLocalDayUtcRange();
  const { data: byPlayedAt, error: byPlayedAtError } = await supabase
    .from('daily_challenge_runs')
    .select('id')
    .eq('user_id', userId)
    .gte('played_at', startIso)
    .lt('played_at', endIso)
    .limit(1);
  if (byChallengeDateError && byPlayedAtError) return false;
  return (byChallengeDate ?? []).length > 0 || (byPlayedAt ?? []).length > 0;
};

export const saveDailyChallengeRun = async (params: {
  userId: string;
  playerName: string;
  challengeDate: string;
  score: number;
  correct: number;
  wrong: number;
  total: number;
  timeSeconds: number;
  answers: Array<{
    questionIndex: number;
    sourceId: string;
    hitza: string;
    chosen: string;
    correct: string;
    isCorrect: boolean;
    responseMs: number;
    points: number;
  }>;
}): Promise<{
  ok: boolean;
  reason?: 'already_played' | 'error';
  errorCode?: string;
  errorMessage?: string;
}> => {
  const {
    userId,
    playerName,
    challengeDate,
    score,
    correct,
    wrong,
    total,
    timeSeconds,
    answers,
  } = params;
  const alreadyPlayed = await hasPlayedDailyChallenge(userId, challengeDate);
  if (alreadyPlayed) return { ok: false, reason: 'already_played' };

  const { data: runData, error: runError } = await supabase
    .from('daily_challenge_runs')
    .insert({
      user_id: userId,
      player_name: playerName,
      display_name: playerName,
      challenge_date: challengeDate,
      played_at: new Date().toISOString(),
      score,
      correct,
      wrong,
      total,
      time_seconds: timeSeconds,
    })
    .select('id')
    .single();

  if (runError) {
    const errorCode = (runError as { code?: string }).code;
    if (errorCode === '23505') return { ok: false, reason: 'already_played' };
    return {
      ok: false,
      reason: 'error',
      errorCode,
      errorMessage: runError.message,
    };
  }

  const runId = (runData as { id: string }).id;
  if (answers.length === 0) return { ok: true };

  const answerRows = answers.map((a) => ({
    run_id: runId,
    question_index: a.questionIndex,
    source_id: a.sourceId,
    hitza: a.hitza,
    chosen: a.chosen,
    correct: a.correct,
    is_correct: a.isCorrect,
    response_ms: a.responseMs,
    points: a.points,
  }));

  const { error: answersError } = await supabase
    .from('daily_challenge_answers')
    .insert(answerRows);

  if (answersError) {
    // Keep run as valid even if per-answer log fails.
    return {
      ok: true,
      reason: 'error',
      errorCode: (answersError as { code?: string }).code,
      errorMessage: answersError.message,
    };
  }
  return { ok: true };
};

export const fetchDailyLeaderboard = async (
  challengeDate: string
): Promise<DailyLeaderboardEntry[]> => {
  const { data, error } = await supabase
    .from('daily_challenge_runs')
    .select(
      'id, user_id, player_name, display_name, challenge_date, played_at, score, correct, wrong, total, time_seconds'
    )
    .eq('challenge_date', challengeDate);
  let rows = error || !data ? [] : (data as DailyRunRow[]);
  if (rows.length === 0) {
    const { startIso, endIso } = getLocalDayUtcRange();
      const { data: byPlayedAt, error: byPlayedAtError } = await supabase
        .from('daily_challenge_runs')
        .select(
          'id, user_id, player_name, display_name, challenge_date, played_at, score, correct, wrong, total, time_seconds'
        )
        .gte('played_at', startIso)
        .lt('played_at', endIso);
    if (!byPlayedAtError && byPlayedAt) {
      rows = byPlayedAt as DailyRunRow[];
    }
  }
  if (rows.length === 0) {
    const latestDate = await fetchLatestChallengeDate();
    if (latestDate) {
      const { data: byLatestDate, error: byLatestDateError } = await supabase
        .from('daily_challenge_runs')
        .select(
          'id, user_id, player_name, display_name, challenge_date, played_at, score, correct, wrong, total, time_seconds'
        )
        .eq('challenge_date', latestDate);
      if (!byLatestDateError && byLatestDate) {
        rows = byLatestDate as DailyRunRow[];
      }
    }
  }
  const sorted = sortLeaderboardRows(rows.map(mapRunWithName));
  return sorted.map((row, idx) => ({ ...row, rank: idx + 1 }));
};

export const fetchPeriodLeaderboard = async (params: {
  startIso: string;
  endIso: string;
}): Promise<PeriodLeaderboardEntry[]> => {
  const { startIso, endIso } = params;
  const { data, error } = await supabase
    .from('daily_challenge_runs')
    .select(
      'user_id, player_name, display_name, score, correct, total, time_seconds, played_at'
    )
    .gte('played_at', startIso)
    .lt('played_at', endIso);

  if (error || !data) return [];

  const agg = new Map<
    string,
    {
      user_id: string;
      player_name: string;
      games_played: number;
      total_score: number;
      total_correct: number;
      total_questions: number;
      total_time_seconds: number;
    }
  >();

  for (const row of data as Array<{
    user_id: string;
    player_name: string | null;
    display_name?: string | null;
    score: number;
    correct: number;
    total: number;
    time_seconds: number;
  }>) {
    const cur = agg.get(row.user_id) || {
      user_id: row.user_id,
      player_name: row.player_name || row.display_name || 'ANON',
      games_played: 0,
      total_score: 0,
      total_correct: 0,
      total_questions: 0,
      total_time_seconds: 0,
    };
    cur.games_played += 1;
    cur.total_score += row.score;
    cur.total_correct += row.correct;
    cur.total_questions += row.total;
    cur.total_time_seconds += row.time_seconds;
    cur.player_name = row.player_name || row.display_name || cur.player_name;
    agg.set(row.user_id, cur);
  }

  const sorted = Array.from(agg.values()).sort((a, b) => {
    if (b.total_score !== a.total_score) return b.total_score - a.total_score;
    return a.total_time_seconds - b.total_time_seconds;
  });

  return sorted.map((row, idx) => ({ ...row, rank: idx + 1 }));
};

export const fetchDailyRunsWithAnswersByDate = async (
  challengeDate: string
): Promise<DailyRunWithAnswers[]> => {
  const { data: runsData, error: runsError } = await supabase
    .from('daily_challenge_runs')
    .select(
      'id, user_id, player_name, display_name, challenge_date, played_at, score, correct, wrong, total, time_seconds'
    )
    .eq('challenge_date', challengeDate);
  let runs = sortLeaderboardRows(
    (runsError || !runsData ? [] : (runsData as DailyRunRow[]))
  );
  if (runs.length === 0) {
    const { startIso, endIso } = getLocalDayUtcRange();
    const { data: byPlayedAt, error: byPlayedAtError } = await supabase
      .from('daily_challenge_runs')
      .select(
        'id, user_id, player_name, display_name, challenge_date, played_at, score, correct, wrong, total, time_seconds'
      )
      .gte('played_at', startIso)
      .lt('played_at', endIso);
    if (!byPlayedAtError && byPlayedAt) {
      runs = sortLeaderboardRows(byPlayedAt as DailyRunRow[]);
    }
  }
  if (runs.length === 0) {
    const latestDate = await fetchLatestChallengeDate();
    if (latestDate) {
      const { data: byLatestDate, error: byLatestDateError } = await supabase
        .from('daily_challenge_runs')
        .select(
          'id, user_id, player_name, display_name, challenge_date, played_at, score, correct, wrong, total, time_seconds'
        )
        .eq('challenge_date', latestDate);
      if (!byLatestDateError && byLatestDate) {
        runs = sortLeaderboardRows(byLatestDate as DailyRunRow[]);
      }
    }
  }
  if (runs.length === 0) return [];

  const runIds = runs.map((r) => r.id);
  const { data: answersData, error: answersError } = await supabase
    .from('daily_challenge_answers')
    .select(
      'run_id, question_index, source_id, hitza, chosen, correct, is_correct, response_ms, points'
    )
    .in('run_id', runIds)
    .order('question_index', { ascending: true });

  if (answersError) {
    return runs.map((run) => ({ ...run, answers: [] }));
  }

  const answersByRun = new Map<string, DailyAnswerRow[]>();
  for (const answer of (answersData ?? []) as DailyAnswerRow[]) {
    const list = answersByRun.get(answer.run_id) || [];
    list.push(answer);
    answersByRun.set(answer.run_id, list);
  }

  return runs.map((rawRun) => {
    const run = mapRunWithName(rawRun);
    return ({
    ...run,
    answers: answersByRun.get(run.id) || [],
    });
  });
};
