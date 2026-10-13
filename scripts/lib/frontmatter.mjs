// Minimal YAML front-matter reader/writer for agent and skill files. Flat keys only — enough for
// `description`, `mode`, `model`, and `name`; nested blocks (permissions) are preserved verbatim.
const BLOCK = /^---\r?\n([\s\S]*?)\r?\n---/;

export function parseFrontmatter(text) {
  const match = BLOCK.exec(text);
  if (!match) return { data: {}, body: text };
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (kv) data[kv[1]] = kv[2].trim();
  }
  return { data, body: text.slice(match.index + match[0].length).replace(/^\r?\n/, '') };
}

export function setFrontmatterValue(text, key, value) {
  const match = BLOCK.exec(text);
  if (!match) throw new Error('No front-matter block found');
  let block = match[1];
  const line = new RegExp(`^${key}:.*$`, 'm');
  if (line.test(block)) {
    block = block.replace(line, `${key}: ${value}`);
  } else if (/^permissions:/m.test(block)) {
    block = block.replace(/^permissions:/m, `${key}: ${value}\npermissions:`);
  } else if (/^mode:/m.test(block)) {
    block = block.replace(/^mode:.*$/m, (m) => `${m}\n${key}: ${value}`);
  } else {
    block = `${block}\n${key}: ${value}`;
  }
  return `---\n${block}\n---${text.slice(match.index + match[0].length)}`;
}
