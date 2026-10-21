export async function readPassword(prompt: string): Promise<string> {
  if (!process.stdin.isTTY || !process.stderr.isTTY)
    throw new Error("INTERACTIVE_TERMINAL_REQUIRED");
  process.stderr.write(prompt);
  const original = process.stdin.isRaw;
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise<string>((resolve, reject) => {
    let password = "";
    const finish = (error?: Error) => {
      process.stdin.off("data", data);
      process.stdin.setRawMode(original);
      process.stdin.pause();
      process.stderr.write("\n");
      if (error) reject(error);
      else resolve(password);
    };
    const data = (chunk: Buffer) => {
      for (const char of chunk.toString("utf8")) {
        if (char === "\u0003" || char === "\u0004") {
          finish(new Error("PASSWORD_CANCELLED"));
          return;
        }
        if (char === "\r" || char === "\n") {
          finish();
          return;
        }
        if (char === "\u007f" || char === "\b")
          password = [...password].slice(0, -1).join("");
        else password += char;
      }
    };
    process.stdin.on("data", data);
  });
}
