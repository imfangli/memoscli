declare module "toml" {
  export function parse(input: string): unknown;
  export default { parse };
}
