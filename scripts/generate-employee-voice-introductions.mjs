import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

const root = fs.realpathSync(process.env.AI_VIRTUAL_COMPANY_ROOT || process.cwd());
const outputDirectory = path.join(root, 'output/2026-09-22-employee-voice-introductions');
const introductionsPath = path.join(outputDirectory, 'introductions.json');
const voiceProfilesPath = path.join(root, 'employees/VOICE_PROFILES.json');
const dryRun = process.argv.includes('--dry-run');

const introductions = JSON.parse(await fsp.readFile(introductionsPath, 'utf8'));
const voiceProfiles = JSON.parse(await fsp.readFile(voiceProfilesPath, 'utf8'));
const profileByRole = new Map(voiceProfiles.profiles.map(profile => [profile.role_id, profile]));
const roster = (await fsp.readFile(path.join(root, 'employees/ROSTER.txt'), 'utf8'))
  .split(/\r?\n/)
  .map(value => value.trim())
  .filter(Boolean);
const errors = [];
const seenRoles = new Set();
const seenOrders = new Set();
const seenFiles = new Set();

if (introductions.schema_version !== 'ted.employee-voice-introductions.v1') errors.push('invalid introduction schema');
if (voiceProfiles.defaults?.model !== 'gpt-4o-mini-tts') errors.push('unexpected speech model');
if (voiceProfiles.defaults?.response_format !== 'mp3') errors.push('this generator requires MP3 output');
if (!Array.isArray(introductions.items)) errors.push('introduction items must be an array');

for (const item of introductions.items || []) {
  if (!roster.includes(item.role_id)) errors.push(`${item.role_id}: role is not in roster`);
  if (!profileByRole.has(item.role_id)) errors.push(`${item.role_id}: missing voice profile`);
  if (seenRoles.has(item.role_id)) errors.push(`${item.role_id}: duplicate role`);
  if (seenOrders.has(item.order)) errors.push(`${item.role_id}: duplicate order`);
  if (seenFiles.has(item.output_file)) errors.push(`${item.role_id}: duplicate output file`);
  if (!/^\d{2}-[a-z0-9-]+\.mp3$/.test(item.output_file || '')) errors.push(`${item.role_id}: unsafe output file`);
  if (typeof item.script_zh !== 'string' || item.script_zh.length < 40) errors.push(`${item.role_id}: introduction is too short`);
  seenRoles.add(item.role_id);
  seenOrders.add(item.order);
  seenFiles.add(item.output_file);
}

for (const role of roster) if (!seenRoles.has(role)) errors.push(`${role}: missing introduction`);
if (errors.length) {
  console.error(JSON.stringify({ status: 'invalid', errors }, null, 2));
  process.exit(1);
}

const plan = introductions.items
  .slice()
  .sort((a, b) => a.order - b.order)
  .map(item => {
    const profile = profileByRole.get(item.role_id);
    return {
      order: item.order,
      role_id: item.role_id,
      display_name: profile.display_name,
      voice: profile.voice,
      speed: profile.speed,
      output_file: item.output_file,
      characters: item.script_zh.length,
    };
  });

if (dryRun) {
  console.log(JSON.stringify({ status: 'dry_run', model: voiceProfiles.defaults.model, clips: plan }, null, 2));
  process.exit(0);
}

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('OPENAI_API_KEY is not available; no API requests were sent and no audio files were written.');
  process.exit(2);
}

await fsp.mkdir(outputDirectory, { recursive: true });
const generated = [];

for (const item of introductions.items.slice().sort((a, b) => a.order - b.order)) {
  const profile = profileByRole.get(item.role_id);
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: voiceProfiles.defaults.model,
      voice: profile.voice,
      input: `${voiceProfiles.defaults.disclosure_zh}${item.script_zh}`,
      instructions: `${voiceProfiles.defaults.safety_instruction} ${profile.instructions}`,
      response_format: voiceProfiles.defaults.response_format,
      speed: profile.speed,
    }),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`${item.role_id}: OpenAI Speech API returned HTTP ${response.status}: ${detail}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('audio')) throw new Error(`${item.role_id}: unexpected content type ${contentType}`);
  const audio = Buffer.from(await response.arrayBuffer());
  if (audio.length < 1024) throw new Error(`${item.role_id}: returned audio is unexpectedly small`);

  const destination = path.join(outputDirectory, item.output_file);
  const temporary = `${destination}.partial`;
  await fsp.writeFile(temporary, audio, { mode: 0o600 });
  await fsp.rename(temporary, destination);
  generated.push({
    ...plan.find(entry => entry.role_id === item.role_id),
    bytes: audio.length,
    sha256: crypto.createHash('sha256').update(audio).digest('hex'),
  });
  console.log(`generated ${item.output_file} (${audio.length} bytes)`);
}

const audioManifest = {
  schema_version: 'ted.employee-voice-audio-manifest.v1',
  generated_at: new Date().toISOString(),
  provider: 'openai',
  model: voiceProfiles.defaults.model,
  disclosure: voiceProfiles.defaults.disclosure_zh,
  clips: generated,
};
await fsp.writeFile(
  path.join(outputDirectory, 'audio-manifest.json'),
  JSON.stringify(audioManifest, null, 2) + '\n',
  { mode: 0o600 },
);
console.log(JSON.stringify({ status: 'generated', clips: generated.length }, null, 2));
