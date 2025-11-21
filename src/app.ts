import express, { Application } from "express";
import routes from "./routes/routes";
import { setupSwagger } from "./config/swagger";

const app: Application = express();
app.use(express.json());

app.use("/emails", routes);

setupSwagger(app);

export default app;
