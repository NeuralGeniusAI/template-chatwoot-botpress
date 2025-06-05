import * as dotenv from "dotenv";

dotenv.config();

export const WEBHOOK_URL = process.env.NEXT_PUBLIC_WEBHOOK_URL;
export const TITLE_PAGE = process.env.NEXT_PUBLIC_TITLE_PAGE;
export const BOTPRESS_TOKEN = process.env.NEXT_PUBLIC_BOTPRESS_TOKEN;
export const AGENT_NAME = process.env.NEXT_PUBLIC_AGENT_NAME;
