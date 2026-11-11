import type { SchemaObject } from '@nestjs/swagger';
import { z, type ZodType } from 'zod';

/**
 * OpenAPI consumers do not understand JSON Schema keywords such as `$schema`
 * or `$id`, and Zod emits verbose regexes next to `format` constraints.
 * Keep the schema readable by removing what the OpenAPI tooling ignores.
 */
function normalize(node: unknown): unknown {
  if (Array.isArray(node)) {
    return node.map(normalize);
  }
  if (node === null || typeof node !== 'object') {
    return node;
  }

  const source = node as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    if (key === '$schema' || key === '$id') continue;
    if (key === 'pattern' && typeof source.format === 'string') continue;
    result[key] = normalize(value);
  }
  return result;
}

/**
 * Converts the Zod schema that validates a request into the matching OpenAPI
 * schema. Zod stays the single source of truth, so the published contract
 * cannot drift from what the server actually accepts.
 */
export function zodToOpenApiSchema(schema: ZodType): SchemaObject {
  const json = z.toJSONSchema(schema, {
    io: 'input',
    unrepresentable: 'any',
    reused: 'inline',
  });
  return normalize(json) as SchemaObject;
}
