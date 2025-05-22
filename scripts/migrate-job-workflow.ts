import { runMigration } from "../migrations/003_add_job_workflow_columns";

// Run the migration for job workflow columns
async function main() {
  try {
    const success = await runMigration();
    if (success) {
      console.log("Job workflow migration successfully completed");
      process.exit(0);
    } else {
      console.error("Job workflow migration failed");
      process.exit(1);
    }
  } catch (error) {
    console.error("Error running migration:", error);
    process.exit(1);
  }
}

main();