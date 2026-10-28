// Current phase-zero entry point. The original scenery inventory generator is
// retained under docs/phase-0/baseline; its old railway is historical only.
import {execFileSync} from "node:child_process";
execFileSync("python3",["scripts/build-canonical-layout.py"],{stdio:"inherit",cwd:new URL("..",import.meta.url)});
