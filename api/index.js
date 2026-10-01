// Vercel runs files under api/ as functions. This hands it the same Express app
// `npm start` serves locally — the built frontend goes to Vercel's CDN instead.
export { default } from "../server.js";
