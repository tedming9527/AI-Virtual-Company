// Display only explicitly declared metadata; never infer purpose from a filename
// or copy arbitrary body text (which may contain private notes or instructions).
export function compactDescription(value, limit = 160) {
  if (typeof value !== 'string') return null;
  const text = value.replace(/\s+/g, ' ').trim();
  if (!text) return null;
  return text.length > limit ? text.slice(0, limit - 1) + '…' : text;
}
export function describeAsset(meta = {}, content = '') {
  const declared = compactDescription(meta.description);
  if (declared) return { description: declared, descriptionSource: 'meta' };
  const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
  const scalar = frontmatter?.match(/^description:[ \t]*(.+)$/m)?.[1]?.trim();
  // Only single-line scalars are supported in legacy external descriptions.
  const fallback = scalar && !/^[>|]/.test(scalar) ? compactDescription(scalar.replace(/^(["'])([\s\S]*)\1$/, '$2')) : null;
  return { description: fallback, descriptionSource: fallback ? 'frontmatter' : 'missing' };
}
