import OpenAI from "openai";
import { openAIConnection } from "./connection";

export const openai = new OpenAI(openAIConnection());
