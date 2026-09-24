import fs from 'node:fs';
import path from 'node:path';

const root = fs.realpathSync(process.argv[2] || process.env.AI_VIRTUAL_COMPANY_ROOT || process.cwd());
const errors = [];
const warnings = [];
const supportedVoices = new Set([
  'alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'nova',
  'onyx', 'sage', 'shimmer', 'verse', 'marin', 'cedar',
]);
const supportedFormats = new Set(['mp3', 'opus', 'aac', 'flac', 'wav', 'pcm']);

function read(relativePath) {
  const candidate = path.join(root, relativePath);
  const real = fs.realpathSync(candidate);
  if (real !== root && !real.startsWith(root + path.sep)) throw new Error('path escapes company root: ' + relativePath);
  return fs.readFileSync(real, 'utf8');
}

function requiredString(object, key, context) {
  if (typeof object?.[key] !== 'string' || !object[key].trim()) errors.push(`${context}: missing ${key}`);
}

let manifest;
try {
  manifest = JSON.parse(read('employees/VOICE_PROFILES.json'));
} catch (error) {
  console.error(JSON.stringify({ errors: ['manifest unreadable: ' + error.message], warnings }, null, 2));
  process.exit(1);
}

const roster = read('employees/ROSTER.txt')
  .split(/\r?\n/)
  .map(line => line.trim())
  .filter(Boolean);
const rosterSet = new Set(roster);

if (manifest.schema_version !== 'ted.employee-voice-profiles.v1') errors.push('invalid schema_version');
if (manifest.status !== 'configured_not_activated') warnings.push('activation status changed; verify real API and listening evidence');
if (manifest.provider !== 'openai' || manifest.channel !== 'speech_api') errors.push('invalid provider or channel');
if (manifest.defaults?.model !== 'gpt-4o-mini-tts') errors.push('unsupported default model');
if (!supportedFormats.has(manifest.defaults?.response_format)) errors.push('unsupported response format');
for (const key of ['language', 'disclosure_zh', 'safety_instruction', 'voice_optimization_note_zh']) {
  requiredString(manifest.defaults, key, 'defaults');
}
if (!manifest.defaults?.disclosure_zh?.includes('AI')) errors.push('disclosure must identify AI-generated speech');
for (const key of ['chatgpt_voice', 'speech_api', 'activation']) {
  requiredString(manifest.capability_boundary, key, 'capability_boundary');
}
if (!Array.isArray(manifest.sources) || manifest.sources.length < 2) errors.push('missing official sources');
else if (manifest.sources.some(url => !/^https:\/\/(learn\.chatgpt\.com|developers\.openai\.com)\//.test(url))) {
  errors.push('sources must use approved official documentation domains');
}

if (!Array.isArray(manifest.profiles)) errors.push('profiles must be an array');
const seenRoles = new Set();
const seenVoices = new Set();
for (const profile of manifest.profiles || []) {
  const context = profile?.role_id || 'unknown-profile';
  for (const key of ['role_id', 'display_name', 'voice', 'style_summary_zh', 'instructions', 'preview_text_zh', 'selection_basis_zh']) {
    requiredString(profile, key, context);
  }
  if (!/^[a-z][a-z0-9-]+$/.test(profile?.role_id || '')) errors.push(`${context}: invalid role_id`);
  if (seenRoles.has(profile.role_id)) errors.push(`${context}: duplicate role_id`);
  seenRoles.add(profile.role_id);
  if (!rosterSet.has(profile.role_id)) errors.push(`${context}: role_id is not in roster`);
  if (!supportedVoices.has(profile.voice)) errors.push(`${context}: unsupported voice ${profile.voice}`);
  if (seenVoices.has(profile.voice)) errors.push(`${context}: duplicate voice ${profile.voice}`);
  seenVoices.add(profile.voice);
  if (typeof profile.speed !== 'number' || profile.speed < 0.25 || profile.speed > 4) errors.push(`${context}: invalid speed`);
  if (!/Mandarin Chinese/i.test(profile.instructions || '')) errors.push(`${context}: instructions must explicitly target Mandarin Chinese`);
  if (!/岗位风格推断/.test(profile.selection_basis_zh || '')) errors.push(`${context}: selection basis must preserve role-inference boundary`);

  try {
    const heading = read(`employees/${profile.role_id}/PROFILE.md`).match(/^#\s+(.+)$/m)?.[1];
    if (heading !== profile.display_name) errors.push(`${context}: display_name does not match PROFILE.md heading`);
  } catch (error) {
    errors.push(`${context}: profile unreadable: ${error.message}`);
  }
}

for (const role of roster) if (!seenRoles.has(role)) errors.push(`${role}: missing voice profile`);
if (seenRoles.size !== rosterSet.size) errors.push(`profile/roster count mismatch: ${seenRoles.size}/${rosterSet.size}`);

console.log(JSON.stringify({
  schema_version: manifest.schema_version,
  roster_count: rosterSet.size,
  profile_count: manifest.profiles?.length || 0,
  unique_voice_count: seenVoices.size,
  errors,
  warnings,
  scope: 'structure, roster coverage, supported enums, identity headings, and activation boundary; no API call or audio quality certification',
}, null, 2));
process.exitCode = errors.length ? 1 : 0;
