/**
 * Lightweight OpenAPI 3.x / Swagger 2.x parser.
 * Converts an OpenAPI spec into a flat list of endpoint descriptors
 * that map directly to our `api_endpoint` block content shape.
 */

export interface ParsedEndpoint {
  method: string;
  path: string;
  description: string;
  parameters: { name: string; type: string; required: boolean }[];
  response: string;
  tags: string[];
  summary: string;
}

export interface ParsedOpenAPI {
  title: string;
  description: string;
  version: string;
  baseUrl: string;
  endpoints: ParsedEndpoint[];
  /** Unique tags found – used to group endpoints into pages/sections */
  tags: string[];
}

function resolveRef(spec: any, ref: string): any {
  const parts = ref.replace(/^#\//, "").split("/");
  let current = spec;
  for (const p of parts) {
    current = current?.[p];
    if (!current) return {};
  }
  return current;
}

function resolveSchema(spec: any, schema: any): any {
  if (!schema) return schema;
  if (schema.$ref) return resolveRef(spec, schema.$ref);
  return schema;
}

function schemaToTypeString(spec: any, schema: any, depth = 0): string {
  if (!schema) return "any";
  const resolved = resolveSchema(spec, schema);
  if (depth > 3) return "...";

  if (resolved.type === "array") {
    return `${schemaToTypeString(spec, resolved.items, depth + 1)}[]`;
  }

  if (resolved.type === "object" || resolved.properties) {
    const props = resolved.properties || {};
    const entries = Object.entries(props).slice(0, 8).map(([key, val]: [string, any]) => {
      const r = resolveSchema(spec, val);
      return `  "${ key}": ${JSON.stringify(r.example ?? r.type ?? "any")}`;
    });
    return `{\n${entries.join(",\n")}\n}`;
  }

  return resolved.type || "any";
}

function extractParameters(spec: any, params: any[]): { name: string; type: string; required: boolean }[] {
  if (!params || !Array.isArray(params)) return [];
  return params.map((p) => {
    const resolved = p.$ref ? resolveRef(spec, p.$ref) : p;
    const schema = resolveSchema(spec, resolved.schema);
    return {
      name: resolved.name || "",
      type: schema?.type || resolved.type || "string",
      required: !!resolved.required,
    };
  });
}

function extractResponse(spec: any, responses: any): string {
  if (!responses) return "";
  // Try 200, 201, default
  const res = responses["200"] || responses["201"] || responses["default"];
  if (!res) return "";

  // OpenAPI 3.x
  const content = res.content;
  if (content) {
    const json = content["application/json"];
    if (json?.schema) {
      const schema = resolveSchema(spec, json.schema);
      if (schema.example) return JSON.stringify(schema.example, null, 2);
      return schemaToTypeString(spec, json.schema);
    }
    if (json?.example) return JSON.stringify(json.example, null, 2);
  }

  // Swagger 2.x
  if (res.schema) {
    const schema = resolveSchema(spec, res.schema);
    if (schema.example) return JSON.stringify(schema.example, null, 2);
    return schemaToTypeString(spec, res.schema);
  }

  return res.description || "";
}

export function parseOpenAPI(raw: string): ParsedOpenAPI {
  let spec: any;
  try {
    spec = JSON.parse(raw);
  } catch {
    // Try simple YAML-like parsing for common cases
    throw new Error("Only JSON format is supported. Please convert your YAML to JSON first.");
  }

  const isSwagger2 = !!spec.swagger;
  const info = spec.info || {};
  const title = info.title || "API";
  const description = info.description || "";
  const version = info.version || "";

  let baseUrl = "";
  if (isSwagger2) {
    baseUrl = `${spec.schemes?.[0] || "https"}://${spec.host || "api.example.com"}${spec.basePath || ""}`;
  } else if (spec.servers?.length) {
    baseUrl = spec.servers[0].url || "";
  }

  const endpoints: ParsedEndpoint[] = [];
  const tagSet = new Set<string>();
  const paths = spec.paths || {};

  for (const [path, methods] of Object.entries(paths)) {
    for (const [method, operation] of Object.entries(methods as Record<string, any>)) {
      if (["get", "post", "put", "delete", "patch"].indexOf(method) === -1) continue;

      const op = operation as any;
      const tags = op.tags || ["Default"];
      tags.forEach((t: string) => tagSet.add(t));

      // Merge path-level and operation-level parameters
      const pathParams = (methods as any).parameters || [];
      const opParams = op.parameters || [];

      // OpenAPI 3.x requestBody → virtual parameter
      const bodyParams: any[] = [];
      if (op.requestBody?.content?.["application/json"]?.schema) {
        const schema = resolveSchema(spec, op.requestBody.content["application/json"].schema);
        if (schema.properties) {
          for (const [name, prop] of Object.entries(schema.properties)) {
            const r = resolveSchema(spec, prop);
            bodyParams.push({
              name,
              type: r.type || "any",
              required: (schema.required || []).includes(name),
            });
          }
        }
      }

      endpoints.push({
        method: method.toUpperCase(),
        path,
        summary: op.summary || "",
        description: op.description || op.summary || "",
        parameters: [...extractParameters(spec, [...pathParams, ...opParams]), ...bodyParams],
        response: extractResponse(spec, op.responses),
        tags,
      });
    }
  }

  return {
    title,
    description,
    version,
    baseUrl,
    endpoints,
    tags: Array.from(tagSet),
  };
}
