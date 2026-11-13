import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;

/** Conexão com o banco. Fica `null` quando DATABASE_URL não está definida, e o site mostra as vitrines vazias. */
export const db = url
  ? drizzle(postgres(url, { max: 5, prepare: false }), { schema })
  : null;

export { schema };
