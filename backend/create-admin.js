const readline = require("readline");
const db = require("./database");
const { hashPassword } = require("./auth");

function ask(question, hidden = false) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    if (!hidden) {
      rl.question(question, (answer) => { rl.close(); resolve(answer.trim()); });
      return;
    }
    process.stdout.write(question);
    const stdin = process.stdin;
    let value = "";
    const onData = (char) => {
      char = char.toString();
      if (char === "\n" || char === "\r" || char === "\u0004") {
        stdin.setRawMode(false);
        stdin.off("data", onData);
        process.stdout.write("\n");
        rl.close();
        resolve(value);
      } else if (char === "\u0003") {
        process.exit(1);
      } else if (char === "\u007f") {
        value = value.slice(0, -1);
      } else {
        value += char;
      }
    };
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on("data", onData);
  });
}

(async () => {
  try {
    const username = await ask("Admin username: ");
    const password = await ask("Admin password: ", true);
    if (!/^[A-Za-z0-9_.-]{3,50}$/.test(username)) throw new Error("Username must be 3-50 characters and use letters, numbers, _, ., or -.");
    if (password.length < 12) throw new Error("Password must be at least 12 characters.");

    const existing = db.prepare("SELECT id FROM admins WHERE username = ?").get(username);
    const passwordHash = hashPassword(password);
    if (existing) {
      db.prepare("UPDATE admins SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(passwordHash, existing.id);
      console.log(`Admin '${username}' password updated.`);
    } else {
      db.prepare("INSERT INTO admins (username, password_hash) VALUES (?, ?)").run(username, passwordHash);
      console.log(`Admin '${username}' created successfully.`);
    }
  } catch (error) {
    console.error(`Could not create admin: ${error.message}`);
    process.exitCode = 1;
  } finally {
    db.close();
  }
})();
