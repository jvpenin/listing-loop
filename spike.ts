import { run, AutonomyLevel, ToolConfirmationOutcome } from "@factory/droid-sdk/node";
import { mkdirSync } from "node:fs";

mkdirSync("runs/spike", { recursive: true });

const produto = "top cropped feminino de academia, tecido canelado, cor preta";
const variants = [
  { variantId: "v1", angulo: "academia", capa: "modelo" },
  { variantId: "v2", angulo: "casual", capa: "solo" },
  { variantId: "v3", angulo: "conforto", capa: "uso" },
  { variantId: "v4", angulo: "presente", capa: "solo" },
];

const t0 = Date.now();

const results = await Promise.all(
  variants.map(async (v) => {
    const t = Date.now();
    const r = await run(
      `Use the subagent listing-producer with this variant spec and WAIT until it finishes (do not run it in background): ${JSON.stringify({ ...v, produto })}`,
      {
        cwd: process.cwd(),
        modelId: "claude-haiku-5-5",
        autonomyLevel: AutonomyLevel.High,
        // aprova pedidos de permissão (ex.: Execute para salvar a imagem) e registra cada um
        permissionHandler({ toolUses, options }) {
          console.log(`[permissão ${v.variantId}]`, toolUses.map((u) => u.details.type).join(", "));
          const ok = ToolConfirmationOutcome.ProceedOnce;
          return options.some((o) => o.value === ok) ? ok : options[0].value;
        },
      }
    );
    return { id: v.variantId, ok: r.success, segundos: Math.round((Date.now() - t) / 1000) };
  })
);

console.table(results);
console.log(`tempo total: ${Math.round((Date.now() - t0) / 1000)}s`);