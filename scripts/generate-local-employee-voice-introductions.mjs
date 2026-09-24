import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = fs.realpathSync(process.env.AI_VIRTUAL_COMPANY_ROOT || process.cwd());
const outputDirectory = path.join(root, 'output/2026-09-22-employee-voice-introductions');
const introductionsPath = path.join(outputDirectory, 'introductions.json');
const localPlanPath = path.join(outputDirectory, 'local-voice-plan.json');
const voiceProfilesPath = path.join(root, 'employees/VOICE_PROFILES.json');
const manifestPath = path.join(outputDirectory, 'local-audio-manifest.json');
const dryRun = process.argv.includes('--dry-run');
const force = process.argv.includes('--force');

const introductions = JSON.parse(await fsp.readFile(introductionsPath, 'utf8'));
const localPlan = JSON.parse(await fsp.readFile(localPlanPath, 'utf8'));
const voiceProfiles = JSON.parse(await fsp.readFile(voiceProfilesPath, 'utf8'));
const displayNameByRole = new Map(
  voiceProfiles.profiles.map(profile => [profile.role_id, profile.display_name]),
);
const introByRole = new Map(introductions.items.map(item => [item.role_id, item]));
const roster = (await fsp.readFile(path.join(root, 'employees/ROSTER.txt'), 'utf8'))
  .split(/\r?\n/)
  .map(value => value.trim())
  .filter(Boolean);

