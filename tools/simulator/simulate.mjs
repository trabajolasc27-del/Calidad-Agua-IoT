#!/usr/bin/env node
// Simulador de mediciones IoT (docs/API_CONTRACT.md, seccion 5).
// Envia lotes HTTPS POST a la Edge Function ingest-measurement sin
// necesidad del ESP32 fisico, para poder desarrollar y probar el resto de
// la plataforma con datos sinteticos.
//
// Uso:
//   node tools/simulator/simulate.mjs --profile=normal
//   node tools/simulator/simulate.mjs --profile=critico --sequence=42
//   node tools/simulator/simulate.mjs --profile=duplicado
//   node tools/simulator/simulate.mjs --profile=invalido
//   node tools/simulator/simulate.mjs --profile=no-existe
//   node tools/simulator/simulate.mjs --profile=no-autorizado
//
// Variables necesarias (via .env en la raiz del repo, o variables de
// entorno ya exportadas): SIMULATOR_TARGET_URL, SIMULATOR_DEVICE_ID,
// SIMULATOR_DEVICE_SECRET.

import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "..", "..", ".env");

try {
  process.loadEnvFile(envPath);
} catch {
  // Sin .env local: se asume que las variables ya estan en el entorno
  // (por ejemplo, en un pipeline de CI).
}

function parseArgs(argv) {
  const args = { profile: "normal" };
  for (const raw of argv) {
    const match = raw.match(/^--([^=]+)=(.*)$/);
    if (match) args[match[1]] = match[2];
  }
  return args;
}

const PROFILES = {
  // Los cuatro parametros dentro de rango CONFORME segun los umbrales
  // demo de supabase/seed.sql.
  normal: { ph: 7.1, dissolved_oxygen: 6.8, turbidity: 4.2, temperature: 28.3 },
  // Turbidez en banda ALERTA (entre warning_high y critical_high).
  alerta: { ph: 7.0, dissolved_oxygen: 6.5, turbidity: 7.0, temperature: 27.0 },
  // Oxigeno disuelto por debajo de critical_low: banda CRITICO.
  critico: { ph: 7.0, dissolved_oxygen: 1.4, turbidity: 4.0, temperature: 27.0 },
  // Valor fuera de cualquier rango fisico plausible, para forzar 422.
  invalido: { ph: 999, dissolved_oxygen: 6.8, turbidity: 4.2, temperature: 28.3 },
};

function buildPayload(deviceId, sequence, values) {
  return {
    device_id: deviceId,
    sequence,
    measured_at: new Date().toISOString(),
    values,
  };
}

async function send(targetUrl, secret, payload, { malformed = false } = {}) {
  const body = malformed
    ? JSON.stringify({ device_id: payload.device_id }) // payload incompleto a proposito
    : JSON.stringify(payload);

  const response = await fetch(targetUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
    body,
  });

  const text = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }

  console.log(`HTTP ${response.status}`);
  console.log(JSON.stringify(parsed, null, 2));
  return response.status;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const targetUrl = process.env.SIMULATOR_TARGET_URL;
  const deviceId = process.env.SIMULATOR_DEVICE_ID;
  const secret = process.env.SIMULATOR_DEVICE_SECRET;

  if (!targetUrl || !deviceId || !secret) {
    console.error(
      "Faltan variables de entorno: SIMULATOR_TARGET_URL, SIMULATOR_DEVICE_ID, SIMULATOR_DEVICE_SECRET (ver .env.example).",
    );
    process.exit(1);
  }

  const sequence = args.sequence ? Number(args.sequence) : Math.floor(Date.now() / 1000);

  switch (args.profile) {
    case "normal":
    case "alerta":
    case "critico":
    case "invalido": {
      const payload = buildPayload(deviceId, sequence, PROFILES[args.profile]);
      console.log(`Enviando perfil "${args.profile}" (sequence=${sequence})...`);
      await send(targetUrl, secret, payload);
      break;
    }

    case "duplicado": {
      const payload = buildPayload(deviceId, sequence, PROFILES.normal);
      console.log(`Enviando dos veces la misma secuencia (sequence=${sequence}) para forzar 409...`);
      await send(targetUrl, secret, payload);
      console.log("--- segundo envio (debe responder 409) ---");
      await send(targetUrl, secret, payload);
      break;
    }

    case "malformado": {
      const payload = buildPayload(deviceId, sequence, PROFILES.normal);
      console.log("Enviando payload incompleto para forzar 400...");
      await send(targetUrl, secret, payload, { malformed: true });
      break;
    }

    case "no-existe": {
      const payload = buildPayload("NODO-QUE-NO-EXISTE", sequence, PROFILES.normal);
      console.log("Enviando con device_id inexistente para forzar 404...");
      await send(targetUrl, secret, payload);
      break;
    }

    case "no-autorizado": {
      const payload = buildPayload(deviceId, sequence, PROFILES.normal);
      console.log("Enviando con secreto incorrecto para forzar 401...");
      await send(targetUrl, "secreto-incorrecto", payload);
      break;
    }

    default:
      console.error(
        `Perfil desconocido: "${args.profile}". Usa uno de: normal, alerta, critico, invalido, duplicado, malformado, no-existe, no-autorizado.`,
      );
      process.exit(1);
  }
}

main().catch((error) => {
  console.error("Error del simulador:", error);
  process.exit(1);
});
