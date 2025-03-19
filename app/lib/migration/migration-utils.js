import { getDatabase } from "./lib/database/mongoDbConnection";
import { sql } from "@vercel/postgres";
import { ObjectId } from "mongodb";
import { decryptData } from "@/app/lib/security/security";

// Map MongoDB ObjectIds to PostgreSQL IDs
const idMappings = {
  users: new Map(),
  treatments: new Map(),
  healthHistories: new Map(),
  treatmentPlans: new Map(),
};

// Helper function to convert MongoDB ObjectId to string
function objectIdToString(id) {
  if (!id) return null;
  if (typeof id === "string") return id;
  if (id instanceof ObjectId) return id.toString();
  if (id.$oid) return id.$oid;
  return null;
}

// Helper function to convert MongoDB date to ISO string
function dateToISOString(date) {
  if (!date) return null;
  if (typeof date === "string") return date;
  if (date instanceof Date) return date.toISOString();
  if (date.$date) return new Date(date.$date).toISOString();
  return null;
}

// Helper function to safely parse JSON
function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
}

// Helper function to check if a table exists
async function tableExists(tableName) {
  try {
    const result = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = ${tableName}
      );
    `;
    return result.rows[0].exists;
  } catch (error) {
    console.error(`Error checking if table ${tableName} exists:`, error);
    return false;
  }
}

// Helper function to create tables if they don't exist
async function createTablesIfNotExist() {
  try {
    // Create users table
    if (!(await tableExists("users"))) {
      await sql`
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          mongo_id TEXT UNIQUE,
          email TEXT UNIQUE,
          first_name TEXT,
          last_name TEXT,
          phone TEXT,
          role TEXT,
          created_at TIMESTAMP WITH TIME ZONE,
          updated_at TIMESTAMP WITH TIME ZONE,
          last_login TIMESTAMP WITH TIME ZONE,
          password_hash TEXT,
          password_salt TEXT,
          email_verified BOOLEAN DEFAULT FALSE,
          cancel_count INTEGER DEFAULT 0,
          email_list BOOLEAN DEFAULT TRUE,
          encrypted_data TEXT
        );
      `;
      console.log("Created users table");
    }

    // Create health_histories table
    if (!(await tableExists("health_histories"))) {
      await sql`
        CREATE TABLE health_histories (
          id SERIAL PRIMARY KEY,
          mongo_id TEXT UNIQUE,
          user_id INTEGER REFERENCES users(id),
          created_at TIMESTAMP WITH TIME ZONE,
          encrypted_data TEXT
        );
      `;
      console.log("Created health_histories table");
    }

    // Create treatments table
    if (!(await tableExists("treatments"))) {
      await sql`
        CREATE TABLE treatments (
          id SERIAL PRIMARY KEY,
          mongo_id TEXT UNIQUE,
          rmt_id INTEGER REFERENCES users(id),
          rmt_location_id TEXT,
          appointment_date DATE,
          appointment_start_time TIME,
          appointment_end_time TIME,
          status TEXT,
          duration INTEGER,
          email TEXT,
          first_name TEXT,
          last_name TEXT,
          location TEXT,
          user_id INTEGER REFERENCES users(id),
          workplace TEXT,
          payment_type TEXT,
          price DECIMAL(10, 2),
          google_calendar_event_id TEXT,
          google_calendar_event_link TEXT,
          created_at TIMESTAMP WITH TIME ZONE,
          treatment_plan_id INTEGER,
          encrypted_data TEXT
        );
      `;
      console.log("Created treatments table");
    }

    // Create treatment_plans table
    if (!(await tableExists("treatment_plans"))) {
      await sql`
        CREATE TABLE treatment_plans (
          id SERIAL PRIMARY KEY,
          mongo_id TEXT UNIQUE,
          client_id INTEGER REFERENCES users(id),
          created_by INTEGER REFERENCES users(id),
          start_date TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE,
          encrypted_data TEXT
        );
      `;
      console.log("Created treatment_plans table");
    }

    // Create treatment_plan_treatments junction table
    if (!(await tableExists("treatment_plan_treatments"))) {
      await sql`
        CREATE TABLE treatment_plan_treatments (
          id SERIAL PRIMARY KEY,
          treatment_plan_id INTEGER REFERENCES treatment_plans(id),
          treatment_id INTEGER REFERENCES treatments(id)
        );
      `;
      console.log("Created treatment_plan_treatments table");
    }

    // Update treatments table to add foreign key to treatment_plans
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.constraint_column_usage 
          WHERE table_name = 'treatments' AND column_name = 'treatment_plan_id'
        ) THEN
          ALTER TABLE treatments 
          ADD CONSTRAINT fk_treatment_plan 
          FOREIGN KEY (treatment_plan_id) 
          REFERENCES treatment_plans(id);
        END IF;
      END $$;
    `;
    console.log("Updated treatments table with foreign key constraint");

    return true;
  } catch (error) {
    console.error("Error creating tables:", error);
    return false;
  }
}

export {
  idMappings,
  objectIdToString,
  dateToISOString,
  safeJsonParse,
  tableExists,
  createTablesIfNotExist,
};