const { stdout: voiceList } = await run('/usr/bin/say', ['-v', '?'], {
  encoding: 'utf8',
  maxBuffer: 1024 * 1024,
});
const installedVoices = new Map();
for (const line of voiceList.split(/\r?\n/)) {
  const match = line.match(/^(.+?)\s+([a-z]{2}_[A-Z0-9]+)\s+#/);
  if (match) installedVoices.set(match[1].trim(), match[2]);
}

const errors = [];
const seenRoles = new Set();
const seenOrders = new Set();
const seenVoices = new Set();
const seenFiles = new Set();

if (localPlan.schema_version !== 'ted.employee-local-voice-plan.v1') {
  errors.push('invalid local voice plan schema');
}
if (localPlan.provider !== 'macos-say') errors.push('provider must be macos-say');
if (localPlan.locale !== 'zh_CN') errors.push('locale must be zh_CN');
if (localPlan.output_format !== 'm4a-aac') errors.push('output format must be m4a-aac');
if (!Array.isArray(localPlan.items)) errors.push('local voice items must be an array');

for (const item of localPlan.items || []) {
  const locale = installedVoices.get(item.local_voice);
  if (!roster.includes(item.role_id)) errors.push(`${item.role_id}: role is not in roster`);
  if (!introByRole.has(item.role_id)) errors.push(`${item.role_id}: missing introduction`);
  if (!displayNameByRole.has(item.role_id)) errors.push(`${item.role_id}: missing display name`);
  if (!locale) errors.push(`${item.role_id}: local voice is not installed: ${item.local_voice}`);
  if (locale && locale !== 'zh_CN') errors.push(`${item.role_id}: local voice locale is ${locale}, not zh_CN`);
  if (seenRoles.has(item.role_id)) errors.push(`${item.role_id}: duplicate role`);
  if (seenOrders.has(item.order)) errors.push(`${item.role_id}: duplicate order`);
  if (seenVoices.has(item.local_voice)) errors.push(`${item.role_id}: duplicate local voice`);
  if (seenFiles.has(item.output_file)) errors.push(`${item.role_id}: duplicate output file`);
  if (!/^\d{2}-[a-z0-9-]+-local\.m4a$/.test(item.output_file || '')) {
    errors.push(`${item.role_id}: unsafe output filename`);
  }
  if (!Number.isInteger(item.rate_wpm) || item.rate_wpm < 120 || item.rate_wpm > 240) {
    errors.push(`${item.role_id}: rate_wpm must be an integer from 120 to 240`);
  }
  seenRoles.add(item.role_id);
  seenOrders.add(item.order);
  seenVoices.add(item.local_voice);
  seenFiles.add(item.output_file);
}

for (const role of roster) if (!seenRoles.has(role)) errors.push(`${role}: missing local voice plan`);
if (errors.length) {
  console.error(JSON.stringify({ status: 'invalid', errors }, null, 2));
  process.exit(1);
}

const plan = localPlan.items
  .slice()
  .sort((a, b) => a.order - b.order)
  .map(item => ({
    order: item.order,
    role_id: item.role_id,
    display_name: displayNameByRole.get(item.role_id),
    local_voice: item.local_voice,
    locale: installedVoices.get(item.local_voice),
    rate_wpm: item.rate_wpm,
    output_file: item.output_file,
    characters: introByRole.get(item.role_id).script_zh.length,
  }));

if (dryRun) {
  console.log(JSON.stringify({ status: 'dry_run', provider: 'macos-say', clips: plan }, null, 2));
  process.exit(0);
}

await fsp.mkdir(outputDirectory, { recursive: true });
if (!force) {
  const existing = [];
  for (const item of plan) {
    try {
      await fsp.access(path.join(outputDirectory, item.output_file));
      existing.push(item.output_file);
    } catch {
      // The target does not exist and can be generated safely.
    }
  }
  if (existing.length) {
    console.error(`Refusing to overwrite existing audio files without --force: ${existing.join(', ')}`);
    process.exit(2);
  }
}

const generated = [];
for (const item of localPlan.items.slice().sort((a, b) => a.order - b.order)) {
  const intro = introByRole.get(item.role_id);
  const destination = path.join(outputDirectory, item.output_file);
  const temporaryAiff = path.join(outputDirectory, `.${item.role_id}-${process.pid}.aiff`);
  const temporaryM4a = path.join(outputDirectory, `.${item.role_id}-${process.pid}.partial.m4a`);
  const spokenText = `${localPlan.disclosure_zh} ${intro.script_zh}`;

  try {
    await run('/usr/bin/say', [
      '-v', item.local_voice,
      '-r', String(item.rate_wpm),
      '-o', temporaryAiff,
      spokenText,
    ], { encoding: 'utf8', maxBuffer: 1024 * 1024 });

    await run('/opt/homebrew/bin/ffmpeg', [
      '-hide_banner',
      '-loglevel', 'error',
      '-y',
      '-i', temporaryAiff,
      '-vn',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      temporaryM4a,
    ], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });

    const { stdout: probeOutput } = await run('/opt/homebrew/bin/ffprobe', [
      '-v', 'error',
      '-select_streams', 'a:0',
      '-show_entries', 'stream=codec_name,sample_rate,channels:format=format_name,duration,size',
      '-of', 'json',
      temporaryM4a,
    ], { encoding: 'utf8', maxBuffer: 1024 * 1024 });
    const probe = JSON.parse(probeOutput);
    const stream = probe.streams?.[0];
    const format = probe.format;
    const durationSeconds = Number(format?.duration);
    const bytes = Number(format?.size);
    if (stream?.codec_name !== 'aac') throw new Error(`${item.role_id}: expected AAC codec`);
    if (!String(format?.format_name || '').includes('m4a')) throw new Error(`${item.role_id}: expected M4A container`);
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      throw new Error(`${item.role_id}: invalid duration`);
    }
    if (!Number.isFinite(bytes) || bytes < 1024) throw new Error(`${item.role_id}: audio is unexpectedly small`);

    if (force) await fsp.rm(destination, { force: true });
    await fsp.chmod(temporaryM4a, 0o600);
    await fsp.rename(temporaryM4a, destination);
    const audio = await fsp.readFile(destination);
    generated.push({
      ...plan.find(entry => entry.role_id === item.role_id),
      bytes: audio.length,
      duration_seconds: Number(durationSeconds.toFixed(3)),
      codec: stream.codec_name,
      sample_rate_hz: Number(stream.sample_rate),
      channels: stream.channels,
      sha256: crypto.createHash('sha256').update(audio).digest('hex'),
    });
    console.log(`generated ${item.output_file} (${audio.length} bytes, ${durationSeconds.toFixed(2)}s)`);
  } finally {
    await fsp.rm(temporaryAiff, { force: true });
    await fsp.rm(temporaryM4a, { force: true });
  }
}

const manifest = {
  schema_version: 'ted.employee-local-audio-manifest.v1',
  generated_at: new Date().toISOString(),
  provider: 'macos-say',
  converter: 'ffmpeg-aac',
  locale: localPlan.locale,
  disclosure_zh: localPlan.disclosure_zh,
  selection_note_zh: localPlan.selection_note_zh,
  clips: generated,
};
const temporaryManifest = `${manifestPath}.partial`;
await fsp.writeFile(temporaryManifest, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
await fsp.rename(temporaryManifest, manifestPath);
console.log(JSON.stringify({ status: 'generated', provider: 'macos-say', clips: generated.length }, null, 2));
