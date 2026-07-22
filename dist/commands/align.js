"use strict";

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { _log, err, ok, c, bold, _warn } = require("../utils/logger");

function alignText(text) {
    if (!text) return "";

    let cleaned = text.trim();
    let matches = true;

    // 1. Strip Conversational Introduction Slop step-by-step
    while (matches) {
        matches = false;
        const prefixes = [
            /^(?:sure|certainly|okay|absolutely|great|of course|as requested|as you asked|happy to help|here is|here's|let's|i can help)(?:[^\n]*?)(?:[.!?;:]|\n)\s*/i,
            /^(?:I'd be happy to help with that\.|I can certainly help you with that\.|Let me help you with that\.|Here's what you requested:)\s*/i,
            /^(?:here is the implementation|here is the code|here are the details|here is your code|here's the implementation|here's the code|here's the solution|here are the details:)(?:[^\n]*?)(?:[.!?;:]|\n)\s*/i
        ];
        
        for (const regex of prefixes) {
            const temp = cleaned.replace(regex, "");
            if (temp !== cleaned) {
                cleaned = temp.trim();
                matches = true;
                break;
            }
        }
    }

    // 2. Strip Conversational Conclusion Slop
    const outroRegexes = [
        /[\r\n\s]*(?:i hope this helps|let me know if you need|let me know if this works|please review the code|let me know if you have any questions|feel free to ask|hope that helps|happy coding)(?:.*)$/gi,
    ];

    for (const regex of outroRegexes) {
        cleaned = cleaned.replace(regex, "");
    }

    // 3. Bullet-point collapse logic (1-2 item list -> prose)
    const lines = cleaned.split(/\r?\n/);
    const resultLines = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];
        const bulletMatch = line.match(/^(\s*)([-*]|\d+\.)\s+(.*)$/);

        if (bulletMatch) {
            const listItems = [];
            const indent = bulletMatch[1];
            let j = i;

            while (j < lines.length) {
                const nextLine = lines[j];
                const nextMatch = nextLine.match(/^(\s*)([-*]|\d+\.)\s+(.*)$/);
                if (nextMatch && nextMatch[1].length === indent.length) {
                    listItems.push({ index: j, content: nextMatch[3] });
                    j++;
                } else if (nextLine.trim() === "") {
                    if (j + 1 < lines.length) {
                        const lookahead = lines[j + 1];
                        const lookaheadMatch = lookahead.match(/^(\s*)([-*]|\d+\.)\s+(.*)$/);
                        if (lookaheadMatch && lookaheadMatch[1].length === indent.length) {
                            j++;
                            continue;
                        }
                    }
                    break;
                } else {
                    break;
                }
            }

            if (listItems.length > 0 && listItems.length <= 2) {
                const collapsedProse = listItems.map(item => {
                    let content = item.content.trim();
                    if (content && !/[.!?]$/.test(content)) {
                        content += ".";
                    }
                    if (content) {
                        content = content.charAt(0).toUpperCase() + content.slice(1);
                    }
                    return content;
                }).join(" ");
                resultLines.push(indent + collapsedProse);
                i = j;
            } else {
                for (let k = i; k < j; k++) {
                    resultLines.push(lines[k]);
                }
                i = j;
            }
        } else {
            resultLines.push(line);
            i++;
        }
    }

    cleaned = resultLines.join("\n");
    return cleaned.trim();
}

function validateCodeContent(text) {
    const warnings = [];

    // Next.js 15 unawaited dynamic properties check
    const unawaitedNext15Regex = /(?<!await\s+)(cookies|headers|params)\s*\(\s*\)\s*\.\s*(get|has|set|delete|toString)/g;
    if (unawaitedNext15Regex.test(text)) {
        warnings.push("Next.js 15: Found unawaited call to cookies(), headers(), or params(). In Next.js 15+, these are async and must be awaited.");
    }

    // React 19 useFormState check
    if (text.includes("useFormState")) {
        warnings.push("React 19: Found useFormState. In React 19, this is renamed to useActionState.");
    }

    // Drizzle .filter() check
    const drizzleFilterRegex = /\.from\s*\([^)]*\)\s*\.\s*filter\s*\(/;
    if (drizzleFilterRegex.test(text)) {
        warnings.push("Drizzle ORM: Found .from().filter(). Drizzle does not use .filter(), use .where() instead.");
    }

    // OpenAI gpt-5 or claude-4-opus checks
    if (text.includes("gpt-5") || text.includes("claude-4-opus")) {
        warnings.push("LLM Models: Found references to non-existent models (gpt-5, claude-4-opus).");
    }

    return warnings;
}

async function cmdAlign(flags, argv, quiet) {
    let inputSource = null;

    // Find if a file path is specified
    const positionalArgs = argv.slice(3).filter(arg => !arg.startsWith("--"));
    if (positionalArgs.length > 0) {
        inputSource = positionalArgs[0];
    } else if (flags.path) {
        inputSource = flags.path;
    }

    let textContent = "";

    if (inputSource) {
        // Read from file
        const resolvedPath = path.resolve(inputSource);
        if (!fs.existsSync(resolvedPath)) {
            err(`File not found: ${inputSource}`);
            process.exit(1);
        }
        textContent = fs.readFileSync(resolvedPath, "utf8");
    } else {
        // Read from stdin
        textContent = await new Promise((resolve) => {
            let data = "";
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout,
                terminal: false
            });
            rl.on("line", (line) => {
                data += line + "\n";
            });
            rl.on("close", () => {
                resolve(data);
            });
        });
    }

    const aligned = alignText(textContent);
    const warnings = validateCodeContent(aligned);

    // Print warnings to stderr so they don't corrupt stdout piping
    if (warnings.length > 0 && !quiet) {
        process.stderr.write("\n" + bold(c("yellow", "⚠️  OCAE Alignment Validator Warnings:")) + "\n");
        for (const warnMsg of warnings) {
            process.stderr.write(`  ${c("yellow", "●")} ${warnMsg}\n`);
        }
        process.stderr.write("\n");
    }

    if (flags.write && inputSource) {
        // Write in-place to the file
        fs.writeFileSync(path.resolve(inputSource), aligned, "utf8");
        if (!quiet) {
            ok(`Aligned output written in-place to: ${c("cyan", inputSource)}`);
        }
    } else {
        // Print to stdout
        process.stdout.write(aligned + "\n");
    }
}

module.exports = {
    cmdAlign,
    alignText,
    validateCodeContent
};
