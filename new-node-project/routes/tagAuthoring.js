const express = require('express');
const mongoose = require('mongoose');
const { Readable } = require('stream');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const { getOrCreateBucket } = require('../models/newConnection');

const router = express.Router();

const normalizeKey = (value) => {
  if (!value || typeof value !== 'string') return '';
  return value
    .trim()
    .toLowerCase()
    .replace(/^input:/, '')
    .replace(/^number_input:/, '')
    .replace(/^date:/, '')
    .replace(/^range_input:/, '')
    .replace(/[\s/-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
};

const readFileBufferFromBucket = async (bucketName, fileId) => {
  const bucket = getOrCreateBucket(bucketName);
  const objectId = new mongoose.Types.ObjectId(fileId);
  const file = await bucket.find({ _id: objectId }).next();

  if (!file) {
    return { file: null, buffer: null };
  }

  const buffer = await new Promise((resolve, reject) => {
    const chunks = [];
    const downloadStream = bucket.openDownloadStream(objectId);
    downloadStream.on('data', (chunk) => chunks.push(chunk));
    downloadStream.on('end', () => resolve(Buffer.concat(chunks)));
    downloadStream.on('error', reject);
  });

  return { file, buffer };
};

const extractTextFromDocxBuffer = (buffer) => {
  const zip = new PizZip(buffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });
  return doc.getFullText() || '';
};

const getRawTagSpans = (text) => {
  const spans = [];
  const tagRegex = /\{[^{}]*\}/g;
  let match;

  while ((match = tagRegex.exec(text)) !== null) {
    spans.push({
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  return spans;
};

const overlapsRawTagSpan = (start, end, spans) => spans.some((span) => start < span.end && end > span.start);

const findSafeReplacementIndexes = (text, sourceText) => {
  if (!text || !sourceText) return [];

  const spans = getRawTagSpans(text);
  const safeIndexes = [];
  let index = text.indexOf(sourceText);

  while (index !== -1) {
    const end = index + sourceText.length;
    if (!overlapsRawTagSpan(index, end, spans)) {
      safeIndexes.push(index);
    }
    index = text.indexOf(sourceText, index + 1);
  }

  return safeIndexes;
};

const parsePreferredOccurrenceOrders = (checkedOccurrenceOrders) => (
  Array.isArray(checkedOccurrenceOrders)
    ? [...new Set(
      checkedOccurrenceOrders
        .map((value) => Number.parseInt(value, 10))
        .filter((value) => Number.isFinite(value) && value >= 1)
    )].sort((a, b) => a - b)
    : []
);

const buildTargetMatchIndexes = (safeMatchIndexes, preferredOrders, includeFallbackFirst = false) => {
  let targetMatchIndexes = preferredOrders
    .map((order) => safeMatchIndexes[order - 1])
    .filter((index) => typeof index === 'number');

  if (targetMatchIndexes.length === 0 && includeFallbackFirst && safeMatchIndexes.length > 0) {
    targetMatchIndexes = [safeMatchIndexes[0]];
  }

  return [...new Set(targetMatchIndexes)];
};

const escapeXmlText = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const isAlphaNumericChar = (value) => /[A-Za-z0-9]/.test(String(value || ''));

const findPreviousVisibleChar = (xml, startIndex) => {
  if (!xml || startIndex < 0) return '';
  let index = startIndex;

  while (index >= 0) {
    const current = xml[index];

    if (current === '>') {
      const openIndex = xml.lastIndexOf('<', index);
      if (openIndex === -1) return '';
      index = openIndex - 1;
      continue;
    }

    return current;
  }

  return '';
};

const findNextVisibleChar = (xml, startIndex) => {
  if (!xml || startIndex >= xml.length) return '';
  let index = startIndex;

  while (index < xml.length) {
    const current = xml[index];

    if (current === '<') {
      const closeIndex = xml.indexOf('>', index);
      if (closeIndex === -1) return '';
      index = closeIndex + 1;
      continue;
    }

    return current;
  }

  return '';
};

const getBoundarySpacingGuard = (xml, matchStartIndex, matchLength) => {
  const previousChar = findPreviousVisibleChar(xml, matchStartIndex - 1);
  const nextChar = findNextVisibleChar(xml, matchStartIndex + matchLength);
  const needsSpacing = isAlphaNumericChar(previousChar) && isAlphaNumericChar(nextChar);
  return {
    addLeadingSpace: needsSpacing,
    addTrailingSpace: needsSpacing,
  };
};

const applyReplacementSpacingGuard = (replacementText, spacingGuard) => {
  let adjusted = String(replacementText || '');
  if (spacingGuard.addLeadingSpace && !/^\s/.test(adjusted)) {
    adjusted = ` ${adjusted}`;
  }
  if (spacingGuard.addTrailingSpace && !/\s$/.test(adjusted)) {
    adjusted = `${adjusted} `;
  }
  return adjusted;
};

const buildHighlightedRunXml = (text, spacingGuard = { addLeadingSpace: false, addTrailingSpace: false }) => {
  const guardedText = applyReplacementSpacingGuard(text, spacingGuard);
  const escapedText = escapeXmlText(guardedText);
  return `</w:t></w:r><w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t xml:space="preserve">${escapedText}</w:t></w:r><w:r><w:t xml:space="preserve">`;
};

const ensureRunPrHasYellowHighlight = (runPrXml) => {
  const baseRunPr = String(runPrXml || '').trim();
  if (!baseRunPr) {
    return '<w:rPr><w:highlight w:val="yellow"/></w:rPr>';
  }

  const selfClosingHighlightRegex = /<w:highlight\b[^>]*\/>/g;
  const pairedHighlightRegex = /<w:highlight\b[^>]*>[\s\S]*?<\/w:highlight>/g;

  if (selfClosingHighlightRegex.test(baseRunPr)) {
    return baseRunPr.replace(selfClosingHighlightRegex, '<w:highlight w:val="yellow"/>');
  }

  if (pairedHighlightRegex.test(baseRunPr)) {
    return baseRunPr.replace(pairedHighlightRegex, '<w:highlight w:val="yellow"/>');
  }

  return baseRunPr.replace('</w:rPr>', '<w:highlight w:val="yellow"/></w:rPr>');
};

const buildTextOpenTagForContent = (textOpenTag, textContent) => {
  const baseTag = String(textOpenTag || '<w:t>');
  const content = String(textContent || '');
  const needsPreservedSpace = /^\s|\s$/.test(content);
  const xmlSpaceAttrRegex = /\sxml:space="[^"]*"/i;

  if (!needsPreservedSpace) {
    return baseTag;
  }

  if (xmlSpaceAttrRegex.test(baseTag)) {
    return baseTag.replace(xmlSpaceAttrRegex, ' xml:space="preserve"');
  }

  return baseTag.replace(/>$/, ' xml:space="preserve">');
};

const buildRunWithText = (runOpenTag, runPrXml, textOpenTag, textContent) => {
  const adjustedTextOpenTag = buildTextOpenTagForContent(textOpenTag, textContent);
  return `${runOpenTag}${runPrXml}${adjustedTextOpenTag}${textContent}</w:t></w:r>`;
};

const findRunOpenTagStart = (xml, beforeIndex) => {
  if (!xml || !Number.isInteger(beforeIndex) || beforeIndex <= 0) return -1;

  const runOpenRegex = /<w:r(?:\s[^>]*)?>/g;
  let lastRunOpenStart = -1;
  let match;

  while ((match = runOpenRegex.exec(xml)) !== null) {
    if (match.index >= beforeIndex) break;
    lastRunOpenStart = match.index;
  }

  return lastRunOpenStart;
};

const highlightMatchPreservingRunFormatting = (xml, matchStartIndex, matchLength) => {
  if (!xml || !Number.isInteger(matchStartIndex) || !Number.isInteger(matchLength) || matchLength <= 0) {
    return { xml: null, reason: 'INVALID_ARGUMENTS' };
  }

  const matchEndIndex = matchStartIndex + matchLength;
  const textOpenStart = xml.lastIndexOf('<w:t', matchStartIndex);
  if (textOpenStart === -1) return { xml: null, reason: 'TEXT_OPEN_NOT_FOUND' };

  const textOpenEnd = xml.indexOf('>', textOpenStart);
  if (textOpenEnd === -1) return { xml: null, reason: 'TEXT_OPEN_TAG_INVALID' };

  const textCloseStart = xml.indexOf('</w:t>', textOpenEnd + 1);
  if (textCloseStart === -1) return { xml: null, reason: 'TEXT_CLOSE_NOT_FOUND' };

  const textContentStart = textOpenEnd + 1;
  const textContentEnd = textCloseStart;

  if (matchStartIndex < textContentStart || matchEndIndex > textContentEnd) {
    return { xml: null, reason: 'MATCH_SPANS_MULTIPLE_TEXT_NODES' };
  }

  const runOpenStart = findRunOpenTagStart(xml, textOpenStart);
  if (runOpenStart === -1) return { xml: null, reason: 'RUN_OPEN_NOT_FOUND' };

  const runOpenEnd = xml.indexOf('>', runOpenStart);
  if (runOpenEnd === -1) return { xml: null, reason: 'RUN_OPEN_TAG_INVALID' };

  const runCloseStart = xml.indexOf('</w:r>', textCloseStart);
  if (runCloseStart === -1) return { xml: null, reason: 'RUN_CLOSE_NOT_FOUND' };

  const runOpenTag = xml.slice(runOpenStart, runOpenEnd + 1);
  const textOpenTag = xml.slice(textOpenStart, textOpenEnd + 1);
  const textCloseLength = '</w:t>'.length;
  const runCloseLength = '</w:r>'.length;

  const runPrStart = xml.indexOf('<w:rPr', runOpenEnd + 1);
  const runPrEnd = runPrStart >= 0 ? xml.indexOf('</w:rPr>', runPrStart) : -1;
  const runPrSelfCloseEnd = runPrStart >= 0 ? xml.indexOf('/>', runPrStart) : -1;
  const runPrXml = (
    runPrStart >= 0 &&
    runPrEnd >= 0 &&
    runPrEnd < textOpenStart
  )
    ? xml.slice(runPrStart, runPrEnd + '</w:rPr>'.length)
    : (
      runPrStart >= 0 &&
      runPrSelfCloseEnd >= 0 &&
      runPrSelfCloseEnd < textOpenStart
    )
      ? xml.slice(runPrStart, runPrSelfCloseEnd + '/>'.length)
      : '';

  const betweenRunAndText = xml.slice(runOpenEnd + 1, textOpenStart);
  const betweenTextAndRunClose = xml.slice(textCloseStart + textCloseLength, runCloseStart);
  const removeRunPrOnce = runPrXml ? betweenRunAndText.replace(runPrXml, '') : betweenRunAndText;
  if (removeRunPrOnce.trim() || betweenTextAndRunClose.trim()) {
    return { xml: null, reason: 'RUN_STRUCTURE_COMPLEX' };
  }

  const beforeText = xml.slice(textContentStart, matchStartIndex);
  const matchedText = xml.slice(matchStartIndex, matchEndIndex);
  const afterText = xml.slice(matchEndIndex, textContentEnd);

  const runs = [];
  if (beforeText) {
    runs.push(buildRunWithText(runOpenTag, runPrXml, textOpenTag, beforeText));
  }
  if (matchedText) {
    const highlightedRunPr = ensureRunPrHasYellowHighlight(runPrXml);
    runs.push(buildRunWithText(runOpenTag, highlightedRunPr, textOpenTag, matchedText));
  }
  if (afterText) {
    runs.push(buildRunWithText(runOpenTag, runPrXml, textOpenTag, afterText));
  }

  if (runs.length === 0) return { xml: null, reason: 'EMPTY_SPLIT_RESULT' };

  return {
    xml: (
      xml.slice(0, runOpenStart) +
      runs.join('') +
      xml.slice(runCloseStart + runCloseLength)
    ),
    reason: null,
  };
};

const collectMatches = (text, regex, mapper) => {
  const results = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    const mapped = mapper(match);
    if (mapped) {
      results.push(mapped);
    }
  }
  return results;
};

const parseFields = (text) => {
  const fields = [];

  fields.push(
    ...collectMatches(
      text,
      /\{input:([\w\s/&-]+?)(?:\|order:\s*\d+)?\}/gi,
      (match) => {
        const raw = match[1]?.trim();
        const key = normalizeKey(raw);
        return {
          id: `input:${key}`,
          family: 'input',
          key,
          rawTag: match[0],
        };
      }
    )
  );

  fields.push(
    ...collectMatches(
      text,
      /\{number_input:\s*([\w\s/_&-]+?)(?:\s*\|order:\s*\d+)?\}/gi,
      (match) => {
        const raw = match[1]?.trim();
        const key = normalizeKey(raw);
        return {
          id: `number_input:${key}`,
          family: 'number_input',
          key,
          rawTag: match[0],
        };
      }
    )
  );

  fields.push(
    ...collectMatches(
      text,
      /\{date:([^|}]+?)(?:\|order:\s*\d+)?\}/gi,
      (match) => {
        const raw = match[1]?.trim();
        const key = normalizeKey(raw);
        return {
          id: `date:${key}`,
          family: 'date',
          key,
          rawTag: match[0],
        };
      }
    )
  );

  fields.push(
    ...collectMatches(
      text,
      /\{range_input:([^|}]+?)\|([^|}]+?)(?:\|order:\s*\d+)?\}/gi,
      (match) => {
        const minRaw = match[1]?.trim();
        const maxRaw = match[2]?.trim();
        const minKey = normalizeKey(minRaw);
        const maxKey = normalizeKey(maxRaw);
        return {
          id: `range_input:${minKey}|${maxKey}`,
          family: 'range_input',
          key: `${minKey}|${maxKey}`,
          minKey,
          maxKey,
          rawTag: match[0],
        };
      }
    )
  );

  return fields;
};

