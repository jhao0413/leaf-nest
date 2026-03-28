import { Hono } from 'hono';
import { registerHealthRoute } from './routes/health';

export const app = new Hono();

registerHealthRoute(app);
