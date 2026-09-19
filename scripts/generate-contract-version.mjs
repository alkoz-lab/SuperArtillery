import { readFile, writeFile } from 'node:fs/promises';
import { parse } from 'yaml';

const contractPath = new URL('../contracts/openapi/superartillery.yaml', import.meta.url);
const contract = parse(await readFile(contractPath, 'utf8'));
const contractVersion = contract?.info?.version;

if (typeof contractVersion !== 'string' || !contractVersion.trim()) {
  throw new Error('The OpenAPI contract must define a non-empty info.version');
}

const generatedSource = `// Generated from contracts/openapi/superartillery.yaml. Do not edit manually.\nexport const CONTRACT_VERSION = ${JSON.stringify(contractVersion)};\n`;

await writeFile(
  new URL('../packages/core/src/contract/contract-version.ts', import.meta.url),
  generatedSource
);

console.log(`Generated contract version ${contractVersion}`);