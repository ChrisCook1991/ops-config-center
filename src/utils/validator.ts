import Ajv, { ErrorObject } from "ajv";
import { PROMOTIONAL_BANNER_SCHEMA, BannerPayload } from "../constants/schemas";

const ajv = new Ajv({ allErrors: true, verbose: true });

// Compile the schema once
const validate = ajv.compile(PROMOTIONAL_BANNER_SCHEMA);

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateBannerPayload(payload: BannerPayload): ValidationResult {
  const valid = validate(payload);

  if (valid) {
    return { isValid: true, errors: [] };
  }

  const errors = (validate.errors || []).map((err: ErrorObject) => {
    const field = err.instancePath ? err.instancePath.replace(/^\//, "").replace(/\//g, ".") : "root";
    return `[${field}] ${err.message}`;
  });

  return { isValid: false, errors };
}
