// Prepend the @doikayt scope unless the name is already scoped — any existing
// @scope/ is left as-is. Shared by `init` (library name prompt) and the `new`
// command (scoped `npm init`).
export function scopeName(name) {
  return name.startsWith("@") ? name : `@doikayt/${name}`;
}