const parseMetadata = (text) => {
  const metadata = [];

  metadata.push(
    ...collectMatches(
      text,
      /\{input_tooltip:([^|}]+)\|(?:(text|image|url)\|)?([^}]+)\}/gi,
      (match) => {
        const rawTarget = match[1]?.trim();
        return {
          id: `input_tooltip:${normalizeKey(rawTarget)}`,
          family: 'input_tooltip',
          targetKey: normalizeKey(rawTarget),
          valueType: (match[2] || 'text').trim(),
          content: (match[3] || '').trim(),
          rawTag: match[0],
        };
      }
    )
  );

  metadata.push(
    ...collectMatches(
      text,
      /\{button_tooltip:([^|}]+)\|(?:(text|image|url)\|)?([^}]+)\}/gi,
      (match) => {
        const rawTarget = match[1]?.trim();
        return {
          id: `button_tooltip:${normalizeKey(rawTarget)}`,
          family: 'button_tooltip',
          targetKey: normalizeKey(rawTarget),
          valueType: (match[2] || 'text').trim(),
          content: (match[3] || '').trim(),
          rawTag: match[0],
        };
      }
    )
  );

  metadata.push(
    ...collectMatches(
      text,
      /\{hyperlink:([^|}]+)\|([^}]+)\}/gi,
      (match) => {
        const rawTarget = match[1]?.trim();
        return {
          id: `hyperlink:${normalizeKey(rawTarget)}`,
          family: 'hyperlink',
          targetKey: normalizeKey(rawTarget),
          valueType: 'url',
          content: (match[2] || '').trim(),
          rawTag: match[0],
        };
      }
    )
  );

  metadata.push(
    ...collectMatches(
      text,
      /\{input_label:([^|}]+)\|([^}]+)\}/gi,
      (match) => {
        const rawTarget = match[1]?.trim();
        return {
          id: `input_label:${normalizeKey(rawTarget)}`,
          family: 'input_label',
          targetKey: normalizeKey(rawTarget),
          valueType: 'text',
          content: (match[2] || '').trim(),
          rawTag: match[0],
        };
      }
    )
  );

  return metadata;
};

