// Verify all lucide-react imports exist in the installed package
const fs = require("fs");
const path = require("path");

// Load lucide-react types
const dts = fs.readFileSync(
  "/home/z/my-project/node_modules/lucide-react/dist/lucide-react.d.ts",
  "utf-8"
);

// Extract all declared icon names
const declared = new Set();
const re = /declare const (\w+):/g;
let m;
while ((m = re.exec(dts))) declared.add(m[1]);

// Also collect type aliases and exports (LucideIcon type, XIcon variants, etc.)
const exportRe = /export\s*\{([^}]+)\}/g;
while ((m = exportRe.exec(dts))) {
  const names = m[1].split(",").map((s) => s.trim());
  for (const n of names) {
    // Handle "Foo as Bar" — both names valid
    const parts = n.split(/\s+as\s+/).map((s) => s.trim());
    for (const p of parts) {
      if (p && !p.startsWith("//")) declared.add(p);
    }
  }
}
// Add LucideIcon type
declared.add("LucideIcon");
declared.add("LucideProps");

// Walk all .tsx/.ts files
function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.name.endsWith(".tsx") || e.name.endsWith(".ts")) out.push(p);
  }
  return out;
}

const files = walk("/home/z/my-project/src");
const importRe = /import\s*\{([^}]+)\}\s*from\s*["']lucide-react["']/g;
const invalid = new Map();
for (const f of files) {
  const content = fs.readFileSync(f, "utf-8");
  let im;
  while ((im = importRe.exec(content))) {
    const names = im[1].split(",").map((s) => s.trim()).filter(Boolean);
    for (const n of names) {
      // strip "as Alias"
      const real = n.split(/\s+as\s+/)[0].trim();
      if (!declared.has(real)) {
        if (!invalid.has(f)) invalid.set(f, []);
        invalid.get(f).push(real);
      }
    }
  }
}

if (invalid.size === 0) {
  console.log("✓ All lucide-react imports are valid.");
} else {
  console.log("✗ Invalid lucide-react imports found:\n");
  for (const [f, names] of invalid) {
    console.log(`  ${f}:`);
    for (const n of [...new Set(names)]) console.log(`    - ${n}`);
  }
}
