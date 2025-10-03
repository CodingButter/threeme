// Simple dev server to serve the documentation
import { existsSync } from "fs";

const server = Bun.serve({
  port: 3001,
  fetch(req) {
    const url = new URL(req.url);
    let path = url.pathname;

    // Serve index.html for root
    if (path === "/") {
      path = "/index.html";
    }

    const filePath = `./dist${path}`;

    // Check if file exists
    if (!existsSync(filePath)) {
      // Check if docs have been built
      if (!existsSync("./dist")) {
        return new Response(
          `
<!DOCTYPE html>
<html>
<head>
  <title>ThreeMe Docs - Not Built</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      background: #0a0a0a;
      color: #fff;
    }
    .container {
      text-align: center;
      max-width: 600px;
      padding: 2rem;
    }
    h1 { color: #00d8ff; margin-bottom: 1rem; }
    code {
      background: #1a1a1a;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      display: inline-block;
      margin: 1rem 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📚 ThreeMe Documentation</h1>
    <p>Documentation has not been built yet.</p>
    <p>Run the following command to build the docs:</p>
    <code>bun run build</code>
  </div>
</body>
</html>
          `,
          { headers: { "Content-Type": "text/html" } }
        );
      }

      return new Response("404 Not Found", { status: 404 });
    }

    return new Response(Bun.file(filePath));
  },
  development: {
    console: true,
  },
});

console.log(`📚 ThreeMe Documentation server running at http://localhost:${server.port}`);
console.log(`   Run 'bun run build' to generate documentation`);