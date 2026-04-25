

import { config, connectDB } from "./config";
import app from "./app";

async function bootstrap(): Promise<void> {
  await connectDB();
  app.listen(config.port, () => {
    console.log(`Server running on port ${config.port} [${config.nodeEnv}]`);
  });
}

bootstrap();