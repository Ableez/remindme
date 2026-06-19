import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.cron("daily-catchup", "0 7 * * *", internal.catchup.runAll, {});

export default crons;
