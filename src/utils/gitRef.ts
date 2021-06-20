type RefTypes = "heads" | "tags" | "pull";
type Ref = {type: RefTypes; name: string};

const refsRegex = /^refs\/(\w*)\/(.*)/;

/**
 * Parses a git ref string:
 * ```
 * refs/heads/*  > { type: "heads", name: "*" }
 * refs/tags/*   > { type: "tags", name: "*" }
 * refs/remotes/ > { type: "remotes", name: "" }
 * ```
 * @param refStr "refs/heads/dapplion/feat1"
 */
export function parseRef(refStr: string): Ref {
  const match = refStr.match(refsRegex);
  if (match === null) {
    throw Error(`Invalid ref ${refStr}`);
  }

  const type = match[1] as RefTypes;
  const name = match[2];

  return {type, name};
}

/**
 * Parse ref
 * @param refStr
 * @returns
 */
export function parseBranchFromRef(refStr: string): string {
  const ref = parseRef(refStr);

  switch (ref.type) {
    case "heads":
      return ref.name;

    case "pull":
      throw Error("Merge commit not supported. Make sure to checkout head branch commit");

    case "tags":
      throw Error("Running on tags not supported. Trigger on push events only");

    default:
      throw Error(`Ref type '${ref.type}' not supported: ${refStr}`);
  }
}
