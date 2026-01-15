/**
 * Unit Tests for Summary Worker JSON Parsing Utilities
 *
 * These functions handle AI response parsing with robust error recovery:
 * - escapeControlCharsInStrings: Escapes raw newlines/tabs inside JSON strings
 * - fixTruncatedJson: Closes unclosed brackets/quotes in truncated JSON
 * - extractJsonObject: Finds JSON object in text with extra content
 * - parseAIResponse: Full parsing pipeline with all recovery steps
 */

import { describe, it, expect } from 'vitest';
import {
  escapeControlCharsInStrings,
  fixTruncatedJson,
  extractJsonObject,
  parseAIResponseForTest,
} from '@/lib/queues/workers/summary.worker';

describe('escapeControlCharsInStrings', () => {
  it('should pass through valid JSON unchanged', () => {
    const input = '{"key": "value", "num": 123}';
    expect(escapeControlCharsInStrings(input)).toBe(input);
  });

  it('should escape raw newlines inside strings', () => {
    const input = '{"key": "line1\nline2"}';
    const expected = '{"key": "line1\\nline2"}';
    expect(escapeControlCharsInStrings(input)).toBe(expected);
  });

  it('should escape raw tabs inside strings', () => {
    const input = '{"key": "col1\tcol2"}';
    const expected = '{"key": "col1\\tcol2"}';
    expect(escapeControlCharsInStrings(input)).toBe(expected);
  });

  it('should escape carriage returns inside strings', () => {
    const input = '{"key": "line1\r\nline2"}';
    const expected = '{"key": "line1\\r\\nline2"}';
    expect(escapeControlCharsInStrings(input)).toBe(expected);
  });

  it('should not escape control chars outside strings', () => {
    const input = '{\n  "key": "value"\n}';
    expect(escapeControlCharsInStrings(input)).toBe(input);
  });

  it('should handle already escaped sequences', () => {
    const input = '{"key": "already\\nescaped"}';
    expect(escapeControlCharsInStrings(input)).toBe(input);
  });

  it('should handle escaped quotes inside strings', () => {
    const input = '{"key": "he said \\"hello\\""}';
    expect(escapeControlCharsInStrings(input)).toBe(input);
  });

  it('should handle multiple control chars in one string', () => {
    const input = '{"key": "line1\nline2\tcolumn\rend"}';
    const expected = '{"key": "line1\\nline2\\tcolumn\\rend"}';
    expect(escapeControlCharsInStrings(input)).toBe(expected);
  });

  it('should escape other control characters as unicode', () => {
    // ASCII 1 (SOH) should become \u0001
    const input = '{"key": "text\u0001here"}';
    const expected = '{"key": "text\\u0001here"}';
    expect(escapeControlCharsInStrings(input)).toBe(expected);
  });

  it('should handle nested objects with control chars', () => {
    const input = '{"outer": {"inner": "has\nnewline"}}';
    const expected = '{"outer": {"inner": "has\\nnewline"}}';
    expect(escapeControlCharsInStrings(input)).toBe(expected);
  });

  it('should handle arrays with control chars in strings', () => {
    const input = '{"arr": ["item1\nbreak", "item2"]}';
    const expected = '{"arr": ["item1\\nbreak", "item2"]}';
    expect(escapeControlCharsInStrings(input)).toBe(expected);
  });
});

