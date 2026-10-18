import type { Express } from "express";
import express from "express";
import { z } from "zod";
import {
  McpServer,
  createMcpHandler,
  ProtocolError,
  ProtocolErrorCode,
  type StandardSchemaWithJSON,
} from "@modelcontextprotocol/server";
import { toNodeHandler } from "@modelcontextprotocol/node";
import { inputSchema, SubmitError, type createSubmit } from "./submit.js";
export function mountMcp(
  app: Express,
  submit: ReturnType<typeof createSubmit>,
  topics: string[],
) {
  const schema = z.toJSONSchema(inputSchema, { unrepresentable: "any" });
  // Business validation runs after per-client accounting and returns stable tool errors.
  const businessSchema: StandardSchemaWithJSON = {
    "~standard": {
      version: 1,
      vendor: "noticeflow",
      validate: (value) => ({ value }),
      jsonSchema: { input: () => schema, output: () => schema },
    },
  };
  const mcpHandler = createMcpHandler(
    () => {
      const server = new McpServer({ name: "noticeflow", version: "0.1.0" });
      server.registerTool(
        "submit_notification",
        {
          description: `Push a prepared notification to external group robots. Accepted means durably queued, not delivered. Repeated calls create duplicate notifications. Topics: ${topics.join(", ")}.`,
          inputSchema: businessSchema,
          annotations: {
            readOnlyHint: false,
            destructiveHint: false,
            idempotentHint: false,
            openWorldHint: true,
          },
        },
        (input, ctx) => {
          try {
            const result = submit(ctx.http!.authInfo!.clientId, input);
            return {
              structuredContent: result,
              content: [
                { type: "text" as const, text: JSON.stringify(result) },
              ],
            };
          } catch (error) {
            if (error instanceof SubmitError)
              return {
                isError: true,
                content: [
                  {
                    type: "text" as const,
                    text: JSON.stringify({
                      error: error.code,
                      retryable: error.retryable,
                    }),
                  },
                ],
              };
            throw new ProtocolError(
              ProtocolErrorCode.InternalError,
              "SERVER_ERROR",
            );
          }
        },
      );
      return server;
    },
    { legacy: "stateless" },
  );
  const handler = toNodeHandler(mcpHandler);
  app.all("/mcp", express.json({ limit: "64kb" }), (req, res) => {
    void handler(req, res, req.body);
  });
  return () => mcpHandler.close();
}
