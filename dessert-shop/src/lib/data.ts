import "server-only";
import { cache } from "react";
import { db } from "./db";
import { getSettings, listCustomers } from "./ledger";

// Deduplicated per request: the layout (badge count) and the page share one query.
export const loadSettings = cache(() => getSettings(db()));
export const loadCustomers = cache(() => listCustomers(db()));