const parseSections = (text) => {
  const sections = [];
  const regex =
    /\{section_start:([^}]+)\}|\{section_end:([^}]+)\}|\{#(Select_[^}]+|Nested_select_[^}]+)\}|\{\/(Select_[^}]+|Nested_select_[^}]+)\}/g;

  let match;
  while ((match = regex.exec(text)) !== null) {
    const rawTag = match[0];
    if (match[1]) {
      sections.push({
        family: 'section',
        type: 'open',
        key: match[1].trim(),
        rawTag,
      });
    } else if (match[2]) {
      sections.push({
        family: 'section',
        type: 'close',
        key: match[2].trim(),
        rawTag,
      });
    } else if (match[3]) {
      sections.push({
        family: 'select',
        type: 'open',
        key: match[3].trim(),
        rawTag,
      });
    } else if (match[4]) {
      sections.push({
        family: 'select',
        type: 'close',
        key: match[4].trim(),
        rawTag,
      });
    }
  }

  return sections;
};

const parseTables = (text) => {
  const tables = [];

  tables.push(
    ...collectMatches(text, /\{TABLE_START:([^}]+)\}/g, (match) => ({
      family: 'TABLE_START',
      key: match[1]?.trim(),
      rawTag: match[0],
    }))
  );

  tables.push(
    ...collectMatches(text, /\{TABLE_END:([^}]+)\}/g, (match) => ({
      family: 'TABLE_END',
      key: match[1]?.trim(),
      rawTag: match[0],
    }))
  );

  tables.push(
    ...collectMatches(text, /\{table_tooltip:([^|}]+)\|([^}]+)\}/gi, (match) => ({
      family: 'table_tooltip',
      key: match[1]?.trim(),
      content: (match[2] || '').trim(),
      rawTag: match[0],
    }))
  );

  tables.push(
    ...collectMatches(text, /\{table_hyperlink:([^|}]+)\|([^}]+)\}/gi, (match) => ({
      family: 'table_hyperlink',
      key: match[1]?.trim(),
      content: (match[2] || '').trim(),
      rawTag: match[0],
    }))
  );

  tables.push(
    ...collectMatches(text, /\{table_hyperlink_tooltip:([^|}]+)\|([^}]+)\}/gi, (match) => ({
      family: 'table_hyperlink_tooltip',
      key: match[1]?.trim(),
      content: (match[2] || '').trim(),
      rawTag: match[0],
    }))
  );

  return tables;
};

