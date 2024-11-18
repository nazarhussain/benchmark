import {options} from "../src/run/options";

const sections: string[] = [];

for (const [cmd, data] of Object.entries(options)) {
  const cmds = [cmd, ...(data.alias || [])];
  sections.push(`### ${cmds.map((c) => `\`--${c}\``).join(", ")}
  
${data.description || ""}

- type: ${data.type || "string"}
- default: ${data.default || data.defaultDescription || ""}
`);
}

console.log(sections.join("\n"));
