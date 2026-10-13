export function verifiedRating(record, identity, contentDigest) {
  if (!record || typeof record.quality !== 'number' || !Number.isFinite(record.quality) || record.quality < 0 || record.quality > 5 ||
      typeof record.source !== 'string' || !record.source.trim() || !Number.isFinite(Date.parse(record.assessedAt || '')) || record.identity !== identity ||
      !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(contentDigest || '') || record.contentDigest !== contentDigest || !Number.isInteger(record.sampleSize) || record.sampleSize < 20) return null;
  return { quality: record.quality, source: String(record.source), assessedAt: String(record.assessedAt),
    sampleSize: record.sampleSize,
    provisional: record.provisional === true };
}

export const releasedIdentity = pack => `pack:${pack.type}/${pack.name}@${pack.version}`;
export const prIdentity = (pr, change) => `pr:${pr.number}:${pr.headSha}:${change.type}/${change.name}`;
export const skillCandidateIdentity = candidate => `skill-candidate:${candidate.id}:${candidate.bundleSha256}`;