const buildValidation = (fields, metadata, tables) => {
  const errors = [];
  const warnings = [];

  const groupedFields = fields.reduce((acc, field) => {
    const groupKey = `${field.family}:${field.key}`;
    acc[groupKey] = (acc[groupKey] || 0) + 1;
    return acc;
  }, {});

  Object.entries(groupedFields).forEach(([groupKey, count]) => {
    if (count > 1) {
      errors.push({
        code: 'DUPLICATE_FIELD_KEY',
        message: `Duplicate field key detected for "${groupKey}" (${count} occurrences).`,
      });
    }
  });

  const knownFieldKeys = new Set();
  fields.forEach((field) => {
    if (field.family === 'range_input') {
      if (field.minKey) knownFieldKeys.add(field.minKey);
      if (field.maxKey) knownFieldKeys.add(field.maxKey);
    }
    knownFieldKeys.add(field.key);
  });

  metadata.forEach((meta) => {
    if (!knownFieldKeys.has(meta.targetKey)) {
      warnings.push({
        code: 'UNKNOWN_METADATA_TARGET',
        message: `Metadata "${meta.family}" targets unknown field key "${meta.targetKey}".`,
      });
    }
  });

  const startCounts = {};
  const endCounts = {};
  tables.forEach((item) => {
    if (item.family === 'TABLE_START') {
      startCounts[item.key] = (startCounts[item.key] || 0) + 1;
    }
    if (item.family === 'TABLE_END') {
      endCounts[item.key] = (endCounts[item.key] || 0) + 1;
    }
  });

  const startTotal = Object.values(startCounts).reduce((sum, n) => sum + n, 0);
  const endTotal = Object.values(endCounts).reduce((sum, n) => sum + n, 0);
  if (startTotal !== endTotal) {
    errors.push({
      code: 'TABLE_START_END_COUNT_MISMATCH',
      message: `TABLE_START (${startTotal}) and TABLE_END (${endTotal}) counts do not match.`,
    });
  }

  const tableNames = new Set([...Object.keys(startCounts), ...Object.keys(endCounts)]);
  tableNames.forEach((name) => {
    const starts = startCounts[name] || 0;
    const ends = endCounts[name] || 0;
    if (starts !== ends) {
      warnings.push({
        code: 'TABLE_NAME_PAIRING_WARNING',
        message: `Table "${name}" has ${starts} TABLE_START and ${ends} TABLE_END tags.`,
      });
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
};

const buildRepeatedTextCandidates = (text) => {
  const rawText = String(text || '');
  if (!rawText) return [];

  // Remove template tags so helper candidates are based on plain text only.
  const plainText = rawText.replace(/\{[^{}]*\}/g, ' ');
  const normalizedText = plainText
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalizedText) return [];

  const stopWords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'if', 'in', 'into',
    'is', 'it', 'of', 'on', 'or', 'that', 'the', 'their', 'then', 'there', 'these',
    'this', 'to', 'was', 'we', 'with', 'you', 'your',
  ]);

  const candidateOccurrences = new Map();

  const toCandidateSlug = (value) => {
    const slug = String(value || '')
      .toLowerCase()
      .replace(/[^\w]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
    return slug || 'candidate';
  };

  const buildContextSnippet = (value, start, end) => {
    const snippetRadius = 36;
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start) {
      return String(value || '').trim();
    }

    const leftStart = Math.max(0, start - snippetRadius);
    const rightEnd = Math.min(value.length, end + snippetRadius);
    const prefix = leftStart > 0 ? '...' : '';
    const suffix = rightEnd < value.length ? '...' : '';
    const snippet = value.slice(leftStart, rightEnd).trim();
    return `${prefix}${snippet}${suffix}`;
  };

  const addCandidate = (value, startIndex = -1) => {
    const cleaned = String(value || '').trim().replace(/[.,;:!?]+$/g, '');
    if (!cleaned) return;
    if (cleaned.length < 3) return;
    if (/^\d+$/.test(cleaned)) return;
    if (stopWords.has(cleaned.toLowerCase())) return;

    const start = Number.isInteger(startIndex) && startIndex >= 0 ? startIndex : -1;
    const end = start >= 0 ? start + cleaned.length : -1;
    const existingOccurrences = candidateOccurrences.get(cleaned) || [];
    const isDuplicate = start >= 0 && existingOccurrences.some((occurrence) => occurrence.start === start);
    if (isDuplicate) return;

    existingOccurrences.push({
      start,
      end,
      context: buildContextSnippet(normalizedText, start, end),
    });
    candidateOccurrences.set(cleaned, existingOccurrences);
  };

  // Title-case / proper noun style phrases (1-4 words): "Acme", "Acme Corporation", etc.
  const phraseRegex = /\b([A-Z][A-Za-z0-9&/-]*(?:\s+[A-Z][A-Za-z0-9&/-]*){0,3})\b/g;
  let phraseMatch;
  while ((phraseMatch = phraseRegex.exec(normalizedText)) !== null) {
    const phrase = phraseMatch[1]?.trim();
    if (!phrase) continue;

    const words = phrase.split(/\s+/);
    const allStopWords = words.every((word) => stopWords.has(word.toLowerCase()));
    if (allStopWords) continue;

    addCandidate(phrase, phraseMatch.index);
  }

  // Repeated ALL-CAPS tokens often represent stable labels/entities.
  const upperRegex = /\b([A-Z]{3,}(?:\s+[A-Z]{2,})?)\b/g;
  let upperMatch;
  while ((upperMatch = upperRegex.exec(normalizedText)) !== null) {
    addCandidate(upperMatch[1], upperMatch.index);
  }

  return Array.from(candidateOccurrences.entries())
    .map(([candidateText, occurrences]) => {
      const sortedOccurrences = occurrences
        .slice()
        .sort((a, b) => {
          const aStart = a.start >= 0 ? a.start : Number.MAX_SAFE_INTEGER;
          const bStart = b.start >= 0 ? b.start : Number.MAX_SAFE_INTEGER;
          return aStart - bStart;
        })
        .map((occurrence, index) => ({
          id: `${toCandidateSlug(candidateText)}_${index + 1}`,
          order: index + 1,
          context: occurrence.context,
          start: occurrence.start,
          end: occurrence.end,
        }));

      return {
        text: candidateText,
        count: sortedOccurrences.length,
        occurrences: sortedOccurrences,
      };
    })
    .filter((item) => item.count >= 2)
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      if (b.text.length !== a.text.length) return b.text.length - a.text.length;
      return a.text.localeCompare(b.text);
    })
    .slice(0, 12);
};

