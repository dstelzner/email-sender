import app from "./src/app";

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
  console.log(`Swagger docs: http://localhost:${PORT}/api-docs`);
});
