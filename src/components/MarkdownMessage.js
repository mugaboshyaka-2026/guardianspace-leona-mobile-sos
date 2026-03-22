import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../theme';

function parseInlineSegments(text = '') {
  const segments = [];
  const boldRegex = /(\*\*[^*]+\*\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', text: text.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'bold', text: match[0].slice(2, -2) });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', text: text.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ type: 'text', text }];
}

function renderInlineText(text, baseStyle, boldStyle) {
  return parseInlineSegments(text).map((segment, idx) => (
    <Text key={`${segment.type}-${idx}`} style={segment.type === 'bold' ? [baseStyle, boldStyle] : baseStyle}>
      {segment.text}
    </Text>
  ));
}

function isMarkdownDivider(line) {
  const trimmed = line.trim();
  return /^[-*_]{3,}$/.test(trimmed);
}

function isMarkdownTableLine(line) {
  const trimmed = line.trim();
  return trimmed.startsWith('|') && trimmed.endsWith('|');
}

function isMarkdownTableSeparator(line) {
  return /^\|?(\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?$/.test(line.trim());
}

function parseMarkdownBlocks(text = '') {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (isMarkdownDivider(trimmed)) {
      blocks.push({ type: 'divider' });
      i += 1;
      continue;
    }

    if (trimmed.startsWith('## ')) {
      blocks.push({ type: 'heading', level: 2, text: trimmed.slice(3).trim() });
      i += 1;
      continue;
    }

    if (trimmed.startsWith('# ')) {
      blocks.push({ type: 'heading', level: 1, text: trimmed.slice(2).trim() });
      i += 1;
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ''));
        i += 1;
      }
      blocks.push({ type: 'list', items });
      continue;
    }

    if (isMarkdownTableLine(trimmed)) {
      const tableLines = [];
      while (i < lines.length && isMarkdownTableLine(lines[i].trim())) {
        tableLines.push(lines[i].trim());
        i += 1;
      }

      const rows = tableLines.map((tableLine) =>
        tableLine
          .split('|')
          .slice(1, -1)
          .map((cell) => cell.trim())
      );
      const contentRows = rows.filter((row) => !isMarkdownTableSeparator(`|${row.join('|')}|`));

      if (contentRows.length > 0) {
        blocks.push({
          type: 'table',
          headers: contentRows[0],
          rows: contentRows.slice(1),
        });
      }
      continue;
    }

    const paragraphLines = [];
    while (i < lines.length) {
      const current = lines[i].trim();
      if (
        !current ||
        isMarkdownDivider(current) ||
        current.startsWith('#') ||
        /^[-*]\s+/.test(current) ||
        isMarkdownTableLine(current)
      ) {
        break;
      }
      paragraphLines.push(current);
      i += 1;
    }
    blocks.push({ type: 'paragraph', text: paragraphLines.join(' ') });
  }

  return blocks;
}

function MarkdownMessage({ text, tone = 'agent' }) {
  const blocks = useMemo(() => parseMarkdownBlocks(text), [text]);
  const toneStyles = {
    agent: {
      text: styles.agentText,
      heading: styles.agentHeading,
      divider: styles.agentDivider,
      table: styles.agentTable,
    },
    user: {
      text: styles.userText,
      heading: styles.userHeading,
      divider: styles.userDivider,
      table: styles.userTable,
    },
    brief: {
      text: styles.briefText,
      heading: styles.briefHeading,
      divider: styles.briefDivider,
      table: styles.briefTable,
    },
  };
  const toneStyle = toneStyles[tone] || toneStyles.agent;

  return (
    <View style={styles.markdownContainer}>
      {blocks.map((block, idx) => {
        if (block.type === 'heading') {
          return (
            <Text
              key={`heading-${idx}`}
              style={[
                styles.markdownHeading,
                block.level === 1 ? styles.markdownHeadingPrimary : styles.markdownHeadingSecondary,
                toneStyle.heading,
              ]}
            >
              {block.text}
            </Text>
          );
        }

        if (block.type === 'divider') {
          return <View key={`divider-${idx}`} style={[styles.markdownDivider, toneStyle.divider]} />;
        }

        if (block.type === 'list') {
          return (
            <View key={`list-${idx}`} style={styles.markdownList}>
              {block.items.map((item, itemIdx) => (
                <View key={`item-${itemIdx}`} style={styles.markdownListRow}>
                  <Text style={[styles.markdownBullet, toneStyle.text]}>•</Text>
                  <Text style={[styles.messageText, toneStyle.text]}>
                    {renderInlineText(item, [styles.messageText, toneStyle.text], styles.messageTextBold)}
                  </Text>
                </View>
              ))}
            </View>
          );
        }

        if (block.type === 'table') {
          return (
            <View key={`table-${idx}`} style={[styles.markdownTable, toneStyle.table]}>
              <View style={[styles.markdownTableRow, styles.markdownTableHeaderRow]}>
                {block.headers.map((header, headerIdx) => (
                  <Text key={`header-${headerIdx}`} style={[styles.markdownTableHeaderText, toneStyle.text]}>
                    {header}
                  </Text>
                ))}
              </View>
              {block.rows.map((row, rowIdx) => (
                <View key={`row-${rowIdx}`} style={styles.markdownTableRow}>
                  {row.map((cell, cellIdx) => (
                    <Text key={`cell-${cellIdx}`} style={[styles.markdownTableCellText, toneStyle.text]}>
                      {cell}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          );
        }

        return (
          <Text key={`paragraph-${idx}`} style={[styles.messageText, toneStyle.text, styles.markdownParagraph]}>
            {renderInlineText(block.text, [styles.messageText, toneStyle.text], styles.messageTextBold)}
          </Text>
        );
      })}
    </View>
  );
}

export default React.memo(MarkdownMessage);

const styles = StyleSheet.create({
  messageText: { fontSize: 14, lineHeight: 20 },
  agentText: { color: colors.text },
  userText: { color: colors.blueLight },
  briefText: { color: colors.textSec },
  messageTextBold: { fontWeight: '700' },
  markdownContainer: { gap: spacing.sm },
  markdownParagraph: { marginBottom: 0 },
  markdownHeading: { fontWeight: '700', letterSpacing: 0.4 },
  markdownHeadingPrimary: { fontSize: 16, lineHeight: 22 },
  markdownHeadingSecondary: { fontSize: 13, lineHeight: 18, textTransform: 'uppercase' },
  agentHeading: { color: colors.text },
  userHeading: { color: colors.white },
  briefHeading: { color: colors.text, marginBottom: 2 },
  markdownDivider: { height: 1, marginVertical: spacing.xs },
  agentDivider: { backgroundColor: 'rgba(255,255,255,0.12)' },
  userDivider: { backgroundColor: 'rgba(255,255,255,0.2)' },
  briefDivider: { backgroundColor: colors.border },
  markdownList: { gap: spacing.sm },
  markdownListRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  markdownBullet: { fontSize: 14, lineHeight: 20, marginTop: 1 },
  markdownTable: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  agentTable: { borderColor: 'rgba(255,255,255,0.12)' },
  userTable: { borderColor: 'rgba(255,255,255,0.2)' },
  briefTable: { borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.02)' },
  markdownTableHeaderRow: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  markdownTableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  markdownTableHeaderText: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: 11,
    fontWeight: '700',
  },
  markdownTableCellText: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: 12,
    lineHeight: 17,
  },
});