router.post('/analyze-template', async (req, res) => {
  const { fileId, bucketName } = req.body || {};

  if (!fileId || !bucketName) {
    return res.status(400).json({
      error: 'fileId and bucketName are required.',
    });
  }

  if (!mongoose.Types.ObjectId.isValid(fileId)) {
    return res.status(400).json({
      error: 'Invalid fileId format.',
    });
  }

  try {
    const { file, buffer } = await readFileBufferFromBucket(bucketName, fileId);

    if (!file || !buffer) {
      return res.status(404).json({
        error: `Template with ID "${fileId}" not found in bucket "${bucketName}".`,
      });
    }

    const text = extractTextFromDocxBuffer(buffer);
    const fields = parseFields(text);
    const metadata = parseMetadata(text);
    const sections = parseSections(text);
    const tables = parseTables(text);
    const validation = buildValidation(fields, metadata, tables);
    const repeatedTextCandidates = buildRepeatedTextCandidates(text);

    return res.status(200).json({
      templateSummary: {
        fileId,
        bucketName,
        filename: file.filename || '',
        textLength: text.length,
      },
      inventories: {
        fields,
        metadata,
        sections,
        tables,
      },
      validation,
      helperCandidates: {
        repeatedText: repeatedTextCandidates,
      },
    });
  } catch (error) {
    console.error('Error analyzing template for tag authoring:', error);
    return res.status(500).json({
      error: 'Failed to analyze template.',
      details: error.message,
    });
  }
});

