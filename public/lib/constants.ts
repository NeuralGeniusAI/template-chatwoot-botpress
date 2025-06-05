import * as dotenv from "dotenv";

dotenv.config();

export const WEBHOOK_URL = process.env.NEXT_PUBLIC_WEBHOOK_URL;
export const TITLE_PAGE = process.env.NEXT_PUBLIC_TITLE_PAGE;
