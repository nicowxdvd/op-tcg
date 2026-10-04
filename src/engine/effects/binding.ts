export const CHOICE = '$choice'


export function bind<T>(node: T, option: string): T {
  if (node === CHOICE)
    return option as T
  if (Array.isArray(node))
    return node.map(item => bind(item, option)) as T
  if (node && typeof node === 'object')
    return Object.fromEntries(Object.entries(node).map(([key, value]) => [key, bind(value, option)])) as T

  return node

}