router.post('/replace-selected', async (req, res) => {
  const {
    fileId,
    bucketName,
    sourceText,
    replacementText,
    checkedOccurrenceOrders,
    replaceAllChecked,
  } = req.body || {};

  if (!fileId || !bucketName || !sourceText || !replacementText) {
    return res.status(400).json({
      error: 'fileId, bucketName, sourceText, and replacementText are required.',
    });
  }

  if (!mongoose.Types.ObjectId.isValid(fileId)) {
    return res.status(400).json({
      error: 'Invalid fileId format.',
    });
  }

  const normalizedSourceText = String(sourceText).trim();
  const normalizedReplacementText = String(replacementText).trim();

  if (!normalizedSourceText || !normalizedReplacementText) {
    return res.status(400).json({
      error: 'sourceText and replacementText must be non-empty strings.',
    });
  }

  try {
    const { file, buffer } = await readFileBufferFromBucket(bucketName, fileId);

    if (!file || !buffer) {
      return res.status(404).json({
        error: `Template with ID "${fileId}" not found in bucket "${bucketName}".`,
      });
    }

    const zip = new PizZip(buffer);
    const documentXmlFile = zip.file('word/document.xml');

    if (!documentXmlFile) {
      return res.status(500).json({
        error: 'The template is missing word/document.xml and cannot be updated.',
      });
    }

    const documentXml = documentXmlFile.asText();
    const safeMatchIndexes = findSafeReplacementIndexes(documentXml, normalizedSourceText);
    if (safeMatchIndexes.length === 0) {
      return res.status(409).json({
        error: 'No safe plain-text occurrence was found for replacement.',
      });
    }

    const replaceAllCheckedOccurrences = Boolean(replaceAllChecked);
    const preferredOrders = parsePreferredOccurrenceOrders(checkedOccurrenceOrders);

    if (replaceAllCheckedOccurrences && preferredOrders.length === 0) {
      return res.status(409).json({
        error: 'No checked occurrences are available for replacement.',
      });
    }

    let targetMatchIndexes = buildTargetMatchIndexes(
      safeMatchIndexes,
      preferredOrders,
      !replaceAllCheckedOccurrences
    );

    if (targetMatchIndexes.length === 0) {
      return res.status(409).json({
        error: 'No checked safe occurrence is currently available for replacement.',
      });
    }

    if (!replaceAllCheckedOccurrences && targetMatchIndexes.length > 1) {
      targetMatchIndexes = [targetMatchIndexes[0]];
    }

    const replacementTargetsDescending = targetMatchIndexes
      .slice()
      .sort((a, b) => b - a);

    let updatedDocumentXml = documentXml;
    replacementTargetsDescending.forEach((targetIndex) => {
      const spacingGuard = getBoundarySpacingGuard(
        updatedDocumentXml,
        targetIndex,
        normalizedSourceText.length
      );
      const guardedReplacementText = applyReplacementSpacingGuard(
        normalizedReplacementText,
        spacingGuard
      );
      updatedDocumentXml =
        updatedDocumentXml.slice(0, targetIndex) +
        guardedReplacementText +
        updatedDocumentXml.slice(targetIndex + normalizedSourceText.length);
    });

    zip.file('word/document.xml', updatedDocumentXml);

    const modifiedBuffer = zip.generate({ type: 'nodebuffer' });

    try {
      extractTextFromDocxBuffer(modifiedBuffer);
    } catch (validationError) {
      return res.status(409).json({
        error: 'Replacement would produce an invalid template. No changes were saved.',
        details: validationError.message,
      });
    }

    const tempBucketName = 'temp_files';
    const tempBucket = getOrCreateBucket(tempBucketName);
    const modifiedFilename = `tag_authored_${file.filename || 'template.docx'}`;

    const uploadStream = tempBucket.openUploadStream(modifiedFilename, {
      metadata: {
        originalFileId: fileId,
        sourceBucketName: bucketName,
        processedWith: 'tag_authoring_replace_selected',
        replaceMode: replaceAllCheckedOccurrences ? 'replace_all_checked' : 'replace_one_checked',
        replacedSourceText: normalizedSourceText,
        replacementText: normalizedReplacementText,
        replacedCount: replacementTargetsDescending.length,
        timestamp: new Date(),
      },
    });

    await new Promise((resolve, reject) => {
      Readable.from(modifiedBuffer).pipe(uploadStream);
      uploadStream.on('finish', resolve);
      uploadStream.on('error', reject);
    });

    return res.status(200).json({
      message: replaceAllCheckedOccurrences
        ? `Replaced ${replacementTargetsDescending.length} checked occurrences.`
        : 'Replaced one checked occurrence.',
      replacedCount: replacementTargetsDescending.length,
      modifiedFileId: uploadStream.id,
      tempBucketName,
      modifiedFilename,
    });
  } catch (error) {
    console.error('Error replacing selected text for tag authoring:', error);
    return res.status(500).json({
      error: 'Failed to replace selected text.',
      details: error.message,
    });
  }
});

