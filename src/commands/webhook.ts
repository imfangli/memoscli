import { Command } from "commander";
import { generateEventsFromDiff, countEvents, flushQueue, createTestEvent, sendEvent } from "../core/webhook.js";
import { commandConfig } from "./helpers.js";

export function registerWebhook(program: Command): void {
  const webhook = program.command("webhook").alias("wh").description("Manage webhook events");

  webhook.command("status").alias("st").description("Show webhook queue status").action(async (command: Command) => {
    const config = await commandConfig(command);
    console.log("Endpoints:");
    for (const endpoint of config.webhook.endpoints) {
      console.log(`- ${endpoint.name} ${endpoint.enabled ? "enabled" : "disabled"} ${endpoint.url}`);
    }
    console.log(`Pending: ${await countEvents(config.data_dir, "pending")}`);
    console.log(`Sent: ${await countEvents(config.data_dir, "sent")}`);
    console.log(`Failed: ${await countEvents(config.data_dir, "failed")}`);
  });

  webhook.command("flush").alias("f").description("Send pending webhook events").action(async (command: Command) => {
    const config = await commandConfig(command);
    const result = await flushQueue(config.data_dir, config, "pending");
    console.log(`Webhook flush: ${result.sent} sent, ${result.failed} failed`);
  });

  webhook.command("retry").alias("r").description("Retry failed webhook events").action(async (command: Command) => {
    const config = await commandConfig(command);
    const result = await flushQueue(config.data_dir, config, "failed");
    console.log(`Webhook retry: ${result.sent} sent, ${result.failed} failed`);
  });

  webhook.command("test").alias("t").argument("<name>", "endpoint name").description("Send a webhook test event").action(async (name: string, command: Command) => {
    const config = await commandConfig(command);
    const event = await createTestEvent(name);
    const endpoint = config.webhook.endpoints.find((item) => item.name === name);
    if (!endpoint) throw new Error(`Webhook endpoint not found: ${name}`);
    const ok = await sendEvent({ ...config, webhook: { ...config.webhook, endpoints: [{ ...endpoint, events: [...endpoint.events, "webhook.test"] }] } }, event);
    console.log(ok ? `Webhook test sent: ${name}` : `Webhook test failed: ${name}`);
  });

  webhook
    .command("generate")
    .alias("g")
    .requiredOption("--from <ref>", "from git ref")
    .requiredOption("--to <ref>", "to git ref")
    .description("Generate webhook events from a git diff")
    .action(async (options: { from: string; to: string }, command: Command) => {
      const config = await commandConfig(command);
      const events = await generateEventsFromDiff(config.data_dir, options.from, options.to);
      console.log(`Generated ${events.length} webhook event(s).`);
    });
}