describe('fixTruncatedJson', () => {
  it('should return valid JSON unchanged', () => {
    const input = '{"key": "value"}';
    expect(fixTruncatedJson(input)).toBe(input);
  });

  it('should close unclosed object', () => {
    const input = '{"key": "value"';
    const result = fixTruncatedJson(input);
    expect(() => JSON.parse(result)).not.toThrow();
    expect(JSON.parse(result)).toEqual({ key: 'value' });
  });

  it('should close unclosed array', () => {
    const input = '{"arr": [1, 2, 3';
    const result = fixTruncatedJson(input);
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it('should close unclosed string', () => {
    const input = '{"key": "unclosed value';
    const result = fixTruncatedJson(input);
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it('should close multiple unclosed structures', () => {
    const input = '{"outer": {"inner": [1, 2';
    const result = fixTruncatedJson(input);
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it('should handle deeply nested truncation', () => {
    const input = '{"a": {"b": {"c": {"d": "value';
    const result = fixTruncatedJson(input);
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it('should handle truncation in array of objects', () => {
    const input = '{"items": [{"id": 1}, {"id": 2';
    const result = fixTruncatedJson(input);
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it('should handle escaped quotes before truncation', () => {
    const input = '{"key": "value with \\"quotes\\"';
    const result = fixTruncatedJson(input);
    expect(() => JSON.parse(result)).not.toThrow();
  });
});

describe('extractJsonObject', () => {
  it('should extract JSON from clean input', () => {
    const input = '{"key": "value"}';
    expect(extractJsonObject(input)).toBe(input);
  });

  it('should extract JSON with text before', () => {
    const input = 'Here is the JSON: {"key": "value"}';
    expect(extractJsonObject(input)).toBe('{"key": "value"}');
  });

  it('should extract JSON with text after', () => {
    const input = '{"key": "value"} That was the response.';
    expect(extractJsonObject(input)).toBe('{"key": "value"}');
  });

  it('should extract JSON with text before and after', () => {
    const input = 'Response: {"key": "value"} End.';
    expect(extractJsonObject(input)).toBe('{"key": "value"}');
  });

  it('should handle nested objects', () => {
    const input = 'Here: {"outer": {"inner": "value"}}';
    expect(extractJsonObject(input)).toBe('{"outer": {"inner": "value"}}');
  });

  it('should handle objects with arrays', () => {
    const input = 'Data: {"items": [1, 2, 3]}!';
    expect(extractJsonObject(input)).toBe('{"items": [1, 2, 3]}');
  });

  it('should handle braces inside strings', () => {
    const input = 'JSON: {"code": "function() { return {}; }"}';
    expect(extractJsonObject(input)).toBe('{"code": "function() { return {}; }"}');
  });

  it('should return truncated JSON from start to end', () => {
    const input = 'Start: {"key": "value';
    const result = extractJsonObject(input);
    expect(result).toBe('{"key": "value');
  });

  it('should return null for input without JSON object', () => {
    const input = 'No JSON here, just text';
    expect(extractJsonObject(input)).toBeNull();
  });

  it('should return null for array-only input', () => {
    const input = '[1, 2, 3]';
    expect(extractJsonObject(input)).toBeNull();
  });

  it('should handle escaped quotes in strings', () => {
    const input = 'Data: {"msg": "He said \\"hello\\""}';
    expect(extractJsonObject(input)).toBe('{"msg": "He said \\"hello\\""}');
  });
});

describe('parseAIResponse', () => {
  it('should parse valid JSON', () => {
    const input = '{"key": "value", "num": 42}';
    const result = parseAIResponseForTest<{ key: string; num: number }>(input);
    expect(result).toEqual({ key: 'value', num: 42 });
  });

  it('should strip markdown code blocks with json tag', () => {
    const input = '```json\n{"key": "value"}\n```';
    const result = parseAIResponseForTest<{ key: string }>(input);
    expect(result).toEqual({ key: 'value' });
  });

  it('should strip markdown code blocks without language tag', () => {
    const input = '```\n{"key": "value"}\n```';
    const result = parseAIResponseForTest<{ key: string }>(input);
    expect(result).toEqual({ key: 'value' });
  });

  it('should handle AI response with explanatory text', () => {
    const input = 'Here is the summary:\n{"narrative": "Test content"}';
    const result = parseAIResponseForTest<{ narrative: string }>(input);
    expect(result).toEqual({ narrative: 'Test content' });
  });

  it('should escape control chars and parse', () => {
    const input = '{"narrative": "Line 1\nLine 2"}';
    const result = parseAIResponseForTest<{ narrative: string }>(input);
    expect(result.narrative).toBe('Line 1\nLine 2');
  });

  it('should fix truncated JSON and parse', () => {
    const input = '{"key": "value", "items": [1, 2';
    const result = parseAIResponseForTest<{ key: string; items: number[] }>(input);
    expect(result.key).toBe('value');
    expect(result.items).toContain(1);
    expect(result.items).toContain(2);
  });

  it('should handle combined issues: markdown + control chars', () => {
    const input = '```json\n{"msg": "Hello\nWorld"}\n```';
    const result = parseAIResponseForTest<{ msg: string }>(input);
    expect(result.msg).toBe('Hello\nWorld');
  });

  it('should handle combined issues: extra text + truncation', () => {
    const input = 'Response: {"narrative": "Test';
    const result = parseAIResponseForTest<{ narrative: string }>(input);
    expect(result.narrative).toBe('Test');
  });

  it('should throw on completely invalid input', () => {
    const input = 'This is not JSON at all';
    expect(() => parseAIResponseForTest(input)).toThrow();
  });

  it('should throw on empty input', () => {
    expect(() => parseAIResponseForTest('')).toThrow();
  });

  it('should handle nested objects with all issues', () => {
    const input = `Here is the result:
\`\`\`json
{
  "summary": {
    "narrative": "The interview covered several topics.
Key finding: users want simplicity.",
    "segments": 5
  }
}
\`\`\`
Hope this helps!`;
    const result = parseAIResponseForTest<{
      summary: { narrative: string; segments: number };
    }>(input);
    expect(result.summary.segments).toBe(5);
    expect(result.summary.narrative).toContain('Key finding');
  });

  it('should handle source summary structure', () => {
    const input = `{
  "narrative": "This interview explored user preferences for the new dashboard design.",
  "duration": 1800,
  "segmentCount": 45
}`;
    const result = parseAIResponseForTest<{
      narrative: string;
      duration: number;
      segmentCount: number;
    }>(input);
    expect(result.narrative).toContain('dashboard design');
    expect(result.duration).toBe(1800);
    expect(result.segmentCount).toBe(45);
  });

  it('should handle project summary structure', () => {
    const input = `{
  "researchObjectives": "Understand user needs for reporting features",
  "keyFindings": ["Users prefer visual reports", "Export to PDF is essential"],
  "participantOverview": "12 participants from enterprise segment",
  "recommendations": ["Add chart builder", "Improve export options"]
}`;
    const result = parseAIResponseForTest<{
      researchObjectives: string;
      keyFindings: string[];
      participantOverview: string;
      recommendations: string[];
    }>(input);
    expect(result.keyFindings).toHaveLength(2);
    expect(result.recommendations).toContain('Add chart builder');
  });
});