router.post('/preview-highlight-checked', async (req, res) => {
  const {
    fileId,
    bucketName,
    sourceText,
    checkedOccurrenceOrders,
  } = req.body || {};

  if (!fileId || !bucketName || !sourceText) {
    return res.status(400).json({
      error: 'fileId, bucketName, and sourceText are required.',
    });
  }

  if (!mongoose.Types.ObjectId.isValid(fileId)) {
    return res.status(400).json({
      error: 'Invalid fileId format.',
    });
  }

  const normalizedSourceText = String(sourceText).trim();
  if (!normalizedSourceText) {
    return res.status(400).json({
      error: 'sourceText must be a non-empty string.',
    });
  }

  const preferredOrders = parsePreferredOccurrenceOrders(checkedOccurrenceOrders);
  if (preferredOrders.length === 0) {
    return res.status(409).json({
      error: 'No checked occurrences are available for highlighting.',
    });
  }

  try {
    const { file, buffer } = await readFileBufferFromBucket(bucketName, fileId);

    if (!file || !buffer) {
      return res.status(404).json({
        error: `Template with ID "${fileId}" not found in bucket "${bucketName}".`,
      });
    }

    const zip = new PizZip(buffer);
    const documentXmlFile = zip.file('word/document.xml');
    if (!documentXmlFile) {
      return res.status(500).json({
        error: 'The template is missing word/document.xml and cannot be highlighted.',
      });
    }

    const documentXml = documentXmlFile.asText();
    const safeMatchIndexes = findSafeReplacementIndexes(documentXml, normalizedSourceText);
    if (safeMatchIndexes.length === 0) {
      return res.status(409).json({
        error: 'No safe plain-text occurrence was found for highlighting.',
      });
    }

    const targetMatchIndexes = buildTargetMatchIndexes(safeMatchIndexes, preferredOrders, false);
    if (targetMatchIndexes.length === 0) {
      return res.status(409).json({
        error: 'No checked safe occurrence is currently available for highlighting.',
      });
    }

    const targetIndexesDescending = targetMatchIndexes
      .slice()
      .sort((a, b) => b - a);

    let highlightedDocumentXml = documentXml;
    let highlightedAppliedCount = 0;
    let skippedHighlightCount = 0;
    const skippedReasonCounts = {};

    targetIndexesDescending.forEach((targetIndex) => {
      const highlightResult = highlightMatchPreservingRunFormatting(
        highlightedDocumentXml,
        targetIndex,
        normalizedSourceText.length
      );

      if (!highlightResult?.xml) {
        skippedHighlightCount += 1;
        const reason = highlightResult?.reason || 'UNKNOWN';
        skippedReasonCounts[reason] = (skippedReasonCounts[reason] || 0) + 1;
        return;
      }

      highlightedDocumentXml = highlightResult.xml;
      highlightedAppliedCount += 1;
    });

    if (highlightedAppliedCount === 0) {
      return res.status(409).json({
        error: 'No checked occurrence could be highlighted safely without changing formatting.',
      });
    }

    zip.file('word/document.xml', highlightedDocumentXml);
    const highlightedBuffer = zip.generate({ type: 'nodebuffer' });

    try {
      extractTextFromDocxBuffer(highlightedBuffer);
    } catch (validationError) {
      return res.status(409).json({
        error: 'Highlighted preview could not be generated safely. No changes were saved.',
        details: validationError.message,
      });
    }

    const tempBucketName = 'temp_files';
    const tempBucket = getOrCreateBucket(tempBucketName);
    const highlightedFilename = `tag_highlighted_${file.filename || 'template.docx'}`;
    const uploadStream = tempBucket.openUploadStream(highlightedFilename, {
      metadata: {
        originalFileId: fileId,
        sourceBucketName: bucketName,
        processedWith: 'tag_authoring_preview_highlight_checked',
        highlightedSourceText: normalizedSourceText,
        highlightedCount: highlightedAppliedCount,
        skippedHighlightCount,
        skippedHighlightReasons: skippedReasonCounts,
        timestamp: new Date(),
      },
    });

    await new Promise((resolve, reject) => {
      Readable.from(highlightedBuffer).pipe(uploadStream);
      uploadStream.on('finish', resolve);
      uploadStream.on('error', reject);
    });

    return res.status(200).json({
      message: skippedHighlightCount > 0
        ? `Previewed ${highlightedAppliedCount} highlighted occurrences (${skippedHighlightCount} skipped to preserve formatting).`
        : `Previewed ${highlightedAppliedCount} highlighted occurrences.`,
      highlightedCount: highlightedAppliedCount,
      skippedHighlightCount,
      skippedHighlightReasons: skippedReasonCounts,
      modifiedFileId: uploadStream.id,
      tempBucketName,
      modifiedFilename: highlightedFilename,
    });
  } catch (error) {
    console.error('Error generating highlighted preview for tag authoring:', error);
    return res.status(500).json({
      error: 'Failed to generate highlighted preview.',
      details: error.message,
    });
  }
});

module.exports = router;
